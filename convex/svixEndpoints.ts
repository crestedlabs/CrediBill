"use node";

import { v } from "convex/values";
import {
  internalMutation,
  internalAction,
  mutation,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import {
  createSvixEndpoint,
  updateSvixEndpoint,
  deleteSvixEndpoint,
  toggleSvixEndpoint,
  getSvixEndpointSecret,
} from "./lib/svix";
import { getAllEventTypes } from "../lib/svix-events";

// ============================================================================
// INTERNAL MUTATIONS - Database Operations
// ============================================================================

/**
 * Store Svix endpoint ID in the webhooks table
 */
// ============================================================================
// INTERNAL ACTIONS - Svix API Operations
// ============================================================================

/**
 * Create a Svix endpoint for a webhook
 */
export const createSvixWebhookEndpoint = internalAction({
  args: {
    webhookId: v.id("webhooks"),
    appId: v.id("apps"),
    svixAppId: v.string(),
    url: v.string(),
    events: v.array(v.string()),
    description: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      console.log(
        `[Svix] Creating Svix endpoint for webhook ${args.webhookId}`,
      );

      // Validate URL
      if (!args.url.startsWith("https://")) {
        throw new Error("Webhook URL must use HTTPS");
      }

      // Create Svix endpoint
      const endpoint = await createSvixEndpoint(
        args.svixAppId,
        {
          url: args.url,
          filterTypes: args.events.length > 0 ? args.events : undefined,
          description: args.description,
        },
        mode,
      );

      // Store endpoint ID in database
      await ctx.runMutation(internal.svixMutations.storeSvixEndpointId, {
        webhookId: args.webhookId,
        svixEndpointId: endpoint.id,
      });

      // Get and store the webhook secret
      const secret = await getSvixEndpointSecret(
        args.svixAppId,
        endpoint.id,
        mode,
      );
      await ctx.runMutation(internal.svixMutations.storeWebhookSecret, {
        webhookId: args.webhookId,
        secret,
      });

      console.log(`[Svix] Successfully created Svix endpoint ${endpoint.id}`);

      return {
        success: true,
        endpointId: endpoint.id,
        secret,
      };
    } catch (error: any) {
      console.error(`[Svix] Failed to create Svix endpoint:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Update a Svix endpoint
 */
export const updateSvixWebhookEndpoint = internalAction({
  args: {
    webhookId: v.id("webhooks"),
    svixAppId: v.string(),
    svixEndpointId: v.string(),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      console.log(`[Svix] Updating Svix endpoint ${args.svixEndpointId}`);

      // Validate URL if provided
      if (args.url && !args.url.startsWith("https://")) {
        throw new Error("Webhook URL must use HTTPS");
      }

      // Update Svix endpoint
      await updateSvixEndpoint(
        args.svixAppId,
        args.svixEndpointId,
        {
          url: args.url,
          filterTypes: args.events,
          description: args.description,
        },
        mode,
      );

      // If URL changed, get new secret
      if (args.url) {
        const secret = await getSvixEndpointSecret(
          args.svixAppId,
          args.svixEndpointId,
          mode,
        );
        await ctx.runMutation(internal.svixMutations.storeWebhookSecret, {
          webhookId: args.webhookId,
          secret,
        });
      }

      console.log(
        `[Svix] Successfully updated Svix endpoint ${args.svixEndpointId}`,
      );

      return {
        success: true,
      };
    } catch (error: any) {
      console.error(`[Svix] Failed to update Svix endpoint:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Delete a Svix endpoint
 */
export const deleteSvixWebhookEndpoint = internalAction({
  args: {
    webhookId: v.id("webhooks"),
    svixAppId: v.string(),
    svixEndpointId: v.string(),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      console.log(`[Svix] Deleting Svix endpoint ${args.svixEndpointId}`);

      // Delete Svix endpoint
      await deleteSvixEndpoint(args.svixAppId, args.svixEndpointId, mode);

      // Clear endpoint ID from database
      await ctx.runMutation(internal.svixMutations.clearSvixEndpointId, {
        webhookId: args.webhookId,
      });

      console.log(
        `[Svix] Successfully deleted Svix endpoint ${args.svixEndpointId}`,
      );

      return {
        success: true,
      };
    } catch (error: any) {
      console.error(`[Svix] Failed to delete Svix endpoint:`, error.message);

      // Clear from database even if Svix deletion fails
      await ctx.runMutation(internal.svixMutations.clearSvixEndpointId, {
        webhookId: args.webhookId,
      });

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Toggle Svix endpoint (enable/disable)
 */
export const toggleSvixWebhookEndpoint = internalAction({
  args: {
    svixAppId: v.string(),
    svixEndpointId: v.string(),
    disabled: v.boolean(),
    mode: v.optional(v.union(v.literal("test"), v.literal("live"))),
  },
  handler: async (ctx, args) => {
    try {
      const mode = args.mode || "live";

      await toggleSvixEndpoint(
        args.svixAppId,
        args.svixEndpointId,
        args.disabled,
        mode,
      );

      return {
        success: true,
      };
    } catch (error: any) {
      console.error(`[Svix] Failed to toggle Svix endpoint:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  },
});
