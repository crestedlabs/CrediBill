import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Query to get all providers (including inactive ones)
export const getAllProviders = query({
  args: {},
  handler: async (ctx) => {
    const providers = await ctx.db.query("providerCatalog").collect();

    // Sort by sortOrder
    return providers.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Query to get a single provider by ID
export const getProviderById = query({
  args: { providerId: v.id("providerCatalog") },
  handler: async (ctx, { providerId }) => {
    return await ctx.db.get(providerId);
  },
});

// Query to get a single provider by name
export const getProviderByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const provider = await ctx.db
      .query("providerCatalog")
      .withIndex("by_name", (q) => q.eq("name", name))
      .unique();

    return provider;
  },
});

// Query to get providers available in a specific region
export const getProvidersByRegion = query({
  args: { countryCode: v.string() }, // ISO 3166-1 alpha-2
  handler: async (ctx, { countryCode }) => {
    const allProviders = await ctx.db
      .query("providerCatalog")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Filter providers that support the country
    const availableProviders = allProviders.filter((provider) =>
      provider.regions.includes(countryCode.toUpperCase())
    );

    return availableProviders.sort((a, b) => a.sortOrder - b.sortOrder);
  },
});

// Mutation to update a provider (admin use)
export const updateProvider = mutation({
  args: {
    providerId: v.id("providerCatalog"),
    isActive: v.optional(v.boolean()),
    isRecommended: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  },
  handler: async (ctx, { providerId, ...updates }) => {
    await ctx.db.patch(providerId, updates);
    return { success: true };
  },
});
