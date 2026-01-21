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
      v.literal("clerk"),
    ),
    event: v.string(),
    payload: v.any(),
    status: v.union(
      v.literal("received"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("ignored"),
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
      v.literal("refunded"),
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
        `Transaction ${args.transactionId} is already in terminal state ${transaction.status}, ignoring update to ${args.status}`,
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

            // CRITICAL: Billing period STARTS when first payment is received
            // For BOTH trialing -> active AND pending_payment -> active:
            // Set billing period dates from payment timestamp (when we actually receive money)
            if (plan?.interval !== "one-time") {
              updateData.startDate = now; // Subscription starts when payment received
              updateData.currentPeriodStart = now; // Current billing period starts now
              updateData.currentPeriodEnd = now + periodDuration; // Period ends and payment due
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
                },
              );
            }
          } else if (subscription.status === "active") {
            // Renewal payment for already active subscription
            // New period starts from payment date - service resumes when payment is received
            const plan = await ctx.db.get(subscription.planId);
            if (plan && plan.interval !== "one-time") {
              let periodDuration: number;
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
                default:
                  periodDuration = 30 * 24 * 60 * 60 * 1000;
              }

              await ctx.db.patch(transaction.subscriptionId, {
                lastPaymentDate: now,
                failedPaymentAttempts: 0,
                currentPeriodStart: now,
                currentPeriodEnd: now + periodDuration,
              });

              // Send subscription.renewed webhook
              const customer = await ctx.db.get(subscription.customerId);
              if (customer) {
                await ctx.scheduler.runAfter(
                  0,
                  internal.webhookDelivery.queueWebhook,
                  {
                    appId: subscription.appId,
                    event: "subscription.renewed",
                    payload: {
                      subscription: {
                        ...subscription,
                        currentPeriodStart: now,
                        currentPeriodEnd: now + periodDuration,
                        nextPaymentDate: now + periodDuration,
                      },
                      customer,
                      payment_date: now,
                    },
                  },
                );
              }
            } else {
              // Just update payment date for one-time plans
              await ctx.db.patch(transaction.subscriptionId, {
                lastPaymentDate: now,
                failedPaymentAttempts: 0,
              });
            }
          }
        }
      }
    }

    // If failed and this is a subscription payment, increment failure count
    // SECURITY: Only process failures if invoice is NOT already paid (immutability)
    if (args.status === "failed" && transaction.subscriptionId) {
      // Check if invoice is already paid - if so, ignore failure
      if (transaction.invoiceId) {
        const invoice = await ctx.db.get(transaction.invoiceId);
        if (invoice && invoice.status === "paid") {
          console.warn(
            `[SECURITY] Ignoring failed payment update for already-paid invoice ${transaction.invoiceId}. Transaction updated but subscription not affected.`,
          );
          return; // Exit early - don't increment failures
        }
      }

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
            transaction.subscriptionId,
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
              },
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
      v.literal("refunded"),
    ),
    amount: v.number(),
    currency: v.string(),
    providerResponse: v.optional(v.any()),
    metadata: v.optional(v.any()),
    customerId: v.optional(v.id("customers")),
    subscriptionId: v.optional(v.id("subscriptions")),
    invoiceId: v.optional(v.id("invoices")),
    failureCode: v.optional(v.string()),
    failureReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the provider catalog ID for this app
    const app = await ctx.db.get(args.appId);
    if (!app || !app.paymentProviderId) {
      throw new Error("App not found or payment provider not configured");
    }

    // Check if invoice is already paid (prevent double payment)
    if (args.invoiceId && args.status === "success") {
      const invoice = await ctx.db.get(args.invoiceId);
      if (invoice && invoice.status === "paid") {
        console.warn(
          `Invoice ${args.invoiceId} already paid. Recording transaction but skipping activation.`,
        );
        // Still record the transaction but don't activate subscription
        const transactionId = await ctx.db.insert("paymentTransactions", {
          organizationId: args.organizationId,
          appId: args.appId,
          customerId: args.customerId!,
          providerCatalogId: app.paymentProviderId,
          providerTransactionId: args.providerTransactionId,
          providerReference: args.providerTransactionId,
          subscriptionId: args.subscriptionId,
          invoiceId: args.invoiceId,
          amount: args.amount,
          currency: args.currency,
          paymentMethod: "other",
          status: args.status,
          attemptNumber: 1,
          isRetry: false,
          providerResponse: args.providerResponse,
          metadata: {
            ...args.metadata,
            note: "Invoice already paid - duplicate payment",
          },
          initiatedAt: Date.now(),
          completedAt: Date.now(),
        });
        return transactionId;
      }
    }

    const transactionId = await ctx.db.insert("paymentTransactions", {
      organizationId: args.organizationId,
      appId: args.appId,
      customerId: args.customerId!,
      providerCatalogId: app.paymentProviderId,
      providerTransactionId: args.providerTransactionId,
      providerReference: args.providerTransactionId,
      subscriptionId: args.subscriptionId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      currency: args.currency,
      paymentMethod: "other",
      status: args.status,
      attemptNumber: 1,
      isRetry: false,
      providerResponse: args.providerResponse,
      metadata: args.metadata,
      failureCode: args.failureCode,
      failureReason: args.failureReason,
      initiatedAt: Date.now(),
      completedAt:
        args.status === "success" || args.status === "failed"
          ? Date.now()
          : undefined,
    });

    // If successful payment, handle invoice and subscription updates
    if (args.status === "success") {
      // Mark invoice as paid
      if (args.invoiceId) {
        const invoice = await ctx.db.get(args.invoiceId);
        if (invoice && invoice.status !== "paid") {
          await ctx.db.patch(args.invoiceId, {
            status: "paid",
            amountPaid: args.amount,
          });
        }
      }

      // Activate subscription if it's trialing or pending first payment
      if (args.subscriptionId) {
        const subscription = await ctx.db.get(args.subscriptionId);
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
              periodDuration = 30 * 24 * 60 * 60 * 1000;
            }

            const updateData: any = {
              status: "active",
              lastPaymentDate: now,
              failedPaymentAttempts: 0,
            };

            // For first payment (trialing or pending_payment), activate subscription and set billing period
            // This converts trialing/pending_payment → active with billing dates
            if (
              (subscription.status === "pending_payment" ||
                subscription.status === "trialing") &&
              plan?.interval !== "one-time"
            ) {
              updateData.status = "active"; // Activate subscription on first payment
              updateData.startDate = now; // Customer since date (first payment)
              updateData.currentPeriodStart = now; // Billing period starts now
              updateData.currentPeriodEnd = now + periodDuration; // Period ends and payment due
            }

            await ctx.db.patch(args.subscriptionId, updateData);

            // Send subscription.activated webhook
            const customer = await ctx.db.get(subscription.customerId);
            if (customer) {
              await ctx.scheduler.runAfter(
                0,
                internal.webhookDelivery.queueWebhook,
                {
                  appId: args.appId,
                  event: "subscription.activated",
                  payload: {
                    subscription: {
                      ...subscription,
                      ...updateData,
                    },
                    customer,
                    first_payment: subscription.status === "pending_payment",
                  },
                },
              );
            }
          } else if (subscription.status === "active") {
            // Renewal payment - extend the billing period
            const plan = await ctx.db.get(subscription.planId);
            if (plan && plan.interval !== "one-time") {
              let periodDuration: number;
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
                default:
                  periodDuration = 30 * 24 * 60 * 60 * 1000;
              }

              await ctx.db.patch(args.subscriptionId, {
                lastPaymentDate: now,
                failedPaymentAttempts: 0,
                currentPeriodStart: now,
                currentPeriodEnd: now + periodDuration,
              });

              // Send subscription.renewed webhook
              const customer = await ctx.db.get(subscription.customerId);
              if (customer) {
                await ctx.scheduler.runAfter(
                  0,
                  internal.webhookDelivery.queueWebhook,
                  {
                    appId: args.appId,
                    event: "subscription.renewed",
                    payload: {
                      subscription: {
                        ...subscription,
                        currentPeriodStart: now,
                        currentPeriodEnd: now + periodDuration,
                        nextPaymentDate: now + periodDuration,
                      },
                      customer,
                      payment_date: now,
                    },
                  },
                );
              }
            } else {
              // Just update payment date for one-time plans
              await ctx.db.patch(args.subscriptionId, {
                lastPaymentDate: now,
                failedPaymentAttempts: 0,
              });
            }
          }
        }
      }
    }

    // Handle failed payment - increment failure count on subscription
    // SECURITY: Only process failures if invoice is NOT already paid (immutability)
    if (args.status === "failed" && args.subscriptionId) {
      // Check if invoice is already paid - if so, ignore failure
      if (args.invoiceId) {
        const invoice = await ctx.db.get(args.invoiceId);
        if (invoice && invoice.status === "paid") {
          console.warn(
            `[SECURITY] Ignoring failed payment for already-paid invoice ${args.invoiceId}. Transaction recorded but subscription not affected.`,
          );
          return transactionId; // Exit early - don't increment failures
        }
      }

      const subscription = await ctx.db.get(args.subscriptionId);
      if (subscription) {
        const failureCount = (subscription.failedPaymentAttempts || 0) + 1;
        await ctx.db.patch(args.subscriptionId, {
          failedPaymentAttempts: failureCount,
        });

        // If too many failures and subscription is active, mark as past_due
        if (failureCount >= 3 && subscription.status === "active") {
          await ctx.db.patch(args.subscriptionId, {
            status: "past_due",
          });

          // Send subscription.past_due webhook
          const customer = await ctx.db.get(subscription.customerId);
          if (customer) {
            await ctx.scheduler.runAfter(
              0,
              internal.webhookDelivery.queueWebhook,
              {
                appId: args.appId,
                event: "subscription.past_due",
                payload: {
                  subscription: { ...subscription, status: "past_due" },
                  customer,
                  failed_attempts: failureCount,
                  last_failure_reason: args.failureReason || "Payment failed",
                },
              },
            );
          }
        }
      }
    }

    return transactionId;
  },
});
