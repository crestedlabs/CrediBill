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

    // Check for any existing active subscription (only one subscription allowed per customer)
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
      throw new ConvexError({
        message:
          "This customer already has an active subscription. Please cancel the existing subscription first or use 'Change Subscription' to switch plans.",
        code: "DUPLICATE_SUBSCRIPTION",
      });
    }

    // Calculate dates
    const now = Date.now();
    const startDate = args.startDate || now;
    // Use trial period from plan
    const trialDays = plan.trialDays ?? 0;
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
      trialEndsAt: isTrialing ? trialEndDate : undefined,
      nextPaymentDate: isTrialing ? trialEndDate : currentPeriodEnd,
      lastPaymentDate: undefined,
      failedPaymentAttempts: 0,
    });

    // Send webhook to client
    const subscription = await ctx.db.get(subscriptionId);
    
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
        
        // Send webhook
        const cancelledSub = await ctx.db.get(args.subscriptionId);
        const customer = await ctx.db.get(subscription.customerId);
        
        if (cancelledSub && customer) {
          await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
            appId: subscription.appId,
            event: "subscription.cancelled",
            payload: {
              subscription: cancelledSub,
              customer,
            },
          });
        }
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
      
      // Send webhook for cancelled subscription
      const cancelledSub = await ctx.db.get(args.subscriptionId);
      const customer = await ctx.db.get(subscription.customerId);
      
      if (cancelledSub && customer) {
        await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "subscription.cancelled",
          payload: {
            subscription: cancelledSub,
            customer,
          },
        });
      }
      
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

    // Send webhook
    const renewedSub = await ctx.db.get(args.subscriptionId);
    const customer = await ctx.db.get(subscription.customerId);
    
    if (renewedSub && customer) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: subscription.appId,
        event: "subscription.renewed",
        payload: {
          subscription: renewedSub,
          customer,
          plan,
        },
      });
    }

    return { success: true, renewed: true, newPeriodEnd };
  },
});

/**
 * Change subscription plan with proration
 */
export const changeSubscription = mutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    newPlanId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) throw new ConvexError("Subscription not found");

    // Get the app
    const app = await ctx.db.get(subscription.appId);
    if (!app) throw new ConvexError("App not found");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied to organization");

    // Get the current plan
    const currentPlan = await ctx.db.get(subscription.planId);
    if (!currentPlan) throw new ConvexError("Current plan not found");

    // Get the new plan
    const newPlan = await ctx.db.get(args.newPlanId);
    if (!newPlan) throw new ConvexError("New plan not found");

    // Verify new plan belongs to the same app
    if (newPlan.appId !== subscription.appId) {
      throw new ConvexError("New plan must belong to the same app");
    }

    // Check if new plan is active
    if (newPlan.status !== "active") {
      throw new ConvexError("New plan is not available for subscriptions");
    }

    // Can't change to the same plan
    if (subscription.planId === args.newPlanId) {
      throw new ConvexError("Subscription is already on this plan");
    }

    const now = Date.now();
    const currentAmount = currentPlan.baseAmount || 0;
    const newAmount = newPlan.baseAmount || 0;
    const isUpgrade = newAmount > currentAmount;

    // Calculate proration (only for upgrades on non-trialing subscriptions)
    let proratedAmount = 0;
    if (subscription.status === "active" && isUpgrade) {
      const periodDuration =
        subscription.currentPeriodEnd - subscription.currentPeriodStart;
      const timeUsed = now - subscription.currentPeriodStart;
      const timeRemaining = subscription.currentPeriodEnd - now;
      const percentRemaining = timeRemaining / periodDuration;

      // Calculate proration for upgrade
      const unusedAmount = currentAmount * percentRemaining;
      const proratedNewAmount = newAmount * percentRemaining;
      proratedAmount = proratedNewAmount - unusedAmount;

      // For upgrades, charge immediately (positive amount)
    }
    // For downgrades, no proration - change takes effect at next renewal

    // Create plan snapshot for new plan
    const newPlanSnapshot = {
      name: newPlan.name,
      pricingModel: newPlan.pricingModel,
      baseAmount: newPlan.baseAmount,
      currency: newPlan.currency,
      interval: newPlan.interval,
      usageMetric: newPlan.usageMetric,
      unitPrice: newPlan.unitPrice,
      freeUnits: newPlan.freeUnits,
    };

    // Update the subscription
    await ctx.db.patch(args.subscriptionId, {
      planId: args.newPlanId,
      planSnapshot: newPlanSnapshot,
      // Keep current period dates unchanged - they stay on their billing cycle
      // Period will adjust on next renewal
    });

    // Send webhook
    const updatedSub = await ctx.db.get(args.subscriptionId);
    const customer = await ctx.db.get(subscription.customerId);
    
    if (updatedSub && customer) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: app._id,
        event: "subscription.plan_changed",
        payload: {
          subscription: updatedSub,
          customer,
          old_plan: currentPlan,
          new_plan: newPlan,
          proration: {
            amount: proratedAmount,
            is_upgrade: isUpgrade,
          },
        },
      });
    }

    // Note: In a production system, you would:
    // 1. Create a credit/debit transaction for proration
    // 2. If upgrade, charge the prorated amount immediately
    // 3. If downgrade, apply credit to next invoice
    // 4. Send notification to customer about plan change

    return {
      success: true,
      message: `Subscription changed from ${currentPlan.name} to ${newPlan.name}`,
      proratedAmount,
      isUpgrade,
    };
  },
});
