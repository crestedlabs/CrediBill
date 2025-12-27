/**
 * Cron Mutation Helpers
 *
 * Internal mutations used by cron jobs to update data
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Mark a transaction as expired
 */
export const markTransactionExpired = internalMutation({
  args: { transactionId: v.id("paymentTransactions") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.transactionId, {
      status: "failed",
      failureReason: "Transaction expired",
      failureCode: "EXPIRED",
      completedAt: Date.now(),
    });
  },
});
