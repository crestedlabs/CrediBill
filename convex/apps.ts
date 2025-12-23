import { query } from "./_generated/server";
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

    return apps.map(app => ({
      _id: app._id,
      name: app.name,
      description: app.description,
      status: app.status,
      mode: app.mode,
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
      billingCycle: app.billingCycle,
    };
  },
});