"use node";

import { v } from "convex/values";
import { action, mutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { generateDashboardAccess } from "./lib/svix";

// ============================================================================
// PUBLIC ACTIONS - Dashboard Access
// ============================================================================

/**
 * Generate a Svix dashboard access URL
 * This allows customers to view their webhook logs, deliveries, and debug issues
 * The URL is time-limited (expires after 1 hour by default)
 */
export const generateWebhookDashboard = action({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.runQuery(internal.svixMutations.getApp, {
      appId: args.appId,
    });

    if (!app) throw new Error("App not found");

    // Verify user has access to this organization
    const membership = await ctx.runQuery(
      internal.svixMutations.getOrgMembership,
      {
        organizationId: app.organizationId,
        userId: user._id,
      },
    );

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization",
      );
    }

    // Check if Svix app exists
    if (!app.svixAppId) {
      throw new Error(
        "Svix application not configured. Please configure webhooks first.",
      );
    }

    try {
      const mode = app.mode === "test" ? "test" : "live";

      // Generate dashboard access URL
      const dashboard = await generateDashboardAccess(app.svixAppId, mode);

      return {
        success: true,
        url: dashboard.url,
        expiresIn: 3600, // 1 hour in seconds
        message: "Dashboard access granted. This link will expire in 1 hour.",
      };
    } catch (error: any) {
      console.error(
        `[Svix] Failed to generate dashboard access:`,
        error.message,
      );

      throw new Error(`Failed to generate dashboard access: ${error.message}`);
    }
  },
});

/**
 * Check if dashboard access is available for an app
 * Returns information about whether the app can access the dashboard
 */
export const checkDashboardAvailability = action({
  args: {
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    available: boolean;
    hasSvixApp: boolean;
    hasWebhook: boolean;
    hasSvixEndpoint: boolean;
    message: string;
  }> => {
    const user = await ctx.runQuery(internal.users.getCurrentUserInternal);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.runQuery(internal.svixMutations.getApp, {
      appId: args.appId,
    });

    if (!app) throw new Error("App not found");

    // Verify user has access
    const membership = await ctx.runQuery(
      internal.svixMutations.getOrgMembership,
      {
        organizationId: app.organizationId,
        userId: user._id,
      },
    );

    if (!membership) {
      throw new Error("Access denied");
    }

    const hasSvixApp = !!app.svixAppId;

    // Get webhook configuration
    const webhook = await ctx.runQuery(internal.svixMutations.getWebhookByApp, {
      appId: args.appId,
    });

    const hasWebhook = !!webhook;
    const hasSvixEndpoint = !!(webhook && webhook.svixEndpointId);

    return {
      available: hasSvixApp && hasWebhook,
      hasSvixApp,
      hasWebhook,
      hasSvixEndpoint,
      message: !hasSvixApp
        ? "Svix application not configured"
        : !hasWebhook
          ? "No webhook configured. Please add a webhook URL first."
          : hasSvixEndpoint
            ? "Dashboard available"
            : "Webhook configured, Svix endpoint being created",
    };
  },
});
