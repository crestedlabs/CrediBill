"use node";

/**
 * Node.js Actions for Payment Provider Operations
 * Handles encryption/decryption and provider testing
 */

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { encryptString, decryptString } from "../lib/encryption";
import {
  createPaymentAdapter,
  isProviderSupported,
} from "./lib/paymentAdapters";

const ENCRYPTION_KEY =
  process.env.PAYMENT_CREDENTIALS_ENCRYPTION_KEY ||
  "default-key-change-in-production";

/**
 * Internal action to add payment provider with encryption
 */
export const addPaymentProviderInternal = internalAction({
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
    // Check if provider is supported
    if (!isProviderSupported(args.provider)) {
      throw new Error(`Provider ${args.provider} is not yet supported`);
    }

    // Encrypt the secret key
    const secretKeyEncrypted = await encryptString(
      args.credentials.secretKey,
      ENCRYPTION_KEY
    );

    // Call internal mutation to save
    return await ctx.runMutation(
      internal.paymentProviders.savePaymentProvider,
      {
        appId: args.appId,
        provider: args.provider,
        credentials: args.credentials,
        secretKeyEncrypted,
        environment: args.environment,
        webhookSecret: args.webhookSecret,
        supportedMethods: args.supportedMethods,
        isPrimary: args.isPrimary,
      }
    );
  },
});

/**
 * Internal action to test provider connection with decryption
 */
export const testProviderConnectionInternal = internalAction({
  args: {
    providerId: v.id("paymentProviders"),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ success: boolean; message: string }> => {
    // Get provider (need to use runQuery since we're in action)
    const provider = await ctx.runQuery(
      internal.paymentProviders.getProviderById,
      {
        providerId: args.providerId,
      }
    );

    if (!provider) {
      throw new Error("Provider not found");
    }

    try {
      // Decrypt credentials
      const secretKey = await decryptString(
        provider.credentials.secretKeyEncrypted,
        ENCRYPTION_KEY
      );

      // Create and initialize adapter
      const adapter = createPaymentAdapter(
        provider.provider as any,
        {
          secretKey,
          publicKey: provider.credentials.publicKey,
          merchantId: provider.credentials.merchantId,
          apiUrl: provider.credentials.apiUrl,
        },
        provider.environment
      );

      // Test connection
      const result = await adapter.testConnection();

      // Update provider status
      await ctx.runMutation(internal.paymentProviders.updateProviderStatus, {
        providerId: args.providerId,
        connectionStatus: result.success ? "connected" : "error",
        lastError: result.error,
      });

      return result;
    } catch (error: any) {
      // Update error status
      await ctx.runMutation(internal.paymentProviders.updateProviderStatus, {
        providerId: args.providerId,
        connectionStatus: "error",
        lastError: error.message,
      });

      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
      };
    }
  },
});
