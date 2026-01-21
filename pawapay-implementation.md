# PawaPay + CrediBill Integration Guide for Reciit

**App Name**: Reciit  
**Backend**: Convex  
**Frontend**: Next.js + React  
**Payment Provider**: PawaPay  
**Billing Service**: CrediBill  
**Last Updated**: January 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Database Schema (Convex)](#database-schema-convex)
5. [Environment Variables](#environment-variables)
6. [CrediBill API Integration](#credibill-api-integration)
7. [PawaPay Payment Flow](#pawapay-payment-flow)
8. [Webhook Implementation](#webhook-implementation)
9. [Complete Implementation Steps](#complete-implementation-steps)
10. [Testing Checklist](#testing-checklist)
11. [Error Handling](#error-handling)
12. [Security Best Practices](#security-best-practices)

---

## Overview

Reciit integrates with **CrediBill** for subscription management and **PawaPay** for payment processing. CrediBill tracks subscriptions, generates invoices, and sends webhooks when subscription states change. Reciit is responsible for collecting payments from end-users via PawaPay.

### Key Concepts

- **CrediBill**: Tracks subscriptions, plans, customers, invoices, and usage. Does NOT collect payments.
- **PawaPay**: Processes mobile money payments (MTN, Airtel, etc.) in East Africa.
- **Reciit** (your app): Creates customers, manages subscriptions via CrediBill API, initiates payments via PawaPay, and receives webhooks from CrediBill about subscription state changes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                         RECIIT APP                           │
│                    (Next.js + Convex)                        │
└──────────────────────────────────────────────────────────────┘
                │                           │
                │ API Calls                 │ Webhooks
                ▼                           ▼
┌─────────────────────────┐   ┌──────────────────────────────┐
│      CREDIBILL API      │   │   CREDIBILL WEBHOOKS         │
│   (Subscription Mgmt)   │   │   (via Svix)                 │
└─────────────────────────┘   └──────────────────────────────┘
                                              │
                                              │ Notifications
                                              ▼
                                    ┌──────────────────┐
                                    │  Reciit Webhook  │
                                    │    Endpoint      │
                                    └──────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                     PAYMENT FLOW                             │
└──────────────────────────────────────────────────────────────┘
    Customer           Reciit              PawaPay
       │                 │                    │
       │ 1. Subscribe    │                    │
       ├────────────────►│                    │
       │                 │ 2. Create Customer │
       │                 │    (CrediBill API) │
       │                 │                    │
       │                 │ 3. Create Sub      │
       │                 │    (CrediBill API) │
       │                 │                    │
       │                 │ 4. Initiate Deposit│
       │                 ├───────────────────►│
       │                 │    (with metadata) │
       │                 │                    │
       │ 5. Payment Prompt◄───────────────────┤
       ├─────────────────┤                    │
       │                 │                    │
       │ 6. Confirm      │                    │
       ├────────────────►│                    │
       │                 │ 7. Webhook (COMPLETED)
       │                 │◄───────────────────┤
       │                 │                    │
       │                 │ 8. CrediBill processes
       │                 │    → activates sub │
       │                 │    → marks invoice paid
       │                 │                    │
       │ 9. Webhook      │                    │
       │   (subscription.activated)           │
       │◄────────────────┤                    │
       │                 │                    │
```

---

## Prerequisites

### 1. CrediBill Setup

1. Create an account at CrediBill dashboard
2. Create an organization
3. Create an app in your organization
   - Name: "Reciit"
   - Select Payment Provider: **PawaPay**
   - Set default currency (UGX, KES, etc.)
   - Set timezone (EAT)
   - Configure grace period (e.g., 3 days)
4. Configure PawaPay credentials in CrediBill
   - Go to App Settings → Payment Provider
   - Enter PawaPay API keys
   - Save and test connection
5. Create API Key
   - Go to App Settings → API Keys
   - Create new key with `read` and `write` scopes
   - Copy the key (shown only once): `pk_live_xxxxx...`
6. Configure webhook endpoint
   - Go to App Settings → Webhooks
   - Enter your webhook URL: `https://reciit.com/api/webhooks/credibill`
   - Save webhook secret: `whsec_xxxxx...`
7. Create subscription plans
   - Go to Plans → Create Plan
   - Example: Basic Plan (10,000 UGX/month)

### 2. PawaPay Setup

1. Create PawaPay merchant account at https://www.pawapay.co.uk
2. Complete KYC verification
3. Get API credentials:
   - API Token (Bearer token)
   - API Base URL: `https://api.pawapay.co.uk` (production)
   - Test URL: `https://api.sandbox.pawapay.cloud` (sandbox)
4. Configure webhook URL in PawaPay dashboard
   - URL: `https://api.credibill.tech/v1/webhooks/pawapay`
   - This routes to CrediBill's Cloudflare Worker which forwards to Convex

### 3. Convex Setup

1. Install Convex: `npm install convex`
2. Initialize: `npx convex dev`
3. Configure authentication (Clerk recommended)

---

## Database Schema (Convex)

Create these tables in `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Customers - Your end users
  customers: defineTable({
    // CrediBill customer ID
    credibillCustomerId: v.string(),

    // User info
    email: v.string(),
    phone: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),

    // Status
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("blocked"),
    ),

    // Clerk integration (if using Clerk)
    clerkUserId: v.optional(v.string()),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_credibill_id", ["credibillCustomerId"])
    .index("by_clerk_user", ["clerkUserId"]),

  // Subscriptions - Links to CrediBill subscriptions
  subscriptions: defineTable({
    // References
    customerId: v.id("customers"),
    credibillSubscriptionId: v.string(),
    credibillPlanId: v.string(),

    // Subscription details
    status: v.union(
      v.literal("trialing"),
      v.literal("pending_payment"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("cancelled"),
    ),

    // Dates
    startDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),

    // Plan snapshot (cached from CrediBill)
    planName: v.string(),
    planAmount: v.number(),
    planCurrency: v.string(),
    planInterval: v.string(),

    // Features (app-specific)
    features: v.optional(v.array(v.string())),

    // Metadata
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_customer", ["customerId"])
    .index("by_credibill_sub", ["credibillSubscriptionId"])
    .index("by_status", ["status"]),

  // Transactions - PawaPay payment tracking
  transactions: defineTable({
    // References
    customerId: v.id("customers"),
    subscriptionId: v.optional(v.id("subscriptions")),

    // PawaPay deposit ID (YOUR generated UUID)
    depositId: v.string(),

    // Amount
    amount: v.string(), // PawaPay uses string amounts
    currency: v.string(),

    // Status from PawaPay
    status: v.union(
      v.literal("PENDING"),
      v.literal("ACCEPTED"),
      v.literal("SUBMITTED"),
      v.literal("COMPLETED"),
      v.literal("FAILED"),
    ),

    // PawaPay response data
    correspondent: v.optional(v.string()), // "MTN_MOMO_UGA"
    payer: v.optional(v.any()), // Phone and account details

    // Failure info
    failureCode: v.optional(v.string()),
    failureReason: v.optional(v.string()),

    // Metadata sent to PawaPay
    metadata: v.object({
      credibill_app_id: v.string(),
      credibill_customer_id: v.string(),
      credibill_subscription_id: v.string(),
      credibill_invoice_id: v.optional(v.string()),
    }),

    // Timestamps
    initiatedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_customer", ["customerId"])
    .index("by_deposit_id", ["depositId"])
    .index("by_subscription", ["subscriptionId"])
    .index("by_status", ["status"]),

  // Webhook Events - Track incoming webhooks from CrediBill
  webhookEvents: defineTable({
    // Event details
    event: v.string(), // "subscription.activated", "subscription.renewed", etc.
    payload: v.any(),

    // Processing
    processed: v.boolean(),
    processedAt: v.optional(v.number()),
    error: v.optional(v.string()),

    // Verification
    signatureValid: v.boolean(),

    // Timestamp
    receivedAt: v.number(),
  })
    .index("by_event", ["event"])
    .index("by_processed", ["processed"])
    .index("by_received", ["receivedAt"]),
});
```

---

## Environment Variables

### Convex Environment Variables

Go to Convex Dashboard → Settings → Environment Variables:

```bash
# CrediBill API
CREDIBILL_API_KEY=pk_live_xxxxxxxxxxxxx
CREDIBILL_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
CREDIBILL_APP_ID=j57xxxxxxxxxxxxx
CREDIBILL_BASE_URL=https://your-credibill-deployment.convex.site

# PawaPay API
PAWAPAY_API_TOKEN=Bearer xxxxxxxxxxxxx
PAWAPAY_BASE_URL=https://api.pawapay.co.uk
# For testing:
# PAWAPAY_BASE_URL=https://api.sandbox.pawapay.cloud

# Encryption (for sensitive data storage)
ENCRYPTION_KEY=your-32-byte-hex-string
```

### Next.js Environment Variables

`.env.local`:

```bash
# Public
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# Clerk (optional)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```

---

## CrediBill API Integration

### 1. API Client Setup

Create `lib/credibill.ts`:

```typescript
const CREDIBILL_API_KEY = process.env.CREDIBILL_API_KEY!;
const CREDIBILL_BASE_URL = process.env.CREDIBILL_BASE_URL!;

interface CrediBillCustomer {
  customerId: string;
}

interface CrediBillSubscription {
  subscriptionId: string;
  invoiceId: string | null;
  status: string;
  trialEndsAt: number | null;
  nextBillingDate: number | null;
  paymentDueDate: number | null;
}

export class CrediBillClient {
  private baseUrl: string;
  private apiKey: string;

  constructor() {
    this.baseUrl = CREDIBILL_BASE_URL;
    this.apiKey = CREDIBILL_API_KEY;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "CrediBill API error");
    }

    return response.json();
  }

  // Create customer in CrediBill
  async createCustomer(data: {
    email: string;
    phone: string;
    first_name?: string;
    last_name?: string;
  }): Promise<CrediBillCustomer> {
    return this.request<CrediBillCustomer>("/api/v1/customers/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Create subscription
  async createSubscription(data: {
    customerId: string;
    planId: string;
    startDate?: number;
  }): Promise<CrediBillSubscription> {
    return this.request<CrediBillSubscription>("/api/v1/subscriptions/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Get subscription
  async getSubscription(subscriptionId: string) {
    return this.request(
      `/api/v1/subscriptions?subscriptionId=${subscriptionId}`,
      {
        method: "GET",
      },
    );
  }

  // Cancel subscription
  async cancelSubscription(
    subscriptionId: string,
    cancelAtPeriodEnd: boolean = true,
  ) {
    return this.request(
      `/api/v1/subscriptions/cancel?subscriptionId=${subscriptionId}&cancelAtPeriodEnd=${cancelAtPeriodEnd}`,
      {
        method: "DELETE",
      },
    );
  }

  // Get invoices
  async getInvoices(params: { customerId?: string; status?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/invoices?${query}`, {
      method: "GET",
    });
  }

  // Record usage (for usage-based plans)
  async recordUsage(data: {
    subscriptionId: string;
    quantity: number;
    metric: string;
    eventId?: string;
    metadata?: any;
  }) {
    return this.request("/api/v1/usage", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}
```

### 2. Convex Actions for CrediBill

Create `convex/credibill.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Create customer in CrediBill
 */
export const createCustomerInCrediBill = internalAction({
  args: {
    email: v.string(),
    phone: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(
      `${process.env.CREDIBILL_BASE_URL}/api/v1/customers/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CREDIBILL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: args.email,
          phone: args.phone,
          first_name: args.firstName,
          last_name: args.lastName,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create customer");
    }

    const data = await response.json();
    return data.customerId;
  },
});

/**
 * Create subscription in CrediBill
 */
export const createSubscriptionInCrediBill = internalAction({
  args: {
    customerId: v.string(), // CrediBill customer ID
    planId: v.string(), // CrediBill plan ID
    startDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const response = await fetch(
      `${process.env.CREDIBILL_BASE_URL}/api/v1/subscriptions/create`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.CREDIBILL_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerId: args.customerId,
          planId: args.planId,
          startDate: args.startDate,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to create subscription");
    }

    return await response.json();
  },
});
```

---

## PawaPay Payment Flow

### 1. Generate Deposit ID

**CRITICAL**: The `depositId` MUST be a UUID you generate. This is YOUR reference that links the payment to your customer/subscription.

```typescript
import { v4 as uuidv4 } from "uuid";

const depositId = uuidv4(); // e.g., "550e8400-e29b-41d4-a716-446655440000"
```

### 2. Initiate Deposit with PawaPay

Create `convex/pawapay.ts`:

```typescript
"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Initiate PawaPay deposit
 */
export const initiateDeposit = internalAction({
  args: {
    depositId: v.string(), // YOUR generated UUID
    amount: v.string(), // e.g., "10000.00"
    currency: v.string(), // "UGX", "KES", etc.
    phoneNumber: v.string(), // "+256700123456"
    customerId: v.id("customers"),
    subscriptionId: v.optional(v.id("subscriptions")),
    credibillCustomerId: v.string(),
    credibillSubscriptionId: v.string(),
    credibillInvoiceId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Metadata MUST include these fields for CrediBill to process
    const metadata = [
      { credibill_app_id: process.env.CREDIBILL_APP_ID! },
      { credibill_customer_id: args.credibillCustomerId },
      { credibill_subscription_id: args.credibillSubscriptionId },
    ];

    if (args.credibillInvoiceId) {
      metadata.push({ credibill_invoice_id: args.credibillInvoiceId });
    }

    const payload = {
      depositId: args.depositId, // YOUR UUID
      amount: args.amount,
      currency: args.currency,
      correspondent: "MTN_MOMO_UGA", // Or detect from phone number
      payer: {
        type: "MSISDN",
        address: {
          value: args.phoneNumber,
        },
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "Reciit Subscription",
      metadata: metadata,
    };

    console.log("[PawaPay] Initiating deposit:", payload);

    const response = await fetch(`${process.env.PAWAPAY_BASE_URL}/deposits`, {
      method: "POST",
      headers: {
        Authorization: process.env.PAWAPAY_API_TOKEN!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[PawaPay] Deposit failed:", error);
      throw new Error(`PawaPay deposit failed: ${error}`);
    }

    const result = await response.json();
    console.log("[PawaPay] Deposit initiated:", result);

    return result;
  },
});

/**
 * Check deposit status
 */
export const checkDepositStatus = internalAction({
  args: {
    depositId: v.string(),
  },
  handler: async (ctx, args) => {
    const response = await fetch(
      `${process.env.PAWAPAY_BASE_URL}/deposits/${args.depositId}`,
      {
        method: "GET",
        headers: {
          Authorization: process.env.PAWAPAY_API_TOKEN!,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to check deposit status");
    }

    return await response.json();
  },
});
```

### 3. Complete Payment Flow

Create `convex/payments.ts`:

```typescript
import { v } from "convex/values";
import { mutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v4 as uuidv4 } from "uuid";

/**
 * Subscribe user to a plan (complete flow)
 */
export const subscribeUserToPlan = action({
  args: {
    email: v.string(),
    phone: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    planId: v.string(), // CrediBill plan ID
  },
  handler: async (ctx, args) => {
    // 1. Create customer in Reciit
    const customerId = await ctx.runMutation(
      internal.customers.createCustomer,
      {
        email: args.email,
        phone: args.phone,
        firstName: args.firstName,
        lastName: args.lastName,
      },
    );

    // 2. Create customer in CrediBill
    const credibillCustomerId = await ctx.runAction(
      internal.credibill.createCustomerInCrediBill,
      {
        email: args.email,
        phone: args.phone,
        firstName: args.firstName,
        lastName: args.lastName,
      },
    );

    // 3. Update local customer with CrediBill ID
    await ctx.runMutation(internal.customers.updateCustomer, {
      customerId,
      credibillCustomerId,
    });

    // 4. Create subscription in CrediBill
    const credibillSub = await ctx.runAction(
      internal.credibill.createSubscriptionInCrediBill,
      {
        customerId: credibillCustomerId,
        planId: args.planId,
      },
    );

    // 5. Create local subscription record
    const subscriptionId = await ctx.runMutation(
      internal.subscriptions.createSubscription,
      {
        customerId,
        credibillSubscriptionId: credibillSub.subscriptionId,
        credibillPlanId: args.planId,
        status: credibillSub.status,
        planAmount: 10000, // Get from plan
        planCurrency: "UGX",
        planInterval: "monthly",
        planName: "Basic Plan",
      },
    );

    // 6. Generate deposit ID (UUID)
    const depositId = uuidv4();

    // 7. Create transaction record
    const transactionId = await ctx.runMutation(
      internal.transactions.createTransaction,
      {
        customerId,
        subscriptionId,
        depositId,
        amount: "10000.00",
        currency: "UGX",
        status: "PENDING",
        metadata: {
          credibill_app_id: process.env.CREDIBILL_APP_ID!,
          credibill_customer_id: credibillCustomerId,
          credibill_subscription_id: credibillSub.subscriptionId,
          credibill_invoice_id: credibillSub.invoiceId,
        },
      },
    );

    // 8. Initiate PawaPay deposit
    const pawaPayResult = await ctx.runAction(
      internal.pawapay.initiateDeposit,
      {
        depositId,
        amount: "10000.00",
        currency: "UGX",
        phoneNumber: args.phone,
        customerId,
        subscriptionId,
        credibillCustomerId,
        credibillSubscriptionId: credibillSub.subscriptionId,
        credibillInvoiceId: credibillSub.invoiceId || undefined,
      },
    );

    return {
      customerId,
      subscriptionId,
      depositId,
      status: credibillSub.status,
      message:
        "Payment initiated. Please check your phone for the payment prompt.",
    };
  },
});
```

---

## Webhook Implementation

### 1. CrediBill Webhook Endpoint

Create `app/api/webhooks/credibill/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Verify webhook signature
function verifySignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature),
    Buffer.from(signature),
  );
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature") || "";

    // Verify signature
    const isValid = verifySignature(
      rawBody,
      signature,
      process.env.CREDIBILL_WEBHOOK_SECRET!,
    );

    if (!isValid) {
      console.error("[Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // Parse payload
    const webhook = JSON.parse(rawBody);
    console.log("[Webhook] Received event:", webhook.event);

    // Process webhook in Convex
    await convex.action(api.webhooks.processCrediBillWebhook, {
      event: webhook.event,
      payload: webhook.data,
      timestamp: webhook.timestamp,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Webhook] Error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 },
    );
  }
}
```

### 2. Process Webhooks in Convex

Create `convex/webhooks.ts`:

```typescript
import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

/**
 * Process CrediBill webhook
 */
export const processCrediBillWebhook = action({
  args: {
    event: v.string(),
    payload: v.any(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    // Log webhook
    await ctx.runMutation(internal.webhooks.logWebhook, {
      event: args.event,
      payload: args.payload,
      signatureValid: true,
      receivedAt: Date.now(),
    });

    // Route to appropriate handler
    switch (args.event) {
      case "subscription.created":
        await handleSubscriptionCreated(ctx, args.payload);
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(ctx, args.payload);
        break;

      case "subscription.renewed":
        await handleSubscriptionRenewed(ctx, args.payload);
        break;

      case "subscription.past_due":
        await handleSubscriptionPastDue(ctx, args.payload);
        break;

      case "subscription.cancelled":
        await handleSubscriptionCancelled(ctx, args.payload);
        break;

      case "payment.completed":
        await handlePaymentCompleted(ctx, args.payload);
        break;

      case "payment.failed":
        await handlePaymentFailed(ctx, args.payload);
        break;

      default:
        console.log(`[Webhook] Unhandled event: ${args.event}`);
    }

    // Mark webhook as processed
    await ctx.runMutation(internal.webhooks.markWebhookProcessed, {
      event: args.event,
      timestamp: args.timestamp,
    });
  },
});

/**
 * Handle subscription activated
 */
async function handleSubscriptionActivated(ctx: any, payload: any) {
  const { subscription, customer, first_payment } = payload;

  console.log("[Webhook] Subscription activated:", subscription);

  // Update local subscription
  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    credibillSubscriptionId: subscription._id,
    status: "active",
    startDate: subscription.startDate,
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });

  // Grant user access to features
  await ctx.runMutation(internal.customers.updateCustomerAccess, {
    credibillCustomerId: customer._id,
    hasAccess: true,
  });

  // Send confirmation email (optional)
  // await sendEmail(customer.email, "Subscription Activated");
}

/**
 * Handle subscription renewed
 */
async function handleSubscriptionRenewed(ctx: any, payload: any) {
  const { subscription, payment_date } = payload;

  console.log("[Webhook] Subscription renewed:", subscription);

  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    credibillSubscriptionId: subscription._id,
    status: "active",
    currentPeriodStart: subscription.currentPeriodStart,
    currentPeriodEnd: subscription.currentPeriodEnd,
  });
}

/**
 * Handle subscription past due
 */
async function handleSubscriptionPastDue(ctx: any, payload: any) {
  const { subscription, failed_attempts } = payload;

  console.log("[Webhook] Subscription past due:", subscription);

  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    credibillSubscriptionId: subscription._id,
    status: "past_due",
  });

  // Restrict access but don't fully disable (grace period)
  await ctx.runMutation(internal.customers.updateCustomerAccess, {
    credibillCustomerId: subscription.customerId,
    hasAccess: false,
    gracePeriod: true,
  });

  // Send payment reminder email
  // await sendEmail(customer.email, "Payment Failed - Update Payment Method");
}

/**
 * Handle subscription cancelled
 */
async function handleSubscriptionCancelled(ctx: any, payload: any) {
  const { subscription } = payload;

  console.log("[Webhook] Subscription cancelled:", subscription);

  await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
    credibillSubscriptionId: subscription._id,
    status: "cancelled",
    cancelledAt: Date.now(),
  });

  // Revoke access
  await ctx.runMutation(internal.customers.updateCustomerAccess, {
    credibillCustomerId: subscription.customerId,
    hasAccess: false,
    gracePeriod: false,
  });
}

/**
 * Handle payment completed
 */
async function handlePaymentCompleted(ctx: any, payload: any) {
  const { payment, subscription_id } = payload;

  console.log("[Webhook] Payment completed:", payment);

  // Update transaction status
  await ctx.runMutation(internal.transactions.updateTransactionStatus, {
    depositId: payment.providerTransactionId,
    status: "COMPLETED",
    completedAt: Date.now(),
  });
}

/**
 * Handle payment failed
 */
async function handlePaymentFailed(ctx: any, payload: any) {
  const { payment, subscription_id } = payload;

  console.log("[Webhook] Payment failed:", payment);

  // Update transaction status
  await ctx.runMutation(internal.transactions.updateTransactionStatus, {
    depositId: payment.providerTransactionId,
    status: "FAILED",
    failureCode: payment.failureCode,
    failureReason: payment.failureReason,
    completedAt: Date.now(),
  });
}

/**
 * Log webhook event
 */
export const logWebhook = internalMutation({
  args: {
    event: v.string(),
    payload: v.any(),
    signatureValid: v.boolean(),
    receivedAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhookEvents", {
      event: args.event,
      payload: args.payload,
      signatureValid: args.signatureValid,
      processed: false,
      receivedAt: args.receivedAt,
    });
  },
});

/**
 * Mark webhook as processed
 */
export const markWebhookProcessed = internalMutation({
  args: {
    event: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const webhook = await ctx.db
      .query("webhookEvents")
      .filter((q) =>
        q.and(
          q.eq(q.field("event"), args.event),
          q.eq(q.field("receivedAt"), args.timestamp),
        ),
      )
      .first();

    if (webhook) {
      await ctx.db.patch(webhook._id, {
        processed: true,
        processedAt: Date.now(),
      });
    }
  },
});
```

---

## Complete Implementation Steps

### Step 1: Setup CrediBill Account

1. Go to CrediBill dashboard
2. Create organization: "Reciit Inc"
3. Create app: "Reciit"
   - Select PawaPay as provider
   - Currency: UGX
   - Timezone: EAT
   - Grace period: 3 days
4. Configure PawaPay credentials
5. Create API key → Save to `.env`
6. Create subscription plans:
   - Basic: 10,000 UGX/month
   - Pro: 30,000 UGX/month

### Step 2: Setup PawaPay Account

1. Create merchant account
2. Get API credentials → Save to `.env`
3. Configure webhook in PawaPay dashboard:
   - URL: `https://api.credibill.tech/v1/webhooks/pawapay`

### Step 3: Setup Convex Backend

```bash
# Install dependencies
npm install convex uuid
npm install --save-dev @types/uuid

# Initialize Convex
npx convex dev
```

Create schema in `convex/schema.ts` (see Database Schema section)

### Step 4: Create Convex Functions

1. `convex/credibill.ts` - CrediBill API actions
2. `convex/pawapay.ts` - PawaPay API actions
3. `convex/payments.ts` - Payment flow orchestration
4. `convex/webhooks.ts` - Webhook handlers
5. `convex/customers.ts` - Customer mutations
6. `convex/subscriptions.ts` - Subscription mutations
7. `convex/transactions.ts` - Transaction mutations

### Step 5: Create Next.js Webhook Endpoint

```bash
mkdir -p app/api/webhooks/credibill
```

Create `app/api/webhooks/credibill/route.ts` (see Webhook Implementation section)

### Step 6: Deploy

```bash
# Deploy Convex
npx convex deploy

# Deploy Next.js
vercel deploy

# Update webhook URL in CrediBill dashboard
# URL: https://reciit.com/api/webhooks/credibill
```

---

## Testing Checklist

### Manual Testing

- [ ] Create customer via API
- [ ] Create subscription via API
- [ ] Verify subscription status in CrediBill dashboard
- [ ] Initiate payment with PawaPay
- [ ] Confirm payment on phone
- [ ] Verify webhook received from PawaPay → CrediBill
- [ ] Verify webhook received from CrediBill → Reciit
- [ ] Verify subscription activated in Reciit
- [ ] Verify user has access to features
- [ ] Test payment failure scenario
- [ ] Test subscription cancellation
- [ ] Test webhook signature verification

### PawaPay Test Phone Numbers (Sandbox)

```
+256700000001 - Always succeeds
+256700000002 - Always fails
+256700000003 - Delays 30 seconds then succeeds
```

### Test Deposit IDs

Must be valid UUIDs. Generate with:

```javascript
import { v4 as uuidv4 } from "uuid";
const testDepositId = uuidv4();
```

### Webhook Testing

Use ngrok for local testing:

```bash
ngrok http 3000

# Update webhook URL temporarily:
# https://abc123.ngrok.io/api/webhooks/credibill
```

---

## Error Handling

### Common Errors

#### 1. Missing Metadata in PawaPay Request

**Error**: Webhook received but subscription not updated

**Solution**: Ensure metadata includes ALL required fields:

```javascript
metadata: [
  { credibill_app_id: process.env.CREDIBILL_APP_ID },
  { credibill_customer_id: "j57xxxxx" },
  { credibill_subscription_id: "k9xxxxx" },
  { credibill_invoice_id: "m3xxxxx" }, // Optional but recommended
];
```

#### 2. Invalid Deposit ID

**Error**: "Invalid depositId format"

**Solution**: Use valid UUID v4:

```javascript
import { v4 as uuidv4 } from "uuid";
const depositId = uuidv4();
```

#### 3. Webhook Signature Mismatch

**Error**: "Invalid signature"

**Solution**: Verify webhook secret matches CrediBill dashboard

#### 4. Transaction Already Processed (Idempotency)

**Error**: Duplicate webhook processing

**Solution**: CrediBill handles idempotency automatically using depositId

#### 5. PawaPay Correspondent Mismatch

**Error**: "Correspondent not available"

**Solution**: Detect correspondent from phone number:

```javascript
function detectCorrespondent(phone: string, currency: string) {
  if (currency === "UGX") {
    if (phone.startsWith("+25677") || phone.startsWith("+25678")) {
      return "MTN_MOMO_UGA";
    }
    if (phone.startsWith("+25675") || phone.startsWith("+25670")) {
      return "AIRTEL_OAPI_UGA";
    }
  }
  // Add more correspondents as needed
  return "MTN_MOMO_UGA"; // Default
}
```

---

## Security Best Practices

### 1. Environment Variables

- ✅ Store all secrets in Convex environment variables
- ✅ Never commit API keys to git
- ✅ Use different keys for test/production

### 2. Webhook Verification

- ✅ Always verify webhook signatures
- ✅ Use timing-safe comparison for signatures
- ✅ Check webhook timestamp to prevent replay attacks

### 3. API Key Scoping

- ✅ Use least privilege (only `read` and `write` scopes)
- ✅ Never expose API keys in frontend code
- ✅ Rotate keys periodically

### 4. Payment Security

- ✅ Never store PawaPay credentials in database
- ✅ Use HTTPS for all API calls
- ✅ Validate amounts before initiating payments
- ✅ Log all payment attempts for audit

### 5. Customer Data

- ✅ Encrypt sensitive customer data
- ✅ Comply with data protection regulations
- ✅ Implement data retention policies
- ✅ Provide data export/deletion endpoints

---

## Webhook Events Reference

### Events You Will Receive from CrediBill

| Event                    | Description                | When Triggered                   | Action Required                |
| ------------------------ | -------------------------- | -------------------------------- | ------------------------------ |
| `subscription.created`   | Subscription created       | After API call                   | Log event, no action needed    |
| `subscription.activated` | First payment received     | Payment COMPLETED                | Grant user access              |
| `subscription.renewed`   | Recurring payment received | Monthly/yearly renewal           | Extend access period           |
| `subscription.past_due`  | Payment failed 3+ times    | After retry exhaustion           | Restrict access, send reminder |
| `subscription.cancelled` | Subscription ended         | User cancellation or non-payment | Revoke access                  |
| `payment.completed`      | Payment succeeded          | PawaPay COMPLETED status         | Update transaction record      |
| `payment.failed`         | Payment failed             | PawaPay FAILED status            | Log failure, notify user       |
| `invoice.paid`           | Invoice marked paid        | After payment processed          | Update records                 |
| `invoice.failed`         | Invoice payment failed     | After payment failed             | Send reminder                  |

### Event Payload Structure

All events follow this structure:

```json
{
  "event": "subscription.activated",
  "data": {
    "subscription": {
      "_id": "k9xxxxx",
      "customerId": "j57xxxxx",
      "planId": "p1xxxxx",
      "status": "active",
      "currentPeriodStart": 1705968000000,
      "currentPeriodEnd": 1708560000000
    },
    "customer": {
      "_id": "j57xxxxx",
      "email": "user@example.com",
      "phone": "+256700123456"
    },
    "first_payment": true
  },
  "timestamp": 1705968000000,
  "app_id": "a1xxxxx"
}
```

---

## Subscription States Flow

```
┌─────────────────┐
│   Created       │ User subscribes
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   Trialing      │ If plan has trial (optional)
│  or             │
│ Pending Payment │ If no trial
└────────┬────────┘
         │
         ▼ (payment received)
┌─────────────────┐
│    Active       │ User has access
└────────┬────────┘
         │
         ├──► Renewal payment succeeds → Stay Active
         │
         ├──► Payment fails → Past Due (after 3 attempts)
         │
         └──► User cancels → Cancelled
```

---

## Payment Status Flow (PawaPay)

```
Initiated
   │
   ▼
ACCEPTED (PawaPay received request)
   │
   ▼
SUBMITTED (Sent to mobile operator)
   │
   ├──► COMPLETED (Success) → CrediBill activates subscription
   │
   └──► FAILED (Failed) → CrediBill marks payment failed
```

---

## Metadata Requirements (CRITICAL)

When initiating PawaPay deposits, you MUST include these metadata fields:

```javascript
metadata: [
  {
    credibill_app_id: "a1xxxxxxxxx", // Your CrediBill app ID
  },
  {
    credibill_customer_id: "j57xxxxxxxx", // CrediBill customer ID
  },
  {
    credibill_subscription_id: "k9xxxxxxxx", // CrediBill subscription ID
  },
  {
    credibill_invoice_id: "m3xxxxxxxx", // Optional but recommended
  },
];
```

**Why?** CrediBill's webhook handler extracts these values to:

1. Identify which app the payment belongs to
2. Link payment to the correct customer
3. Update the correct subscription
4. Mark the correct invoice as paid

**Without these fields**, CrediBill cannot process the payment and your subscription will remain in `pending_payment` status.

---

## Support Contacts

- **CrediBill Support**: support@credibill.com
- **PawaPay Support**: support@pawapay.co.uk
- **Your Technical Contact**: Add your email here

---

## Appendix: Full Example Flow

### Complete User Subscription Flow

```typescript
// User clicks "Subscribe" button in your app
// POST /api/subscribe

async function subscribeUser(email: string, phone: string, planId: string) {
  // 1. Create customer locally
  const localCustomer = await db.insert("customers", {
    email,
    phone,
    status: "active",
    createdAt: Date.now(),
  });

  // 2. Create customer in CrediBill
  const credibillCustomer = await credibill.createCustomer({
    email,
    phone,
  });

  // 3. Update local customer with CrediBill ID
  await db.patch(localCustomer, {
    credibillCustomerId: credibillCustomer.customerId,
  });

  // 4. Create subscription in CrediBill
  const credibillSub = await credibill.createSubscription({
    customerId: credibillCustomer.customerId,
    planId: planId, // e.g., "p1xxxxx"
  });

  // 5. Create local subscription
  const localSub = await db.insert("subscriptions", {
    customerId: localCustomer,
    credibillSubscriptionId: credibillSub.subscriptionId,
    status: credibillSub.status, // "pending_payment" or "trialing"
    createdAt: Date.now(),
  });

  // 6. Generate deposit ID
  const depositId = uuidv4();

  // 7. Create transaction record
  const transaction = await db.insert("transactions", {
    customerId: localCustomer,
    subscriptionId: localSub,
    depositId: depositId,
    amount: "10000.00",
    currency: "UGX",
    status: "PENDING",
    metadata: {
      credibill_app_id: process.env.CREDIBILL_APP_ID,
      credibill_customer_id: credibillCustomer.customerId,
      credibill_subscription_id: credibillSub.subscriptionId,
      credibill_invoice_id: credibillSub.invoiceId,
    },
    initiatedAt: Date.now(),
  });

  // 8. Initiate PawaPay deposit
  const pawaPayResult = await pawapay.initiateDeposit({
    depositId: depositId,
    amount: "10000.00",
    currency: "UGX",
    correspondent: "MTN_MOMO_UGA",
    payer: {
      type: "MSISDN",
      address: { value: phone },
    },
    metadata: [
      { credibill_app_id: process.env.CREDIBILL_APP_ID },
      { credibill_customer_id: credibillCustomer.customerId },
      { credibill_subscription_id: credibillSub.subscriptionId },
      { credibill_invoice_id: credibillSub.invoiceId },
    ],
  });

  // 9. Return to user
  return {
    message: "Payment initiated. Check your phone.",
    depositId: depositId,
    subscriptionId: localSub,
  };
}

// WEBHOOKS FLOW:
// → User confirms payment on phone
// → PawaPay sends webhook to CrediBill (via Cloudflare Worker)
// → CrediBill receives webhook, updates transaction → activates subscription
// → CrediBill sends webhook to Reciit: "subscription.activated"
// → Reciit receives webhook, grants user access
```

---

## Quick Reference: API Endpoints

### CrediBill API

| Endpoint                       | Method | Purpose                |
| ------------------------------ | ------ | ---------------------- |
| `/api/v1/customers/create`     | POST   | Create customer        |
| `/api/v1/customers`            | GET    | List/get customers     |
| `/api/v1/subscriptions/create` | POST   | Create subscription    |
| `/api/v1/subscriptions`        | GET    | List/get subscriptions |
| `/api/v1/subscriptions/cancel` | DELETE | Cancel subscription    |
| `/api/v1/usage`                | POST   | Record usage event     |
| `/api/invoices`                | GET    | List/get invoices      |

### PawaPay API

| Endpoint                | Method | Purpose          |
| ----------------------- | ------ | ---------------- |
| `/deposits`             | POST   | Initiate deposit |
| `/deposits/{depositId}` | GET    | Check status     |

---

**End of Implementation Guide**

This guide covers everything you need to integrate Reciit with CrediBill and PawaPay. Follow the steps systematically, test thoroughly, and refer back to this document when troubleshooting issues.
