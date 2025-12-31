import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// Internal query to get an app by ID (no auth check)
export const get = internalQuery({
  args: { id: v.id("apps") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get a single app by ID
export const getAppById = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    return app;
  },
});

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

    return apps;
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
      mode: app.mode ?? "test", // Default to test mode if not set
      paymentProviderId: app.paymentProviderId, // Payment provider ID (immutable)
      defaultCurrency: app.defaultCurrency,
      timezone: app.timezone,
      language: app.language,
      defaultPaymentMethod: app.defaultPaymentMethod,
      retryPolicy: app.retryPolicy,
      gracePeriod: app.gracePeriod,
      // Webhook configuration
      webhookUrl: app.webhookUrl,
      webhookSecret: app.webhookSecret,
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
    paymentProviderId: v.id("providerCatalog"),
    defaultCurrency: v.union(
      v.literal("ugx"),
      v.literal("kes"),
      v.literal("tzs"),
      v.literal("rwf"),
      v.literal("usd")
    ),
    timezone: v.optional(
      v.union(v.literal("eat"), v.literal("cat"), v.literal("wat"))
    ), // DEPRECATED: May return when timezone-aware billing is implemented
    language: v.union(v.literal("en"), v.literal("sw"), v.literal("fr")),
    defaultPaymentMethod: v.optional(
      v.union(v.literal("momo"), v.literal("credit-card"), v.literal("bank"))
    ), // DEPRECATED: Use payment provider configuration
    retryPolicy: v.union(
      v.literal("automatic"),
      v.literal("manual"),
      v.literal("none")
    ),
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
      paymentProviderId: args.paymentProviderId, // IMMUTABLE - cannot be changed after creation
      defaultCurrency: args.defaultCurrency,
      timezone: args.timezone || "eat", // DEPRECATED: fallback to EAT for backward compatibility
      language: args.language,
      defaultPaymentMethod: args.defaultPaymentMethod || "momo", // DEPRECATED: fallback for backward compatibility
      retryPolicy: args.retryPolicy,
      gracePeriod: args.gracePeriod, // Recommended: 7 days (industry standard)
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

// Update app name
export const updateAppName = mutation({
  args: {
    appId: v.id("apps"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Validate name
    if (args.name.length < 3) {
      throw new Error("App name must be at least 3 characters");
    }
    if (args.name.length > 100) {
      throw new Error("App name must be less than 100 characters");
    }

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
      throw new Error("Only owners and admins can rename apps");
    }

    // Check if another app with the same name exists in this organization
    const existingApp = await ctx.db
      .query("apps")
      .withIndex("by_org", (q) => q.eq("organizationId", app.organizationId))
      .filter((q) => q.eq(q.field("name"), args.name))
      .first();

    if (existingApp && existingApp._id !== args.appId) {
      throw new Error(
        "An app with this name already exists in your organization"
      );
    }

    // Update the app name
    await ctx.db.patch(args.appId, { name: args.name });

    return {
      success: true,
      message: "App name updated successfully",
    };
  },
});

export const updateAppMode = mutation({
  args: {
    appId: v.id("apps"),
    mode: v.union(v.literal("live"), v.literal("test")),
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
      throw new Error("Only owners and admins can change app mode");
    }

    // Update the app mode
    await ctx.db.patch(args.appId, { mode: args.mode });

    return {
      success: true,
      message: `App mode changed to ${args.mode}`,
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

    // 3. Delete Payment Provider Credentials
    const credentials = await ctx.db
      .query("paymentProviderCredentials")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const cred of credentials) {
      await ctx.db.delete(cred._id);
    }

    // 4. Delete Payment Transactions
    const paymentTransactions = await ctx.db
      .query("paymentTransactions")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const transaction of paymentTransactions) {
      await ctx.db.delete(transaction._id);
    }

    // 5. Delete Webhook Logs (incoming)
    const webhookLogs = await ctx.db
      .query("webhookLogs")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const log of webhookLogs) {
      await ctx.db.delete(log._id);
    }

    // 6. Delete Outgoing Webhook Logs
    const outgoingWebhookLogs = await ctx.db
      .query("outgoingWebhookLogs")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const log of outgoingWebhookLogs) {
      await ctx.db.delete(log._id);
    }

    // 7. Delete Invoices (must be before subscriptions)
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .collect();
    for (const invoice of invoices) {
      await ctx.db.delete(invoice._id);
    }

    // 9. Delete Usage Summaries (must be before subscriptions)
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
        credentials: credentials.length,
        paymentTransactions: paymentTransactions.length,
        webhookLogs: webhookLogs.length,
        outgoingWebhookLogs: outgoingWebhookLogs.length,
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

/**
 * Update webhook configuration for an app
 */
export const updateWebhookConfig = mutation({
  args: {
    appId: v.id("apps"),
    webhookUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership || membership.role === "viewer")
      throw new Error("Insufficient permissions");

    // Generate webhook secret if not exists or if URL changed
    let webhookSecret = app.webhookSecret;
    if (!webhookSecret || args.webhookUrl !== app.webhookUrl) {
      // Generate a secure random secret
      webhookSecret = `whsec_${Array.from({ length: 32 }, () =>
        Math.random().toString(36).charAt(2)
      ).join("")}`;
    }

    // Update webhook config
    await ctx.db.patch(args.appId, {
      webhookUrl: args.webhookUrl,
      webhookSecret,
    });

    return {
      success: true,
      webhookSecret, // Return the secret so UI can display it
    };
  },
});

/**
 * Test webhook by sending a test event
 */
export const testWebhook = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    if (!app.webhookUrl) {
      return {
        success: false,
        message:
          "No webhook URL configured. Please set a webhook URL in your app settings before testing webhooks.",
      };
    }

    // Verify user has access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied");

    // Queue a test webhook
    const { internal } = await import("./_generated/api");
    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: args.appId,
      event: "test.webhook",
      payload: {
        message: "This is a test webhook",
        timestamp: Date.now(),
      },
    });

    return { success: true };
  },
});
