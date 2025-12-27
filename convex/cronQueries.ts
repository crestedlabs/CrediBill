/**
 * Cron Query Helpers
 *
 * Internal queries used by cron jobs to find data that needs processing
 */

import { internalQuery } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get subscriptions with expired trials
 */
export const getExpiredTrials = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find active subscriptions in trial status whose trial has ended
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "trial"),
          q.lt(q.field("trialEndsAt"), args.now)
        )
      )
      .collect();

    return subscriptions;
  },
});

/**
 * Get subscriptions due for payment
 */
export const getDueSubscriptions = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find active subscriptions whose next payment date has arrived
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("nextPaymentDate"), args.now)
        )
      )
      .collect();

    return subscriptions;
  },
});

/**
 * Get failed transactions eligible for retry
 */
export const getRetryableTransactions = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find failed transactions from the last 7 days
    const sevenDaysAgo = args.now - 7 * 24 * 60 * 60 * 1000;

    const transactions = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .filter((q) =>
        q.and(
          q.gte(q.field("initiatedAt"), sevenDaysAgo),
          q.lt(q.field("attemptNumber"), 3) // Max 3 attempts
        )
      )
      .collect();

    return transactions;
  },
});

/**
 * Get expired pending transactions
 */
export const getExpiredTransactions = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find pending/initiated transactions that have expired
    const pendingTransactions = await ctx.db
      .query("paymentTransactions")
      .filter((q) =>
        q.and(
          q.or(
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "initiated")
          ),
          q.lt(q.field("expiresAt"), args.now)
        )
      )
      .collect();

    return pendingTransactions;
  },
});
