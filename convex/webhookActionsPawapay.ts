"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_WEBHOOK_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

function verifyHmacSignature(
  payload: string,
  receivedSignature: string,
  secret: string,
  algorithm: string = "sha256"
): boolean {
  const computedSignature = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest("hex");
  return timingSafeEqual(computedSignature, receivedSignature);
}

function isReplayAttack(timestamp: number): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return (
    age > MAX_WEBHOOK_AGE_MS || Math.abs(age) > WEBHOOK_TIMESTAMP_TOLERANCE_MS
  );
}

function decryptString(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Handle PawaPay webhook
 * Signature: HMAC-SHA256 sent in 'X-Signature' header
 */
export const handlePawapayWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload
      const webhookData = JSON.parse(args.payload);
      const event = webhookData.event || "unknown";

      // Extract transaction ID
      const depositId = webhookData.depositId || webhookData.deposit_id;
      
      // Get app details to find organization context
      const app = await ctx.runQuery(internal.apps.get, { id: args.appId });
      if (!app) {
        console.error("App not found for webhook");
        return { success: false, error: "App not found" };
      }

      // Get provider credentials for this app
      const credentials = await ctx.runQuery(
        internal.paymentProviderCredentials.getCredentialsInternal,
        {
          appId: args.appId,
        }
      );

      if (!credentials || !credentials.webhookSecret) {
        throw new Error("Provider not configured or missing webhook secret");
      }

      // Decrypt and verify signature
      const webhookSecret = decryptString(credentials.webhookSecret);

      const isValid = verifyHmacSignature(
        args.payload,
        args.signature,
        webhookSecret
      );

      if (!isValid) {
        console.error("Invalid PawaPay webhook signature");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: app.organizationId,
          appId: args.appId,
          provider: "pawapay",
          event,
          payload: webhookData,
          status: "failed",
          signatureValid: false,
        });
        return { success: false, error: "Invalid signature" };
      }

      // Check for idempotency
      const eventId = webhookData.depositId || webhookData.deposit_id;
      if (eventId) {
        const existingWebhook = await ctx.runQuery(
          internal.webhookQueries.findWebhookByEventId,
          { eventId }
        );
        if (existingWebhook) {
          console.log(`Duplicate PawaPay webhook event: ${eventId}`);
          await ctx.runMutation(internal.webhookMutations.logWebhook, {
            organizationId: app.organizationId,
            appId: args.appId,
            provider: "pawapay",
            event,
            payload: webhookData,
            status: "ignored",
            signatureValid: true,
          });
          return { success: true, duplicate: true };
        }
      }

      // Check for replay attack
      const timestamp = webhookData.created
        ? new Date(webhookData.created).getTime()
        : Date.now();
      if (isReplayAttack(timestamp)) {
        console.error("Potential replay attack detected");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: app.organizationId,
          appId: args.appId,
          provider: "pawapay",
          event,
          payload: webhookData,
          status: "failed",
          signatureValid: true,
        });
        return { success: false, error: "Webhook too old" };
      }

      // Map status
      let status: "success" | "failed" | "pending" = "pending";
      const pawaStatus = webhookData.status?.toLowerCase();
      if (pawaStatus === "completed" || pawaStatus === "accepted") {
        status = "success";
      } else if (pawaStatus === "failed" || pawaStatus === "rejected") {
        status = "failed";
      }

      // Find transaction by deposit ID within this app's context
      let transaction = null;
      if (depositId) {
        // For PawaPay, we need to search by provider transaction ID within app scope
        const transactions = await ctx.runQuery(
          internal.webhookQueries.findTransactionsByAppId,
          { appId: args.appId }
        );
        transaction = transactions.find(t => t.providerTransactionId === depositId);
      }

      // Update transaction if found
      if (transaction) {
        await ctx.runMutation(
          internal.webhookMutations.updateTransactionFromWebhook,
          {
            transactionId: transaction._id,
            status,
            providerTransactionId: depositId,
            providerResponse: webhookData,
            metadata: { webhookEvent: event },
          }
        );
      }

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: app.organizationId,
        appId: args.appId,
        provider: "pawapay",
        event,
        payload: webhookData,
        status: "processed",
        paymentTransactionId: transaction?._id,
        subscriptionId: transaction?.subscriptionId,
        signatureValid: true,
        processedAt: Date.now(),
      });

      // Trigger outgoing webhooks to customer app
      if (transaction && (status === "success" || status === "failed")) {
        const webhookEvent =
          status === "success" ? "subscription.activated" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: args.appId,
          event: webhookEvent,
          payload: {
            payment: {
              id: transaction._id,
              amount: transaction.amount,
              currency: transaction.currency,
              status,
              providerTransactionId: depositId,
              timestamp: Date.now(),
            },
            subscription_id: transaction.subscriptionId,
            customer_id: transaction.customerId,
            invoice_id: transaction.invoiceId,
          },
        });
      }

      return { success: true, status };
    } catch (error: any) {
      console.error("Error processing PawaPay webhook:", error);
      return { success: false, error: error.message };
    }
  },
});
