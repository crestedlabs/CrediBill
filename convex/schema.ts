import { defineTable, defineSchema } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Provider Catalog - Master list of available payment providers
  // This is seeded data and rarely changes
  providerCatalog: defineTable({
    name: v.string(), // "flutterwave", "pawapay", "dpo", "pesapal"
    displayName: v.string(), // "Flutterwave", "PawaPay", "DPO Group", "PesaPal"
    description: v.string(),
    logoUrl: v.optional(v.string()),
    logoEmoji: v.string(), // Fallback emoji logo

    // Capabilities
    supportsRecurring: v.boolean(), // Can handle subscription billing
    supportsWebhooks: v.boolean(), // Provides webhook notifications
    supportsRefunds: v.boolean(), // Can process refunds

    // Billing configuration
    billingMode: v.union(
      v.literal("auto"), // Automatic charge/retry
      v.literal("manual") // Manual invoice payment
    ),

    // Geographic availability (ISO 3166-1 alpha-2 country codes)
    regions: v.array(v.string()), // ["UG", "KE", "TZ", "RW", "NG", etc.]

    // Payment methods supported
    paymentMethods: v.array(v.string()), // ["mobile_money", "cards", "bank_transfer"]

    // Status
    isActive: v.boolean(), // Whether this provider is available for selection

    // Documentation
    documentationUrl: v.optional(v.string()),
    signupUrl: v.optional(v.string()),

    // Display order
    sortOrder: v.number(), // For ordering in UI
  })
    .index("by_active", ["isActive"])
    .index("by_name", ["name"]),

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

    // Payment provider selection (IMMUTABLE - cannot be changed after creation)
    // References the providerCatalog table
    paymentProviderId: v.id("providerCatalog"),

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
    gracePeriod: v.number(), // days, default 3

    // Advanced settings (optional with defaults)
    allowPlanDowngrades: v.optional(v.boolean()), // default true
    requireBillingAddress: v.optional(v.boolean()), // default false
    enableProration: v.optional(v.boolean()), // default true
    autoSuspendOnFailedPayment: v.optional(v.boolean()), // default true
    
    // Webhook configuration
    webhookUrl: v.optional(v.string()),
    webhookSecret: v.optional(v.string()),
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
    .index("by_external", ["externalCustomerId"])
    .searchIndex("search_customers", {
      searchField: "email",
      filterFields: ["appId", "status"],
    }),

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
    currency: v.union(
      v.literal("UGX"),
      v.literal("KES"),
      v.literal("RWF"),
      v.literal("TZS"),
      v.literal("USD")
    ),
    interval: v.union(
      v.literal("monthly"),
      v.literal("quarterly"),
      v.literal("yearly"),
      v.literal("one-time")
    ),
    trialDays: v.optional(v.number()), // Plan-specific trial period (0 = no trial)
    usageMetric: v.optional(v.string()), // e.g. "api_calls", "messages"
    unitPrice: v.optional(v.number()), // price per unit
    freeUnits: v.optional(v.number()), // included usage
    status: v.union(v.literal("active"), v.literal("archived")),
    mode: v.union(v.literal("live"), v.literal("test")),
  })
    .index("by_app", ["appId"])
    .index("by_pricing_model", ["pricingModel"]),

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

  // Webhook Deliveries (outgoing webhooks to clients)
  webhookDeliveries: defineTable({
    appId: v.id("apps"),
    event: v.string(), // e.g., "subscription.created", "subscription.renewed"
    payload: v.any(), // The webhook payload
    url: v.string(), // Where it was sent
    status: v.union(
      v.literal("pending"),
      v.literal("success"),
      v.literal("failed")
    ),
    responseStatus: v.optional(v.number()), // HTTP status code
    responseBody: v.optional(v.string()),
    error: v.optional(v.string()),
    attempts: v.number(), // Number of delivery attempts
    lastAttemptAt: v.optional(v.number()),
    nextRetryAt: v.optional(v.number()),
  })
    .index("by_app", ["appId"])
    .index("by_status", ["status"])
    .index("by_next_retry", ["nextRetryAt"]),

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
      v.literal("expired"),
      v.literal("past_due") // Added for failed payments
    ),
    startDate: v.number(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    usageQuantity: v.optional(v.number()), // aggregated from usageEvents or usageSummaries
    usageAmount: v.optional(v.number()), // computed charge

    // Payment tracking fields
    nextPaymentDate: v.optional(v.number()), // When next payment is due
    lastPaymentDate: v.optional(v.number()), // Last successful payment
    trialEndsAt: v.optional(v.number()), // Trial expiration timestamp
    failedPaymentAttempts: v.optional(v.number()), // Count of failed payments
  })
    .index("by_customer", ["customerId"])
    .index("by_app", ["appId"])
    .index("by_plan", ["planId"])
    .index("by_status", ["status"])
    .index("by_customer_plan", ["customerId", "planId"])
    .index("by_next_payment", ["nextPaymentDate"])
    .index("by_trial_end", ["trialEndsAt"]),

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

  // Usage Events Table
  usageEvents: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    subscriptionId: v.id("subscriptions"),
    quantity: v.number(), // number of units consumed
    metric: v.string(), // e.g., "api_calls", "storage_gb", "sms_sent"
    timestamp: v.number(), // when this usage occurred
    eventId: v.optional(v.string()), // external event ID for deduplication
    metadata: v.optional(v.any()), // additional data from external app
  })
    .index("by_subscription", ["subscriptionId"])
    .index("by_customer", ["customerId"])
    .index("by_app", ["appId"])
    .index("by_metric", ["metric"])
    .index("by_timestamp", ["timestamp"])
    .index("by_eventId", ["eventId"])
    .index("by_subscription_timestamp", ["subscriptionId", "timestamp"]),

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

  // Payment Provider Credentials Table
  // Stores API credentials for the app's selected payment provider
  // NOTE: Provider selection (which provider) is immutable and stored in apps.paymentProviderId
  // This table only stores the credentials (API keys) which can be updated
  paymentProviderCredentials: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"), // One-to-one: Each app has exactly one credential record

    // Encrypted credentials (app's keys, not CrediBill's)
    credentials: v.object({
      publicKey: v.optional(v.string()), // Some providers have public keys
      secretKeyEncrypted: v.string(), // Always encrypted
      merchantId: v.optional(v.string()), // Some providers use merchant IDs
      apiUrl: v.optional(v.string()), // Custom API endpoint if needed
    }),

    // Configuration
    environment: v.union(v.literal("test"), v.literal("live")),

    // Webhook configuration
    webhookSecret: v.optional(v.string()), // For verifying provider webhooks

    // Connection status
    connectionStatus: v.union(
      v.literal("connected"),
      v.literal("error"),
      v.literal("pending")
    ),
    lastConnectionTest: v.optional(v.number()),
    lastError: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  })
    .index("by_app", ["appId"])
    .index("by_org", ["organizationId"])
    .index("by_status", ["connectionStatus"]),

  // Payment Transactions Table
  // Tracks every payment attempt (success or failure)
  paymentTransactions: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    customerId: v.id("customers"),
    subscriptionId: v.optional(v.id("subscriptions")),
    invoiceId: v.optional(v.id("invoices")),

    // Payment details
    amount: v.number(), // Smallest currency unit
    currency: v.string(),

    // Provider used for THIS transaction attempt
    // References the app's immutable provider choice
    providerCatalogId: v.id("providerCatalog"),
    providerTransactionId: v.optional(v.string()), // Provider's reference
    providerReference: v.optional(v.string()), // Our reference sent to provider

    // Payment method used
    paymentMethod: v.union(
      v.literal("mobile_money_mtn"),
      v.literal("mobile_money_airtel"),
      v.literal("mobile_money_tigo"),
      v.literal("mobile_money_vodacom"),
      v.literal("card_visa"),
      v.literal("card_mastercard"),
      v.literal("bank_transfer"),
      v.literal("other")
    ),

    // Customer payment details (phone, card token, etc.)
    customerPaymentDetails: v.optional(
      v.object({
        phone: v.optional(v.string()),
        cardLast4: v.optional(v.string()),
        accountNumber: v.optional(v.string()),
      })
    ),

    // Transaction status
    status: v.union(
      v.literal("pending"),
      v.literal("initiated"),
      v.literal("processing"),
      v.literal("success"),
      v.literal("failed"),
      v.literal("canceled"),
      v.literal("refunded")
    ),

    // Failure details
    failureReason: v.optional(v.string()),
    failureCode: v.optional(v.string()),

    // Retry tracking
    attemptNumber: v.number(), // 1st attempt, 2nd attempt, etc.
    isRetry: v.boolean(),
    originalTransactionId: v.optional(v.id("paymentTransactions")),

    // Provider response
    providerResponse: v.optional(v.any()), // Full webhook/API response

    // Timestamps
    initiatedAt: v.number(),
    completedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()), // For pending payments

    // Metadata
    metadata: v.optional(v.any()),
  })
    .index("by_app", ["appId"])
    .index("by_customer", ["customerId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_invoice", ["invoiceId"])
    .index("by_provider", ["providerCatalogId"])
    .index("by_status", ["status"])
    .index("by_provider_txn_id", ["providerTransactionId"])
    .index("by_reference", ["providerReference"])
    .index("by_initiated_at", ["initiatedAt"]),

  // Webhook Logs Table (Incoming webhooks from providers)
  webhookLogs: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),

    // Provider info
    provider: v.union(
      v.literal("flutterwave"),
      v.literal("pawapay"),
      v.literal("pesapal"),
      v.literal("dpo"),
      v.literal("paystack"),
      v.literal("stripe"),
      v.literal("clerk") // For user webhooks
    ),

    // Webhook data
    event: v.string(), // e.g., "charge.completed", "payment.success"
    payload: v.any(), // Full webhook payload
    headers: v.optional(v.any()), // Request headers for debugging

    // Verification
    signatureValid: v.optional(v.boolean()),

    // Processing status
    status: v.union(
      v.literal("received"),
      v.literal("processing"),
      v.literal("processed"),
      v.literal("failed"),
      v.literal("ignored")
    ),

    // Processing details
    processedAt: v.optional(v.number()),
    processingError: v.optional(v.string()),

    // Related entities
    paymentTransactionId: v.optional(v.id("paymentTransactions")),
    subscriptionId: v.optional(v.id("subscriptions")),

    // Timestamps
    receivedAt: v.number(),
  })
    .index("by_app", ["appId"])
    .index("by_provider", ["provider"])
    .index("by_status", ["status"])
    .index("by_received_at", ["receivedAt"])
    .index("by_payment_txn", ["paymentTransactionId"]),

  // Outgoing Webhook Logs (Webhooks sent TO SaaS apps)
  outgoingWebhookLogs: defineTable({
    organizationId: v.id("organizations"),
    appId: v.id("apps"),
    webhookId: v.id("webhooks"), // Reference to webhook configuration

    // Event details
    event: v.string(), // e.g., "subscription.activated", "invoice.paid"
    payload: v.any(), // Payload sent to SaaS app

    // Delivery details
    url: v.string(), // Where we sent it
    httpStatus: v.optional(v.number()), // Response status code
    response: v.optional(v.any()), // Response body

    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("sent"),
      v.literal("delivered"),
      v.literal("failed"),
      v.literal("retrying")
    ),

    // Retry tracking
    attemptNumber: v.number(),
    maxAttempts: v.number(),
    nextRetryAt: v.optional(v.number()),

    // Error details
    error: v.optional(v.string()),

    // Timestamps
    createdAt: v.number(),
    sentAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
  })
    .index("by_app", ["appId"])
    .index("by_webhook", ["webhookId"])
    .index("by_status", ["status"])
    .index("by_event", ["event"])
    .index("by_next_retry", ["nextRetryAt"]),
});
