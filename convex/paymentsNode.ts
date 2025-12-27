/**
 * Payment Provider Integration (Node.js Runtime)
 * Handles actual API calls to payment providers
 */

"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { decryptString } from "../lib/encryption";
import { createPaymentAdapter } from "./lib/paymentAdapters";

const ENCRYPTION_KEY =
  process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY ||
  "default-key-change-in-production";

/**
 * Initiate payment with provider (Node.js runtime for decryption)
 */
export const initiatePaymentWithProvider = internalAction({
  args: {
    transactionId: v.id("paymentTransactions"),
    providerId: v.id("paymentProviders"),
    customerId: v.id("customers"),
    subscriptionId: v.optional(v.id("subscriptions")),
    invoiceId: v.optional(v.id("invoices")),
    amount: v.number(),
    currency: v.string(),
    paymentMethod: v.union(
      v.literal("mobile_money_mtn"),
      v.literal("mobile_money_airtel"),
      v.literal("mobile_money_tigo"),
      v.literal("mobile_money_vodacom"),
      v.literal("card_visa"),
      v.literal("card_mastercard"),
      v.literal("bank_transfer")
    ),
    customerPhone: v.optional(v.string()),
    reference: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    paymentUrl?: string;
    message: string;
  }> => {
    try {
      // Get provider details
      const provider = await ctx.runQuery(
        internal.payments.getProviderDetails,
        {
          providerId: args.providerId,
        }
      );

      if (!provider) {
        throw new Error("Payment provider not found");
      }

      // Get customer details
      const customer = await ctx.runQuery(
        internal.payments.getCustomerDetails,
        {
          customerId: args.customerId,
        }
      );

      if (!customer) {
        throw new Error("Customer not found");
      }

      // Decrypt provider credentials
      const secretKey = await decryptString(
        provider.credentials.secretKeyEncrypted,
        ENCRYPTION_KEY
      );

      // Create payment adapter with decrypted credentials
      const adapter = createPaymentAdapter(
        provider.provider as any,
        {
          secretKey,
          publicKey: provider.credentials.publicKey,
          merchantId: provider.credentials.merchantId,
          apiUrl: provider.credentials.apiUrl,
        },
        provider.environment
      );

      // Prepare payment request
      const paymentRequest = {
        amount: args.amount,
        currency: args.currency,
        customerEmail: customer.email,
        customerPhone: args.customerPhone || customer.phone,
        customerName:
          customer.first_name && customer.last_name
            ? `${customer.first_name} ${customer.last_name}`
            : customer.first_name || customer.email,
        reference: args.reference,
        description: `Payment for subscription ${args.subscriptionId || "N/A"}`,
        paymentMethod: args.paymentMethod,
        callbackUrl: `${process.env.CONVEX_SITE_URL}/api/webhooks/${provider.provider}/${provider.appId}`,
        metadata: {
          transactionId: args.transactionId,
          subscriptionId: args.subscriptionId,
          invoiceId: args.invoiceId,
          customerId: args.customerId,
        },
      };

      // Initiate payment with provider
      const response = await adapter.initiatePayment(paymentRequest);

      // Update transaction status based on response
      await ctx.runMutation(internal.payments.updateTransactionStatus, {
        transactionId: args.transactionId,
        status: response.success ? "initiated" : "failed",
        providerTransactionId: response.transactionId,
        providerReference: args.reference,
        failureReason: response.error,
        providerResponse: response.providerResponse,
      });

      if (response.success) {
        return {
          success: true,
          paymentUrl: response.paymentUrl,
          message: response.message || "Payment initiated successfully",
        };
      } else {
        return {
          success: false,
          message: response.error || "Payment initiation failed",
        };
      }
    } catch (error: any) {
      // Log error and update transaction status
      await ctx.runMutation(internal.payments.updateTransactionStatus, {
        transactionId: args.transactionId,
        status: "failed",
        failureReason: error.message,
      });

      return {
        success: false,
        message: `Payment initiation failed: ${error.message}`,
      };
    }
  },
});

/**
 * Verify payment status with provider
 */
export const verifyPaymentWithProvider = internalAction({
  args: {
    transactionId: v.id("paymentTransactions"),
    providerId: v.id("paymentProviders"),
    providerTransactionId: v.string(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    status: string;
    message: string;
  }> => {
    try {
      // Get provider details
      const provider = await ctx.runQuery(
        internal.payments.getProviderDetails,
        {
          providerId: args.providerId,
        }
      );

      if (!provider) {
        throw new Error("Payment provider not found");
      }

      // Decrypt provider credentials
      const secretKey = await decryptString(
        provider.credentials.secretKeyEncrypted,
        ENCRYPTION_KEY
      );

      // Create payment adapter
      const adapter = createPaymentAdapter(
        provider.provider as any,
        {
          secretKey,
          publicKey: provider.credentials.publicKey,
          merchantId: provider.credentials.merchantId,
          apiUrl: provider.credentials.apiUrl,
        },
        provider.environment
      );

      // Query payment status
      const statusResponse = await adapter.getPaymentStatus(
        args.providerTransactionId
      );

      // Update transaction status
      await ctx.runMutation(internal.payments.updateTransactionStatus, {
        transactionId: args.transactionId,
        status: statusResponse.status,
        providerResponse: statusResponse.providerResponse,
        failureReason: statusResponse.failureReason,
      });

      return {
        success: true,
        status: statusResponse.status,
        message: `Payment status: ${statusResponse.status}`,
      };
    } catch (error: any) {
      return {
        success: false,
        status: "unknown",
        message: `Failed to verify payment: ${error.message}`,
      };
    }
  },
});
