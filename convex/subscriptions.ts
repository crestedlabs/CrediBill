import { query, mutation, internalMutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Create a new subscription - Subscribe a customer to a plan
 */
export const createSubscription = mutation({
  args: {
    appId: v.id("apps"),
    customerId: v.id("customers"),
    planId: v.id("plans"),
    startDate: v.optional(v.number()), // Default to now
    trialDays: v.optional(v.number()), // Number of trial days (0 = no trial)
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new ConvexError("App not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied to organization");

    // Get the customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError("Customer not found");

    // Verify customer belongs to this app
    if (customer.appId !== args.appId) {
      throw new ConvexError("Customer does not belong to this app");
    }

    // Get the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan)
      throw new ConvexError({
        message:
          "The selected plan could not be found. Please refresh the page and try again.",
        code: "PLAN_NOT_FOUND",
      });

    // Verify plan belongs to this app
    if (plan.appId !== args.appId) {
      throw new ConvexError({
        message:
          "This plan is not available for the selected application. Please contact support if you believe this is an error.",
        code: "PLAN_APP_MISMATCH",
      });
    }

    // Check if plan is active
    if (plan.status === "archived") {
      throw new ConvexError({
        message:
          "This plan is no longer available for new subscriptions. Please choose a different plan.",
        code: "PLAN_ARCHIVED",
      });
    }

    // Check for existing active subscription to the same plan
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer_plan", (q) =>
        q.eq("customerId", args.customerId).eq("planId", args.planId)
      )
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "trialing")
        )
      )
      .first();

    if (existingSubscription) {
      throw new ConvexError({
        message:
          "This customer already has an active subscription to this plan. Please cancel the existing subscription first or choose a different plan.",
        code: "DUPLICATE_SUBSCRIPTION",
      });
    }

    // Calculate dates
    const now = Date.now();
    const startDate = args.startDate || now;
    // Use trial period from plan, fallback to provided trialDays for backward compatibility
    const trialDays = plan.trialDays ?? args.trialDays ?? 0;
    const isTrialing = trialDays > 0;

    // Calculate period end based on plan interval
    let periodDuration: number;
    switch (plan.interval) {
      case "monthly":
        periodDuration = 30 * 24 * 60 * 60 * 1000; // 30 days
        break;
      case "quarterly":
        periodDuration = 90 * 24 * 60 * 60 * 1000; // 90 days
        break;
      case "yearly":
        periodDuration = 365 * 24 * 60 * 60 * 1000; // 365 days
        break;
      case "one-time":
        periodDuration = 0; // One-time doesn't renew
        break;
      default:
        periodDuration = 30 * 24 * 60 * 60 * 1000;
    }

    const trialEndDate = isTrialing
      ? startDate + trialDays * 24 * 60 * 60 * 1000
      : startDate;
    const currentPeriodEnd =
      plan.interval === "one-time" ? startDate : trialEndDate + periodDuration;

    // Create plan snapshot
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

    // Create the subscription
    const subscriptionId = await ctx.db.insert("subscriptions", {
      organizationId: app.organizationId,
      appId: args.appId,
      customerId: args.customerId,
      planId: args.planId,
      planSnapshot,
      status: isTrialing ? "trialing" : "active",
      startDate,
      currentPeriodStart: isTrialing ? trialEndDate : startDate,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      usageQuantity: 0,
      usageAmount: 0,
    });

    return subscriptionId;
  },
});

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
      v.literal("cancel"),
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

      case "cancel":
        // Immediate cancellation
        await ctx.db.patch(args.subscriptionId, {
          status: "cancelled",
          cancelAtPeriodEnd: false,
        });
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

/**
 * Renew a subscription (typically called by cron job)
 * Extends the current period and generates invoice
 */
export const renewSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    // Check if subscription should be cancelled
    if (subscription.cancelAtPeriodEnd) {
      await ctx.db.patch(args.subscriptionId, {
        status: "cancelled",
      });
      return { success: true, renewed: false, cancelled: true };
    }

    // Check if subscription is renewable
    if (
      subscription.status !== "active" &&
      subscription.status !== "trialing"
    ) {
      return { success: false, reason: "Subscription is not active" };
    }

    const plan = await ctx.db.get(subscription.planId);
    if (!plan) throw new ConvexError("Plan not found");

    // Don't renew one-time plans
    if (plan.interval === "one-time") {
      await ctx.db.patch(args.subscriptionId, { status: "expired" });
      return { success: true, renewed: false, expired: true };
    }

    // Calculate new period
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
      default:
        periodDuration = 30 * 24 * 60 * 60 * 1000;
    }

    const newPeriodStart = subscription.currentPeriodEnd;
    const newPeriodEnd = newPeriodStart + periodDuration;

    // Generate invoice for the completed period (before updating subscription)
    try {
      await ctx.scheduler.runAfter(
        0,
        internal.invoices.generateInvoiceInternal,
        {
          subscriptionId: args.subscriptionId,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
        }
      );
    } catch (error) {
      console.error("Failed to generate invoice:", error);
      // Don't fail renewal if invoice generation fails
    }

    // Update subscription
    await ctx.db.patch(args.subscriptionId, {
      status: "active", // Convert trialing to active on renewal
      currentPeriodStart: newPeriodStart,
      currentPeriodEnd: newPeriodEnd,
      usageQuantity: 0, // Reset usage for new period
      usageAmount: 0,
    });

    return { success: true, renewed: true, newPeriodEnd };
  },
});
