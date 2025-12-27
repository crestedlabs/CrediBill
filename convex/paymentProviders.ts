/**
 * Payment Providers Backend Functions
 * Manage payment provider connections for apps
 */

import { v } from "convex/values";
import {
  mutation,
  query,
  action,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { getSupportedProviders } from "./lib/paymentAdapters";

/**
 * Add a new payment provider to an app (Action wrapper)
 */
export const addPaymentProvider = action({
  args: {
    appId: v.id("apps"),
    provider: v.union(
      v.literal("flutterwave"),
      v.literal("pawapay"),
      v.literal("pesapal"),
      v.literal("dpo"),
      v.literal("paystack"),
      v.literal("stripe")
    ),
    credentials: v.object({
      publicKey: v.optional(v.string()),
      secretKey: v.string(),
      merchantId: v.optional(v.string()),
      apiUrl: v.optional(v.string()),
    }),
    environment: v.union(v.literal("test"), v.literal("live")),
    webhookSecret: v.optional(v.string()),
    supportedMethods: v.array(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; providerId?: string; message: string }> => {
    // Call internal action that handles encryption (with "use node")
    return await ctx.runAction(
      internal.paymentProvidersNode.addPaymentProviderInternal,
      args
    );
  },
});

/**
 * Internal mutation to save provider (after encryption)
 */
export const savePaymentProvider = internalMutation({
  args: {
    appId: v.id("apps"),
    provider: v.string(),
    credentials: v.object({
      publicKey: v.optional(v.string()),
      secretKey: v.string(),
      merchantId: v.optional(v.string()),
      apiUrl: v.optional(v.string()),
    }),
    secretKeyEncrypted: v.string(),
    environment: v.union(v.literal("test"), v.literal("live")),
    webhookSecret: v.optional(v.string()),
    supportedMethods: v.array(v.string()),
    isPrimary: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get app
    const app = await ctx.db.get(args.appId);
    if (!app) {
      throw new Error("App not found");
    }

    // Get current user (for addedBy field)
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // If this should be primary, unset other primary providers
    if (args.isPrimary) {
      const existingProviders = await ctx.db
        .query("paymentProviders")
        .withIndex("by_app", (q) => q.eq("appId", args.appId))
        .collect();

      for (const provider of existingProviders) {
        if (provider.isPrimary) {
          await ctx.db.patch(provider._id, { isPrimary: false });
        }
      }
    }

    // Check if provider already exists for this app
    const existingProvider = await ctx.db
      .query("paymentProviders")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .filter((q) => q.eq(q.field("provider"), args.provider))
      .first();

    if (existingProvider) {
      throw new Error(`${args.provider} is already connected to this app`);
    }

    // Create payment provider record
    const providerId = await ctx.db.insert("paymentProviders", {
      organizationId: app.organizationId,
      appId: args.appId,
      provider: args.provider as any,
      credentials: {
        publicKey: args.credentials.publicKey,
        secretKeyEncrypted: args.secretKeyEncrypted,
        merchantId: args.credentials.merchantId,
        apiUrl: args.credentials.apiUrl,
      },
      environment: args.environment,
      isPrimary: args.isPrimary ?? false,
      isActive: true,
      webhookSecret: args.webhookSecret,
      supportedMethods: args.supportedMethods as any,
      connectionStatus: "pending",
      addedBy: user._id,
    });

    return {
      success: true,
      providerId,
      message: `${args.provider} added successfully`,
    };
  },
});

/**
 * Get all payment providers for an app
 */
export const getPaymentProviders = query({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);
    if (!user) {
      return [];
    }

    // Get app and verify ownership
    const app = await ctx.db.get(args.appId);
    if (!app) {
      return [];
    }

    // Check if user has permission
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .first();

    if (!member) {
      return [];
    }

    // Get all providers for this app
    const providers = await ctx.db
      .query("paymentProviders")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    // Return without decrypted secrets (for security)
    return providers.map((provider) => ({
      _id: provider._id,
      provider: provider.provider,
      environment: provider.environment,
      isPrimary: provider.isPrimary,
      isActive: provider.isActive,
      supportedMethods: provider.supportedMethods,
      connectionStatus: provider.connectionStatus,
      lastConnectionTest: provider.lastConnectionTest,
      lastError: provider.lastError,
      _creationTime: provider._creationTime,
      // Don't send credentials to client
      hasPublicKey: !!provider.credentials.publicKey,
      hasMerchantId: !!provider.credentials.merchantId,
    }));
  },
});

/**
 * Test payment provider connection (Action wrapper)
 */
export const testProviderConnection = action({
  args: {
    providerId: v.id("paymentProviders"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    return await ctx.runAction(
      internal.paymentProvidersNode.testProviderConnectionInternal,
      args
    );
  },
});

/**
 * Internal query to get provider by ID (for actions)
 */
export const getProviderById = internalQuery({
  args: {
    providerId: v.id("paymentProviders"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.providerId);
  },
});

/**
 * Internal mutation to update provider status
 */
export const updateProviderStatus = internalMutation({
  args: {
    providerId: v.id("paymentProviders"),
    connectionStatus: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("pending")
    ),
    lastError: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.providerId, {
      connectionStatus: args.connectionStatus,
      lastConnectionTest: Date.now(),
      lastError: args.lastError,
    });
  },
});

/**
 * Remove a payment provider
 */
export const removePaymentProvider = mutation({
  args: {
    providerId: v.id("paymentProviders"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get provider
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Check permission
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", provider.organizationId).eq("userId", user._id)
      )
      .first();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new Error("Only owners and admins can remove providers");
    }

    // Delete the provider
    await ctx.db.delete(args.providerId);

    return {
      success: true,
      message: "Payment provider removed successfully",
    };
  },
});

/**
 * Set a provider as primary
 */
export const setPrimaryProvider = mutation({
  args: {
    providerId: v.id("paymentProviders"),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get provider
    const provider = await ctx.db.get(args.providerId);
    if (!provider) {
      throw new Error("Provider not found");
    }

    // Check permission
    const member = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", provider.organizationId).eq("userId", user._id)
      )
      .first();

    if (!member || (member.role !== "owner" && member.role !== "admin")) {
      throw new Error("Only owners and admins can set primary provider");
    }

    // Unset other primary providers for this app
    const otherProviders = await ctx.db
      .query("paymentProviders")
      .withIndex("by_app", (q) => q.eq("appId", provider.appId))
      .collect();

    for (const p of otherProviders) {
      if (p.isPrimary && p._id !== args.providerId) {
        await ctx.db.patch(p._id, { isPrimary: false });
      }
    }

    // Set this as primary
    await ctx.db.patch(args.providerId, { isPrimary: true });

    return {
      success: true,
      message: "Primary provider updated",
    };
  },
});

/**
 * Get list of supported providers (for UI)
 */
export const getSupportedProvidersQuery = query({
  handler: async () => {
    return getSupportedProviders();
  },
});
