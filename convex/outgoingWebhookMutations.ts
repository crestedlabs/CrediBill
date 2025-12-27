import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Create a new webhook log entry
 */
export const createWebhookLog = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    webhookId: v.id("webhooks"),
    event: v.string(),
    payload: v.any(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("outgoingWebhookLogs", {
      organizationId: args.organizationId,
      appId: args.appId,
      webhookId: args.webhookId,
      event: args.event,
      payload: args.payload,
      url: args.url,
      status: "pending",
      attemptNumber: 1,
      maxAttempts: 3,
      createdAt: Date.now(),
    });
  },
});

/**
 * Update webhook log with delivery details
 */
export const updateWebhookLog = internalMutation({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("retrying")
    ),
    httpStatus: v.optional(v.number()),
    response: v.optional(v.any()),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { webhookLogId, ...updates } = args;
    await ctx.db.patch(webhookLogId, updates);
  },
});

/**
 * Increment webhook attempt number
 */
export const incrementWebhookAttempt = internalMutation({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
  },
  handler: async (ctx, args) => {
    const log = await ctx.db.get(args.webhookLogId);
    if (!log) {
      throw new Error(`Webhook log ${args.webhookLogId} not found`);
    }

    await ctx.db.patch(args.webhookLogId, {
      attemptNumber: log.attemptNumber + 1,
      status: "retrying",
    });
  },
});

/**
 * Schedule a webhook retry
 */
export const scheduleRetry = internalMutation({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
    delayMs: v.number(),
  },
  handler: async (ctx, args) => {
    const nextRetryAt = Date.now() + args.delayMs;

    await ctx.db.patch(args.webhookLogId, {
      status: "retrying",
      nextRetryAt,
    });
  },
});

/**
 * Mark webhook as permanently failed (max retries reached)
 */
export const markWebhookFailed = internalMutation({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookLogId, {
      status: "failed",
      nextRetryAt: undefined,
    });
  },
});
