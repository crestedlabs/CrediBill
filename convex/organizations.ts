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

    const trimmedName = name.trim();

    // Check if user already has an organization with this name
    const existingMemberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get all organizations this user is a member of
    const existingOrgs = await Promise.all(
      existingMemberships.map((membership) =>
        ctx.db.get(membership.organizationId)
      )
    );

    // Check for duplicate names (case-insensitive)
    const duplicateName = existingOrgs.find(
      (org) => org && org.name.toLowerCase() === trimmedName.toLowerCase()
    );

    if (duplicateName) {
      throw new Error("You already have an organization with this name");
    }

    // Create the organization
    const organizationId = await ctx.db.insert("organizations", {
      name: trimmedName,
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

export const getOrganizationMembers = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, { organizationId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

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

    // Get all members
    const memberships = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org", (q) => q.eq("organizationId", organizationId))
      .collect();

    // Get user details for each member
    const members = await Promise.all(
      memberships.map(async (m) => {
        const userDoc = await ctx.db.get(m.userId);
        return {
          _id: m._id,
          userId: m.userId,
          name: userDoc?.name || "Unknown",
          email: userDoc?.email || "",
          role: m.role,
        };
      })
    );

    return members;
  },
});

export const inviteMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("member"), v.literal("viewer")),
  },
  handler: async (ctx, { organizationId, email, role }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Verify user is owner or admin of this organization
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

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error(
        "Access denied: Only owners and admins can invite members"
      );
    }

    // Validate email
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      throw new Error("Invalid email address");
    }

    // Check if user exists in the system
    const invitedUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .unique();

    if (!invitedUser) {
      throw new Error(
        "User not found. They must create an account first before being invited."
      );
    }

    // Check if user is already a member
    const existingMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", organizationId).eq("userId", invitedUser._id)
      )
      .unique();

    if (existingMembership) {
      throw new Error("This user is already a member of this organization");
    }

    // Add user to organization
    await ctx.db.insert("organizationMembers", {
      organizationId,
      userId: invitedUser._id,
      role,
    });

    return {
      success: true,
      message: `${invitedUser.name} has been added to the organization`,
    };
  },
});

export const updateMemberRole = mutation({
  args: {
    membershipId: v.id("organizationMembers"),
    newRole: v.union(
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
  },
  handler: async (ctx, { membershipId, newRole }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the membership to update
    const targetMembership = await ctx.db.get(membershipId);
    if (!targetMembership) throw new Error("Membership not found");

    // Verify user is owner or admin of this organization
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", targetMembership.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!userMembership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    if (userMembership.role !== "owner" && userMembership.role !== "admin") {
      throw new Error(
        "Access denied: Only owners and admins can change member roles"
      );
    }

    // Prevent changing owner role
    if (targetMembership.role === "owner") {
      throw new Error("Cannot change the role of the organization owner");
    }

    // Prevent non-owners from creating admins
    if (newRole === "admin" && userMembership.role !== "owner") {
      throw new Error("Only owners can promote members to admin");
    }

    // Update the role
    await ctx.db.patch(membershipId, {
      role: newRole,
    });

    return { success: true, message: "Member role updated successfully" };
  },
});

export const removeMember = mutation({
  args: {
    membershipId: v.id("organizationMembers"),
  },
  handler: async (ctx, { membershipId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the membership to remove
    const targetMembership = await ctx.db.get(membershipId);
    if (!targetMembership) throw new Error("Membership not found");

    // Verify user is owner or admin of this organization
    const userMembership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q
          .eq("organizationId", targetMembership.organizationId)
          .eq("userId", user._id)
      )
      .unique();

    if (!userMembership) {
      throw new Error(
        "Access denied: You are not a member of this organization"
      );
    }

    if (userMembership.role !== "owner" && userMembership.role !== "admin") {
      throw new Error(
        "Access denied: Only owners and admins can remove members"
      );
    }

    // Prevent removing the owner
    if (targetMembership.role === "owner") {
      throw new Error(
        "Cannot remove the organization owner. Transfer ownership or delete the organization instead."
      );
    }

    // Delete the membership
    await ctx.db.delete(membershipId);

    return { success: true, message: "Member removed successfully" };
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
      // 1. Delete API Keys
      const apiKeys = await ctx.db
        .query("apiKeys")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const key of apiKeys) {
        await ctx.db.delete(key._id);
      }

      // 2. Delete Webhooks
      const webhooks = await ctx.db
        .query("webhooks")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const webhook of webhooks) {
        await ctx.db.delete(webhook._id);
      }

      // 3. Delete Payment Provider Credentials
      const credentials = await ctx.db
        .query("paymentProviderCredentials")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const cred of credentials) {
        await ctx.db.delete(cred._id);
      }

      // 4. Delete Payment Transactions
      const paymentTransactions = await ctx.db
        .query("paymentTransactions")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const transaction of paymentTransactions) {
        await ctx.db.delete(transaction._id);
      }

      // 5. Delete Webhook Logs
      const webhookLogs = await ctx.db
        .query("webhookLogs")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const log of webhookLogs) {
        await ctx.db.delete(log._id);
      }

      // 6. Delete Outgoing Webhook Logs
      const outgoingWebhookLogs = await ctx.db
        .query("outgoingWebhookLogs")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const log of outgoingWebhookLogs) {
        await ctx.db.delete(log._id);
      }

      // 7. Delete Invoices
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const invoice of invoices) {
        await ctx.db.delete(invoice._id);
      }

      // 8. Delete Usage Summaries
      const usageSummaries = await ctx.db
        .query("usageSummaries")
        .filter((q) => q.eq(q.field("appId"), app._id))
        .collect();
      for (const summary of usageSummaries) {
        await ctx.db.delete(summary._id);
      }

      // 9. Delete Usage Events
      const usageEvents = await ctx.db
        .query("usageEvents")
        .filter((q) => q.eq(q.field("appId"), app._id))
        .collect();
      for (const event of usageEvents) {
        await ctx.db.delete(event._id);
      }

      // 10. Delete Subscriptions
      const subscriptions = await ctx.db
        .query("subscriptions")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const subscription of subscriptions) {
        await ctx.db.delete(subscription._id);
      }

      // 11. Delete Plans
      const plans = await ctx.db
        .query("plans")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const plan of plans) {
        await ctx.db.delete(plan._id);
      }

      // 12. Delete Customers
      const customers = await ctx.db
        .query("customers")
        .withIndex("by_app", (q) => q.eq("appId", app._id))
        .collect();
      for (const customer of customers) {
        await ctx.db.delete(customer._id);
      }

      // 13. Delete the app
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
