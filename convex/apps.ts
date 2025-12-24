import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

export const getUserApps = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, { organizationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    let targetOrgId = organizationId;

    // If no organizationId provided, get user's first organization
    if (!targetOrgId) {
      const membership = await ctx.db
        .query("organizationMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();

      if (!membership) throw new Error("No organization access");
      targetOrgId = membership.organizationId;
    }

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", targetOrgId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Get all apps for the organization
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_org", (q) => q.eq("organizationId", targetOrgId))
      .collect();

    return apps.map((app) => ({
      _id: app._id,
      name: app.name,
      description: app.description,
      status: app.status,
      mode: app.mode,
      _creationTime: app._creationTime,
    }));
  },
});

export const getAppSettings = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const app = await ctx.db.get(appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to this app's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to app");

    return {
      _id: app._id,
      name: app.name,
      defaultCurrency: app.defaultCurrency,
      timezone: app.timezone,
      language: app.language,
      defaultPaymentMethod: app.defaultPaymentMethod,
      retryPolicy: app.retryPolicy,
      defaultTrialLength: app.defaultTrialLength,
      gracePeriod: app.gracePeriod,
      // Advanced settings with defaults
      allowPlanDowngrades: app.allowPlanDowngrades ?? true,
      requireBillingAddress: app.requireBillingAddress ?? false,
      enableProration: app.enableProration ?? true,
      autoSuspendOnFailedPayment: app.autoSuspendOnFailedPayment ?? true,
    };
  },
});

export const createApp = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    organizationId: v.id("organizations"),
    defaultCurrency: v.union(
      v.literal("ugx"),
      v.literal("kes"),
      v.literal("tzs"),
      v.literal("rwf"),
      v.literal("usd")
    ),
    timezone: v.union(v.literal("eat"), v.literal("cat"), v.literal("wat")),
    language: v.union(v.literal("en"), v.literal("sw"), v.literal("fr")),
    defaultPaymentMethod: v.union(
      v.literal("momo"),
      v.literal("credit-card"),
      v.literal("bank")
    ),
    retryPolicy: v.union(
      v.literal("automatic"),
      v.literal("manual"),
      v.literal("none")
    ),
    defaultTrialLength: v.number(),
    gracePeriod: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", args.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    // Validate name
    if (!args.name || args.name.trim().length < 3) {
      throw new Error("App name must be at least 3 characters");
    }

    // Validate numbers
    if (args.defaultTrialLength < 0 || args.defaultTrialLength > 365) {
      throw new Error("Trial length must be between 0 and 365 days");
    }

    if (args.gracePeriod < 0 || args.gracePeriod > 30) {
      throw new Error("Grace period must be between 0 and 30 days");
    }

    // Create the app
    const appId = await ctx.db.insert("apps", {
      name: args.name.trim(),
      description: args.description?.trim() || undefined,
      organizationId: args.organizationId,
      status: "active",
      mode: "test", // Start in test mode by default
      defaultCurrency: args.defaultCurrency,
      timezone: args.timezone,
      language: args.language,
      defaultPaymentMethod: args.defaultPaymentMethod,
      retryPolicy: args.retryPolicy,
      defaultTrialLength: args.defaultTrialLength,
      gracePeriod: args.gracePeriod,
    });

    return {
      success: true,
      appId,
      message: "App created successfully",
    };
  },
});

export const updateAppSettings = mutation({
  args: {
    appId: v.id("apps"),
    // General settings
    defaultCurrency: v.optional(
      v.union(
        v.literal("ugx"),
        v.literal("kes"),
        v.literal("tzs"),
        v.literal("rwf"),
        v.literal("usd")
      )
    ),
    timezone: v.optional(
      v.union(v.literal("eat"), v.literal("cat"), v.literal("wat"))
    ),
    language: v.optional(
      v.union(v.literal("en"), v.literal("sw"), v.literal("fr"))
    ),
    // Billing settings
    defaultPaymentMethod: v.optional(
      v.union(v.literal("momo"), v.literal("credit-card"), v.literal("bank"))
    ),
    retryPolicy: v.optional(
      v.union(v.literal("automatic"), v.literal("manual"), v.literal("none"))
    ),
    defaultTrialLength: v.optional(v.number()),
    gracePeriod: v.optional(v.number()),
    // Advanced settings
    allowPlanDowngrades: v.optional(v.boolean()),
    requireBillingAddress: v.optional(v.boolean()),
    enableProration: v.optional(v.boolean()),
    autoSuspendOnFailedPayment: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user is owner or admin of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can update app settings");
    }

    // Prepare update object with only provided fields
    const updates: any = {};
    if (args.defaultCurrency !== undefined) {
      updates.defaultCurrency = args.defaultCurrency;
    }
    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }
    if (args.language !== undefined) {
      updates.language = args.language;
    }
    if (args.defaultPaymentMethod !== undefined) {
      updates.defaultPaymentMethod = args.defaultPaymentMethod;
    }
    if (args.retryPolicy !== undefined) {
      updates.retryPolicy = args.retryPolicy;
    }
    if (args.defaultTrialLength !== undefined) {
      // Validate trial length
      if (args.defaultTrialLength < 0 || args.defaultTrialLength > 365) {
        throw new Error("Trial length must be between 0 and 365 days");
      }
      updates.defaultTrialLength = args.defaultTrialLength;
    }
    if (args.gracePeriod !== undefined) {
      // Validate grace period
      if (args.gracePeriod < 0 || args.gracePeriod > 30) {
        throw new Error("Grace period must be between 0 and 30 days");
      }
      updates.gracePeriod = args.gracePeriod;
    }
    if (args.allowPlanDowngrades !== undefined) {
      updates.allowPlanDowngrades = args.allowPlanDowngrades;
    }
    if (args.requireBillingAddress !== undefined) {
      updates.requireBillingAddress = args.requireBillingAddress;
    }
    if (args.enableProration !== undefined) {
      updates.enableProration = args.enableProration;
    }
    if (args.autoSuspendOnFailedPayment !== undefined) {
      updates.autoSuspendOnFailedPayment = args.autoSuspendOnFailedPayment;
    }

    // Update the app
    await ctx.db.patch(args.appId, updates);

    return {
      success: true,
      message: "Settings updated successfully",
    };
  },
});

export const deleteApp = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, { appId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(appId);
    if (!app) throw new Error("App not found");

    // Verify user is owner or admin of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can delete apps");
    }

    // CASCADE DELETE: Delete all related data

    // 1. Delete API Keys
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const key of apiKeys) {
      await ctx.db.delete(key._id);
    }

    // 2. Delete Webhooks
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const webhook of webhooks) {
      await ctx.db.delete(webhook._id);
    }

    // 3. Delete Payments (must be before invoices)
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const payment of payments) {
      await ctx.db.delete(payment._id);
    }

    // 4. Delete Invoices (must be before subscriptions)
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const invoice of invoices) {
      await ctx.db.delete(invoice._id);
    }

    // 5. Delete Usage Summaries (must be before subscriptions)
    const usageSummaries = await ctx.db
      .query("usageSummaries")
      .filter((q) => q.eq(q.field("appId"), appId))
      .collect();
    for (const summary of usageSummaries) {
      await ctx.db.delete(summary._id);
    }

    // 6. Delete Usage Events (must be before subscriptions)
    const usageEvents = await ctx.db
      .query("usageEvents")
      .filter((q) => q.eq(q.field("appId"), appId))
      .collect();
    for (const event of usageEvents) {
      await ctx.db.delete(event._id);
    }

    // 7. Delete Subscriptions (must be before customers and plans)
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const subscription of subscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // 8. Delete Plans
    const plans = await ctx.db
      .query("plans")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const plan of plans) {
      await ctx.db.delete(plan._id);
    }

    // 9. Delete Customers
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const customer of customers) {
      await ctx.db.delete(customer._id);
    }

    // 10. Finally, delete the app itself
    await ctx.db.delete(appId);

    return {
      success: true,
      message: "App and all associated data deleted successfully",
      deletedCounts: {
        apiKeys: apiKeys.length,
        webhooks: webhooks.length,
        payments: payments.length,
        invoices: invoices.length,
        usageSummaries: usageSummaries.length,
        usageEvents: usageEvents.length,
        subscriptions: subscriptions.length,
        plans: plans.length,
        customers: customers.length,
      },
    };
  },
});
