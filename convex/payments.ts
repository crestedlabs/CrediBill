/**
 * Payment Orchestration
 * Core functions for initiating and managing payments
 */

import { v } from "convex/values";
import {
  action,
  internalAction,
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { Id } from "./_generated/dataModel";

/**
 * Initiate a payment for a subscription
 * This is the main entry point for charging customers
 */
export const initiateSubscriptionPayment = action({
  args: {
    subscriptionId: v.id("subscriptions"),
    invoiceId: v.optional(v.id("invoices")),
    paymentMethod: v.union(
      v.literal("mobile_money_mtn"),
      v.literal("mobile_money_airtel"),
      v.literal("mobile_money_tigo"),
      v.literal("mobile_money_vodacom"),
      v.literal("card_visa"),
      v.literal("card_mastercard"),
      v.literal("bank_transfer")
    ),
    customerPhone: v.optional(v.string()), // Required for mobile money
    amount: v.optional(v.number()), // Override invoice amount if needed
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    transactionId?: Id<"paymentTransactions">;
    paymentUrl?: string;
    message: string;
  }> => {
    // Get subscription details
    const subscription = await ctx.runQuery(
      internal.payments.getSubscriptionDetails,
      {
        subscriptionId: args.subscriptionId,
      }
    );

    if (!subscription) {
      return { success: false, message: "Subscription not found" };
    }

    // Get plan for currency
    const plan = await ctx.runQuery(internal.payments.getPlanDetails, {
      planId: subscription.planId,
    });

    if (!plan) {
      return { success: false, message: "Plan not found" };
    }

    // Get or create invoice
    let invoiceId = args.invoiceId;
    if (!invoiceId) {
      invoiceId = await ctx.runMutation(
        internal.payments.createInvoiceForSubscription,
        {
          subscriptionId: args.subscriptionId,
        }
      );
    }

    const invoice = await ctx.runQuery(internal.payments.getInvoiceDetails, {
      invoiceId,
    });

    if (!invoice) {
      return { success: false, message: "Invoice not found" };
    }

    // Get app's primary payment provider
    const provider = await ctx.runQuery(internal.payments.getPrimaryProvider, {
      appId: subscription.appId,
    });

    if (!provider) {
      return {
        success: false,
        message: "No payment provider configured for this app",
      };
    }

    // Create payment transaction record
    const transactionId = await ctx.runMutation(
      internal.payments.createPaymentTransaction,
      {
        organizationId: subscription.organizationId,
        appId: subscription.appId,
        customerId: subscription.customerId,
        subscriptionId: args.subscriptionId,
        invoiceId,
        amount: args.amount || invoice.amountDue,
        currency: plan.currency,
        paymentProviderId: provider._id,
        paymentMethod: args.paymentMethod,
        customerPhone: args.customerPhone,
        attemptNumber: 1,
        isRetry: false,
      }
    );

    // Initiate payment with provider (using internal action for Node.js runtime)
    const result = await ctx.runAction(
      internal.paymentsNode.initiatePaymentWithProvider,
      {
        transactionId,
        providerId: provider._id,
        customerId: subscription.customerId,
        subscriptionId: args.subscriptionId,
        invoiceId,
        amount: args.amount || invoice.amountDue,
        currency: plan.currency,
        paymentMethod: args.paymentMethod,
        customerPhone: args.customerPhone,
        reference: `txn_${transactionId}`,
      }
    );

    return {
      success: result.success,
      transactionId,
      paymentUrl: result.paymentUrl,
      message: result.message,
    };
  },
});

/**
 * Process trial expiration - convert trial to paid subscription
 */
export const processTrialExpiration = action({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    // Get subscription
    const subscription = await ctx.runQuery(
      internal.payments.getSubscriptionDetails,
      {
        subscriptionId: args.subscriptionId,
      }
    );

    if (!subscription) {
      return { success: false, message: "Subscription not found" };
    }

    // Verify it's actually in trial and trial has ended
    if (subscription.status !== "trialing") {
      return { success: false, message: "Subscription is not in trial" };
    }

    const now = Date.now();
    if (!subscription.trialEndsAt || subscription.trialEndsAt > now) {
      return { success: false, message: "Trial has not ended yet" };
    }

    // Get customer's default payment method
    const customer = await ctx.runQuery(internal.payments.getCustomerDetails, {
      customerId: subscription.customerId,
    });

    if (!customer) {
      return { success: false, message: "Customer not found" };
    }

    // Attempt to charge for first billing period
    // For now, we'll require the app to provide payment method
    // In the future, we can store customer payment methods

    return {
      success: false,
      message: "Trial expired. Customer needs to provide payment details.",
    };
  },
});

/**
 * Process recurring payment for active subscription
 */
export const processRecurringPayment = action({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    // Get subscription
    const subscription = await ctx.runQuery(
      internal.payments.getSubscriptionDetails,
      {
        subscriptionId: args.subscriptionId,
      }
    );

    if (!subscription) {
      return { success: false, message: "Subscription not found" };
    }

    // Verify subscription is active
    if (subscription.status !== "active") {
      return { success: false, message: "Subscription is not active" };
    }

    // Check if payment is due
    const now = Date.now();
    if (!subscription.nextPaymentDate || subscription.nextPaymentDate > now) {
      return { success: false, message: "Payment is not due yet" };
    }

    // Create invoice for this billing period
    const invoiceId = await ctx.runMutation(
      internal.payments.createInvoiceForSubscription,
      {
        subscriptionId: args.subscriptionId,
      }
    );

    // Get customer's stored payment method (if available)
    // For now, return message that payment is needed

    return {
      success: false,
      message: "Recurring payment due. Waiting for customer payment.",
    };
  },
});

/**
 * Retry a failed payment
 */
export const retryFailedPayment = action({
  args: {
    transactionId: v.id("paymentTransactions"),
    paymentMethod: v.optional(
      v.union(
        v.literal("mobile_money_mtn"),
        v.literal("mobile_money_airtel"),
        v.literal("mobile_money_tigo"),
        v.literal("mobile_money_vodacom"),
        v.literal("card_visa"),
        v.literal("card_mastercard"),
        v.literal("bank_transfer")
      )
    ),
    customerPhone: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    newTransactionId?: Id<"paymentTransactions">;
    paymentUrl?: string;
    message: string;
  }> => {
    // Get original transaction
    const originalTxn = await ctx.runQuery(
      internal.payments.getTransactionDetails,
      {
        transactionId: args.transactionId,
      }
    );

    if (!originalTxn) {
      return { success: false, message: "Transaction not found" };
    }

    // Check if already succeeded
    if (originalTxn.status === "success") {
      return { success: false, message: "Transaction already succeeded" };
    }

    // Count retry attempts
    const attemptNumber = originalTxn.attemptNumber + 1;

    // Get provider
    const provider = await ctx.runQuery(internal.payments.getProviderDetails, {
      providerId: originalTxn.paymentProviderId,
    });

    if (!provider) {
      return { success: false, message: "Payment provider not found" };
    }

    // Create new transaction for retry
    const newTransactionId = await ctx.runMutation(
      internal.payments.createPaymentTransaction,
      {
        organizationId: originalTxn.organizationId,
        appId: originalTxn.appId,
        customerId: originalTxn.customerId,
        subscriptionId: originalTxn.subscriptionId,
        invoiceId: originalTxn.invoiceId,
        amount: originalTxn.amount,
        currency: originalTxn.currency,
        paymentProviderId: originalTxn.paymentProviderId,
        paymentMethod: (args.paymentMethod || originalTxn.paymentMethod) as any,
        customerPhone:
          args.customerPhone || originalTxn.customerPaymentDetails?.phone,
        attemptNumber,
        isRetry: true,
        originalTransactionId: args.transactionId,
      }
    );

    // Initiate payment with provider
    const result = await ctx.runAction(
      internal.paymentsNode.initiatePaymentWithProvider,
      {
        transactionId: newTransactionId,
        providerId: provider._id,
        customerId: originalTxn.customerId,
        subscriptionId: originalTxn.subscriptionId,
        invoiceId: originalTxn.invoiceId,
        amount: originalTxn.amount,
        currency: originalTxn.currency,
        paymentMethod: (args.paymentMethod || originalTxn.paymentMethod) as any,
        customerPhone:
          args.customerPhone || originalTxn.customerPaymentDetails?.phone,
        reference: `txn_${newTransactionId}_retry${attemptNumber}`,
      }
    );

    return {
      success: result.success,
      newTransactionId,
      paymentUrl: result.paymentUrl,
      message: result.message,
    };
  },
});

// ============= Internal Queries =============

/**
 * Get subscription details (internal)
 */
export const getSubscriptionDetails = internalQuery({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    return subscription;
  },
});

/**
 * Get plan details (internal)
 */
export const getPlanDetails = internalQuery({
  args: { planId: v.id("plans") },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    return plan;
  },
});

/**
 * Get invoice details (internal)
 */
export const getInvoiceDetails = internalQuery({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    return invoice;
  },
});

/**
 * Get customer details (internal)
 */
export const getCustomerDetails = internalQuery({
  args: { customerId: v.id("customers") },
  handler: async (ctx, args) => {
    const customer = await ctx.db.get(args.customerId);
    return customer;
  },
});

/**
 * Get primary payment provider for app (internal)
 */
export const getPrimaryProvider = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const provider = await ctx.db
      .query("paymentProviders")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .filter((q) => q.eq(q.field("isPrimary"), true))
      .first();
    return provider;
  },
});

/**
 * Get provider details (internal)
 */
export const getProviderDetails = internalQuery({
  args: { providerId: v.id("paymentProviders") },
  handler: async (ctx, args) => {
    const provider = await ctx.db.get(args.providerId);
    return provider;
  },
});

/**
 * Get transaction details (internal)
 */
export const getTransactionDetails = internalQuery({
  args: { transactionId: v.id("paymentTransactions") },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    return transaction;
  },
});

// ============= Internal Mutations =============

/**
 * Create invoice for subscription (internal)
 */
export const createInvoiceForSubscription = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    const plan = await ctx.db.get(subscription.planId);
    if (!plan) throw new Error("Plan not found");

    // Calculate invoice amount (base plan + usage)
    const now = Date.now();
    const periodStart =
      subscription.nextPaymentDate || subscription.currentPeriodStart || now;
    const periodEnd = periodStart + 30 * 24 * 60 * 60 * 1000; // 30 days

    // For now, just charge the plan amount
    // TODO: Add usage calculation
    const amountDue = plan.baseAmount || 0;

    // Generate invoice number
    const invoiceCount = (
      await ctx.db
        .query("invoices")
        .withIndex("by_app", (q) => q.eq("appId", subscription.appId))
        .collect()
    ).length;
    const invoiceNumber = `INV-${Date.now()}-${invoiceCount + 1}`;

    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: subscription.organizationId,
      appId: subscription.appId,
      customerId: subscription.customerId,
      subscriptionId: args.subscriptionId,
      invoiceNumber,
      currency: plan.currency,
      amountDue,
      amountPaid: 0,
      status: "open",
      periodStart,
      periodEnd,
      lineItems: [
        {
          description: plan.name,
          quantity: 1,
          unitAmount: plan.baseAmount || 0,
          totalAmount: plan.baseAmount || 0,
          type: "plan",
        },
      ],
    });

    return invoiceId;
  },
});

/**
 * Create payment transaction record (internal)
 */
export const createPaymentTransaction = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    subscriptionId: v.optional(v.id("subscriptions")),
    invoiceId: v.optional(v.id("invoices")),
    amount: v.number(),
    currency: v.string(),
    paymentProviderId: v.id("paymentProviders"),
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
    attemptNumber: v.number(),
    isRetry: v.boolean(),
    originalTransactionId: v.optional(v.id("paymentTransactions")),
  },
  handler: async (ctx, args) => {
    const transactionId = await ctx.db.insert("paymentTransactions", {
      organizationId: args.organizationId,
      appId: args.appId,
      customerId: args.customerId,
      subscriptionId: args.subscriptionId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      currency: args.currency,
      paymentProviderId: args.paymentProviderId,
      paymentMethod: args.paymentMethod,
      customerPaymentDetails: args.customerPhone
        ? { phone: args.customerPhone }
        : undefined,
      status: "pending",
      attemptNumber: args.attemptNumber,
      isRetry: args.isRetry,
      originalTransactionId: args.originalTransactionId,
      initiatedAt: Date.now(),
    });

    return transactionId;
  },
});

/**
 * Update transaction status (internal)
 */
export const updateTransactionStatus = internalMutation({
  args: {
    transactionId: v.id("paymentTransactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("initiated"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("refunded")
    ),
    providerTransactionId: v.optional(v.string()),
    providerReference: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    failureCode: v.optional(v.string()),
    providerResponse: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };

    if (args.providerTransactionId)
      updates.providerTransactionId = args.providerTransactionId;
    if (args.providerReference)
      updates.providerReference = args.providerReference;
    if (args.failureReason) updates.failureReason = args.failureReason;
    if (args.failureCode) updates.failureCode = args.failureCode;
    if (args.providerResponse) updates.providerResponse = args.providerResponse;

    if (
      args.status === "success" ||
      args.status === "failed" ||
      args.status === "canceled"
    ) {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.transactionId, updates);
  },
});

// ====================================
// PUBLIC QUERIES AND MUTATIONS
// ====================================

/**
 * List payment transactions by invoice
 */
export const listPaymentsByInvoice = query({
  args: { invoiceId: v.id("invoices") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .order("desc")
      .collect();

    return transactions;
  },
});

/**
 * List payment transactions by subscription
 */
export const listPaymentsBySubscription = query({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const transactions = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      )
      .order("desc")
      .collect();

    return transactions;
  },
});
