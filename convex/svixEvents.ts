"use node";

import { v } from "convex/values";
import { internalAction, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { sendSvixMessage } from "./lib/svix";
import {
  createWebhookPayload,
  createTestWebhookPayload,
  SvixEventType,
  generateEventId,
} from "../lib/svix-events";

// ============================================================================
// ============================================================================
// INTERNAL ACTIONS - Svix Message Sending
// ============================================================================

/**
 * Send a webhook event through Svix
 * This is the core function that all webhook events use
 */
export const sendWebhookEvent = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    payload: v.any(),
    eventId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    try {
      // Get app details
      const app = await ctx.runQuery(internal.svixMutations.getAppDetails, {
        appId: args.appId,
      });

      if (!app) {
        console.error(`[Svix] App ${args.appId} not found`);
        return {
          success: false,
          error: "App not found",
        };
      }

      // Check if Svix app exists
      if (!app.svixAppId) {
        console.log(
          `[Svix] App ${args.appId} has no Svix app ID, skipping webhook`,
        );
        return {
          success: false,
          error: "Svix application not configured",
        };
      }

      // Get active webhooks for this app
      const webhooks = await ctx.runQuery(
        internal.svixMutations.getActiveWebhooks,
        {
          appId: args.appId,
        },
      );

      if (webhooks.length === 0) {
        console.log(
          `[Svix] No active webhooks configured for app ${args.appId}`,
        );
        return {
          success: true,
        };
      }

      const mode = app.mode === "test" ? "test" : "live";
      const eventId = args.eventId || generateEventId();

      // Create webhook payload
      const webhookPayload = createWebhookPayload({
        eventType: args.eventType as SvixEventType,
        data: args.payload,
        appId: args.appId,
        eventId,
      });

      console.log(
        `[Svix] Sending webhook event ${args.eventType} for app ${args.appId}`,
      );

      // Send message to Svix
      const svixMessage = await sendSvixMessage(
        app.svixAppId,
        {
          eventType: args.eventType,
          payload: webhookPayload,
          eventId,
        },
        mode,
      );

      console.log(`[Svix] Message sent: ${svixMessage.id}`);

      // Log webhook deliveries for each webhook
      let logsCreated = 0;
      for (const webhook of webhooks) {
        // Only log if webhook is subscribed to this event or subscribed to all events
        if (
          webhook.events.length === 0 ||
          webhook.events.includes(args.eventType)
        ) {
          await ctx.runMutation(internal.svixMutations.createWebhookLog, {
            organizationId: app.organizationId,
            appId: args.appId,
            webhookId: webhook._id,
            event: args.eventType,
            payload: webhookPayload,
            url: webhook.url,
            svixMessageId: svixMessage.id,
          });
          logsCreated++;
        }
      }

      return {
        success: true,
      };
    } catch (error: any) {
      console.error(`[Svix] Failed to send webhook event:`, error.message);

      return {
        success: false,
        error: error.message,
      };
    }
  },
});

/**
 * Send a test webhook
 */
export const sendTestWebhook = internalAction({
  args: {
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      const testPayload = createTestWebhookPayload({
        appId: args.appId,
        message:
          "This is a test webhook from CrediBill. If you receive this, your webhook is working correctly!",
      });

      const result = await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
        appId: args.appId,
        eventType: testPayload.event,
        payload: testPayload.data,
        eventId: testPayload.event_id,
      });

      return result;
    } catch (error: any) {
      console.error(`[Svix] Failed to send test webhook:`, error.message);
      return {
        success: false,
        error: error.message,
      };
    }
  },
});

// ============================================================================
// HELPER ACTIONS - Event-Specific Webhooks
// ============================================================================

/**
 * Send subscription event webhook
 */
export const sendSubscriptionWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    subscriptionData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.subscriptionData,
    });
  },
});

/**
 * Send invoice event webhook
 */
export const sendInvoiceWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    invoiceData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.invoiceData,
    });
  },
});

/**
 * Send customer event webhook
 */
export const sendCustomerWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    customerData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.customerData,
    });
  },
});

/**
 * Send payment event webhook
 */
export const sendPaymentWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    paymentData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.paymentData,
    });
  },
});

/**
 * Send plan event webhook
 */
export const sendPlanWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    planData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.planData,
    });
  },
});

/**
 * Send usage event webhook
 */
export const sendUsageWebhook = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    usageData: v.any(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    return await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
      appId: args.appId,
      eventType: args.eventType,
      payload: args.usageData,
    });
  },
});

// ============================================================================
// PUBLIC ACTIONS - User-Facing Operations
// ============================================================================

/**
 * Send a test webhook (public API)
 */
export const testWebhook = action({
  args: {
    appId: v.id("apps"),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{ success: boolean; error?: string; message?: string }> => {
    // Note: Authentication is handled in the internal action via queries
    return await ctx.runAction(internal.svixEvents.sendTestWebhook, {
      appId: args.appId,
    });
  },
});

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Send webhook to multiple apps
 * Useful for platform-wide events
 */
export const broadcastWebhookEvent = internalAction({
  args: {
    appIds: v.array(v.id("apps")),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: Array<{ appId: string; success: boolean; error?: string }>;
  }> => {
    const results: Array<{ appId: string; success: boolean; error?: string }> =
      [];

    for (const appId of args.appIds) {
      try {
        const result = await ctx.runAction(
          internal.svixEvents.sendWebhookEvent,
          {
            appId,
            eventType: args.eventType,
            payload: args.payload,
          },
        );

        results.push({
          appId,
          success: result.success,
          error: result.error,
        });

        // Add small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        results.push({
          appId,
          success: false,
          error: error.message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return {
      total: args.appIds.length,
      successful,
      failed,
      results,
    };
  },
});

/**
 * Retry queued webhooks
 * This would be called by a cron job if you implement the queue
 */
export const retryQueuedWebhooks = internalAction({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    // Implementation would fetch from webhookQueue table
    // and retry sending through Svix
    console.log("[Svix] Retry queued webhooks - not yet implemented");

    return {
      success: false,
      error: "Not yet implemented",
    };
  },
});
