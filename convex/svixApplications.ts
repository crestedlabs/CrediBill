"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import {
  createSvixApplication,
  deleteSvixApplication,
  getSvixApplication,
} from "./lib/svix";

// ============================================================================
// INTERNAL MUTATIONS - Moved to svixMutations.ts
// Database mutations cannot be in Node.js files
// ============================================================================

// ============================================================================
// INTERNAL ACTIONS - Svix API Operations
// ============================================================================

/**
 * Create a Svix application for a CrediBill app
 * This should be called when a new CrediBill app is created
 */
export const createSvixApp = internalAction({
  args: {
    appId: v.id("apps"),
    appName: v.string(),
    organizationId: v.id("organizations"),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      console.log(
        `[Svix] Creating Svix application for app ${args.appId} (${args.appName})`,
      );

      // Create Svix application
      const svixApp = await createSvixApplication(
        {
          name: args.appName,
          uid: args.appId, // Use CrediBill app ID as UID for easy lookup
        },
        mode,
      );

      // Store Svix app ID in database
      await ctx.runMutation(internal.svixMutations.storeSvixAppId, {
        appId: args.appId,
        svixAppId: svixApp.id,
      });

      console.log(
        `[Svix] Successfully created Svix app ${svixApp.id} for app ${args.appId}`,
      );

      return {
        success: true,
        svixAppId: svixApp.id,
      };
    } catch (error: any) {
      console.error(
        `[Svix] Failed to create Svix app for ${args.appId}:`,
        error.message,
      );

      // Don't throw - we'll retry later
      // The app creation should succeed even if Svix is down
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Delete a Svix application
 * This should be called when a CrediBill app is deleted
 */
export const deleteSvixApp = internalAction({
  args: {
    appId: v.id("apps"),
    svixAppId: v.string(),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      console.log(
        `[Svix] Deleting Svix application ${args.svixAppId} for app ${args.appId}`,
      );

      // Delete Svix application
      await deleteSvixApplication(args.svixAppId, mode);

      // Clear Svix app ID from database
      await ctx.runMutation(internal.svixMutations.clearSvixAppId, {
        appId: args.appId,
      });

      console.log(`[Svix] Successfully deleted Svix app ${args.svixAppId}`);

      return {
        success: true,
      };
    } catch (error: any) {
      console.error(
        `[Svix] Failed to delete Svix app ${args.svixAppId}:`,
        error.message,
      );

      // Still clear from database even if Svix deletion fails
      // (app might already be deleted in Svix)
      await ctx.runMutation(internal.svixMutations.clearSvixAppId, {
        appId: args.appId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Get Svix application details
 * Useful for debugging and verification
 */
export const getSvixApp = internalAction({
  args: {
    svixAppId: v.string(),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      const svixApp = await getSvixApplication(args.svixAppId, mode);

      if (!svixApp) {
        return {
          success: false,
          error: "Svix application not found",
        };
      }

      return {
        success: true,
        app: svixApp,
      };
    } catch (error: any) {
      console.error(
        `[Svix] Failed to get Svix app ${args.svixAppId}:`,
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Retry failed Svix application creation
 * This can be called by a cron job or manually to retry apps that failed creation
 */
export const retryFailedSvixAppCreation = internalAction({
  args: {
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; svixAppId?: string; error?: string }> => {
    try {
      // Get the app details
      const app = await ctx.runQuery(internal.svixMutations.getAppForRetry, {
        appId: args.appId,
      });

      if (!app) {
        console.error(`[Svix] App ${args.appId} not found for retry`);
        return {
          success: false,
          error: "App not found",
        };
      }

      // Check if Svix app already exists
      if (app.svixAppId) {
        console.log(
          `[Svix] App ${args.appId} already has Svix app ${app.svixAppId}`,
        );
        return {
          success: true,
          svixAppId: app.svixAppId,
        };
      }

      // Retry creation
      console.log(`[Svix] Retrying Svix app creation for ${args.appId}`);

      const result = await ctx.runAction(
        internal.svixApplications.createSvixApp,
        {
          appId: args.appId,
          appName: app.name,
          organizationId: app.organizationId,
          mode: app.mode === "test" ? "test" : "live",
        },
      );

      return result;
    } catch (error: any) {
      console.error(
        `[Svix] Failed to retry Svix app creation for ${args.appId}:`,
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Ensure Svix application exists for an app
 * Creates one if it doesn't exist
 */
export const ensureSvixApp = internalAction({
  args: {
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; svixAppId?: string; error?: string }> => {
    try {
      // Get the app details
      const app = await ctx.runQuery(internal.svixMutations.getAppForRetry, {
        appId: args.appId,
      });

      if (!app) {
        return {
          success: false,
          error: "App not found",
        };
      }

      // If Svix app already exists, verify it
      if (app.svixAppId) {
        const verifyResult = await ctx.runAction(
          internal.svixApplications.getSvixApp,
          {
            svixAppId: app.svixAppId,
            mode: app.mode === "test" ? "test" : "live",
          },
        );

        if (verifyResult.success) {
          console.log(`[Svix] Svix app ${app.svixAppId} exists and is valid`);
          return {
            success: true,
            svixAppId: app.svixAppId,
          };
        }

        // Svix app doesn't exist in Svix but we have an ID - clear it
        console.log(
          `[Svix] Svix app ${app.svixAppId} not found in Svix, recreating`,
        );
        await ctx.runMutation(internal.svixMutations.clearSvixAppId, {
          appId: args.appId,
        });
      }

      // Create new Svix app
      const result = await ctx.runAction(
        internal.svixApplications.createSvixApp,
        {
          appId: args.appId,
          appName: app.name,
          organizationId: app.organizationId,
          mode: app.mode === "test" ? "test" : "live",
        },
      );

      return result;
    } catch (error: any) {
      console.error(
        `[Svix] Failed to ensure Svix app for ${args.appId}:`,
        error.message,
      );

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Batch create Svix applications for apps without them
 * Useful for migration or fixing missing Svix apps
 */
export const batchEnsureSvixApps = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;

    console.log(`[Svix] Starting batch Svix app creation (limit: ${limit})`);

    // Get apps without Svix app IDs
    const apps: any[] = await ctx.runQuery(
      internal.svixMutations.getAppsWithoutSvixAppId,
      {
        limit,
      },
    );

    console.log(`[Svix] Found ${apps.length} apps without Svix app IDs`);

    if (apps.length === 0) {
      return {
        success: true,
        processed: 0,
        created: 0,
        failed: 0,
      };
    }

    let created = 0;
    let failed = 0;

    // Process each app
    for (const app of apps) {
      try {
        const result = await ctx.runAction(
          internal.svixApplications.createSvixApp,
          {
            appId: app._id,
            appName: app.name,
            organizationId: app.organizationId,
            mode: app.mode === "test" ? "test" : "live",
          },
        );

        if (result.success) {
          created++;
        } else {
          failed++;
        }

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`[Svix] Error processing app ${app._id}:`, error.message);
        failed++;
      }
    }

    console.log(
      `[Svix] Batch creation complete: ${created} created, ${failed} failed`,
    );

    return {
      success: true,
      processed: apps.length,
      created,
      failed,
    };
  },
});
