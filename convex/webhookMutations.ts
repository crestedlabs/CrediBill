import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Log a webhook event
 */
export const logWebhook = internalMutation({
  args: {
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    provider: v.union(
      v.literal("flutterwave"),
      v.literal("pawapay"),
      v.literal("pesapal"),
      v.literal("dpo"),
      v.literal("paystack"),
      v.literal("stripe"),
      v.literal("clerk")
    ),
    event: v.string(),
    payload: v.any(),
    status: v.union(
      v.literal("received"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("ignored")
    ),
    paymentTransactionId: v.optional(v.id("paymentTransactions")),
    subscriptionId: v.optional(v.id("subscriptions")),
    signatureValid: v.optional(v.boolean()),
    processedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const receivedAt = Date.now();

    // Parse payload if it's a string
    let parsedPayload = args.payload;
    if (typeof args.payload === "string") {
      try {
        parsedPayload = JSON.parse(args.payload);
      } catch {
        parsedPayload = args.payload;
      }
    }

    return await ctx.db.insert("webhookLogs", {
      organizationId: args.organizationId,
      appId: args.appId,
      provider: args.provider,
      event: args.event,
      payload: parsedPayload,
      status: args.status,
      paymentTransactionId: args.paymentTransactionId,
      subscriptionId: args.subscriptionId,
      signatureValid: args.signatureValid,
      receivedAt,
      processedAt:
        args.processedAt ||
        (args.status !== "received" ? Date.now() : undefined),
    });
  },
});

/**
 * Update a transaction from webhook data
 */
export const updateTransactionFromWebhook = internalMutation({
  args: {
    transactionId: v.id("paymentTransactions"),
    status: v.union(
      v.literal("pending"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("refunded")
    ),
    providerTransactionId: v.optional(v.string()),
    providerResponse: v.optional(v.any()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const transaction = await ctx.db.get(args.transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${args.transactionId} not found`);
    }

    // Prevent overwriting terminal states
    const terminalStates = ["success", "canceled", "refunded"];
    if (terminalStates.includes(transaction.status)) {
      console.warn(
        `Transaction ${args.transactionId} is already in terminal state ${transaction.status}, ignoring update to ${args.status}`
      );
      return;
    }

    // Update transaction
    await ctx.db.patch(args.transactionId, {
      status: args.status,
      providerTransactionId:
        args.providerTransactionId || transaction.providerTransactionId,
      providerResponse: args.providerResponse,
      metadata: {
        ...transaction.metadata,
        ...args.metadata,
      },
      completedAt:
        args.status === "success" || args.status === "failed"
          ? Date.now()
          : transaction.completedAt,
    });

    // If successful, mark invoice as paid
    if (args.status === "success" && transaction.invoiceId) {
      const invoice = await ctx.db.get(transaction.invoiceId);
      if (invoice && invoice.status !== "paid") {
        await ctx.db.patch(transaction.invoiceId, {
          status: "paid",
        });
      }
    }

    // If failed and this is a subscription payment, increment failure count
    if (args.status === "failed" && transaction.subscriptionId) {
      const subscription = await ctx.db.get(transaction.subscriptionId);
      if (subscription) {
        const failureCount = (subscription.failedPaymentAttempts || 0) + 1;
        await ctx.db.patch(transaction.subscriptionId, {
          failedPaymentAttempts: failureCount,
        });

        // If too many failures, mark subscription as past_due
        if (failureCount >= 3 && subscription.status === "active") {
          await ctx.db.patch(transaction.subscriptionId, {
            status: "past_due",
          });
        }
      }
    }
  },
});
