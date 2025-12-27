"use node";

import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import * as crypto from "crypto";

// ============================================================================
// CONFIGURATION
// ============================================================================

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000]; // 1min, 5min, 15min
const WEBHOOK_TIMEOUT_MS = 30_000; // 30 seconds

// ============================================================================
// WEBHOOK SIGNATURE GENERATION
// ============================================================================

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Create webhook headers including signature and timestamp
 */
function createWebhookHeaders(
  payload: string,
  secret: string
): Record<string, string> {
  const timestamp = Date.now().toString();
  const signaturePayload = `${timestamp}.${payload}`;
  const signature = generateWebhookSignature(signaturePayload, secret);

  return {
    "Content-Type": "application/json",
    "X-CrediBill-Signature": signature,
    "X-CrediBill-Timestamp": timestamp,
    "User-Agent": "CrediBill-Webhooks/1.0",
  };
}

// ============================================================================
// WEBHOOK DELIVERY
// ============================================================================

/**
 * Send a webhook to a customer's endpoint
 */
export const sendWebhook = internalAction({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
    url: v.string(),
    payload: v.any(),
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    const startTime = Date.now();
    const payloadString = JSON.stringify(args.payload);

    try {
      // Generate signature
      const headers = createWebhookHeaders(payloadString, args.secret);

      // Send webhook with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        WEBHOOK_TIMEOUT_MS
      );

      const response = await fetch(args.url, {
        method: "POST",
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const duration = Date.now() - startTime;
      const httpStatus = response.status;
      let responseBody: any;

      try {
        const text = await response.text();
        responseBody = text ? JSON.parse(text) : null;
      } catch {
        responseBody = await response.text();
      }

      // Update log with delivery details
      await ctx.runMutation(
        internal.outgoingWebhookMutations.updateWebhookLog,
        {
          webhookLogId: args.webhookLogId,
          status:
            httpStatus >= 200 && httpStatus < 300 ? "delivered" : "failed",
          httpStatus,
          response: responseBody,
          sentAt: startTime,
          deliveredAt:
            httpStatus >= 200 && httpStatus < 300 ? Date.now() : undefined,
          error:
            httpStatus >= 200 && httpStatus < 300
              ? undefined
              : `HTTP ${httpStatus}: ${JSON.stringify(responseBody)}`,
        }
      );

      return {
        success: httpStatus >= 200 && httpStatus < 300,
        httpStatus,
        duration,
      };
    } catch (error: any) {
      // Handle network errors, timeouts, etc.
      const duration = Date.now() - startTime;
      const errorMessage =
        error.name === "AbortError" ? "Request timeout" : error.message;

      await ctx.runMutation(
        internal.outgoingWebhookMutations.updateWebhookLog,
        {
          webhookLogId: args.webhookLogId,
          status: "failed",
          sentAt: startTime,
          error: errorMessage,
        }
      );

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  },
});

/**
 * Retry a failed webhook delivery
 */
export const retryWebhook = internalAction({
  args: {
    webhookLogId: v.id("outgoingWebhookLogs"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{
    success: boolean;
    reason?: string;
    error?: string;
    httpStatus?: number;
    duration?: number;
  }> => {
    // Get webhook log
    const log: any = await ctx.runQuery(
      internal.outgoingWebhookQueries.getWebhookLog,
      {
        webhookLogId: args.webhookLogId,
      }
    );

    if (!log) {
      throw new Error(`Webhook log ${args.webhookLogId} not found`);
    }

    // Check if we should retry
    if (log.attemptNumber >= log.maxAttempts) {
      console.log(
        `Max retry attempts reached for webhook ${args.webhookLogId}`
      );
      return { success: false, reason: "max_attempts_reached" };
    }

    if (log.status === "delivered") {
      console.log(`Webhook ${args.webhookLogId} already delivered`);
      return { success: false, reason: "already_delivered" };
    }

    // Get webhook configuration
    const webhook: any = await ctx.runQuery(
      internal.outgoingWebhookQueries.getWebhookConfig,
      {
        webhookId: log.webhookId,
      }
    );

    if (!webhook || webhook.status !== "active") {
      console.log(`Webhook configuration ${log.webhookId} not active`);
      return { success: false, reason: "webhook_inactive" };
    }

    // Increment attempt number
    await ctx.runMutation(
      internal.outgoingWebhookMutations.incrementWebhookAttempt,
      {
        webhookLogId: args.webhookLogId,
      }
    );

    // Send webhook
    const result: any = await ctx.runAction(
      internal.outgoingWebhooks.sendWebhook,
      {
        webhookLogId: args.webhookLogId,
        url: log.url,
        payload: log.payload,
        secret: webhook.secret || "",
      }
    );

    // Schedule next retry if failed
    if (!result.success && log.attemptNumber + 1 < log.maxAttempts) {
      const nextDelay =
        RETRY_DELAYS_MS[log.attemptNumber] ||
        RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      await ctx.runMutation(internal.outgoingWebhookMutations.scheduleRetry, {
        webhookLogId: args.webhookLogId,
        delayMs: nextDelay,
      });
    }

    return result;
  },
});

// ============================================================================
// WEBHOOK TRIGGERING
// ============================================================================

/**
 * Trigger webhooks for a specific event
 */
export const triggerWebhooks = internalAction({
  args: {
    appId: v.id("apps"),
    event: v.string(),
    payload: v.any(),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ triggered: number; successful?: number; failed?: number }> => {
    // Get all active webhooks for this app that are subscribed to this event
    const webhooks: any[] = await ctx.runQuery(
      internal.outgoingWebhookQueries.getActiveWebhooks,
      {
        appId: args.appId,
        event: args.event,
      }
    );

    if (webhooks.length === 0) {
      console.log(
        `No active webhooks found for event ${args.event} in app ${args.appId}`
      );
      return { triggered: 0 };
    }

    // Create webhook logs and send webhooks
    const results = await Promise.all(
      webhooks.map(async (webhook: any) => {
        // Create webhook log
        const logId = await ctx.runMutation(
          internal.outgoingWebhookMutations.createWebhookLog,
          {
            organizationId: webhook.organizationId,
            appId: webhook.appId,
            webhookId: webhook._id,
            event: args.event,
            payload: args.payload,
            url: webhook.url,
          }
        );

        // Send webhook
        const result = await ctx.runAction(
          internal.outgoingWebhooks.sendWebhook,
          {
            webhookLogId: logId,
            url: webhook.url,
            payload: args.payload,
            secret: webhook.secret || "",
          }
        );

        // Schedule retry if failed
        if (!result.success) {
          await ctx.runMutation(
            internal.outgoingWebhookMutations.scheduleRetry,
            {
              webhookLogId: logId,
              delayMs: RETRY_DELAYS_MS[0],
            }
          );
        }

        return result;
      })
    );

    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return { triggered: webhooks.length, successful, failed };
  },
});
