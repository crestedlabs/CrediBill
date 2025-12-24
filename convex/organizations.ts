import { v } from "convex/values";
import { internalQuery, mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

export const createOrganization = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, { name }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Validate the organization name
    if (!name || name.trim().length < 3) {
      throw new Error("Organization name must be at least 3 characters");
    }

    // Create the organization
    const organizationId = await ctx.db.insert("organizations", {
      name: name.trim(),
      ownerUserId: user._id,
    });

    // Add the creator as the owner in organization members
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: user._id,
      role: "owner",
    });

    return {
      success: true,
      organizationId,
      message: "Organization created successfully",
    };
  },
});

export const getUserOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get all organization memberships for this user
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get the organization details for each membership
    const organizations = await Promise.all(
      memberships.map(async (membership) => {
        const org = await ctx.db.get(membership.organizationId);
        return {
          _id: org?._id,
          name: org?.name,
          role: membership.role,
        };
      })
    );

    return organizations.filter((org) => org.name); // Filter out any null orgs
  },
});

export const renameOrg = mutation({
  args: {
    organizationId: v.id("organizations"),
    newName: v.string(),
  },
  handler: async (ctx, { organizationId, newName }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Validate the new name
    if (!newName || newName.trim().length === 0) {
      throw new Error("Organization name cannot be empty");
    }

    // Get the organization
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error("Organization not found");

    // Verify user is a member of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    // Check if user has owner role
    if (membership.role !== "owner") {
      throw new Error(
        "Access denied: Only organization owners can rename the organization"
      );
    }

    // Update the organization name
    await ctx.db.patch(organizationId, {
      name: newName.trim(),
    });

    return { success: true, newName: newName.trim() };
  },
});

export const deleteOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the organization
    const organization = await ctx.db.get(organizationId);
    if (!organization) throw new Error("Organization not found");

    // Verify user is a member of this organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    // Check if user has owner role
    if (membership.role !== "owner") {
      throw new Error(
        "Access denied: Only organization owners can delete the organization"
      );
    }

    // Get all apps in the organization to cascade delete
    const apps = await ctx.db
      .query("apps")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Delete all related data for each app
    for (const app of apps) {
      // Delete customers
      const customers = await ctx.db
        .query("customers")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();

      for (const customer of customers) {
        await ctx.db.delete(customer._id);
      }

      // Delete plans
      const plans = await ctx.db
        .query("plans")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();

      for (const plan of plans) {
        await ctx.db.delete(plan._id);
      }

      // Delete the app
      await ctx.db.delete(app._id);
    }

    // Delete all organization memberships
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    for (const m of memberships) {
      await ctx.db.delete(m._id);
    }

    // Finally, delete the organization
    await ctx.db.delete(organizationId);

    return {
      success: true,
      deletedApps: apps.length,
      message: "Organization and all associated data deleted successfully",
    };
  },
});
