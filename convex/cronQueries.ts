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
          q.eq(q.field("status"), "trialing"),
          q.lt(q.field("trialEndsAt"), args.now),
        ),
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
    // Find active subscriptions whose current period has ended (payment due)
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lte(q.field("currentPeriodEnd"), args.now),
        ),
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
          q.lt(q.field("attemptNumber"), 3), // Max 3 attempts
        ),
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
            q.eq(q.field("status"), "initiated"),
          ),
          q.lt(q.field("expiresAt"), args.now),
        ),
      )
      .collect();

    return pendingTransactions;
  },
});

/**
 * Get subscriptions past their grace period
 * Finds subscriptions where period ended + grace period has passed
 */
export const getGracePeriodExpiredSubscriptions = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find subscriptions where period ended + grace period has passed
    // Status is active or pending_payment (not yet marked past_due)
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "pending_payment"),
        ),
      )
      .collect();

    // Filter subscriptions where grace period has expired
    const expiredSubscriptions = [];
    for (const sub of subscriptions) {
      // Skip subscriptions without currentPeriodEnd (awaiting first payment)
      if (!sub.currentPeriodEnd) {
        continue; // No period end = no grace period to check
      }

      const app = await ctx.db.get(sub.appId);
      if (!app) {
        console.error(
          `[Cron] App ${sub.appId} not found for subscription ${sub._id}`,
        );
        continue;
      }
      if (app.gracePeriod === undefined) {
        console.error(`[Cron] App ${app._id} missing gracePeriod setting`);
        continue;
      }

      const gracePeriodMs = app.gracePeriod * 24 * 60 * 60 * 1000;
      const graceDeadline = sub.currentPeriodEnd + gracePeriodMs;

      if (args.now > graceDeadline) {
        expiredSubscriptions.push({ ...sub, graceDeadline, gracePeriodMs });
      }
    }

    return expiredSubscriptions;
  },
});

/**
 * Get subscriptions needing invoices
 * Finds subscriptions past their period end without invoices for current period
 */
export const getSubscriptionsNeedingInvoices = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find active subscriptions past their period end
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "trialing"),
        ),
      )
      .collect();

    // Filter for subscriptions with currentPeriodEnd and past their period end
    const pastPeriodEnd = subscriptions.filter(
      (sub) => sub.currentPeriodEnd && sub.currentPeriodEnd <= args.now,
    );

    // Check if invoice already exists for this period
    const subscriptionsNeedingInvoices = [];
    for (const sub of pastPeriodEnd) {
      const existingInvoice = await ctx.db
        .query("invoices")
        .withIndex("by_subscription", (q) => q.eq("subscriptionId", sub._id))
        .filter((q) =>
          q.and(
            q.eq(q.field("periodStart"), sub.currentPeriodStart),
            q.eq(q.field("periodEnd"), sub.currentPeriodEnd),
          ),
        )
        .first();

      if (!existingInvoice) {
        subscriptionsNeedingInvoices.push(sub);
      }
    }

    return subscriptionsNeedingInvoices;
  },
});

/**
 * Get subscriptions scheduled for cancellation at period end
 * Finds subscriptions with cancelAtPeriodEnd=true where period has ended
 */
export const getScheduledCancellations = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args) => {
    // Find subscriptions scheduled for cancellation
    const subscriptions = await ctx.db
      .query("subscriptions")
      .filter((q) =>
        q.and(
          q.eq(q.field("cancelAtPeriodEnd"), true),
          q.or(
            q.eq(q.field("status"), "active"),
            q.eq(q.field("status"), "trialing"),
            q.eq(q.field("status"), "pending_payment"),
            q.eq(q.field("status"), "paused"),
          ),
        ),
      )
      .collect();

    // Filter by those past their period end (skip if no currentPeriodEnd)
    return subscriptions.filter(
      (sub) => sub.currentPeriodEnd && args.now >= sub.currentPeriodEnd,
    );
  },
});
