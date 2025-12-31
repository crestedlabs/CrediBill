import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Log a webhook event
 */
export const logWebhook = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    provider: v.union(
      v.literal("flutterwave"),
      v.literal("pawapay"),
      v.literal("pesapal"),
      v.literal("dpo"),
      v.literal("paystack"),
      v.literal("stripe"),
      v.literal("clerk")
    ),
    event: v.string(),
    payload: v.any(),
    status: v.union(
      v.literal("received"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("ignored")
    ),
    paymentTransactionId: v.optional(v.id("paymentTransactions")),
    subscriptionId: v.optional(v.id("subscriptions")),
    signatureValid: v.optional(v.boolean()),
    processedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const receivedAt = Date.now();

    // Parse payload if it's a string
    let parsedPayload = args.payload;
    if (typeof args.payload === "string") {
      try {
        parsedPayload = JSON.parse(args.payload);
      } catch {
        parsedPayload = args.payload;
      }
    }

    return await ctx.db.insert("webhookLogs", {
      organizationId: args.organizationId,
      appId: args.appId,
      provider: args.provider,
      event: args.event,
      payload: parsedPayload,
      status: args.status,
      paymentTransactionId: args.paymentTransactionId,
      subscriptionId: args.subscriptionId,
      signatureValid: args.signatureValid,
      receivedAt,
      processedAt:
        args.processedAt ||
        (args.status !== "received" ? Date.now() : undefined),
    });
  },
});

/**
 * Update a transaction from webhook data
 */
export const updateTransactionFromWebhook = internalMutation({
  args: {
    transactionId: v.id("paymentTransactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("refunded")
    ),
    providerTransactionId: v.optional(v.string()),
    providerResponse: v.optional(v.any()),
    metadata: v.optional(v.any()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${args.transactionId} not found`);
    }

    // Prevent overwriting terminal states
    const terminalStates = ["success", "canceled", "refunded"];
    if (terminalStates.includes(transaction.status)) {
      console.warn(
        `Transaction ${args.transactionId} is already in terminal state ${transaction.status}, ignoring update to ${args.status}`
      );
      return;
    }

    // Update transaction
    await ctx.db.patch(args.transactionId, {
      status: args.status,
      providerTransactionId:
        args.providerTransactionId || transaction.providerTransactionId,
      providerResponse: args.providerResponse,
      metadata: {
        ...transaction.metadata,
        ...args.metadata,
      },
      completedAt:
        args.status === "success" || args.status === "failed"
          ? Date.now()
          : transaction.completedAt,
    });

    // If successful, mark invoice as paid and activate subscription
    if (args.status === "success" && transaction.invoiceId) {
      const invoice = await ctx.db.get(transaction.invoiceId);
      if (invoice && invoice.status !== "paid") {
        await ctx.db.patch(transaction.invoiceId, {
          status: "paid",
        });
      }

      // Activate subscription if it's trialing or pending first payment
      if (transaction.subscriptionId) {
        const subscription = await ctx.db.get(transaction.subscriptionId);
        if (subscription) {
          const now = Date.now();

          // Activate from trialing or pending_payment status
          if (
            subscription.status === "trialing" ||
            subscription.status === "pending_payment"
          ) {
            // Calculate billing period based on plan interval
            const plan = await ctx.db.get(subscription.planId);
            let periodDuration: number;
            if (plan) {
              switch (plan.interval) {
                case "monthly":
                  periodDuration = 30 * 24 * 60 * 60 * 1000;
                  break;
                case "quarterly":
                  periodDuration = 90 * 24 * 60 * 60 * 1000;
                  break;
                case "yearly":
                  periodDuration = 365 * 24 * 60 * 60 * 1000;
                  break;
                case "one-time":
                  periodDuration = 0;
                  break;
                default:
                  periodDuration = 30 * 24 * 60 * 60 * 1000;
              }
            } else {
              periodDuration = 30 * 24 * 60 * 60 * 1000; // Default to monthly
            }

            const updateData: any = {
              status: "active",
              lastPaymentDate: now,
              failedPaymentAttempts: 0, // Reset failure count
            };

            // If this is the first payment (pending_payment -> active), set the billing period
            if (
              subscription.status === "pending_payment" &&
              plan?.interval !== "one-time"
            ) {
              updateData.currentPeriodStart = now;
              updateData.currentPeriodEnd = now + periodDuration;
              updateData.nextPaymentDate = now + periodDuration;
            }

            await ctx.db.patch(transaction.subscriptionId, updateData);

            // Send subscription.activated webhook
            const customer = await ctx.db.get(subscription.customerId);
            if (customer) {
              await ctx.scheduler.runAfter(
                0,
                internal.webhookDelivery.queueWebhook,
                {
                  appId: subscription.appId,
                  event: "subscription.activated",
                  payload: {
                    subscription: {
                      ...subscription,
                      ...updateData,
                    },
                    customer,
                    first_payment: subscription.status === "pending_payment",
                  },
                }
              );
            }
          } else if (subscription.status === "active") {
            // Just update payment date for active subscriptions
            await ctx.db.patch(transaction.subscriptionId, {
              lastPaymentDate: now,
              failedPaymentAttempts: 0, // Reset failure count
            });
          }
        }
      }
    }

    // If failed and this is a subscription payment, increment failure count
    if (args.status === "failed" && transaction.subscriptionId) {
      const subscription = await ctx.db.get(transaction.subscriptionId);
      if (subscription) {
        const failureCount = (subscription.failedPaymentAttempts || 0) + 1;
        await ctx.db.patch(transaction.subscriptionId, {
          failedPaymentAttempts: failureCount,
        });

        // If too many failures, mark subscription as past_due
        if (failureCount >= 3 && subscription.status === "active") {
          await ctx.db.patch(transaction.subscriptionId, {
            status: "past_due",
          });

          // Send subscription.past_due webhook
          const updatedSubscription = await ctx.db.get(
            transaction.subscriptionId
          );
          const customer = await ctx.db.get(subscription.customerId);
          if (updatedSubscription && customer) {
            await ctx.scheduler.runAfter(
              0,
              internal.webhookDelivery.queueWebhook,
              {
                appId: subscription.appId,
                event: "subscription.past_due",
                payload: {
                  subscription: updatedSubscription,
                  customer,
                  failed_attempts: failureCount,
                  last_failure_reason: args.failureReason || "Payment failed",
                },
              }
            );
          }
        }
      }
    }
  },
});

/**
 * Create a new transaction from webhook data (for payments initiated outside CrediBill)
 */
export const createTransactionFromWebhook = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    providerTransactionId: v.string(),
    provider: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("refunded")
    ),
    amount: v.number(),
    currency: v.string(),
    providerResponse: v.optional(v.any()),
    metadata: v.optional(v.any()),
    customerId: v.optional(v.id("customers")),
    subscriptionId: v.optional(v.id("subscriptions")),
    invoiceId: v.optional(v.id("invoices")),
  },
  handler: async (ctx, args) => {
    // Get the provider catalog ID for this app
    const app = await ctx.db.get(args.appId);
    if (!app || !app.paymentProviderId) {
      throw new Error("App not found or payment provider not configured");
    }

    return await ctx.db.insert("paymentTransactions", {
      organizationId: args.organizationId,
      appId: args.appId,
      customerId: args.customerId!, // Required - validated before calling this mutation
      providerCatalogId: app.paymentProviderId,
      providerTransactionId: args.providerTransactionId,
      providerReference: args.providerTransactionId, // Use provider's depositId as our reference
      subscriptionId: args.subscriptionId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      currency: args.currency,
      paymentMethod: "other", // Required field - will be updated if we know the method
      status: args.status,
      attemptNumber: 1, // First webhook notification is attempt 1
      isRetry: false, // Not a retry, this is tracking the payment
      providerResponse: args.providerResponse,
      metadata: args.metadata,
      initiatedAt: Date.now(),
      completedAt:
        args.status === "success" || args.status === "failed"
          ? Date.now()
          : undefined,
    });
  },
});
