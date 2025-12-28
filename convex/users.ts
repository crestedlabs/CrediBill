import { internalMutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name} ${data.last_name}`,
      externalUserId: data.id,
      email: data.email_addresses[0]?.email_address || "",
      status: "active" as const,
    };

    const existingUser = await userByExternalId(ctx, data.id);

    if (existingUser === null) {
      // Create new user
      const userId = await ctx.db.insert("users", userAttributes);

      // Create organization for new user
      const orgName = `${userAttributes.name}'s Organization`;
      const organizationId = await ctx.db.insert("organizations", {
        name: orgName,
        ownerUserId: userId,
      });

      // Add user as owner of the organization
      await ctx.db.insert("organizationMembers", {
        organizationId,
        userId,
        role: "owner",
      });
    } else {
      // Update existing user
      await ctx.db.patch(existingUser._id, userAttributes);
    }
  },
});

export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    const user = await userByExternalId(ctx, clerkUserId);

    if (user === null) {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`
      );
      return;
    }

    // Find all organizations owned by this user
    const ownedOrganizations = await ctx.db
      .query("organizations")
      .withIndex("by_owner", (q) => q.eq("ownerUserId", user._id))
      .collect();

    // Cascade delete for each owned organization
    for (const org of ownedOrganizations) {
      // Get all apps in this organization
      const apps = await ctx.db
        .query("apps")
        .withIndex("by_org", (q) => q.eq("organizationId", org._id))
        .collect();

      for (const app of apps) {
        // 1. Delete API Keys (ADDED - was missing)
        const apiKeys = await ctx.db
          .query("apiKeys")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const key of apiKeys) {
          await ctx.db.delete(key._id);
        }

        // 2. Delete Webhooks (ADDED - was missing)
        const webhooks = await ctx.db
          .query("webhooks")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const webhook of webhooks) {
          await ctx.db.delete(webhook._id);
        }

        // 3. Delete Payment Provider Credentials (ADDED - was missing)
        const credentials = await ctx.db
          .query("paymentProviderCredentials")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const cred of credentials) {
          await ctx.db.delete(cred._id);
        }

        // 4. Delete Payment Transactions (ADDED - was missing)
        const paymentTransactions = await ctx.db
          .query("paymentTransactions")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const transaction of paymentTransactions) {
          await ctx.db.delete(transaction._id);
        }

        // 5. Delete Webhook Logs (ADDED - was missing)
        const webhookLogs = await ctx.db
          .query("webhookLogs")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const log of webhookLogs) {
          await ctx.db.delete(log._id);
        }

        // 6. Delete Outgoing Webhook Logs (ADDED - was missing)
        const outgoingWebhookLogs = await ctx.db
          .query("outgoingWebhookLogs")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();
        for (const log of outgoingWebhookLogs) {
          await ctx.db.delete(log._id);
        }

        // Get all customers for this app (ORIGINAL CODE - unchanged)
        const customers = await ctx.db
          .query("customers")
          .withIndex("by_app", (q) => q.eq("appId", app._id))
          .collect();

        for (const customer of customers) {
          // Get all subscriptions for this customer
          const subscriptions = await ctx.db
            .query("subscriptions")
            .withIndex("by_customer", (q) => q.eq("customerId", customer._id))
            .collect();

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

            // Delete usage summaries for this subscription
            const usageSummaries = await ctx.db
              .query("usageSummaries")
              .withIndex("by_subscription_period", (q) =>
                q.eq("subscriptionId", subscription._id)
              )
              .collect();
            for (const summary of usageSummaries) {
              await ctx.db.delete(summary._id);
            }

            // Get all invoices for this subscription
            const invoices = await ctx.db
              .query("invoices")
              .withIndex("by_subscription", (q) =>
                q.eq("subscriptionId", subscription._id)
              )
              .collect();

            for (const invoice of invoices) {
              // Delete the invoice directly
              await ctx.db.delete(invoice._id);
            }

            // Delete the subscription
            await ctx.db.delete(subscription._id);
          }

          // Delete the customer
          await ctx.db.delete(customer._id);
        }

        // Delete all plans for this app
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

      // Delete all organization members
      const orgMembers = await ctx.db
        .query("organizationMembers")
        .withIndex("by_org", (q) => q.eq("organizationId", org._id))
        .collect();
      for (const member of orgMembers) {
        await ctx.db.delete(member._id);
      }

      // Delete the organization
      await ctx.db.delete(org._id);
    }

    // Finally, delete the user
    await ctx.db.delete(user._id);
  },
});

export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  return await userByExternalId(ctx, identity.subject);
}

async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalUserId", externalId))
    .unique();
}
