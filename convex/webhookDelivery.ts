import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { ConvexError } from "convex/values";

/**
 * Queue a webhook for delivery to client
 */
export const queueWebhook = internalMutation({
  args: {
    appId: v.id("apps"),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Get app to check webhook configuration
    const app = await ctx.db.get(args.appId);
    if (!app || !app.webhookUrl) {
      // No webhook URL configured, skip silently
      return null;
    }

    // Create webhook delivery record
    const deliveryId = await ctx.db.insert("webhookDeliveries", {
      appId: args.appId,
      event: args.event,
      payload: args.payload,
      url: app.webhookUrl,
      status: "pending",
      attempts: 0,
      lastAttemptAt: undefined,
      nextRetryAt: Date.now(), // Send immediately
    });

    // Schedule delivery
    await ctx.scheduler.runAfter(0, internal.webhookDelivery.deliverWebhook, {
      deliveryId,
    });

    return deliveryId;
  },
});

/**
 * Deliver a webhook (called by scheduler)
 */
export const deliverWebhook = internalAction({
  args: {
    deliveryId: v.id("webhookDeliveries"),
  },
  handler: async (ctx, args) => {
    // Get delivery record
    const delivery = await ctx.runQuery(internal.webhookDelivery.getDelivery, {
      deliveryId: args.deliveryId,
    });

    if (!delivery) return;

    // Get app for webhook secret
    const app = await ctx.runQuery(internal.webhookDelivery.getApp, {
      appId: delivery.appId,
    });

    if (!app) return;

    try {
      // Prepare payload with metadata
      const payload = {
        event: delivery.event,
        data: delivery.payload,
        timestamp: Date.now(),
        app_id: delivery.appId,
      };

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "User-Agent": "CrediBill-Webhooks/1.0",
        "X-Webhook-Event": delivery.event,
        "X-Delivery-Attempt": (delivery.attempts + 1).toString(),
      };

      // Generate signature if webhook secret exists
      if (app.webhookSecret) {
        // Simple HMAC signature using native crypto
        const encoder = new TextEncoder();
        const data = encoder.encode(JSON.stringify(payload));
        const key = encoder.encode(app.webhookSecret);

        // Create HMAC-SHA256 signature
        const cryptoKey = await crypto.subtle.importKey(
          "raw",
          key,
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign"]
        );

        const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
        const signatureHex = Array.from(new Uint8Array(signature))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        headers["X-Webhook-Signature"] = signatureHex;
      }

      // Send webhook
      const response = await fetch(delivery.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();

      // Update delivery record
      await ctx.runMutation(internal.webhookDelivery.updateDelivery, {
        deliveryId: args.deliveryId,
        status: response.ok ? "success" : "failed",
        responseStatus: response.status,
        responseBody: responseBody.substring(0, 1000), // Limit size
        attempts: delivery.attempts + 1,
        lastAttemptAt: Date.now(),
        nextRetryAt: undefined,
      });

      // If failed and retries remain, schedule retry
      if (!response.ok && delivery.attempts < 3) {
        const retryDelays = [60000, 300000, 900000]; // 1min, 5min, 15min
        const nextRetryAt = Date.now() + retryDelays[delivery.attempts];

        await ctx.runMutation(internal.webhookDelivery.updateDelivery, {
          deliveryId: args.deliveryId,
          status: "pending",
          nextRetryAt,
        });

        // Schedule retry
        await ctx.scheduler.runAt(
          nextRetryAt,
          internal.webhookDelivery.deliverWebhook,
          {
            deliveryId: args.deliveryId,
          }
        );
      }
    } catch (error: any) {
      // Network error or other failure
      await ctx.runMutation(internal.webhookDelivery.updateDelivery, {
        deliveryId: args.deliveryId,
        status: "failed",
        error: error.message || "Unknown error",
        attempts: delivery.attempts + 1,
        lastAttemptAt: Date.now(),
        nextRetryAt: undefined,
      });

      // Retry on error if retries remain
      if (delivery.attempts < 3) {
        const retryDelays = [60000, 300000, 900000];
        const nextRetryAt = Date.now() + retryDelays[delivery.attempts];

        await ctx.runMutation(internal.webhookDelivery.updateDelivery, {
          deliveryId: args.deliveryId,
          status: "pending",
          nextRetryAt,
        });

        await ctx.scheduler.runAt(
          nextRetryAt,
          internal.webhookDelivery.deliverWebhook,
          {
            deliveryId: args.deliveryId,
          }
        );
      }
    }
  },
});

/**
 * Get delivery record (internal query)
 */
export const getDelivery = internalQuery({
  args: { deliveryId: v.id("webhookDeliveries") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.deliveryId);
  },
});

/**
 * Get app (internal query)
 */
export const getApp = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId);
  },
});

/**
 * Update delivery record (internal mutation)
 */
export const updateDelivery = internalMutation({
  args: {
    deliveryId: v.id("webhookDeliveries"),
    status: v.optional(
      v.union(v.literal("pending"), v.literal("success"), v.literal("failed"))
    ),
    responseStatus: v.optional(v.number()),
    responseBody: v.optional(v.string()),
    error: v.optional(v.string()),
    attempts: v.optional(v.number()),
    lastAttemptAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { deliveryId, ...updates } = args;
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, v]) => v !== undefined)
    );
    await ctx.db.patch(deliveryId, cleanUpdates);
  },
});

/**
 * List webhook deliveries for an app (for admin dashboard)
 */
export const listWebhookDeliveries = query({
  args: {
    appId: v.id("apps"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Verify user has access to the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new ConvexError("App not found");

    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    // Get deliveries
    const deliveries = await ctx.db
      .query("webhookDeliveries")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .order("desc")
      .take(args.limit || 50);

    return deliveries;
  },
});
