import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { testSvixConnection } from "./lib/svix";

/**
 * Test Svix connection (internal use)
 * This verifies that the Svix API keys are properly configured
 */
export const testConnection = internalAction({
  args: {
    mode: v.union(v.literal("test"), v.literal("live")),
  },
  handler: async (ctx, args) => {
    try {
      const isConnected = await testSvixConnection(args.mode);

      if (isConnected) {
        console.log(`✅ [Svix] Successfully connected in ${args.mode} mode`);
        return {
          success: true,
          mode: args.mode,
          message: `Successfully connected to Svix in ${args.mode} mode`,
        };
      } else {
        console.error(`❌ [Svix] Failed to connect in ${args.mode} mode`);
        return {
          success: false,
          mode: args.mode,
          error: `Failed to connect to Svix in ${args.mode} mode. Check your API key.`,
        };
      }
    } catch (error: any) {
      console.error(
        `❌ [Svix] Connection test error (${args.mode}):`,
        error.message,
      );
      return {
        success: false,
        mode: args.mode,
        error: error.message,
      };
    }
  },
});

/**
 * Test Svix connection (public API for admins)
 * This can be called from the frontend to verify setup
 */
export const testSvixSetup = action({
  args: {},
  handler: async (ctx) => {
    try {
      // Test both test and live modes
      const testResult = await testSvixConnection("test");
      const liveResult = await testSvixConnection("live");

      return {
        test: {
          connected: testResult,
          configured: process.env.SVIX_API_KEY_TEST ? true : false,
        },
        live: {
          connected: liveResult,
          configured: process.env.SVIX_API_KEY_LIVE ? true : false,
        },
        recommendation:
          !testResult && !liveResult
            ? "Neither API key is configured. Please set SVIX_API_KEY_TEST and SVIX_API_KEY_LIVE in your Convex environment variables."
            : !testResult
              ? "Test mode not configured. Set SVIX_API_KEY_TEST for development."
              : !liveResult
                ? "Live mode not configured. Set SVIX_API_KEY_LIVE for production."
                : "✅ All Svix API keys are configured and working!",
      };
    } catch (error: any) {
      return {
        error: error.message,
        recommendation:
          "Check your Svix API key configuration in Convex environment variables.",
      };
    }
  },
});
