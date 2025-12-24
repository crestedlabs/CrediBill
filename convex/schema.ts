import { defineTable, defineSchema } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  //Organizations. Each User belongs to an organization
  organizations: defineTable({
    name: v.string(),
    ownerUserId: v.id("users"),
  }).index("by_owner", ["ownerUserId"]),

  // Organization Members, this help a business have accountants, admins etc
  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("member"),
      v.literal("viewer")
    ),
  })
    .index("by_org", ["organizationId"])
    .index("by_user", ["userId"])
    .index("by_org_user", ["organizationId", "userId"]),

  // Users. Here i define SaaS owners
  users: defineTable({
    email: v.string(),
    name: v.string(),
    externalUserId: v.optional(v.string()), // Clerk ID stored in the subject JWT Field
    status: v.union(v.literal("active"), v.literal("suspended")),
  })
    .index("by_email", ["email"])
    .index("byExternalId", ["externalUserId"]),

  //Apps. Each organization can have many apps
  apps: defineTable({
    name: v.string(),
    organizationId: v.id("organizations"),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("active"),
      v.literal("paused"),
      v.literal("archived")
    ),
    mode: v.optional(v.union(v.literal("live"), v.literal("test"))),

    // App-specific settings (required with defaults)
    defaultCurrency: v.union(
      v.literal("ugx"),
      v.literal("kes"),
      v.literal("tzs"),
      v.literal("rwf"),
      v.literal("usd")
    ),
    timezone: v.union(
      v.literal("eat"), // East Africa Time (GMT+3)
      v.literal("cat"), // Central Africa Time (GMT+2)
      v.literal("wat") // West Africa Time (GMT+1)
    ),
    language: v.union(v.literal("en"), v.literal("sw"), v.literal("fr")),

    // Payment settings (required with defaults)
    defaultPaymentMethod: v.union(
      v.literal("momo"),
      v.literal("credit-card"),
      v.literal("bank")
    ),
    retryPolicy: v.union(
      v.literal("automatic"),
      v.literal("manual"),
      v.literal("none")
    ),

    // Billing settings (required with defaults)
    defaultTrialLength: v.number(), // days, default 14
    gracePeriod: v.number(), // days, default 3

    // Advanced settings (optional with defaults)
    allowPlanDowngrades: v.optional(v.boolean()), // default true
    requireBillingAddress: v.optional(v.boolean()), // default false
    enableProration: v.optional(v.boolean()), // default true
    autoSuspendOnFailedPayment: v.optional(v.boolean()), // default true

    // Legacy fields (deprecated but kept for backward compatibility)
    billingCycle: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("quarterly"),
        v.literal("annual"),
        v.literal("one-time")
      )
    ),
    supportsOneTimePayments: v.optional(v.boolean()),
  })
    .index("by_org", ["organizationId"])
    .index("by_status", ["status"]),

  //Customers. here each customer must belong to an app
  customers: defineTable({
    organizationId: v.id("organizations"),
    email: v.string(),
    phone: v.optional(v.string()),
    first_name: v.optional(v.string()),
    last_name: v.optional(v.string()),
    appId: v.id("apps"),
    externalCustomerId: v.optional(v.string()), // Stripe / Flutterwave / etc
    metadata: v.optional(v.any()),
    type: v.optional(v.union(v.literal("individual"), v.literal("business"))),
    status: v.optional(
      v.union(v.literal("active"), v.literal("inactive"), v.literal("blocked"))
    ),
  })
    .index("by_org", ["organizationId"])
    .index("by_app", ["appId"])
    .index("by_app_email", ["appId", "email"])
    .index("by_external", ["externalCustomerId"]),

  // Plans, a customer subscribes to a plan
  plans: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    name: v.string(),
    description: v.optional(v.string()),
    pricingModel: v.union(
      v.literal("flat"),
      v.literal("usage"),
      v.literal("hybrid")
    ),
    baseAmount: v.optional(v.number()), // smallest unit
    currency: v.string(),
    interval: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
      v.literal("one-time")
    ),
    usageMetric: v.optional(v.string()), // e.g. "api_calls", "messages"
    unitPrice: v.optional(v.number()), // price per unit
    freeUnits: v.optional(v.number()), // included usage
    status: v.union(v.literal("active"), v.literal("archived")),
    mode: v.union(v.literal("live"), v.literal("test")),
  })
    .index("by_app", ["appId"])
    .index("by_pricing_model", ["pricingModel"]),

  //Usage Events table
  usageEvents: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    subscriptionId: v.id("subscriptions"),
    metric: v.string(), // must match plan.usageMetric
    quantity: v.number(), // e.g. 1 API call, 5 messages
    occurredAt: v.number(), // when usage happened
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_customer", ["customerId"])
    .index("by_metric", ["metric"])
    .index("by_time", ["occurredAt"]),

  // Usage Summaries (This is not so important for me but makes it easy for me to generate invoices)
  usageSummaries: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    subscriptionId: v.id("subscriptions"),
    metric: v.string(),
    periodStart: v.number(),
    periodEnd: v.number(),
    totalUsage: v.number(),
    createdAt: v.number(),
  }).index("by_subscription_period", [
    "subscriptionId",
    "periodStart",
    "periodEnd",
  ]),

  // Subscriptions
  subscriptions: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    planId: v.id("plans"),
    planSnapshot: v.optional(v.any()), // optional JSON copy of plan at time of subscription
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("paused"),
      v.literal("cancelled"),
      v.literal("expired")
    ),
    startDate: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    usageQuantity: v.optional(v.number()), // aggregated from usageEvents or usageSummaries
    usageAmount: v.optional(v.number()), // computed charge
  })
    .index("by_customer", ["customerId"])
    .index("by_app", ["appId"])
    .index("by_plan", ["planId"])
    .index("by_status", ["status"])
    .index("by_customer_plan", ["customerId", "planId"]),

  //Invoices Table
  invoices: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    subscriptionId: v.id("subscriptions"),
    invoiceNumber: v.string(), // unique per org/app
    currency: v.string(),
    amountDue: v.number(), // smallest currency unit
    amountPaid: v.optional(v.number()), // updated as payments come in
    status: v.union(
      v.literal("draft"),
      v.literal("open"),
      v.literal("paid"),
      v.literal("failed"),
      v.literal("void")
    ),
    periodStart: v.number(),
    periodEnd: v.number(),
    dueDate: v.optional(v.number()),
    metadata: v.optional(v.any()),
    lineItems: v.array(
      v.object({
        description: v.string(),
        quantity: v.number(),
        unitAmount: v.number(),
        totalAmount: v.number(),
        type: v.union(
          v.literal("plan"),
          v.literal("usage"),
          v.literal("one_time")
        ),
      })
    ),
  })
    .index("by_customer", ["customerId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_app", ["appId"])
    .index("by_status", ["status"])
    .index("by_invoiceNumber", ["invoiceNumber"]),

  // Payments Table
  payments: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    invoiceId: v.id("invoices"),
    amount: v.number(),
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    provider: v.union(
      v.literal("pawapay"),
      v.literal("flutterwave"),
      v.literal("dpo"),
      v.literal("pesapal"),
      v.literal("stripe"),
      v.literal("paystack"),
      v.literal("paytoto")
    ),
    providerPaymentId: v.optional(v.string()), // PSP transaction ID
    providerMetadata: v.optional(v.any()), // raw PSP response
    paidAt: v.optional(v.number()), // when payment actually completed
    metadata: v.optional(v.any()), // any internal notes
  })
    .index("by_invoice", ["invoiceId"])
    .index("by_customer", ["customerId"])
    .index("by_app", ["appId"])
    .index("by_status", ["status"])
    .index("by_provider", ["provider"])
    .index("by_providerPaymentId", ["providerPaymentId"]),

  // Webhooks Table
  webhooks: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    url: v.string(),
    events: v.array(v.string()), // e.g., ["subscription.created", "invoice.paid"]
    status: v.union(v.literal("active"), v.literal("inactive")),
    secret: v.optional(v.string()), // For webhook signature verification
    description: v.optional(v.string()),
  })
    .index("by_app", ["appId"])
    .index("by_org", ["organizationId"])
    .index("by_status", ["status"]),

  // API Keys Table
  apiKeys: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    name: v.string(), // User-friendly name: "Production Key", "CI/CD Key"
    keyId: v.string(), // Unique identifier: "key_abc123..."
    hashedSecret: v.string(), // bcrypt hash of the actual secret key
    keyPrefix: v.string(), // First 12 chars for display: "pk_live_abc1"
    keySuffix: v.string(), // Last 4 chars for display: "xyz9"
    environment: v.union(v.literal("test"), v.literal("live")),
    scopes: v.array(v.string()), // ["read", "write", "webhooks", "admin"]
    status: v.union(v.literal("active"), v.literal("revoked")),
    expiresAt: v.optional(v.number()), // Unix timestamp
    lastUsedAt: v.optional(v.number()),
    createdBy: v.id("users"),
  })
    .index("by_keyId", ["keyId"])
    .index("by_app", ["appId"])
    .index("by_org", ["organizationId"])
    .index("by_status", ["status"]),
});
