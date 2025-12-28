import { query, mutation } from "./_generated/server";
import { getCurrentUser } from "./users";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Create a new customer for an app
 * Email must be unique within the app
 */
export const createCustomer = mutation({
  args: {
    appId: v.id("apps"),
    email: v.string(),
    phone: v.optional(v.string()),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    externalCustomerId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    type: v.optional(v.union(v.literal("individual"), v.literal("business"))),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the app to verify it exists and get organizationId
    const app = await ctx.db.get(args.appId);
    if (!app) throw new ConvexError("App not found");

    // Verify user has access to the organization that owns this app
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied to organization");

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new ConvexError("Invalid email format");
    }

    // Check if customer with this email already exists in this app
    const existingCustomer = await ctx.db
      .query("customers")
      .withIndex("by_app_email", (q) =>
        q.eq("appId", args.appId).eq("email", args.email)
      )
      .unique();

    if (existingCustomer) {
      throw new ConvexError(
        "Customer with this email already exists in this app"
      );
    }

    // Create the customer
    const customerId = await ctx.db.insert("customers", {
      organizationId: app.organizationId,
      appId: args.appId,
      email: args.email,
      phone: args.phone,
      first_name: args.first_name,
      last_name: args.last_name,
      externalCustomerId: args.externalCustomerId,
      metadata: args.metadata,
      type: args.type || "individual",
      status: args.status || "active",
    });

    // Send customer.created webhook
    const customer = await ctx.db.get(customerId);
    if (customer) {
      await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
        appId: args.appId,
        event: "customer.created",
        payload: {
          customer,
        },
      });
    }

    return customerId;
  },
});

/**
 * List all customers for a specific app
 * Supports pagination and search
 */
export const listCustomers = query({
  args: {
    appId: v.id("apps"),
    search: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the app to verify access
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

    // Get customers using search index if search term provided
    let customers;

    if (args.search && args.search.trim().length > 0) {
      // Use full-text search on email field
      customers = await ctx.db
        .query("customers")
        .withSearchIndex("search_customers", (q) =>
          q.search("email", args.search!).eq("appId", args.appId)
        )
        .collect();

      // Also search in name and phone fields manually (since search index only supports one field)
      const searchLower = args.search.toLowerCase();
      const allCustomers = await ctx.db
        .query("customers")
        .withIndex("by_app", (q) => q.eq("appId", args.appId))
        .collect();

      const namePhoneMatches = allCustomers.filter(
        (c) =>
          c.first_name?.toLowerCase().includes(searchLower) ||
          c.last_name?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(args.search!)
      );

      // Combine and deduplicate results
      const customerMap = new Map();
      [...customers, ...namePhoneMatches].forEach((c) =>
        customerMap.set(c._id, c)
      );
      customers = Array.from(customerMap.values());
    } else {
      // No search term, get all customers for app
      customers = await ctx.db
        .query("customers")
        .withIndex("by_app", (q) => q.eq("appId", args.appId))
        .collect();
    }

    // Filter by status if provided
    if (args.status) {
      customers = customers.filter((c) => c.status === args.status);
    }

    // For each customer, get their subscription count
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const subscriptions = await ctx.db
          .query("subscriptions")
          .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
          .collect();

        const activeSubscriptions = subscriptions.filter(
          (s) => s.status === "active" || s.status === "trialing"
        );

        return {
          ...customer,
          subscriptionCount: subscriptions.length,
          activeSubscriptionCount: activeSubscriptions.length,
        };
      })
    );

    return customersWithStats;
  },
});

/**
 * Get a single customer with full details
 */
export const getCustomer = query({
  args: {
    customerId: v.id("customers"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError("Customer not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", customer.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    // Get customer's subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    // Get subscription details with plan info
    const subscriptionsWithPlans = await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = await ctx.db.get(sub.planId);
        return {
          ...sub,
          plan,
        };
      })
    );

    // Get customer's invoices
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    return {
      ...customer,
      subscriptions: subscriptionsWithPlans,
      invoices,
    };
  },
});

/**
 * Update customer information
 */
export const updateCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    externalCustomerId: v.optional(v.string()),
    metadata: v.optional(v.any()),
    type: v.optional(v.union(v.literal("individual"), v.literal("business"))),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError("Customer not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", customer.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    // If email is being changed, check for uniqueness
    if (args.email && args.email !== customer.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(args.email)) {
        throw new ConvexError("Invalid email format");
      }

      const existingCustomer = await ctx.db
        .query("customers")
        .withIndex("by_app_email", (q) =>
          q.eq("appId", customer.appId).eq("email", args.email!)
        )
        .unique();

      if (existingCustomer) {
        throw new ConvexError(
          "Customer with this email already exists in this app"
        );
      }
    }

    // Build update object with only provided fields
    const updates: any = {};
    if (args.email !== undefined) updates.email = args.email;
    if (args.phone !== undefined) updates.phone = args.phone;
    if (args.first_name !== undefined) updates.first_name = args.first_name;
    if (args.last_name !== undefined) updates.last_name = args.last_name;
    if (args.externalCustomerId !== undefined)
      updates.externalCustomerId = args.externalCustomerId;
    if (args.metadata !== undefined) updates.metadata = args.metadata;
    if (args.type !== undefined) updates.type = args.type;
    if (args.status !== undefined) updates.status = args.status;

    // Update the customer
    await ctx.db.patch(args.customerId, updates);

    // Send customer.updated webhook if there were actual changes
    if (Object.keys(updates).length > 0) {
      const updatedCustomer = await ctx.db.get(args.customerId);
      if (updatedCustomer) {
        await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
          appId: customer.appId,
          event: "customer.updated",
          payload: {
            customer: updatedCustomer,
            changes: updates,
          },
        });
      }
    }

    return args.customerId;
  },
});

/**
 * Delete a customer
 * Includes cascade checks - prevents deletion if customer has active subscriptions
 */
export const deleteCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    force: v.optional(v.boolean()), // Force delete even with subscriptions (will cascade)
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new ConvexError("Unauthorized");

    // Get the customer
    const customer = await ctx.db.get(args.customerId);
    if (!customer) throw new ConvexError("Customer not found");

    // Verify user has access to the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", customer.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new ConvexError("Access denied");

    // Check for active subscriptions
    const subscriptions = await ctx.db
      .query("subscriptions")
      .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
      .collect();

    const activeSubscriptions = subscriptions.filter(
      (s) => s.status === "active" || s.status === "trialing"
    );

    if (activeSubscriptions.length > 0 && !args.force) {
      throw new ConvexError(
        `Cannot delete customer with ${activeSubscriptions.length} active subscription(s). Cancel subscriptions first or use force delete.`
      );
    }

    // Auto-delete cancelled/expired subscriptions (they're no longer needed)
    const inactiveSubscriptions = subscriptions.filter(
      (s) => s.status === "cancelled" || s.status === "expired"
    );
    
    for (const subscription of inactiveSubscriptions) {
      await ctx.db.delete(subscription._id);
    }

    // If force delete, cascade delete related data
    if (args.force && subscriptions.length > 0) {
      for (const subscription of subscriptions) {
        // Delete usage events for this subscription
        const usageEvents = await ctx.db
          .query("usageEvents")
          .withIndex("by_subscription", (q) =>
            q.eq("subscriptionId", subscription._id)
          )
          .collect();

        for (const event of usageEvents) {
          await ctx.db.delete(event._id);
        }

        // Delete usage summaries
        const usageSummaries = await ctx.db
          .query("usageSummaries")
          .withIndex("by_subscription_period", (q) =>
            q.eq("subscriptionId", subscription._id)
          )
          .collect();

        for (const summary of usageSummaries) {
          await ctx.db.delete(summary._id);
        }

        // Delete the subscription
        await ctx.db.delete(subscription._id);
      }

      // Delete invoices
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
        .collect();

      for (const invoice of invoices) {
        await ctx.db.delete(invoice._id);
      }
    }

    // Delete the customer
    await ctx.db.delete(args.customerId);

    // Send customer.deleted webhook
    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: customer.appId,
      event: "customer.deleted",
      payload: {
        customer,
        force_deleted: !!args.force,
        cascaded_subscriptions: args.force ? subscriptions.length : 0,
      },
    });

    return { success: true };
  },
});
