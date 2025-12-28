import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

/**
 * Find a transaction by provider reference (our internal reference)
 */
export const findTransactionByReference = internalQuery({
  args: { reference: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentTransactions")
      .withIndex("by_reference", (q) =>
        q.eq("providerReference", args.reference)
      )
      .first();
  },
});

/**
 * Find a transaction by provider reference scoped to a specific app
 */
export const findTransactionByReferenceAndApp = internalQuery({
  args: { 
    reference: v.string(),
    appId: v.id("apps")
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentTransactions")
      .withIndex("by_reference", (q) =>
        q.eq("providerReference", args.reference)
      )
      .filter((q) => q.eq(q.field("appId"), args.appId))
      .first();
  },
});

/**
 * Find all transactions for a specific app (used for webhook processing)
 */
export const findTransactionsByAppId = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentTransactions")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();
  },
});

/**
 * Find a transaction by provider transaction ID (provider's reference)
 */
export const findTransactionByProviderTxnId = internalQuery({
  args: { providerTxnId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("paymentTransactions")
      .withIndex("by_provider_txn_id", (q) =>
        q.eq("providerTransactionId", args.providerTxnId)
      )
      .first();
  },
});

/**
 * Get provider details from catalog for a given provider ID
 */
export const getProviderDetails = internalQuery({
  args: { providerId: v.id("providerCatalog") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

/**
 * Find a webhook by event ID (searches recent webhook payloads)
 */
export const findWebhookByEventId = internalQuery({
  args: { eventId: v.string() },
  handler: async (ctx, args) => {
    // Search through recent webhooks (last 100) to find matching event ID
    const recentWebhooks = await ctx.db
      .query("webhookLogs")
      .order("desc")
      .take(100);

    for (const webhook of recentWebhooks) {
      // Search the payload string for the event ID
      const payloadStr = JSON.stringify(webhook.payload);
      if (payloadStr.includes(args.eventId)) {
        return webhook;
      }
    }

    return null;
  },
});
