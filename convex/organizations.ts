import { query } from "./_generated/server";
import { getCurrentUser } from "./users";

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

    return organizations.filter(org => org.name); // Filter out any null orgs
  },
});