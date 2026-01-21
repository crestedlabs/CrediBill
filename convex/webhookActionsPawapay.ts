"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
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
  algorithm: string = "sha256",
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
 * Handle PawaPay webhook (forwarded from Cloudflare Worker)
 * Authentication is handled at HTTP layer via X-Webhook-Secret
 * NOTE: appId is now extracted from the webhook body as credibill_app_id
 */
export const handlePawapayWebhook = internalAction({
  args: {
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload from Cloudflare Worker
      const webhookData = JSON.parse(args.payload);

      console.log(
        "[PawaPay] Raw webhook data:",
        JSON.stringify(webhookData).substring(0, 500),
      );

      // Provider-agnostic: Handle nested structure (PawaPay wraps in "data")
      const data = webhookData.data || webhookData;
      const outerStatus = webhookData.status; // "FOUND" from PawaPay wrapper
      const event = webhookData.event || "payment.status_update";

      // Extract transaction ID (provider-agnostic field names)
      const depositId = data.depositId || data.deposit_id || data.transactionId;

      // Extract metadata - PawaPay sends metadata as array of objects
      // Example: [{"credibill_customer_id": "..."}, {"credibill_subscription_id": "..."}]
      const metadataArray = data.metadata || [];

      // Helper function to extract value from metadata array
      const getMetadataValue = (key: string) => {
        if (Array.isArray(metadataArray)) {
          const item = metadataArray.find((obj: any) => obj && obj[key]);
          return item ? item[key] : undefined;
        }
        // Fallback for flat object structure (backwards compatibility)
        return metadataArray[key];
      };

      const customerId = getMetadataValue("credibill_customer_id");
      const subscriptionId = getMetadataValue("credibill_subscription_id");
      const invoiceId = getMetadataValue("credibill_invoice_id");
      const appId = getMetadataValue("credibill_app_id");

      if (!appId) {
        console.error("[PawaPay] Missing credibill_app_id in metadata", {
          depositId,
          metadata: metadataArray,
        });
        return {
          success: false,
          error:
            "Missing credibill_app_id in metadata. Include it in your deposit request.",
          logged: true,
        };
      }

      console.log("[PawaPay] Extracted metadata:", {
        appId,
        customerId,
        subscriptionId,
        invoiceId,
        depositId,
      });

      // Get app details to find organization context
      const app = await ctx.runQuery(internal.apps.get, {
        id: appId as Id<"apps">,
      });
      if (!app) {
        console.error("App not found for webhook");
        // Still return success so PawaPay accepts webhook
        return { success: true, error: "App not found", logged: true };
      }

      // Validate required metadata - customerId is required for transaction tracking
      if (!customerId) {
        console.error("[PawaPay] Missing required metadata: customerId", {
          depositId,
        });
        return {
          success: true,
          error:
            "Missing required metadata: credibill_customer_id. Include it in your deposit request metadata.",
          logged: true,
        };
      }

      // Check for idempotency using depositId
      if (depositId) {
        const existingTransaction = await ctx.runQuery(
          internal.webhookQueries.findTransactionByReferenceAndApp,
          {
            reference: depositId,
            appId: appId as Id<"apps">,
          },
        );
        if (existingTransaction) {
          console.log(`Duplicate PawaPay webhook for depositId: ${depositId}`);
          // Update existing transaction status if it's a state transition
          const currentStatus = webhookData.status?.toUpperCase();
          if (currentStatus === "COMPLETED" || currentStatus === "FAILED") {
            // Only update if moving to final state
            await ctx.runMutation(
              internal.webhookMutations.updateTransactionFromWebhook,
              {
                transactionId: existingTransaction._id,
                status: currentStatus === "COMPLETED" ? "success" : "failed",
                providerTransactionId: depositId,
                providerResponse: webhookData,
                metadata: { webhookEvent: event, pawaPayStatus: currentStatus },
              },
            );
          }
          return { success: true, duplicate: false, updated: true };
        }
      }

      // Check for replay attack
      const timestamp = data.created
        ? new Date(data.created).getTime()
        : Date.now();
      if (isReplayAttack(timestamp)) {
        console.error("Potential replay attack detected");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: app.organizationId,
          appId: appId as Id<"apps">,
          provider: "pawapay",
          event,
          payload: webhookData,
          status: "failed",
          signatureValid: true,
        });
        return { success: true, error: "Webhook too old", logged: true };
      }

      // Map PawaPay status to internal status
      // ACCEPTED: deposit request accepted by pawaPay for processing → pending
      // SUBMITTED: deposit submitted to MMO, being processed → pending
      // COMPLETED: deposit successful (FINAL STATE) → success
      // FAILED: deposit failed (FINAL STATE) → failed
      // PawaPay failureCodes: PAYER_LIMIT_REACHED, PAYER_NOT_FOUND, UNSPECIFIED_FAILURE, etc.
      // Note: PawaPay nests failure info inside failureReason object
      let status: "success" | "failed" | "pending" = "pending";
      const pawaStatus = data.status?.toUpperCase();

      // Extract failure details - PawaPay structure: { failureReason: { failureCode, failureMessage } }
      const failureCode =
        data.failureReason?.failureCode || data.failureCode || undefined;
      const failureReason =
        data.failureReason?.failureMessage ||
        (typeof data.failureReason === "string"
          ? data.failureReason
          : undefined) ||
        failureCode ||
        undefined;

      console.log("[PawaPay] Status mapping:", {
        rawStatus: data.status,
        upperCaseStatus: pawaStatus,
        failureCode,
        failureReason,
        depositId,
      });

      if (pawaStatus === "COMPLETED") {
        status = "success";
      } else if (pawaStatus === "FAILED") {
        status = "failed";
      } else if (pawaStatus === "ACCEPTED" || pawaStatus === "SUBMITTED") {
        status = "pending";
      }

      console.log("[PawaPay] Mapped to internal status:", status);

      const isFinalState =
        pawaStatus === "COMPLETED" || pawaStatus === "FAILED";

      // Find or create transaction record using depositId (app owner's UUID)
      let transaction = null;
      if (depositId) {
        transaction = await ctx.runQuery(
          internal.webhookQueries.findTransactionByReferenceAndApp,
          {
            reference: depositId,
            appId: appId as Id<"apps">,
          },
        );
      }

      if (transaction) {
        // Update existing transaction
        await ctx.runMutation(
          internal.webhookMutations.updateTransactionFromWebhook,
          {
            transactionId: transaction._id,
            status,
            providerTransactionId: depositId,
            providerResponse: data,
            failureReason: status === "failed" ? failureReason : undefined,
            metadata: {
              webhookEvent: event,
              pawaPayStatus: pawaStatus,
              failureCode,
              correspondent: data.payer?.accountDetails?.provider,
            },
          },
        );
      } else if (depositId) {
        // Create new transaction record - app owner initiated payment, we're just tracking it
        // Extract customer/subscription from metadata if provided
        const transactionId = await ctx.runMutation(
          internal.webhookMutations.createTransactionFromWebhook,
          {
            organizationId: app.organizationId,
            appId: appId as Id<"apps">,
            customerId: customerId as any, // From metadata
            subscriptionId: subscriptionId as any, // From metadata
            invoiceId: invoiceId as any, // From metadata (optional)
            providerTransactionId: depositId,
            provider: "pawapay",
            status,
            amount: parseFloat(data.amount || "0"),
            currency: data.currency || "UGX",
            providerResponse: data,
            failureCode: status === "failed" ? failureCode : undefined,
            failureReason: status === "failed" ? failureReason : undefined,
            metadata: {
              pawaPayStatus: pawaStatus,
              correspondent: data.payer?.accountDetails?.provider,
              payer: data.payer,
              providerTransactionId: data.providerTransactionId,
            },
          },
        );
        // Fetch the created transaction to get full object
        const createdTransaction = await ctx.runQuery(
          internal.webhookQueries.findTransactionByReferenceAndApp,
          { reference: depositId, appId: appId as Id<"apps"> },
        );
        transaction = createdTransaction;
      }

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: app.organizationId,
        appId: appId as Id<"apps">,
        provider: "pawapay",
        event: `pawapay.${pawaStatus?.toLowerCase() || "unknown"}`,
        payload: webhookData,
        status: "processed",
        paymentTransactionId: transaction?._id,
        subscriptionId: transaction?.subscriptionId,
        processedAt: Date.now(),
      });

      // Only trigger outgoing webhooks on FINAL states (COMPLETED/FAILED)
      // Don't send duplicate events for ACCEPTED/SUBMITTED intermediate states
      if (transaction && isFinalState) {
        const webhookEvent =
          status === "success" ? "payment.completed" : "payment.failed";
        await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
          appId: appId as Id<"apps">,
          event: webhookEvent,
          payload: {
            payment: {
              id: transaction._id,
              providerTransactionId: depositId,
              amount: parseFloat(data.amount || "0"),
              currency: data.currency,
              status,
              pawaPayStatus: pawaStatus,
              failureCode: status === "failed" ? failureCode : undefined,
              failureReason: status === "failed" ? failureReason : undefined,
              correspondent: data.payer?.accountDetails?.provider,
              payer: data.payer,
              timestamp: data.created || new Date().toISOString(),
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
      // Log the error but still return success=true so PawaPay registers the webhook
      // The error is logged in the console and can be debugged later
      return {
        success: true, // Always true so PawaPay accepts the webhook
        error: error.message,
        note: "Webhook received but processing encountered an error. Check logs for details.",
      };
    }
  },
});
