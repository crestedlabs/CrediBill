/**
 * Cron Mutation Helpers
 *
 * Internal mutations used by cron jobs to update data
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mark a subscription trial as expired
 */
export const markTrialExpired = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) return;
    
    // Mark trial as expired - subscription becomes past_due awaiting payment
    await ctx.db.patch(args.subscriptionId, {
      status: "past_due", // Past due - awaiting payment from client
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
