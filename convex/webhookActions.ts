"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";

// ============================================================================
// SECURITY CONSTANTS
// ============================================================================

const WEBHOOK_TIMESTAMP_TOLERANCE_MS = 5 * 60 * 1000; // 5 minutes
const MAX_WEBHOOK_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;

// ============================================================================
// SECURITY UTILITIES
// ============================================================================

/**
 * Timing-safe string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify HMAC signature (generic for all providers using HMAC)
 */
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

/**
 * Check if a webhook is a replay attack based on timestamp
 */
function isReplayAttack(timestamp: number): boolean {
  const now = Date.now();
  const age = now - timestamp;
  return (
    age > MAX_WEBHOOK_AGE_MS || Math.abs(age) > WEBHOOK_TIMESTAMP_TOLERANCE_MS
  );
}

/**
 * Decrypt AES-256-GCM encrypted data
 */
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

// ============================================================================
// HELPER ACTIONS
// ============================================================================

/**
 * Decrypt a webhook secret
 */
export const decryptWebhookSecret = internalAction({
  args: { encryptedSecret: v.string() },
  handler: async (_, args) => {
    return decryptString(args.encryptedSecret);
  },
});

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
 * Verify a DPO transaction via API
 */
export const verifyDpoTransaction = internalAction({
  args: {
    transactionToken: v.string(),
    companyToken: v.string(),
  },
  handler: async (_, args) => {
    const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>${args.companyToken}</CompanyToken>
  <Request>verifyToken</Request>
  <TransactionToken>${args.transactionToken}</TransactionToken>
</API3G>`;

    const response = await fetch("https://secure.3gdirectpay.com/API/v6/", {
      method: "POST",
      headers: {
        "Content-Type": "application/xml",
      },
      body: xmlPayload,
    });

    if (!response.ok) {
      throw new Error(
        `Failed to verify DPO transaction: ${response.statusText}`
      );
    }

    const xmlResponse = await response.text();

    // Parse XML response (basic parsing)
    const resultMatch = xmlResponse.match(/<Result>(.*?)<\/Result>/);
    const resultExplanationMatch = xmlResponse.match(
      /<ResultExplanation>(.*?)<\/ResultExplanation>/
    );

    return {
      result: resultMatch ? resultMatch[1] : null,
      resultExplanation: resultExplanationMatch
        ? resultExplanationMatch[1]
        : null,
      raw: xmlResponse,
    };
  },
});

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Handle Flutterwave webhook
 * Signature: SHA256 hash sent in 'verif-hash' header
 */
export const handleFlutterwaveWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload
      const webhookData = JSON.parse(args.payload);
      const event = webhookData.event || "unknown";
      const data = webhookData.data || {};

      // Extract transaction reference
      const txRef = data.tx_ref || data.flw_ref;
      if (!txRef) {
        console.error(
          "Flutterwave webhook missing transaction reference - cannot log without org/app context"
        );
        return { success: false, error: "Missing transaction reference" };
      }

      // Find transaction
      const transaction = await ctx.runQuery(
        internal.webhookQueries.findTransactionByReference,
        { reference: txRef }
      );

      if (!transaction) {
        console.error(
          "Transaction not found - cannot log without org/app context"
        );
        return { success: false, error: "Transaction not found" };
      }

      // Get provider details
      const provider = await ctx.runQuery(
        internal.webhookQueries.getProviderDetails,
        {
          providerId: transaction.paymentProviderId,
        }
      );

      if (!provider || !provider.webhookSecret) {
        throw new Error("Provider not configured or missing webhook secret");
      }

      // Decrypt and verify signature
      const webhookSecret = await ctx.runAction(
        internal.webhookActions.decryptWebhookSecret,
        {
          encryptedSecret: provider.webhookSecret,
        }
      );

      // Flutterwave uses SHA256 hash of the webhook secret as verification
      const isValid = timingSafeEqual(args.signature, webhookSecret);

      if (!isValid) {
        console.error("Invalid Flutterwave webhook signature");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: transaction.organizationId,
          appId: transaction.appId,
          provider: "flutterwave",
          event,
          payload: webhookData,
          status: "failed",
          paymentTransactionId: transaction._id,
          signatureValid: false,
        });
        return { success: false, error: "Invalid signature" };
      }

      // Check for idempotency
      const eventId = webhookData.id || webhookData.event_id;
      if (eventId) {
        const existingWebhook = await ctx.runQuery(
          internal.webhookQueries.findWebhookByEventId,
          { eventId }
        );
        if (existingWebhook) {
          console.log(`Duplicate Flutterwave webhook event: ${eventId}`);
          await ctx.runMutation(internal.webhookMutations.logWebhook, {
            organizationId: transaction.organizationId,
            appId: transaction.appId,
            provider: "flutterwave",
            event,
            payload: webhookData,
            status: "ignored",
            paymentTransactionId: transaction._id,
            signatureValid: true,
          });
          return { success: true, duplicate: true };
        }
      }

      // Check for replay attack
      const timestamp = data.created_at
        ? new Date(data.created_at).getTime()
        : Date.now();
      if (isReplayAttack(timestamp)) {
        console.error("Potential replay attack detected");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: transaction.organizationId,
          appId: transaction.appId,
          provider: "flutterwave",
          event,
          payload: webhookData,
          status: "failed",
          paymentTransactionId: transaction._id,
          signatureValid: true,
        });
        return { success: false, error: "Webhook too old" };
      }

      // Map status
      let status: "success" | "failed" | "pending" = "pending";
      const flwStatus = data.status?.toLowerCase();
      if (flwStatus === "successful" || flwStatus === "success") {
        status = "success";
      } else if (flwStatus === "failed") {
        status = "failed";
      }

      // Update transaction
      await ctx.runMutation(
        internal.webhookMutations.updateTransactionFromWebhook,
        {
          transactionId: transaction._id,
          status,
          providerTransactionId: data.id?.toString(),
          providerResponse: data,
          metadata: { webhookEvent: event },
        }
      );

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: transaction.organizationId,
        appId: transaction.appId,
        provider: "flutterwave",
        event,
        payload: webhookData,
        status: "processed",
        paymentTransactionId: transaction._id,
        subscriptionId: transaction.subscriptionId,
        signatureValid: true,
        processedAt: Date.now(),
      });

      // Trigger outgoing webhooks to customer app
      if (status === "success" || status === "failed") {
        const webhookEvent =
          status === "success" ? "payment.success" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: transaction.appId,
          event: webhookEvent,
          payload: {
            id: transaction._id,
            amount: transaction.amount,
            currency: transaction.currency,
            status,
            customerId: transaction.customerId,
            subscriptionId: transaction.subscriptionId,
            invoiceId: transaction.invoiceId,
            providerTransactionId: data.id?.toString(),
            timestamp: Date.now(),
          },
        });
      }

      return { success: true, status };
    } catch (error: any) {
      console.error("Error processing Flutterwave webhook:", error);
      return { success: false, error: error.message };
    }
  },
});

/**
 * Handle PawaPay webhook
 * Signature: HMAC-SHA256 sent in 'X-Signature' header
 */
export const handlePawapayWebhook = internalAction({
  args: {
    payload: v.string(),
    signature: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload
      const webhookData = JSON.parse(args.payload);
      const event = webhookData.event || "unknown";

      // Extract transaction ID
      const depositId = webhookData.depositId || webhookData.deposit_id;
      if (!depositId) {
        console.error(
          "PawaPay webhook missing transaction reference - cannot log without org/app context"
        );
        return { success: false, error: "Missing deposit ID" };
      }

      // Find transaction
      const transaction = await ctx.runQuery(
        internal.webhookQueries.findTransactionByProviderTxnId,
        { providerTxnId: depositId }
      );

      if (!transaction) {
        console.error(
          "Transaction not found - cannot log without org/app context"
        );
        return { success: false, error: "Transaction not found" };
      }

      // Get provider details
      const provider = await ctx.runQuery(
        internal.webhookQueries.getProviderDetails,
        {
          providerId: transaction.paymentProviderId,
        }
      );

      if (!provider || !provider.webhookSecret) {
        throw new Error("Provider not configured or missing webhook secret");
      }

      // Decrypt and verify signature
      const webhookSecret = await ctx.runAction(
        internal.webhookActions.decryptWebhookSecret,
        {
          encryptedSecret: provider.webhookSecret,
        }
      );

      const isValid = verifyHmacSignature(
        args.payload,
        args.signature,
        webhookSecret
      );

      if (!isValid) {
        console.error("Invalid PawaPay webhook signature");
        await ctx.runMutation(internal.webhookMutations.logWebhook, {
          organizationId: transaction.organizationId,
          appId: transaction.appId,
          provider: "pawapay",
          event,
          payload: webhookData,
          status: "failed",
          paymentTransactionId: transaction._id,
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
            organizationId: transaction.organizationId,
            appId: transaction.appId,
            provider: "pawapay",
            event,
            payload: webhookData,
            status: "ignored",
            paymentTransactionId: transaction._id,
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
          organizationId: transaction.organizationId,
          appId: transaction.appId,
          provider: "pawapay",
          event,
          payload: webhookData,
          status: "failed",
          paymentTransactionId: transaction._id,
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

      // Update transaction
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

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: transaction.organizationId,
        appId: transaction.appId,
        provider: "pawapay",
        event,
        payload: webhookData,
        status: "processed",
        paymentTransactionId: transaction._id,
        subscriptionId: transaction.subscriptionId,
        signatureValid: true,
        processedAt: Date.now(),
      });

      // Trigger outgoing webhooks to customer app
      if (status === "success" || status === "failed") {
        const webhookEvent =
          status === "success" ? "payment.success" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: transaction.appId,
          event: webhookEvent,
          payload: {
            id: transaction._id,
            amount: transaction.amount,
            currency: transaction.currency,
            status,
            customerId: transaction.customerId,
            subscriptionId: transaction.subscriptionId,
            invoiceId: transaction.invoiceId,
            providerTransactionId: depositId,
            timestamp: Date.now(),
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

/**
 * Handle Pesapal webhook
 * Verification: OAuth + API call to verify transaction
 */
export const handlePesapalWebhook = internalAction({
  args: {
    payload: v.string(),
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
          providerId: transaction.paymentProviderId,
        }
      );

      if (
        !provider ||
        !provider.credentials?.publicKey ||
        !provider.credentials?.secretKeyEncrypted
      ) {
        throw new Error("Provider not configured or missing credentials");
      }

      // Decrypt credentials
      const consumerSecret = decryptString(
        provider.credentials.secretKeyEncrypted
      );

      // Verify transaction via API
      const verificationResult = await ctx.runAction(
        internal.webhookActions.verifyPesapalTransaction,
        {
          orderTrackingId: orderTrackingId || merchantReference,
          consumerKey: provider.credentials.publicKey,
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
          status === "success" ? "payment.success" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: transaction.appId,
          event: webhookEvent,
          payload: {
            id: transaction._id,
            amount: transaction.amount,
            currency: transaction.currency,
            status,
            customerId: transaction.customerId,
            subscriptionId: transaction.subscriptionId,
            invoiceId: transaction.invoiceId,
            providerTransactionId: orderTrackingId,
            timestamp: Date.now(),
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

/**
 * Handle DPO webhook
 * Verification: CompanyToken + API call to verify transaction
 */
export const handleDpoWebhook = internalAction({
  args: {
    payload: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Parse payload (DPO may send XML or JSON)
      let webhookData: any;
      try {
        webhookData = JSON.parse(args.payload);
      } catch {
        // Try parsing as XML
        webhookData = { raw: args.payload };
      }

      const event = webhookData.TransactionType || "unknown";

      // Extract transaction token
      const transactionToken =
        webhookData.TransactionToken || webhookData.transaction_token;
      const companyRef = webhookData.CompanyRef || webhookData.company_ref;

      if (!transactionToken && !companyRef) {
        console.error(
          "DPO webhook missing transaction reference - cannot log without org/app context"
        );
        return { success: false, error: "Missing transaction information" };
      }

      // Find transaction (try both IDs)
      const transaction = companyRef
        ? await ctx.runQuery(
            internal.webhookQueries.findTransactionByReference,
            {
              reference: companyRef,
            }
          )
        : await ctx.runQuery(
            internal.webhookQueries.findTransactionByProviderTxnId,
            {
              providerTxnId: transactionToken,
            }
          );

      if (!transaction) {
        console.error(
          "Transaction not found - cannot log without org/app context"
        );
        return { success: false, error: "Transaction not found" };
      }

      // Check for idempotency
      const eventId = transactionToken || companyRef;
      if (eventId) {
        const existingWebhook = await ctx.runQuery(
          internal.webhookQueries.findWebhookByEventId,
          { eventId }
        );
        if (existingWebhook) {
          console.log(`Duplicate DPO webhook event: ${eventId}`);
          await ctx.runMutation(internal.webhookMutations.logWebhook, {
            organizationId: transaction.organizationId,
            appId: transaction.appId,
            provider: "dpo",
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
          providerId: transaction.paymentProviderId,
        }
      );

      if (!provider || !provider.credentials?.merchantId) {
        throw new Error("Provider not configured or missing company token");
      }

      // Verify transaction via API
      const verificationResult = await ctx.runAction(
        internal.webhookActions.verifyDpoTransaction,
        {
          transactionToken: transactionToken || companyRef,
          companyToken: provider.credentials.merchantId,
        }
      );

      // Map status
      let status: "success" | "failed" | "pending" = "pending";
      const dpoResult = verificationResult.result;
      if (dpoResult === "000" || dpoResult === "Success") {
        status = "success";
      } else if (dpoResult === "901" || dpoResult === "Failed") {
        status = "failed";
      }

      // Update transaction
      await ctx.runMutation(
        internal.webhookMutations.updateTransactionFromWebhook,
        {
          transactionId: transaction._id,
          status,
          providerTransactionId: transactionToken,
          providerResponse: verificationResult,
          metadata: { webhookEvent: event },
        }
      );

      // Log webhook
      await ctx.runMutation(internal.webhookMutations.logWebhook, {
        organizationId: transaction.organizationId,
        appId: transaction.appId,
        provider: "dpo",
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
          status === "success" ? "payment.success" : "payment.failed";
        await ctx.runAction(internal.outgoingWebhooks.triggerWebhooks, {
          appId: transaction.appId,
          event: webhookEvent,
          payload: {
            id: transaction._id,
            amount: transaction.amount,
            currency: transaction.currency,
            status,
            customerId: transaction.customerId,
            subscriptionId: transaction.subscriptionId,
            invoiceId: transaction.invoiceId,
            providerTransactionId: transactionToken,
            timestamp: Date.now(),
          },
        });
      }

      return { success: true, status };
    } catch (error: any) {
      console.error("Error processing DPO webhook:", error);
      return { success: false, error: error.message };
    }
  },
});
