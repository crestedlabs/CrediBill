/**
 * Payment Provider Credentials Management
 * Stores and manages API credentials for the app's selected payment provider
 * NOTE: Provider selection (which provider) is immutable in apps.paymentProviderId
 * This only manages the credentials (keys/secrets)
 */

import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";

/**
 * Get payment provider credentials for an app
 */
export const getCredentials = query({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    // Get credentials for this app
    const credentials = await ctx.db
      .query("paymentProviderCredentials")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .unique();

    return credentials;
  },
});

/**
 * Get payment provider credentials for an app (internal version for payment processing)
 */
export const getCredentialsInternal = internalQuery({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    // Get credentials for this app
    const credentials = await ctx.db
      .query("paymentProviderCredentials")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .unique();

    return credentials;
  },
});

/**
 * Save or update payment provider credentials
 * TODO: Implement encryption for secretKeyEncrypted field
 */
export const saveCredentials = mutation({
  args: {
    appId: v.id("apps"),
    credentials: v.object({
      publicKey: v.optional(v.string()),
      secretKey: v.string(), // Will be encrypted before storage
      merchantId: v.optional(v.string()),
      apiUrl: v.optional(v.string()),
    }),
    environment: v.union(v.literal("test"), v.literal("live")),
    webhookSecret: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get the app to verify it has a payment provider selected
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }

    if (!app.paymentProviderId) {
      throw new Error(
        "App does not have a payment provider configured. Please create a new app with a provider selected."
      );
    }

    // Check if credentials already exist
    const existing = await ctx.db
      .query("paymentProviderCredentials")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .unique();

    // TODO: Encrypt the secret key before storing
    const secretKeyEncrypted = args.credentials.secretKey; // Placeholder - implement encryption

    const credentialsData = {
      organizationId: app.organizationId,
      appId: args.appId,
      credentials: {
        publicKey: args.credentials.publicKey,
        secretKeyEncrypted,
        merchantId: args.credentials.merchantId,
        apiUrl: args.credentials.apiUrl,
      },
      environment: args.environment,
      webhookSecret: args.webhookSecret,
      connectionStatus: "pending" as const,
      updatedAt: Date.now(),
      updatedBy: user._id,
    };

    if (existing) {
      // Update existing credentials
      await ctx.db.patch(existing._id, credentialsData);
      return { success: true, credentialsId: existing._id };
    } else {
      // Create new credentials record
      const credentialsId = await ctx.db.insert("paymentProviderCredentials", {
        ...credentialsData,
        createdAt: Date.now(),
      });
      return { success: true, credentialsId };
    }
  },
});

/**
 * Delete payment provider credentials
 */
export const deleteCredentials = mutation({
  args: { appId: v.id("apps") },
  handler: async (ctx, { appId }) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    const credentials = await ctx.db
      .query("paymentProviderCredentials")
      .withIndex("by_app", (q) => q.eq("appId", appId))
      .unique();

    if (credentials) {
      await ctx.db.delete(credentials._id);
    }

    return { success: true };
  },
});
