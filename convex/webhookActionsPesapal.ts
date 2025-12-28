"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

function decryptString(encryptedData: string): string {
  const parts = encryptedData.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted data format");
  }

  const [ivHex, encryptedHex, tagHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  // Derive key from ENCRYPTION_KEY using SHA256
  const key = crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString("utf8");
}

/**
 * Verify a Pesapal transaction via API
 */
export const verifyPesapalTransaction = internalAction({
  args: {
    orderTrackingId: v.string(),
    consumerKey: v.string(),
    consumerSecret: v.string(),
  },
  handler: async (_, args) => {
    // Get OAuth token
    const tokenResponse = await fetch(
      "https://pay.pesapal.com/v3/api/Auth/RequestToken",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          consumer_key: args.consumerKey,
          consumer_secret: args.consumerSecret,
        }),
      }
    );

    if (!tokenResponse.ok) {
      throw new Error(
        `Failed to get Pesapal token: ${tokenResponse.statusText}`
      );
    }

    const tokenData: any = await tokenResponse.json();
    const accessToken = tokenData.token;

    // Get transaction status
    const statusResponse = await fetch(
      `https://pay.pesapal.com/v3/api/Transactions/GetTransactionStatus?orderTrackingId=${args.orderTrackingId}`,
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!statusResponse.ok) {
      throw new Error(
        `Failed to verify Pesapal transaction: ${statusResponse.statusText}`
      );
    }

    return await statusResponse.json();
  },
});

/**
 * Handle Pesapal webhook
 * Verification: OAuth + API call to verify transaction
 */
export const handlePesapalWebhook = internalAction({
  args: {
    payload: v.string(),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload
      const webhookData = JSON.parse(args.payload);
      const event = webhookData.NotificationType || "unknown";

      // Extract order tracking ID
      const orderTrackingId = webhookData.OrderTrackingId;
      const merchantReference = webhookData.OrderMerchantReference;

      if (!orderTrackingId && !merchantReference) {
        console.error(
          "Pesapal webhook missing transaction reference - cannot log without org/app context"
        );
        return { success: false, error: "Missing tracking information" };
      }

      // Find transaction (try both IDs)
      const transaction = merchantReference
        ? await ctx.runQuery(
            internal.webhookQueries.findTransactionByReference,
            {
              reference: merchantReference,
            }
          )
        : await ctx.runQuery(
            internal.webhookQueries.findTransactionByProviderTxnId,
            {
              providerTxnId: orderTrackingId,
            }
          );

      if (!transaction) {
        console.error(
          "Transaction not found - cannot log without org/app context"
        );
        return { success: false, error: "Transaction not found" };
      }

      // Check for idempotency
      const eventId = orderTrackingId || merchantReference;
      if (eventId) {
        const existingWebhook = await ctx.runQuery(
          internal.webhookQueries.findWebhookByEventId,
          { eventId }
        );
        if (existingWebhook) {
          console.log(`Duplicate Pesapal webhook event: ${eventId}`);
          await ctx.runMutation(internal.webhookMutations.logWebhook, {
            organizationId: transaction.organizationId,
            appId: transaction.appId,
            provider: "pesapal",
            event,
            payload: webhookData,
            status: "ignored",
            paymentTransactionId: transaction._id,
          });
          return { success: true, duplicate: true };
        }
      }

      // Get provider details
      const provider = await ctx.runQuery(
        internal.webhookQueries.getProviderDetails,
        {
          providerId: transaction.providerCatalogId,
        }
      );

      if (!provider) {
        throw new Error("Provider not found in catalog");
      }

      // Get provider credentials for this app
      const credentials = await ctx.runQuery(
        internal.paymentProviderCredentials.getCredentialsInternal,
        {
          appId: transaction.appId,
        }
      );

      if (
        !credentials ||
        !credentials.credentials?.publicKey ||
        !credentials.credentials?.secretKeyEncrypted
      ) {
        throw new Error("Provider credentials not configured or missing keys");
      }

      // Decrypt credentials
      const consumerSecret = decryptString(
        credentials.credentials.secretKeyEncrypted
      );

      // Verify transaction via API
      const verificationResult = await ctx.runAction(
        internal.webhookActions.verifyPesapalTransaction,
        {
          orderTrackingId: orderTrackingId || merchantReference,
          consumerKey: credentials.credentials.publicKey,
          consumerSecret,
        }
      );

      // Map status
      let status: "success" | "failed" | "pending" = "pending";
      const pesapalStatus = verificationResult.status?.toLowerCase();
      if (pesapalStatus === "completed" || pesapalStatus === "success") {
        status = "success";
      } else if (pesapalStatus === "failed" || pesapalStatus === "invalid") {
        status = "failed";
      }

      // Update transaction
      await ctx.runMutation(
        internal.webhookMutations.updateTransactionFromWebhook,
        {
          transactionId: transaction._id,
          status,
          providerTransactionId: orderTrackingId,
          providerResponse: verificationResult,
          metadata: { webhookEvent: event },
        }
      );

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: transaction.organizationId,
        appId: transaction.appId,
        provider: "pesapal",
        event,
        payload: webhookData,
        status: "processed",
        paymentTransactionId: transaction._id,
        subscriptionId: transaction.subscriptionId,
        processedAt: Date.now(),
      });

      // Trigger outgoing webhooks to customer app
      if (status === "success" || status === "failed") {
        const webhookEvent =
          status === "success" ? "subscription.activated" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: transaction.appId,
          event: webhookEvent,
          payload: {
            payment: {
              id: transaction._id,
              amount: transaction.amount,
              currency: transaction.currency,
              status,
              providerTransactionId: orderTrackingId,
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
      console.error("Error processing Pesapal webhook:", error);
      return { success: false, error: error.message };
    }
  },
});
