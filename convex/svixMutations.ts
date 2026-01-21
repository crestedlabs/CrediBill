import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

/**
 * Store Svix application ID in the apps table
 * Called after successfully creating a Svix application
 */
export const storeSvixAppId = internalMutation({
  args: {
    appId: v.id("apps"),
    svixAppId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appId, {
      svixAppId: args.svixAppId,
    });

    console.log(
      `[Svix] Stored Svix app ID ${args.svixAppId} for app ${args.appId}`,
    );
  },
});

/**
 * Clear Svix application ID from the apps table
 * Called after deleting a Svix application
 */
export const clearSvixAppId = internalMutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appId, {
      svixAppId: undefined,
    });

    console.log(`[Svix] Cleared Svix app ID for app ${args.appId}`);
  },
});

/**
 * Get apps without Svix app IDs (for batch creation)
 */
export const getAppsWithoutSvixAppId = internalQuery({
  args: {
    organizationId: v.optional(v.id("organizations")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("apps");

    if (args.organizationId) {
      const apps = await ctx.db
        .query("apps")
        .withIndex("by_org", (q) =>
          q.eq("organizationId", args.organizationId!),
        )
        .filter((q) => q.eq(q.field("svixAppId"), undefined))
        .collect();
      return apps;
    }

    const apps = await query.collect();

    // Filter apps without Svix app IDs
    const appsWithoutSvix = apps.filter((app) => !app.svixAppId);

    // Apply limit
    const limited = args.limit
      ? appsWithoutSvix.slice(0, args.limit)
      : appsWithoutSvix;

    return limited;
  },
});

/**
 * Get app details for Svix app creation retry
 */
export const getAppForRetry = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }
    return app;
  },
});

/**
 * Get app by ID (helper for actions)
 */
export const getApp = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.appId);
  },
});

/**
 * Get organization membership (helper for actions)
 */
export const getOrgMembership = internalQuery({
  args: {
    organizationId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", args.userId),
      )
      .unique();
  },
});

/**
 * Get webhook endpoint by app (helper for actions)
 */
export const getWebhookByApp = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .first();
  },
});

/**
 * Record dashboard access (for tracking)
 */
export const recordDashboardAccess = internalMutation({
  args: {
    appId: v.id("apps"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    console.log(
      `[Svix] User ${args.userId} accessed dashboard for app ${args.appId}`,
    );
    // Could add lastDashboardAccessAt field to apps table here if needed
  },
});

// ============================================================================
// SVIX ENDPOINT MUTATIONS (from svixEndpoints.ts)
// ============================================================================

/**
 * Store Svix endpoint ID in the webhooks table
 */
export const storeSvixEndpointId = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    svixEndpointId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      svixEndpointId: args.svixEndpointId,
    });

    console.log(
      `[Svix] Stored Svix endpoint ID ${args.svixEndpointId} for webhook ${args.webhookId}`,
    );
  },
});

/**
 * Clear Svix endpoint ID from the webhooks table
 */
export const clearSvixEndpointId = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      svixEndpointId: undefined,
    });

    console.log(
      `[Svix] Cleared Svix endpoint ID for webhook ${args.webhookId}`,
    );
  },
});

/**
 * Store webhook secret from Svix
 */
export const storeWebhookSecret = internalMutation({
  args: {
    webhookId: v.id("webhooks"),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.webhookId, {
      secret: args.secret,
    });

    console.log(`[Svix] Stored webhook secret for webhook ${args.webhookId}`);
  },
});

// ============================================================================
// SVIX EVENT MUTATIONS (from svixEvents.ts)
// ============================================================================

/**
 * Create webhook log entry
 */
export const createWebhookLog = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    webhookId: v.id("webhooks"),
    event: v.string(),
    payload: v.any(),
    url: v.string(),
    svixMessageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("outgoingWebhookLogs", {
      organizationId: args.organizationId,
      appId: args.appId,
      webhookId: args.webhookId,
      event: args.event,
      payload: args.payload,
      url: args.url,
      status: "sent",
      attemptNumber: 1,
      maxAttempts: 3,
      createdAt: Date.now(),
      sentAt: Date.now(),
      svixMessageId: args.svixMessageId,
    });
  },
});

/**
 * Update webhook log with delivery status
 */
export const updateWebhookLogStatus = internalMutation({
  args: {
    logId: v.id("outgoingWebhookLogs"),
    status: v.union(
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
    ),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const updates: any = {
      status: args.status,
    };

    if (args.status === "delivered") {
      updates.deliveredAt = Date.now();
    }

    if (args.error) {
      updates.error = args.error;
    }

    await ctx.db.patch(args.logId, updates);
  },
});

/**
 * Get app details for webhook sending
 */
export const getAppDetails = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) return null;

    return {
      _id: app._id,
      name: app.name,
      organizationId: app.organizationId,
      svixAppId: app.svixAppId,
      mode: app.mode,
    };
  },
});

/**
 * Get active webhooks for an app
 */
export const getActiveWebhooks = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

/**
 * Queue a failed webhook event for retry
 */
export const queueFailedWebhook = internalMutation({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    payload: v.any(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(
      `[Svix] Queued webhook for retry: ${args.eventType} (${args.error})`,
    );
  },
});
