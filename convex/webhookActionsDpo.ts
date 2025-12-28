"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

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

/**
 * Handle DPO webhook
 * Verification: CompanyToken + API call to verify transaction
 */
export const handleDpoWebhook = internalAction({
  args: {
    payload: v.string(),
    appId: v.id("apps"),
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

      if (!credentials || !credentials.credentials?.merchantId) {
        throw new Error(
          "Provider credentials not configured or missing merchant ID"
        );
      }

      // Verify transaction via API
      const verificationResult = await ctx.runAction(
        internal.webhookActions.verifyDpoTransaction,
        {
          transactionToken: transactionToken || companyRef,
          companyToken: credentials.credentials.merchantId,
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
              providerTransactionId: transactionToken,
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
      console.error("Error processing DPO webhook:", error);
      return { success: false, error: error.message };
    }
  },
});
