import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";

// Helper function to get all event types
function getAllEventTypes(): string[] {
  return [
    "subscription.created",
    "subscription.updated",
    "subscription.activated",
    "subscription.past_due",
    "subscription.canceled",
    "subscription.trial_started",
    "subscription.trial_ended",
    "invoice.created",
    "invoice.paid",
    "invoice.payment_failed",
    "invoice.voided",
    "customer.created",
    "customer.updated",
    "payment.succeeded",
    "payment.failed",
    "plan.created",
    "plan.updated",
    "usage.reported",
  ];
}

// ============================================================================
// PUBLIC MUTATIONS - User-Facing Operations
// ============================================================================

/**
 * Configure webhook endpoint (create or update)
 * This is the main function users call to set up their webhooks
 */
export const configureWebhookEndpoint = mutation({
  args: {
    appId: v.id("apps"),
    url: v.string(),
    events: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization",
      );
    }

    // Validate URL
    if (!args.url.startsWith("https://")) {
      throw new Error("Webhook URL must use HTTPS for security");
    }

    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid webhook URL format");
    }

    // Default to all events if none specified
    const events =
      args.events && args.events.length > 0 ? args.events : getAllEventTypes();

    // Check if webhook already exists for this app
    const existingWebhook = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .first();

    if (existingWebhook) {
      // Update existing webhook
      await ctx.db.patch(existingWebhook._id, {
        url: args.url,
        events,
        description: args.description,
        status: "active",
      });

      // Update Svix endpoint if it exists
      if (app.svixAppId && existingWebhook.svixEndpointId) {
        ctx.scheduler.runAfter(
          0,
          internal.svixEndpoints.updateSvixWebhookEndpoint,
          {
            webhookId: existingWebhook._id,
            svixAppId: app.svixAppId,
            svixEndpointId: existingWebhook.svixEndpointId,
            url: args.url,
            events,
            description: args.description,
            mode: app.mode === "test" ? "test" : "live",
          },
        );
      } else if (app.svixAppId && !existingWebhook.svixEndpointId) {
        // Svix app exists but no endpoint - create one
        ctx.scheduler.runAfter(
          0,
          internal.svixEndpoints.createSvixWebhookEndpoint,
          {
            webhookId: existingWebhook._id,
            appId: args.appId,
            svixAppId: app.svixAppId,
            url: args.url,
            events,
            description: args.description,
            mode: app.mode === "test" ? "test" : "live",
          },
        );
      }

      return {
        success: true,
        webhookId: existingWebhook._id,
        message: "Webhook configuration updated successfully",
        secret: existingWebhook.secret,
      };
    } else {
      // Create new webhook
      const webhookId = await ctx.db.insert("webhooks", {
        organizationId: app.organizationId,
        appId: args.appId,
        url: args.url,
        events,
        status: "active",
        description: args.description,
      });

      // Ensure Svix app exists first, then create endpoint
      if (!app.svixAppId) {
        // Trigger Svix app creation and endpoint creation in sequence
        ctx.scheduler.runAfter(0, internal.svixApplications.ensureSvixApp, {
          appId: args.appId,
        });
        // Endpoint creation will be handled separately after app is ready
      } else {
        // Svix app exists, create endpoint immediately
        ctx.scheduler.runAfter(
          0,
          internal.svixEndpoints.createSvixWebhookEndpoint,
          {
            webhookId,
            appId: args.appId,
            svixAppId: app.svixAppId,
            url: args.url,
            events,
            description: args.description,
            mode: app.mode === "test" ? "test" : "live",
          },
        );
      }

      return {
        success: true,
        webhookId,
        message:
          "Webhook configured successfully. Your webhook secret will be available shortly.",
      };
    }
  },
});

/**
 * Remove webhook endpoint
 */
export const removeWebhookEndpoint = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization",
      );
    }

    // Get existing webhook
    const webhook = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .first();

    if (!webhook) {
      return {
        success: true,
        message: "No webhook configured",
      };
    }

    // Delete Svix endpoint if it exists
    if (app.svixAppId && webhook.svixEndpointId) {
      ctx.scheduler.runAfter(
        0,
        internal.svixEndpoints.deleteSvixWebhookEndpoint,
        {
          webhookId: webhook._id,
          svixAppId: app.svixAppId,
          svixEndpointId: webhook.svixEndpointId,
          mode: app.mode === "test" ? "test" : "live",
        },
      );
    }

    // Delete webhook from database
    await ctx.db.delete(webhook._id);

    return {
      success: true,
      message: "Webhook endpoint removed successfully",
    };
  },
});

/**
 * Toggle webhook endpoint (enable/disable)
 */
export const toggleWebhookEndpoint = mutation({
  args: {
    appId: v.id("apps"),
    disabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      throw new Error("Access denied");
    }

    // Get webhook
    const webhook = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .first();

    if (!webhook) {
      throw new Error("No webhook configured");
    }

    // Update status in database
    await ctx.db.patch(webhook._id, {
      status: args.disabled ? "inactive" : "active",
    });

    // Toggle in Svix if endpoint exists
    if (app.svixAppId && webhook.svixEndpointId) {
      ctx.scheduler.runAfter(
        0,
        internal.svixEndpoints.toggleSvixWebhookEndpoint,
        {
          svixAppId: app.svixAppId,
          svixEndpointId: webhook.svixEndpointId,
          disabled: args.disabled,
          mode: app.mode === "test" ? "test" : "live",
        },
      );
    }

    return {
      success: true,
      message: args.disabled ? "Webhook disabled" : "Webhook enabled",
    };
  },
});

// ============================================================================
// PUBLIC QUERIES
// ============================================================================

/**
 * Get webhook configuration for an app
 */
export const getWebhookConfig = query({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id),
      )
      .unique();

    if (!membership) {
      throw new Error("Access denied");
    }

    // Get webhook
    const webhook = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .first();

    if (!webhook) {
      return {
        configured: false,
        availableEvents: getAllEventTypes(),
      };
    }

    return {
      configured: true,
      webhook: {
        _id: webhook._id,
        url: webhook.url,
        events: webhook.events,
        status: webhook.status,
        secret: webhook.secret,
        description: webhook.description,
        hasSvixEndpoint: !!webhook.svixEndpointId,
      },
      availableEvents: getAllEventTypes(),
    };
  },
});

/**
 * Get available event types
 */
export const getAvailableEventTypes = query({
  handler: async () => {
    return {
      events: getAllEventTypes(),
      categories: [
        "subscription",
        "invoice",
        "customer",
        "payment",
        "plan",
        "usage",
      ],
    };
  },
});
