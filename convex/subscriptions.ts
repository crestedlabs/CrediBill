import {
  query,
  mutation,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getCurrentUser } from "./users";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

// ============================================================================
// INTERNAL API-KEY-AUTHENTICATED VERSIONS
// ============================================================================

/**
 * Create subscription via API key (no Clerk auth required)
 */
export const createSubscriptionInternal = internalMutation({
  args: {
    appId: v.id("apps"),
    customerId: v.id("customers"),
    planId: v.id("plans"),
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) throw new ConvexError("App not found");

    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError("Customer not found");

    if (customer.appId !== args.appId) {
      throw new ConvexError("Customer does not belong to this app");
    }

    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new ConvexError("Plan not found");

    if (plan.appId !== args.appId) {
      throw new ConvexError("Plan does not belong to this app");
    }

    if (plan.status === "archived") {
      throw new ConvexError("Plan is archived and unavailable");
    }

    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "trialing")
        )
      )
      .first();

    if (existingSubscription) {
      throw new ConvexError("Customer already has an active subscription");
    }

    const now = Date.now();
    const startDate = args.startDate || now;
    const trialDays = plan.trialDays ?? 0;
    const isTrialing = trialDays > 0;

    let periodDuration: number;
    switch (plan.interval) {
      case "monthly":
        periodDuration = 30 * 24 * 60 * 60 * 1000;
        break;
      case "quarterly":
        periodDuration = 90 * 24 * 60 * 60 * 1000;
        break;
      case "yearly":
        periodDuration = 365 * 24 * 60 * 60 * 1000;
        break;
      case "one-time":
        periodDuration = 0;
        break;
      default:
        periodDuration = 30 * 24 * 60 * 60 * 1000;
    }

    const trialEndDate = isTrialing
      ? startDate + trialDays * 24 * 60 * 60 * 1000
      : startDate;

    // For both trial and non-trial subscriptions:
    // currentPeriodEnd represents when the trial/grace period ends
    // Actual billing period (30/90/365 days) only starts when first payment is received
    const currentPeriodEnd = isTrialing
      ? trialEndDate // Trial end date - grace period starts from here if no payment
      : startDate; // For no-trial subscriptions, grace period starts immediately

    const planSnapshot = {
      name: plan.name,
      pricingModel: plan.pricingModel,
      baseAmount: plan.baseAmount,
      currency: plan.currency,
      interval: plan.interval,
      usageMetric: plan.usageMetric,
      unitPrice: plan.unitPrice,
      freeUnits: plan.freeUnits,
    };

    const subscriptionId = await ctx.db.insert("subscriptions", {
      organizationId: app.organizationId,
      appId: args.appId,
      customerId: args.customerId,
      planId: args.planId,
      planSnapshot,
      status: isTrialing ? "trialing" : "pending_payment", // Wait for payment if no trial
      startDate,
      currentPeriodStart: isTrialing ? trialEndDate : startDate,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      usageQuantity: 0,
      usageAmount: 0,
      trialEndsAt: isTrialing ? trialEndDate : undefined,
      nextPaymentDate: isTrialing ? trialEndDate : startDate, // Payment due immediately if no trial
      lastPaymentDate: undefined,
      failedPaymentAttempts: 0,
    });

    const subscription = await ctx.db.get(subscriptionId);

    // Generate invoice immediately if subscription requires payment
    if (!isTrialing) {
      await ctx.scheduler.runAfter(
        0,
        internal.invoices.generateInvoiceInternal,
        {
          subscriptionId,
          periodStart: startDate,
          periodEnd: currentPeriodEnd,
        }
      );
    }

    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: args.appId,
      event: "subscription.created",
      payload: {
        subscription,
        customer,
        plan,
      },
    });

    return subscriptionId;
  },
});

/**
 * List subscriptions via API key (no Clerk auth required)
 */
export const listSubscriptionsInternal = internalQuery({
  args: {
    appId: v.id("apps"),
    customerId: v.optional(v.id("customers")),
    planId: v.optional(v.id("plans")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("past_due"),
        v.literal("cancelled"),
        v.literal("expired")
      )
    ),
  },
  handler: async (ctx, args) => {
    let subscriptions;

    if (args.customerId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .filter((q) => q.eq(q.field("appId"), args.appId))
        .collect();
    } else if (args.planId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_plan", (q) => q.eq("planId", args.planId!))
        .filter((q) => q.eq(q.field("appId"), args.appId))
        .collect();
    } else {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_app", (q) => q.eq("appId", args.appId))
        .collect();
    }

    if (args.status) {
      subscriptions = subscriptions.filter((s) => s.status === args.status);
    }

    const subscriptionsWithDetails = await Promise.all(
      subscriptions.map(async (sub) => {
        const customer = await ctx.db.get(sub.customerId);
        const plan = await ctx.db.get(sub.planId);
        return {
          ...sub,
          customer,
          plan,
        };
      })
    );

    return subscriptionsWithDetails;
  },
});

/**
 * Get subscription via API key (no Clerk auth required)
 */
export const getSubscriptionInternal = internalQuery({
  args: {
    subscriptionId: v.id("subscriptions"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    if (subscription.appId !== args.appId) {
      throw new ConvexError("Access denied");
    }

    const customer = await ctx.db.get(subscription.customerId);
    const plan = await ctx.db.get(subscription.planId);

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", subscription._id)
      )
      .collect();

    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", subscription._id)
      )
      .collect();

    return {
      ...subscription,
      customer,
      plan,
      invoices,
      usageEvents,
    };
  },
});

/**
 * Cancel subscription via API key (no Clerk auth required)
 * Default behavior: Cancel at period end (user retains access until billing period ends)
 */
export const cancelSubscriptionInternal = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    appId: v.id("apps"),
    cancelAtPeriodEnd: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    if (subscription.appId !== args.appId) {
      throw new ConvexError("Access denied");
    }

    // Default to cancel at period end (user keeps access)
    const cancelAtPeriodEnd = args.cancelAtPeriodEnd ?? true;

    if (cancelAtPeriodEnd) {
      await ctx.db.patch(args.subscriptionId, {
        cancelAtPeriodEnd: true,
      });
    } else {
      await ctx.db.patch(args.subscriptionId, {
        status: "cancelled",
        cancelAtPeriodEnd: false,
      });
    }

    const updatedSubscription = await ctx.db.get(args.subscriptionId);
    const customer = await ctx.db.get(subscription.customerId);

    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: args.appId,
      event: cancelAtPeriodEnd
        ? "subscription.cancel_scheduled"
        : "subscription.cancelled",
      payload: {
        subscription: updatedSubscription,
        customer,
      },
    });

    return args.subscriptionId;
  },
});

// ============================================================================
// CLERK-AUTHENTICATED VERSIONS (for dashboard UI)
// ============================================================================

// ============================================================================
// NOTE: Dashboard mutation for creating subscriptions removed.
// Subscriptions should ONLY be created via API (createSubscriptionInternal)
// after payment setup is initiated. Never create subscriptions from the dashboard.
// ============================================================================

/**
 * List subscriptions with filters
 */
export const listSubscriptions = query({
  args: {
    appId: v.optional(v.id("apps")),
    customerId: v.optional(v.id("customers")),
    planId: v.optional(v.id("plans")),
    status: v.optional(
      v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("paused"),
        v.literal("cancelled"),
        v.literal("expired")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // At least one filter must be provided
    if (!args.appId && !args.customerId && !args.planId) {
      throw new ConvexError(
        "Must provide at least one filter: appId, customerId, or planId"
      );
    }

    let subscriptions: any[];

    // Use the most specific index
    if (args.customerId && args.planId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_customer_plan", (q) =>
          q.eq("customerId", args.customerId!).eq("planId", args.planId!)
        )
        .collect();
    } else if (args.customerId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .collect();
    } else if (args.planId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_plan", (q) => q.eq("planId", args.planId!))
        .collect();
    } else if (args.appId) {
      subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_app", (q) => q.eq("appId", args.appId!))
        .collect();
    } else {
      throw new ConvexError("Invalid filter combination");
    }

    // Verify access to organization
    if (subscriptions.length > 0) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org_user", (q) =>
          q
            .eq("organizationId", subscriptions[0].organizationId)
            .eq("userId", user._id)
        )
        .unique();

      if (!membership) throw new ConvexError("Access denied");
    }

    // Filter by status if provided
    if (args.status) {
      subscriptions = subscriptions.filter((s) => s.status === args.status);
    }

    // Enrich with customer and plan data
    const enrichedSubscriptions = await Promise.all(
      subscriptions.map(async (sub) => {
        const customer = await ctx.db.get(sub.customerId);
        const plan = await ctx.db.get(sub.planId);
        return {
          ...sub,
          customer,
          plan,
        };
      })
    );

    return enrichedSubscriptions;
  },
});

/**
 * Get a single subscription with full details
 */
export const getSubscription = query({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    // Verify access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", subscription.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    // Get related data
    const customer = await ctx.db.get(subscription.customerId);
    const plan = await ctx.db.get(subscription.planId);

    // Get usage events if usage-based
    const usageEvents = await ctx.db
      .query("usageEvents")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", subscription._id)
      )
      .collect();

    // Get invoices for this subscription
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_subscription", (q) =>
        q.eq("subscriptionId", subscription._id)
      )
      .collect();

    return {
      ...subscription,
      customer,
      plan,
      usageEvents,
      invoices,
    };
  },
});

/**
 * Update subscription status (pause, resume, cancel)
 */
export const updateSubscriptionStatus = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    action: v.union(
      v.literal("pause"),
      v.literal("resume"),
      v.literal("cancel_at_period_end")
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    // Verify access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", subscription.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    const now = Date.now();

    switch (args.action) {
      case "pause":
        if (
          subscription.status !== "active" &&
          subscription.status !== "trialing"
        ) {
          throw new ConvexError(
            "Can only pause active or trialing subscriptions"
          );
        }
        await ctx.db.patch(args.subscriptionId, { status: "paused" });
        break;

      case "resume":
        if (subscription.status !== "paused") {
          throw new ConvexError("Can only resume paused subscriptions");
        }
        await ctx.db.patch(args.subscriptionId, { status: "active" });
        break;

      case "cancel_at_period_end":
        // Cancel at the end of current billing period
        if (
          subscription.status === "cancelled" ||
          subscription.status === "expired"
        ) {
          throw new ConvexError("Subscription is already ended");
        }
        await ctx.db.patch(args.subscriptionId, {
          cancelAtPeriodEnd: true,
        });
        break;
    }

    return { success: true };
  },
});

// ============================================================================
// NOTE: Dashboard mutation for renewing subscriptions removed.
// Subscription renewals happen automatically via cron jobs after payment
// is received through webhooks. Never manually renew from the dashboard.
// ============================================================================

// ============================================================================
// NOTE: Dashboard mutation for changing subscription plans removed.
// Plan changes should be initiated via API with proper payment handling.
// Never change plans from the dashboard without payment confirmation.
// ============================================================================
