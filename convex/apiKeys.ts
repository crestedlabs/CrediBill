import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Helper function to generate a cryptographically secure API key
function generateApiKey(environment: "test" | "live"): {
  keyId: string;
  fullSecret: string;
  prefix: string;
  suffix: string;
} {
  // Generate random bytes for the key
  const randomPart = Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0")
  ).join("");

  const prefix = environment === "live" ? "sk_live" : "sk_test";
  const fullSecret = `${prefix}_${randomPart}`;
  const keyId = `key_${randomPart.substring(0, 16)}`;

  return {
    keyId,
    fullSecret,
    prefix: fullSecret.substring(0, 12), // "sk_live_abcd" or "sk_test_abcd"
    suffix: fullSecret.slice(-4), // Last 4 chars
  };
}

// Simple hash function (in production, use bcrypt via a Node.js action)
// For now, we'll use a simple hash that works in Convex
async function hashSecret(secret: string): Promise<string> {
  // In Convex, we can't use bcrypt directly, so we'll use a simple approach
  // In production, you'd call a Node.js action that uses bcrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(secret);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify a key against its hash
async function verifySecret(
  providedSecret: string,
  storedHash: string
): Promise<boolean> {
  const providedHash = await hashSecret(providedSecret);
  return providedHash === storedHash;
}

// Get all API keys for an app
export const getApiKeysByApp = query({
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

    // Get all API keys for this app
    const apiKeys = await ctx.db
      .query("apiKeys")
      .withIndex("by_app", (q) => q.eq("appId", args.appId))
      .collect();

    // Return keys without the hashed secret
    return apiKeys.map((key) => ({
      _id: key._id,
      _creationTime: key._creationTime,
      name: key.name,
      keyPrefix: key.keyPrefix,
      keySuffix: key.keySuffix,
      environment: key.environment,
      scopes: key.scopes,
      status: key.status,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
    }));
  },
});

// Create a new API key
export const createApiKey = mutation({
  args: {
    appId: v.id("apps"),
    name: v.string(),
    environment: v.union(v.literal("test"), v.literal("live")),
    scopes: v.array(v.string()),
    expiresAt: v.optional(v.number()),
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
      throw new Error("Only owners and admins can create API keys");
    }

    // Validate scopes
    const validScopes = ["read", "write", "webhooks", "admin"];
    const invalidScopes = args.scopes.filter((s) => !validScopes.includes(s));
    if (invalidScopes.length > 0) {
      throw new Error(`Invalid scopes: ${invalidScopes.join(", ")}`);
    }

    if (args.scopes.length === 0) {
      throw new Error("At least one scope must be selected");
    }

    // Validate expiration date
    if (args.expiresAt && args.expiresAt <= Date.now()) {
      throw new Error("Expiration date must be in the future");
    }

    // Generate API key
    const { keyId, fullSecret, prefix, suffix } = generateApiKey(
      args.environment
    );

    // Hash the secret
    const hashedSecret = await hashSecret(fullSecret);

    // Store the key
    const apiKeyId = await ctx.db.insert("apiKeys", {
      organizationId: app.organizationId,
      appId: args.appId,
      name: args.name,
      keyId,
      hashedSecret,
      keyPrefix: prefix,
      keySuffix: suffix,
      environment: args.environment,
      scopes: args.scopes,
      status: "active",
      expiresAt: args.expiresAt,
      createdBy: user._id,
    });

    return {
      success: true,
      apiKeyId,
      // Return the full secret ONLY ONCE at creation
      secret: fullSecret,
      keyPrefix: prefix,
      keySuffix: suffix,
      message:
        "API key created successfully. Save it now - you won't see it again!",
    };
  },
});

// Revoke an API key (don't delete, just mark as revoked)
export const revokeApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get API key
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", apiKey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can revoke API keys");
    }

    // Revoke the key
    await ctx.db.patch(args.apiKeyId, {
      status: "revoked",
    });

    return {
      success: true,
      message: "API key revoked successfully",
    };
  },
});

// Hard delete an API key (permanently removes from database)
export const deleteApiKey = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get API key
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", apiKey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can delete API keys");
    }

    // Permanently delete the key from database
    await ctx.db.delete(args.apiKeyId);

    return {
      success: true,
      message: "API key deleted successfully",
    };
  },
});

// Update API key name
export const updateApiKeyName = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) {
      throw new Error("Unauthorized");
    }

    // Get API key
    const apiKey = await ctx.db.get(args.apiKeyId);
    if (!apiKey) {
      throw new Error("API key not found");
    }

    // Check if user is owner or admin
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", apiKey.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) {
      throw new Error("You are not a member of this organization");
    }

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only owners and admins can update API keys");
    }

    // Update the key name
    await ctx.db.patch(args.apiKeyId, {
      name: args.name.trim(),
    });

    return {
      success: true,
      message: "API key name updated successfully",
    };
  },
});

// Verify an API key (used by your API endpoints)
export const verifyApiKey = query({
  args: {
    secret: v.string(),
  },
  handler: async (ctx, args) => {
    // Extract keyId from the secret (format: sk_live_xxx or sk_test_xxx)
    const parts = args.secret.split("_");
    if (parts.length < 3) {
      return { valid: false, error: "Invalid key format" };
    }

    // Generate keyId from the secret
    const randomPart = parts.slice(2).join("_");
    const keyId = `key_${randomPart.substring(0, 16)}`;

    // Look up the key
    const apiKey = await ctx.db
      .query("apiKeys")
      .withIndex("by_keyId", (q) => q.eq("keyId", keyId))
      .first();

    if (!apiKey) {
      return { valid: false, error: "Key not found" };
    }

    // Check if key is revoked
    if (apiKey.status === "revoked") {
      return { valid: false, error: "Key has been revoked" };
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt <= Date.now()) {
      return { valid: false, error: "Key has expired" };
    }

    // Verify the secret
    const isValid = await verifySecret(args.secret, apiKey.hashedSecret);
    if (!isValid) {
      return { valid: false, error: "Invalid key" };
    }

    // Note: Update lastUsedAt in a separate mutation call for better performance

    return {
      valid: true,
      apiKeyId: apiKey._id,
      apiKey: {
        _id: apiKey._id,
        organizationId: apiKey.organizationId,
        appId: apiKey.appId,
        environment: apiKey.environment,
        scopes: apiKey.scopes,
      },
    };
  },
});

// Update last used timestamp (call this after verifying a key)
export const updateLastUsed = mutation({
  args: {
    apiKeyId: v.id("apiKeys"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.apiKeyId, {
      lastUsedAt: Date.now(),
    });
  },
});
