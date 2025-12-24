import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Get webhooks for a specific app
export const getWebhooksByApp = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Verify user has access to this app
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }

    // Check if user is a member of the organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You do not have access to this app");
    }

    // Get all webhooks for this app
    const webhooks = await ctx.db
      .query("webhooks")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    return webhooks;
  },
});

// Create a new webhook
export const createWebhook = mutation({
  args: {
    appId: v.id("apps"),
    url: v.string(),
    events: v.array(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get app
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can create webhooks");
    }

    // Validate URL format
    try {
      new URL(args.url);
    } catch {
      throw new Error("Invalid URL format");
    }

    // Validate events array is not empty
    if (args.events.length === 0) {
      throw new Error("At least one event must be selected");
    }

    // Create webhook
    const webhookId = await ctx.db.insert("webhooks", {
      organizationId: app.organizationId,
      appId: args.appId,
      url: args.url,
      events: args.events,
      status: args.status,
      description: args.description,
    });

    return {
      success: true,
      webhookId,
      message: "Webhook created successfully",
    };
  },
});

// Delete a webhook
export const deleteWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get webhook
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", webhook.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can delete webhooks");
    }

    // Delete webhook
    await ctx.db.delete(args.webhookId);

    return {
      success: true,
      message: "Webhook deleted successfully",
    };
  },
});

// Update webhook status (activate/deactivate)
export const updateWebhookStatus = mutation({
  args: {
    webhookId: v.id("webhooks"),
    status: v.union(v.literal("active"), v.literal("inactive")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get webhook
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", webhook.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can update webhooks");
    }

    // Update webhook status
    await ctx.db.patch(args.webhookId, {
      status: args.status,
    });

    return {
      success: true,
      message: `Webhook ${args.status === "active" ? "activated" : "deactivated"} successfully`,
    };
  },
});

// Update webhook details
export const updateWebhook = mutation({
  args: {
    webhookId: v.id("webhooks"),
    url: v.optional(v.string()),
    events: v.optional(v.array(v.string())),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get webhook
    const webhook = await ctx.db.get(args.webhookId);
    if (!webhook) {
      throw new Error("Webhook not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", webhook.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can update webhooks");
    }

    // Validate URL if provided
    if (args.url) {
      try {
        new URL(args.url);
      } catch {
        throw new Error("Invalid URL format");
      }
    }

    // Validate events array if provided
    if (args.events && args.events.length === 0) {
      throw new Error("At least one event must be selected");
    }

    // Build update object with only provided fields
    const updates: {
      url?: string;
      events?: string[];
      description?: string;
    } = {};

    if (args.url !== undefined) updates.url = args.url;
    if (args.events !== undefined) updates.events = args.events;
    if (args.description !== undefined) updates.description = args.description;

    // Update webhook
    await ctx.db.patch(args.webhookId, updates);

    return {
      success: true,
      message: "Webhook updated successfully",
    };
  },
});
