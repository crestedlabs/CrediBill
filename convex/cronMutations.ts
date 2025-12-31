/**
 * Cron Mutation Helpers
 *
 * Internal mutations used by cron jobs to update data
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mark a subscription trial as expired
 * Transitions to pending_payment status, waiting for first payment
 */
export const markTrialExpired = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) return;

    // Transition to pending_payment (awaiting first payment)
    // Set currentPeriodEnd to now so grace period calculation works correctly
    // Grace period enforcement will move to past_due if no payment within grace period
    const now = Date.now();
    await ctx.db.patch(args.subscriptionId, {
      status: "pending_payment",
      currentPeriodEnd: now, // Grace period starts from now (trial end)
      nextPaymentDate: now, // Payment due immediately
    });
  },
});

/**
 * Mark a transaction as expired
 */
export const markTransactionExpired = internalMutation({
  args: { transactionId: v.id("paymentTransactions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "failed",
      failureReason: "Transaction expired",
      failureCode: "EXPIRED",
      completedAt: Date.now(),
    });
  },
});

/**
 * Mark a subscription as past_due (grace period expired)
 */
export const markSubscriptionPastDue = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) return;

    // Only transition if status is active or pending_payment
    if (
      subscription.status === "active" ||
      subscription.status === "pending_payment"
    ) {
      await ctx.db.patch(args.subscriptionId, {
        status: "past_due",
      });
    }
  },
});

/**
 * Cancel subscription at period end
 * Called when scheduled cancellation date is reached
 */
export const cancelSubscriptionAtPeriodEnd = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) return;

    // Cancel the subscription
    await ctx.db.patch(args.subscriptionId, {
      status: "cancelled",
      cancelAtPeriodEnd: false,
    });
  },
});
