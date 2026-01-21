# Design Document: Svix Webhook Integration

## Overview

This design document describes the architecture and implementation approach for integrating Svix as the webhook delivery infrastructure for CrediBill. Svix will replace the custom webhook delivery system, providing enterprise-grade reliability, automatic retries, customer-facing dashboards, and comprehensive debugging tools.

### Current State

CrediBill currently implements two webhook systems:
1. **Legacy System** (`webhookDelivery.ts`): Uses `webhookDeliveries` table, stores webhook URL in `apps.webhookUrl`
2. **New System** (`outgoingWebhooks.ts`): Uses `webhooks` and `outgoingWebhookLogs` tables, supports multiple webhooks per app

Both systems implement:
- Manual retry logic (3 attempts with delays: 1min, 5min, 15min)
- HMAC-SHA256 signature generation
- Webhook delivery logging
- Event-based triggering
- Cron job for retry processing

### Target State

After Svix integration:
- Svix handles all webhook delivery, retries, and monitoring
- Each CrediBill app maps to a Svix application
- Customers manage endpoints through Svix dashboard
- Automatic signature generation via Svix
- Better delivery guarantees and debugging tools
- Gradual migration with dual delivery support

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CrediBill Platform                       │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐                    │
│  │   Billing    │─────▶│    Svix      │                    │
│  │   Events     │      │   Client     │                    │
│  └──────────────┘      └──────┬───────┘                    │
│                               │                             │
│                               │ API Calls                   │
└───────────────────────────────┼─────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    Svix Service       │
                    │  (External SaaS)      │
                    └───────────┬───────────┘
                                │
                                │ Webhook Delivery
                                │ (with retries)
                                ▼
                    ┌───────────────────────┐
                    │  Customer Endpoints   │
                    │  (SaaS Applications)  │
                    └───────────────────────┘
```


### Component Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Convex Backend                            │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Svix Integration Layer                   │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │   Svix       │  │   Svix       │  │   Svix     │ │  │
│  │  │   Client     │  │   App Mgmt   │  │   Events   │ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │           Existing Business Logic                     │  │
│  │                                                        │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │  │
│  │  │ Subscription │  │   Invoice    │  │  Customer  │ │  │
│  │  │   Events     │  │   Events     │  │   Events   │ │  │
│  │  └──────────────┘  └──────────────┘  └────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Database Schema                          │  │
│  │                                                        │  │
│  │  apps: { ..., svixAppId: string }                    │  │
│  │  webhooks: { ..., svixEndpointId: string }           │  │
│  │  outgoingWebhookLogs: { ..., svixMessageId: string } │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Svix Client Wrapper (`convex/svix.ts`)

A centralized Svix client that handles all interactions with the Svix API.

**Responsibilities:**
- Initialize Svix client with API key from environment
- Provide type-safe wrappers for Svix API calls
- Handle errors and implement retry logic
- Support both test and live mode API keys

**Interface:**
```typescript
// Svix client initialization
export function getSvixClient(mode: "test" | "live"): Svix

// Application management
export async function createSvixApplication(params: {
  name: string
  organizationId: Id<"organizations">
  appId: Id<"apps">
  mode: "test" | "live"
}): Promise<{ id: string }>

export async function deleteSvixApplication(svixAppId: string): Promise<void>

export async function getSvixApplication(svixAppId: string): Promise<Application>

// Endpoint management
export async function createSvixEndpoint(params: {
  svixAppId: string
  url: string
  events: string[]
  description?: string
}): Promise<{ id: string }>

export async function updateSvixEndpoint(params: {
  svixAppId: string
  endpointId: string
  url?: string
  events?: string[]
}): Promise<void>

export async function disableSvixEndpoint(params: {
  svixAppId: string
  endpointId: string
}): Promise<void>

// Message sending
export async function sendSvixMessage(params: {
  svixAppId: string
  eventType: string
  payload: any
  eventId: string
}): Promise<{ id: string }>

// Dashboard access
export async function generateDashboardUrl(params: {
  svixAppId: string
}): Promise<{ url: string, expiresAt: number }>

// Delivery logs
export async function getMessageAttempts(params: {
  svixAppId: string
  messageId: string
}): Promise<MessageAttempt[]>

export async function listRecentMessages(params: {
  svixAppId: string
  limit?: number
}): Promise<Message[]>
```


### 2. Event Type Mapping (`lib/svix-events.ts`)

Defines the mapping between CrediBill internal events and Svix event type strings.

**Event Categories:**
- Subscription events: `subscription.*`
- Invoice events: `invoice.*`
- Customer events: `customer.*`
- Payment events: `payment.*`
- Plan events: `plan.*`

**Interface:**
```typescript
// Event type definitions
export const SVIX_EVENT_TYPES = {
  // Subscription events
  SUBSCRIPTION_CREATED: "subscription.created",
  SUBSCRIPTION_ACTIVATED: "subscription.activated",
  SUBSCRIPTION_RENEWED: "subscription.renewed",
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",
  SUBSCRIPTION_PLAN_CHANGED: "subscription.plan_changed",
  SUBSCRIPTION_TRIAL_EXPIRED: "subscription.trial_expired",
  SUBSCRIPTION_PAST_DUE: "subscription.past_due",
  
  // Invoice events
  INVOICE_CREATED: "invoice.created",
  INVOICE_PAID: "invoice.paid",
  INVOICE_OVERDUE: "invoice.overdue",
  INVOICE_VOIDED: "invoice.voided",
  
  // Customer events
  CUSTOMER_CREATED: "customer.created",
  CUSTOMER_UPDATED: "customer.updated",
  CUSTOMER_DELETED: "customer.deleted",
  
  // Payment events
  PAYMENT_DUE: "payment.due",
  PAYMENT_FAILED: "payment.failed",
  
  // Plan events
  PLAN_CREATED: "plan.created",
  PLAN_UPDATED: "plan.updated",
  PLAN_ARCHIVED: "plan.archived",
  
  // Test event
  TEST_WEBHOOK: "test.webhook",
} as const

export type SvixEventType = typeof SVIX_EVENT_TYPES[keyof typeof SVIX_EVENT_TYPES]

// Payload structure
export interface WebhookPayload {
  event: SvixEventType
  data: any
  timestamp: string // ISO 8601
  app_id: string
  event_id: string
}

// Helper to create webhook payload
export function createWebhookPayload(params: {
  eventType: SvixEventType
  data: any
  appId: Id<"apps">
}): WebhookPayload
```

### 3. Svix Application Management (`convex/svixApplications.ts`)

Handles the lifecycle of Svix applications corresponding to CrediBill apps.

**Responsibilities:**
- Create Svix application when CrediBill app is created
- Store Svix application ID in database
- Delete Svix application when CrediBill app is deleted
- Handle errors and retry failed operations

**Interface:**
```typescript
// Internal mutation to store Svix app ID
export const storeSvixAppId = internalMutation({
  args: {
    appId: v.id("apps"),
    svixAppId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appId, { svixAppId: args.svixAppId })
  },
})

// Internal action to create Svix application
export const createSvixApp = internalAction({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    // Get app details
    // Create Svix application
    // Store Svix app ID
    // Handle errors with retry
  },
})

// Internal action to delete Svix application
export const deleteSvixApp = internalAction({
  args: {
    svixAppId: v.string(),
  },
  handler: async (ctx, args) => {
    // Delete Svix application
    // Handle errors gracefully
  },
})

// Internal action to retry failed Svix app creation
export const retryFailedSvixAppCreation = internalAction({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    // Retry with exponential backoff
  },
})
```


### 4. Webhook Endpoint Management (`convex/svixEndpoints.ts`)

Manages Svix endpoints for customer webhook URLs.

**Responsibilities:**
- Create Svix endpoint when customer configures webhook URL
- Update Svix endpoint when URL changes
- Disable Svix endpoint when URL is removed
- Configure event type subscriptions

**Interface:**
```typescript
// Mutation to configure webhook endpoint
export const configureWebhookEndpoint = mutation({
  args: {
    appId: v.id("apps"),
    webhookUrl: v.string(),
    events: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Validate user access
    // Validate webhook URL (HTTPS only)
    // Create or update Svix endpoint
    // Store endpoint ID in database
    // Return webhook secret
  },
})

// Mutation to remove webhook endpoint
export const removeWebhookEndpoint = mutation({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    // Validate user access
    // Disable Svix endpoint
    // Clear webhook URL from database
  },
})

// Query to get webhook configuration
export const getWebhookConfig = query({
  args: {
    appId: v.id("apps"),
  },
  handler: async (ctx, args) => {
    // Validate user access
    // Return webhook URL and secret
    // Return available event types
  },
})
```

### 5. Event Delivery (`convex/svixEvents.ts`)

Sends webhook events through Svix.

**Responsibilities:**
- Send events to Svix asynchronously
- Generate unique event IDs for idempotency
- Handle Svix API errors with queuing
- Support dual delivery during migration

**Interface:**
```typescript
// Internal action to send event via Svix
export const sendWebhookEvent = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Get app and Svix app ID
    // Generate event ID
    // Create webhook payload
    // Send to Svix
    // Log delivery attempt
    // Handle errors with queuing
  },
})

// Internal action to send event via both systems (migration)
export const sendWebhookEventDual = internalAction({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    payload: v.any(),
  },
  handler: async (ctx, args) => {
    // Send via Svix
    // Send via legacy system
    // Log which system succeeded
  },
})

// Internal mutation to queue failed event
export const queueFailedEvent = internalMutation({
  args: {
    appId: v.id("apps"),
    eventType: v.string(),
    payload: v.any(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    // Store event in queue for retry
  },
})

// Internal action to retry queued events
export const retryQueuedEvents = internalAction({
  handler: async (ctx) => {
    // Get queued events
    // Retry sending to Svix
    // Remove from queue on success
  },
})
```

