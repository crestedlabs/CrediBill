import { v } from "convex/values";
import {
  mutation,
  query,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";
import { ConvexError } from "convex/values";

// ============================================================================
// INTERNAL API-KEY-AUTHENTICATED VERSIONS
// ============================================================================

/**
 * List invoices via API key (no Clerk auth required)
 */
export const listInvoicesInternal = internalQuery({
  args: {
    appId: v.id("apps"),
    subscriptionId: v.optional(v.id("subscriptions")),
    customerId: v.optional(v.id("customers")),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("pending"),
        v.literal("paid"),
        v.literal("void"),
        v.literal("failed"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    let invoices;

    if (args.subscriptionId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_subscription", (q) =>
          q.eq("subscriptionId", args.subscriptionId!),
        )
        .filter((q) => q.eq(q.field("appId"), args.appId))
        .collect();
    } else if (args.customerId) {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_customer", (q) => q.eq("customerId", args.customerId!))
        .filter((q) => q.eq(q.field("appId"), args.appId))
        .collect();
    } else {
      invoices = await ctx.db
        .query("invoices")
        .withIndex("by_app", (q) => q.eq("appId", args.appId))
        .collect();
    }

    if (args.status) {
      invoices = invoices.filter((inv) => inv.status === args.status);
    }

    const invoicesWithDetails = await Promise.all(
      invoices.map(async (invoice) => {
        const customer = await ctx.db.get(invoice.customerId);
        const subscription = invoice.subscriptionId
          ? await ctx.db.get(invoice.subscriptionId)
          : null;
        return {
          ...invoice,
          customer,
          subscription,
        };
      }),
    );

    return invoicesWithDetails;
  },
});

/**
 * Get invoice via API key (no Clerk auth required)
 */
export const getInvoiceByIdInternal = internalQuery({
  args: {
    invoiceId: v.id("invoices"),
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");

    if (invoice.appId !== args.appId) {
      throw new ConvexError("Access denied");
    }

    const customer = await ctx.db.get(invoice.customerId);
    const subscription = invoice.subscriptionId
      ? await ctx.db.get(invoice.subscriptionId)
      : null;

    return {
      ...invoice,
      customer,
      subscription,
    };
  },
});

/**
 * Update invoice status via API key (no Clerk auth required)
 */
export const updateInvoiceStatusInternal = internalMutation({
  args: {
    invoiceId: v.id("invoices"),
    appId: v.id("apps"),
    status: v.union(
      v.literal("draft"),
      v.literal("pending"),
      v.literal("paid"),
      v.literal("void"),
      v.literal("failed"),
    ),
    amountPaid: v.optional(v.number()),
    paidDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new ConvexError("Invoice not found");

    if (invoice.appId !== args.appId) {
      throw new ConvexError("Access denied");
    }

    const updates: any = { status: args.status };
    if (args.amountPaid !== undefined) updates.amountPaid = args.amountPaid;
    if (args.paidDate !== undefined) updates.paidDate = args.paidDate;

    await ctx.db.patch(args.invoiceId, updates);

    const updatedInvoice = await ctx.db.get(args.invoiceId);
    const customer = await ctx.db.get(invoice.customerId);

    await ctx.scheduler.runAfter(0, internal.webhookDelivery.queueWebhook, {
      appId: args.appId,
      event: `invoice.${args.status}` as any,
      payload: {
        invoice: updatedInvoice,
        customer,
      },
    });

    return args.invoiceId;
  },
});

// ============================================================================
// CLERK-AUTHENTICATED VERSIONS (for dashboard UI)
// ============================================================================

// Generate a unique invoice number
async function generateInvoiceNumber(
  ctx: any,
  organizationId: string,
  appId: string,
) {
  const year = new Date().getFullYear();

  // Get the latest invoice for this org/app in this year
  const latestInvoice = await ctx.db
    .query("invoices")
    .withIndex("by_app", (q: any) => q.eq("appId", appId))
    .order("desc")
    .first();

  let sequence = 1;

  if (latestInvoice && latestInvoice.invoiceNumber) {
    // Extract sequence from invoice number (e.g., "INV-2025-042" -> 42)
    const match = latestInvoice.invoiceNumber.match(/INV-(\d{4})-(\d+)/);
    if (match && parseInt(match[1]) === year) {
      sequence = parseInt(match[2]) + 1;
    }
  }

  // Format: INV-2025-001
  return `INV-${year}-${sequence.toString().padStart(3, "0")}`;
}

// ============================================================================
// NOTE: Dashboard mutation for generating invoices removed.
// Invoices should ONLY be generated automatically by cron jobs or when
// payments are confirmed via webhooks. Never manually generate invoices.
// ============================================================================

// List invoices for an app with filters
export const listInvoices = query({
  args: {
    appId: v.id("apps"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("open"),
        v.literal("paid"),
        v.literal("failed"),
        v.literal("void"),
      ),
    ),
    customerId: v.optional(v.id("customers")),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    // Get app to verify access
    const app = await ctx.db.get(args.appId);
    if (!app) throw new Error("App not found");

    // Verify access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", app.organizationId).eq("userId", user._id),
      )
      .first();

    if (!membership) throw new Error("Unauthorized");

    // Build query
    let query = ctx.db
      .query("invoices")
      .withIndex("by_app", (q) => q.eq("appId", args.appId));

    // Get all invoices
    let invoices = await query.collect();

    // Apply filters
    if (args.status) {
      invoices = invoices.filter((inv) => inv.status === args.status);
    }

    if (args.customerId) {
      invoices = invoices.filter((inv) => inv.customerId === args.customerId);
    }

    // Enrich with customer and subscription data
    const enrichedInvoices = await Promise.all(
      invoices.map(async (invoice) => {
        const customer = await ctx.db.get(invoice.customerId);
        const subscription = await ctx.db.get(invoice.subscriptionId);

        return {
          ...invoice,
          customer: customer
            ? {
                _id: customer._id,
                email: customer.email,
                first_name: customer.first_name,
                last_name: customer.last_name,
              }
            : null,
          subscription: subscription
            ? {
                _id: subscription._id,
                status: subscription.status,
              }
            : null,
        };
      }),
    );

    // Sort by creation date (newest first)
    return enrichedInvoices.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get single invoice by ID
export const getInvoiceById = query({
  args: {
    invoiceId: v.id("invoices"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Unauthorized");

    const invoice = await ctx.db.get(args.invoiceId);
    if (!invoice) throw new Error("Invoice not found");

    // Verify access
    const membership = await ctx.db
      .query("organizationMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("organizationId", invoice.organizationId).eq("userId", user._id),
      )
      .first();

    if (!membership) throw new Error("Unauthorized");

    // Enrich with related data
    const customer = await ctx.db.get(invoice.customerId);
    const subscription = await ctx.db.get(invoice.subscriptionId);
    const app = await ctx.db.get(invoice.appId);

    return {
      ...invoice,
      customer,
      subscription,
      app,
    };
  },
});

// ============================================================================
// NOTE: Dashboard mutation for updating invoice status removed.
// Invoice status should ONLY be updated automatically when payment webhooks
// are received. Never manually change invoice status from the dashboard.
// ============================================================================

// Helper function to format interval
function formatInterval(interval: string): string {
  switch (interval) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "yearly":
      return "Yearly";
    case "one-time":
      return "One-Time";
    default:
      return interval;
  }
}

// Internal mutation for automatic invoice generation (called by scheduler)
export const generateInvoiceInternal = internalMutation({
  args: {
    subscriptionId: v.id("subscriptions"),
    periodStart: v.number(),
    periodEnd: v.number(),
  },
  handler: async (ctx, args) => {
    // Get subscription
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) {
      console.error("Subscription not found:", args.subscriptionId);
      return null;
    }

    // Get customer, plan, and app
    const customer = await ctx.db.get(subscription.customerId);
    if (!customer) {
      console.error("Customer not found:", subscription.customerId);
      return null;
    }

    const plan = await ctx.db.get(subscription.planId);
    if (!plan) {
      console.error("Plan not found:", subscription.planId);
      return null;
    }

    const app = await ctx.db.get(subscription.appId);
    if (!app) {
      console.error("App not found:", subscription.appId);
      return null;
    }

    // Calculate due date using app's grace period (required - no fallback)
    const gracePeriodDays = app.gracePeriod;
    if (gracePeriodDays === undefined) {
      throw new Error(`App ${app._id} missing required gracePeriod setting`);
    }
    const dueDate = args.periodEnd + gracePeriodDays * 24 * 60 * 60 * 1000;

    // Build line items based on pricing model
    const lineItems = [];
    let totalAmount = 0;

    if (plan.pricingModel === "flat" && plan.baseAmount) {
      // Flat rate subscription
      lineItems.push({
        description: `${plan.name} - ${formatInterval(plan.interval)}`,
        quantity: 1,
        unitAmount: plan.baseAmount,
        totalAmount: plan.baseAmount,
        type: "plan" as const,
      });
      totalAmount = plan.baseAmount;
    } else if (plan.pricingModel === "usage") {
      // Pure usage-based - get actual usage from usageEvents
      const usageMetric = plan.usageMetric || "units";
      const usageEvents = await ctx.db
        .query("usageEvents")
        .withIndex("by_subscription_timestamp", (q) =>
          q.eq("subscriptionId", subscription._id),
        )
        .filter((q) => q.eq(q.field("metric"), usageMetric))
        .filter((q) => q.gte(q.field("timestamp"), args.periodStart))
        .filter((q) => q.lte(q.field("timestamp"), args.periodEnd))
        .collect();

      const usageQuantity = usageEvents.reduce(
        (sum, event) => sum + event.quantity,
        0,
      );
      const unitPrice = plan.unitPrice || 0;
      const freeUnits = plan.freeUnits || 0;
      const billableUnits = Math.max(0, usageQuantity - freeUnits);
      const usageAmount = billableUnits * unitPrice;

      lineItems.push({
        description: `${plan.name} - Usage (${usageQuantity} ${usageMetric})`,
        quantity: billableUnits,
        unitAmount: unitPrice,
        totalAmount: usageAmount,
        type: "usage" as const,
      });
      totalAmount = usageAmount;
    } else if (plan.pricingModel === "hybrid") {
      // Base amount + usage
      const baseAmount = plan.baseAmount || 0;
      lineItems.push({
        description: `${plan.name} - Base Fee`,
        quantity: 1,
        unitAmount: baseAmount,
        totalAmount: baseAmount,
        type: "plan" as const,
      });
      totalAmount += baseAmount;

      // Add usage charges - get actual usage from usageEvents
      const usageMetric = plan.usageMetric || "units";
      const usageEvents = await ctx.db
        .query("usageEvents")
        .withIndex("by_subscription_timestamp", (q) =>
          q.eq("subscriptionId", subscription._id),
        )
        .filter((q) => q.eq(q.field("metric"), usageMetric))
        .filter((q) => q.gte(q.field("timestamp"), args.periodStart))
        .filter((q) => q.lte(q.field("timestamp"), args.periodEnd))
        .collect();

      const usageQuantity = usageEvents.reduce(
        (sum, event) => sum + event.quantity,
        0,
      );
      const unitPrice = plan.unitPrice || 0;
      const freeUnits = plan.freeUnits || 0;
      const billableUnits = Math.max(0, usageQuantity - freeUnits);
      const usageAmount = billableUnits * unitPrice;

      if (billableUnits > 0) {
        lineItems.push({
          description: `${plan.name} - Usage (${usageQuantity} ${usageMetric})`,
          quantity: billableUnits,
          unitAmount: unitPrice,
          totalAmount: usageAmount,
          type: "usage" as const,
        });
        totalAmount += usageAmount;
      }
    }

    // Generate unique invoice number
    const invoiceNumber = await generateInvoiceNumber(
      ctx,
      subscription.organizationId,
      subscription.appId,
    );

    // Create invoice
    const invoiceId = await ctx.db.insert("invoices", {
      organizationId: subscription.organizationId,
      appId: subscription.appId,
      customerId: subscription.customerId,
      subscriptionId: subscription._id,
      invoiceNumber,
      currency: plan.currency,
      amountDue: totalAmount,
      amountPaid: 0,
      status: "open",
      periodStart: args.periodStart,
      periodEnd: args.periodEnd,
      dueDate,
      lineItems,
      metadata: {
        planName: plan.name,
        customerEmail: customer.email,
        generatedAt: Date.now(),
        autoGenerated: true,
      },
    });

    return invoiceId;
  },
});
