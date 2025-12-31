import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

// ============================================================================
// INTERNAL API-KEY-AUTHENTICATED VERSIONS
// ============================================================================

/**
 * Get plans via API key (no Clerk auth required)
 */
export const getPlansByAppInternal = internalQuery({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    return plans;
  },
});

/**
 * Create plan via API key (no Clerk auth required)
 */
export const createPlanInternal = internalMutation({
  args: {
    appId: v.id("apps"),
    name: v.string(),
    description: v.optional(v.string()),
    pricingModel: v.union(
      v.literal("flat"),
      v.literal("usage"),
      v.literal("hybrid")
    ),
    baseAmount: v.optional(v.number()),
    currency: v.string(),
    interval: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
      v.literal("one-time")
    ),
    trialDays: v.optional(v.number()),
    usageMetric: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    freeUnits: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("archived")),
    mode: v.union(v.literal("live"), v.literal("test")),
  },
  handler: async (ctx, args) => {
    const app = await ctx.db.get(args.appId);
    if (!app) throw new ConvexError("App not found");

    if (args.name.length < 3) {
      throw new ConvexError("Plan name must be at least 3 characters");
    }

    if (args.pricingModel === "flat" && !args.baseAmount) {
      throw new ConvexError("Base amount is required for flat pricing");
    }

    if (args.pricingModel === "usage" || args.pricingModel === "hybrid") {
      if (!args.usageMetric) {
        throw new ConvexError(
          "Usage metric is required for usage-based pricing"
        );
      }
      if (!args.unitPrice) {
        throw new ConvexError("Unit price is required for usage-based pricing");
      }
    }

    const planId = await ctx.db.insert("plans", {
      name: args.name,
      description: args.description,
      organizationId: app.organizationId,
      appId: args.appId,
      pricingModel: args.pricingModel,
      baseAmount: args.baseAmount,
      currency: args.currency as "UGX" | "KES" | "RWF" | "TZS" | "USD",
      interval: args.interval,
      trialDays: args.trialDays,
      usageMetric: args.usageMetric,
      unitPrice: args.unitPrice,
      freeUnits: args.freeUnits,
      status: args.status,
      mode: args.mode,
    });

    const plan = await ctx.db.get(planId);
    if (plan) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: args.appId,
        event: "plan.created",
        payload: { plan },
      });
    }

    return planId;
  },
});

/**
 * Update plan via API key (no Clerk auth required)
 */
export const updatePlanInternal = internalMutation({
  args: {
    planId: v.id("plans"),
    appId: v.id("apps"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    baseAmount: v.optional(v.number()),
    unitPrice: v.optional(v.number()),
    freeUnits: v.optional(v.number()),
    trialDays: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new ConvexError("Plan not found");

    if (plan.appId !== args.appId) {
      throw new ConvexError("Plan does not belong to this app");
    }

    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.status !== undefined) updates.status = args.status;
    if (args.baseAmount !== undefined) updates.baseAmount = args.baseAmount;
    if (args.unitPrice !== undefined) updates.unitPrice = args.unitPrice;
    if (args.freeUnits !== undefined) updates.freeUnits = args.freeUnits;
    if (args.trialDays !== undefined) updates.trialDays = args.trialDays;

    await ctx.db.patch(args.planId, updates);

    const updatedPlan = await ctx.db.get(args.planId);
    if (updatedPlan) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: args.appId,
        event: "plan.updated",
        payload: { plan: updatedPlan },
      });
    }

    return args.planId;
  },
});

/**
 * Delete plan via API key (no Clerk auth required)
 */
export const deletePlanInternal = internalMutation({
  args: {
    planId: v.id("plans"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new ConvexError("Plan not found");

    if (plan.appId !== args.appId) {
      throw new ConvexError("Plan does not belong to this app");
    }

    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "trialing")
        )
      )
      .first();

    if (activeSubscriptions) {
      throw new ConvexError(
        "Cannot delete plan with active subscriptions. Archive it instead."
      );
    }

    await ctx.db.delete(args.planId);

    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: args.appId,
      event: "plan.deleted",
      payload: { plan },
    });

    return args.planId;
  },
});

// ============================================================================
// CLERK-AUTHENTICATED VERSIONS (for dashboard UI)
// ============================================================================

// Get plan statistics (subscribers and revenue)
export const getPlanStats = query({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", plan.organizationId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Unauthorized");

    // Count active subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "active"),
          q.eq(q.field("status"), "trialing")
        )
      )
      .collect();

    const subscriberCount = subscriptions.length;

    // Calculate revenue from paid invoices
    let totalRevenue = 0;

    for (const subscription of subscriptions) {
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_subscription", (q) =>
          q.eq("subscriptionId", subscription._id)
        )
        .filter((q) => q.eq(q.field("status"), "paid"))
        .collect();

      for (const invoice of invoices) {
        totalRevenue += invoice.amountPaid || 0;
      }
    }

    return {
      subscriberCount,
      totalRevenue,
      currency: plan.currency,
    };
  },
});

// Get all plans for an app
export const getPlansByApp = query({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app to verify user has access
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Unauthorized");

    // Get all plans for this app
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    return plans;
  },
});

// Create a new plan
export const createPlan = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    appId: v.id("apps"),
    pricingModel: v.union(
      v.literal("flat"),
      v.literal("usage"),
      v.literal("hybrid")
    ),
    baseAmount: v.optional(v.number()),
    currency: v.string(),
    interval: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
      v.literal("one-time")
    ),
    trialDays: v.optional(v.number()), // Plan-specific trial period
    usageMetric: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    freeUnits: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("archived")),
    mode: v.union(v.literal("live"), v.literal("test")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app to verify user has access
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user is owner or admin of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Unauthorized");
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can create plans");
    }

    // Validate inputs
    if (args.name.length < 3) {
      throw new Error("Plan name must be at least 3 characters");
    }

    if (args.pricingModel === "flat" && !args.baseAmount) {
      throw new Error("Base amount is required for flat pricing");
    }

    if (args.pricingModel === "usage" || args.pricingModel === "hybrid") {
      if (!args.usageMetric) {
        throw new Error("Usage metric is required for usage-based pricing");
      }
      if (!args.unitPrice) {
        throw new Error("Unit price is required for usage-based pricing");
      }
    }

    // Create the plan
    const planId = await ctx.db.insert("plans", {
      name: args.name,
      description: args.description,
      organizationId: app.organizationId,
      appId: args.appId,
      pricingModel: args.pricingModel,
      baseAmount: args.baseAmount,
      currency: args.currency as "UGX" | "KES" | "RWF" | "TZS" | "USD",
      interval: args.interval,
      trialDays: args.trialDays,
      usageMetric: args.usageMetric,
      unitPrice: args.unitPrice,
      freeUnits: args.freeUnits,
      status: args.status,
      mode: args.mode,
    });

    // Send plan.created webhook
    const plan = await ctx.db.get(planId);
    if (plan) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: args.appId,
        event: "plan.created",
        payload: {
          plan,
        },
      });
    }

    return {
      success: true,
      planId,
      message: "Plan created successfully",
    };
  },
});

// Update an existing plan
export const updatePlan = mutation({
  args: {
    planId: v.id("plans"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    pricingModel: v.optional(
      v.union(v.literal("flat"), v.literal("usage"), v.literal("hybrid"))
    ),
    baseAmount: v.optional(v.number()),
    // Currency is intentionally excluded - it cannot be changed after plan creation
    interval: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("yearly"),
        v.literal("one-time")
      )
    ),
    trialDays: v.optional(v.number()), // Plan-specific trial period
    usageMetric: v.optional(v.string()),
    unitPrice: v.optional(v.number()),
    freeUnits: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("archived"))),
    mode: v.optional(v.union(v.literal("live"), v.literal("test"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Get the app to verify user has access
    const app = await ctx.db.get(plan.appId);
    if (!app) throw new Error("App not found");

    // Verify user is owner or admin of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Unauthorized");
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can update plans");
    }

    // Check if plan has active subscriptions - warn about impact
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    // Build updates object
    const updates: any = {};

    if (args.name !== undefined) {
      if (args.name.length < 3) {
        throw new Error("Plan name must be at least 3 characters");
      }
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    if (args.pricingModel !== undefined) {
      updates.pricingModel = args.pricingModel;
    }

    if (args.baseAmount !== undefined) {
      updates.baseAmount = args.baseAmount;
    }

    // Currency is intentionally not updatable to prevent revenue calculation issues

    if (args.interval !== undefined) {
      updates.interval = args.interval;
    }

    if (args.trialDays !== undefined) {
      updates.trialDays = args.trialDays;
    }

    if (args.usageMetric !== undefined) {
      updates.usageMetric = args.usageMetric;
    }

    if (args.unitPrice !== undefined) {
      updates.unitPrice = args.unitPrice;
    }

    if (args.freeUnits !== undefined) {
      updates.freeUnits = args.freeUnits;
    }

    if (args.status !== undefined) {
      updates.status = args.status;
    }

    if (args.mode !== undefined) {
      updates.mode = args.mode;
    }

    // Validate based on updated pricing model
    const finalPricingModel = args.pricingModel || plan.pricingModel;
    const finalBaseAmount =
      args.baseAmount !== undefined ? args.baseAmount : plan.baseAmount;
    const finalUsageMetric =
      args.usageMetric !== undefined ? args.usageMetric : plan.usageMetric;
    const finalUnitPrice =
      args.unitPrice !== undefined ? args.unitPrice : plan.unitPrice;

    if (finalPricingModel === "flat" && !finalBaseAmount) {
      throw new Error("Base amount is required for flat pricing");
    }

    if (finalPricingModel === "usage" || finalPricingModel === "hybrid") {
      if (!finalUsageMetric) {
        throw new Error("Usage metric is required for usage-based pricing");
      }
      if (!finalUnitPrice) {
        throw new Error("Unit price is required for usage-based pricing");
      }
    }

    // Update the plan
    await ctx.db.patch(args.planId, updates);

    // Send plan.updated webhook if there were actual changes
    if (Object.keys(updates).length > 0) {
      const updatedPlan = await ctx.db.get(args.planId);
      if (updatedPlan) {
        await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
          appId: plan.appId,
          event: "plan.updated",
          payload: {
            plan: updatedPlan,
            changes: updates,
            active_subscriptions: activeSubscriptions.length,
          },
        });
      }
    }

    return {
      success: true,
      message: "Plan updated successfully",
      hasActiveSubscriptions: activeSubscriptions.length > 0,
      affectedSubscriptions: activeSubscriptions.length,
    };
  },
});

// Delete a plan
export const deletePlan = mutation({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the plan
    const plan = await ctx.db.get(args.planId);
    if (!plan) throw new Error("Plan not found");

    // Get the app to verify user has access
    const app = await ctx.db.get(plan.appId);
    if (!app) throw new Error("App not found");

    // Verify user is owner or admin of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .first();

    if (!membership) throw new Error("Unauthorized");
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can delete plans");
    }

    // Check if plan has active subscriptions
    const activeSubscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_plan", (q) => q.eq("planId", args.planId))
      .filter((q) => q.neq(q.field("status"), "cancelled"))
      .collect();

    if (activeSubscriptions.length > 0) {
      throw new Error(
        `Cannot delete plan with ${activeSubscriptions.length} active subscription(s)`
      );
    }

    // Delete the plan
    await ctx.db.delete(args.planId);

    // Send plan.archived webhook (we use "archived" instead of "deleted" to be less confusing)
    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: plan.appId,
      event: "plan.archived",
      payload: {
        plan,
        reason: "deleted",
      },
    });

    return { success: true };
  },
});
