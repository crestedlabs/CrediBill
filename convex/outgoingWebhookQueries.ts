import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Get a webhook log by ID
 */
export const getWebhookLog = internalQuery({
  args: { webhookLogId: v.id("outgoingWebhookLogs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.webhookLogId);
  },
});

/**
 * Get webhook configuration
 */
export const getWebhookConfig = internalQuery({
  args: { webhookId: v.id("webhooks") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.webhookId);
  },
});

/**
 * Get all active webhooks for an app that are subscribed to a specific event
 */
export const getActiveWebhooks = internalQuery({
  args: {
    appId: v.id("apps"),
    event: v.string(),
  },
  handler: async (ctx, args) => {
    const allWebhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    // Filter webhooks that are subscribed to this event
    return allWebhooks.filter((webhook) => webhook.events.includes(args.event));
  },
});

/**
 * Get pending webhook retries
 */
export const getPendingRetries = internalQuery({
  args: {
    now: v.number(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 100;

    return await ctx.db
      .query("outgoingWebhookLogs")
      .withIndex("by_next_retry")
      .filter((q) =>
        q.and(
          q.neq(q.field("nextRetryAt"), undefined),
          q.lte(q.field("nextRetryAt"), args.now),
          q.eq(q.field("status"), "retrying")
        )
      )
      .take(limit);
  },
});

/**
 * Get webhook delivery statistics for an app
 */
export const getWebhookStats = internalQuery({
  args: {
    appId: v.id("apps"),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const since = args.since || Date.now() - 24 * 60 * 60 * 1000; // Last 24 hours by default

    const logs = await ctx.db
      .query("outgoingWebhookLogs")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .filter((q) => q.gte(q.field("createdAt"), since))
      .collect();

    return {
      total: logs.length,
      delivered: logs.filter((l) => l.status === "delivered").length,
      failed: logs.filter((l) => l.status === "failed").length,
      pending: logs.filter((l) => l.status === "pending").length,
      retrying: logs.filter((l) => l.status === "retrying").length,
    };
  },
});

/**
 * Get recent webhook deliveries for debugging
 */
export const getRecentWebhooks = internalQuery({
  args: {
    appId: v.id("apps"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    return await ctx.db
      .query("outgoingWebhookLogs")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .order("desc")
      .take(limit);
  },
});
