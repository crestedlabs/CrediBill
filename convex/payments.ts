import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUser } from "./users";

// Record a payment against an invoice
export const recordPayment = mutation({
  args: {
    invoiceId: v.id("invoices"),
    amount: v.number(),
    paymentMethod: v.union(
      v.literal("momo"),
      v.literal("credit-card"),
      v.literal("bank"),
      v.literal("cash"),
      v.literal("other")
    ),
    paymentDate: v.optional(v.number()), // If not provided, use current time
    reference: v.optional(v.string()), // Transaction reference or note
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the invoice
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Verify user has access to this app's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invoice.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Validate amount
    if (args.amount <= 0) {
      throw new Error("Payment amount must be greater than zero");
    }

    // Validate invoice is not void
    if (invoice.status === "void") {
      throw new Error("Cannot record payment for void invoice");
    }

    // Calculate new amount paid
    const currentAmountPaid = invoice.amountPaid || 0;
    const newAmountPaid = currentAmountPaid + args.amount;

    // Check for overpayment
    if (newAmountPaid > invoice.amountDue) {
      throw new Error(
        `Payment amount (${args.amount}) would result in overpayment. Invoice due: ${invoice.amountDue}, already paid: ${currentAmountPaid}`
      );
    }

    // Create payment record
    const paymentId = await ctx.db.insert("payments", {
      organizationId: invoice.organizationId,
      appId: invoice.appId,
      customerId: invoice.customerId,
      invoiceId: args.invoiceId,
      amount: args.amount,
      currency: invoice.currency,
      status: "completed",
      paymentMethod: args.paymentMethod,
      provider: "manual",
      providerPaymentId: args.reference,
      paidAt: args.paymentDate || Date.now(),
      notes: args.notes,
      recordedBy: user._id,
    });

    // Update invoice
    const newStatus = newAmountPaid >= invoice.amountDue ? "paid" : "open";
    await ctx.db.patch(args.invoiceId, {
      amountPaid: newAmountPaid,
      status: newStatus,
    });

    return {
      paymentId,
      newAmountPaid,
      remainingBalance: invoice.amountDue - newAmountPaid,
      invoiceStatus: newStatus,
    };
  },
});

// List payments for an invoice
export const listPaymentsByInvoice = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the invoice to verify access
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Verify user has access to this app's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invoice.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Get all payments for this invoice
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_invoice", (q) => q.eq("invoiceId", args.invoiceId))
      .collect();

    // Enrich with user info for manual payments
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        let recordedByUser = null;
        if (payment.recordedBy) {
          const user = await ctx.db.get(payment.recordedBy);
          recordedByUser = user
            ? { name: user.name, email: user.email }
            : null;
        }

        return {
          ...payment,
          recordedByUser,
        };
      })
    );

    return enrichedPayments;
  },
});

// List payments for a customer
export const listPaymentsByCustomer = query({
  args: {
    customerId: v.id("customers"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the app
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify user has access to this app's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Get all payments for this customer in this app
    const payments = await ctx.db
      .query("payments")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("appId"), args.appId))
      .collect();

    // Enrich with invoice info
    const enrichedPayments = await Promise.all(
      payments.map(async (payment) => {
        const invoice = await ctx.db.get(payment.invoiceId);
        return {
          ...payment,
          invoice: invoice
            ? {
                invoiceNumber: invoice.invoiceNumber,
                amountDue: invoice.amountDue,
                status: invoice.status,
              }
            : null,
        };
      })
    );

    return enrichedPayments;
  },
});

// Refund a payment
export const refundPayment = mutation({
  args: {
    paymentId: v.id("payments"),
    refundAmount: v.optional(v.number()), // If not provided, full refund
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get the payment
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Verify user has access to this app's organization
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", payment.organizationId).eq("userId", user._id)
      )
      .unique();

    if (!membership) throw new Error("Access denied to organization");

    // Validate payment can be refunded
    if (payment.status === "refunded") {
      throw new Error("Payment already refunded");
    }

    if (payment.status !== "completed") {
      throw new Error("Only completed payments can be refunded");
    }

    // Determine refund amount
    const refundAmount = args.refundAmount || payment.amount;
    if (refundAmount > payment.amount) {
      throw new Error("Refund amount cannot exceed payment amount");
    }

    // Get the invoice
    const invoice = await ctx.db.get(payment.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Update payment status
    await ctx.db.patch(args.paymentId, {
      status: "refunded",
      notes: payment.notes
        ? `${payment.notes}\n[REFUNDED: ${args.reason || "No reason provided"}]`
        : `[REFUNDED: ${args.reason || "No reason provided"}]`,
    });

    // Update invoice amount paid and status
    const newAmountPaid = (invoice.amountPaid || 0) - refundAmount;
    const newStatus = newAmountPaid >= invoice.amountDue ? "paid" : "open";

    await ctx.db.patch(payment.invoiceId, {
      amountPaid: Math.max(0, newAmountPaid),
      status: newStatus,
    });

    return {
      refundAmount,
      newAmountPaid: Math.max(0, newAmountPaid),
      remainingBalance: invoice.amountDue - Math.max(0, newAmountPaid),
      invoiceStatus: newStatus,
    };
  },
});
