import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// Internal mutation for API endpoint (no auth check)
export const recordUsageEventInternal = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    quantity: v.number(),
    metric: v.string(),
    timestamp: v.number(),
    eventId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    appId: v.optional(v.id("apps")), // For API key scoping validation
  },
  handler: async (ctx, args) => {
    // Get the subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Validate app scoping if appId is provided (from API key)
    if (args.appId && subscription.appId !== args.appId) {
      throw new Error("API key cannot access this subscription");
    }

    // Validate quantity
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    // Check for duplicate eventId if provided
    if (args.eventId) {
      const existingEvent = await ctx.db
        .query("usageEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .first();

      if (existingEvent) {
        return {
          usageEventId: existingEvent._id,
          duplicate: true,
        };
      }
    }

    // Create usage event
    const usageEventId = await ctx.db.insert("usageEvents", {
      organizationId: subscription.organizationId,
      appId: subscription.appId,
      customerId: subscription.customerId,
      subscriptionId: args.subscriptionId,
      quantity: args.quantity,
      metric: args.metric,
      timestamp: args.timestamp,
      eventId: args.eventId,
      metadata: args.metadata,
    });

    return {
      usageEventId,
      duplicate: false,
    };
  },
});

// Record a usage event (authenticated via UI)
export const recordUsageEvent = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    quantity: v.number(),
    metric: v.string(),
    timestamp: v.optional(v.number()), // If not provided, use current time
    eventId: v.optional(v.string()), // For deduplication
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", subscription.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Validate quantity
    if (args.quantity <= 0) {
      throw new Error("Quantity must be greater than zero");
    }

    // Check for duplicate eventId if provided
    if (args.eventId) {
      const existingEvent = await ctx.db
        .query("usageEvents")
        .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
        .first();

      if (existingEvent) {
        // Event already recorded, return existing event ID
        return {
          usageEventId: existingEvent._id,
          duplicate: true,
        };
      }
    }

    // Create usage event
    const usageEventId = await ctx.db.insert("usageEvents", {
      organizationId: subscription.organizationId,
      appId: subscription.appId,
      customerId: subscription.customerId,
      subscriptionId: args.subscriptionId,
      quantity: args.quantity,
      metric: args.metric,
      timestamp: args.timestamp || Date.now(),
      eventId: args.eventId,
      metadata: args.metadata,
    });

    return {
      usageEventId,
      duplicate: false,
    };
  },
});

// Get usage events for a subscription
export const getUsageBySubscription = query({
  args: {
    subscriptionId: v.id("subscriptions"),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new Error("Subscription not found");

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", subscription.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Query usage events
    let query = ctx.db
      .query("usageEvents")
      .withIndex("by_subscription_timestamp", (q) =>
        q.eq("subscriptionId", args.subscriptionId)
      );

    // Apply time filters if provided
    if (args.startTime) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startTime!));
    }
    if (args.endTime) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endTime!));
    }

    const events = await query.collect();

    // Calculate total by metric
    const usageByMetric: Record<string, number> = {};
    events.forEach((event) => {
      usageByMetric[event.metric] =
        (usageByMetric[event.metric] || 0) + event.quantity;
    });

    return {
      events,
      usageByMetric,
      totalEvents: events.length,
    };
  },
});
