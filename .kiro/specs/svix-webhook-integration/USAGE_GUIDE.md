# Svix Webhook Integration - Usage Guide

## Overview

This guide explains how to use the Svix webhook integration in CrediBill for both developers and end-users.

---

## For CrediBill Developers

### Triggering Webhooks in Your Code

#### Option 1: Using Convenience Helpers (Recommended)

The easiest way to trigger webhooks is using the pre-built helper functions in `webhookTriggers.ts`:

```typescript
import { internal } from "./_generated/api";

// Trigger subscription created event
await ctx.runAction(internal.webhookTriggers.triggerSubscriptionCreated, {
  appId: subscription.appId,
  subscriptionId: subscription._id,
});

// Trigger payment succeeded event
await ctx.runAction(internal.webhookTriggers.triggerPaymentSucceeded, {
  appId: payment.appId,
  paymentId: payment._id,
});

// Trigger invoice paid event
await ctx.runAction(internal.webhookTriggers.triggerInvoicePaid, {
  appId: invoice.appId,
  invoiceId: invoice._id,
});
```

**Available Helper Functions:**

**Subscription Events:**

- `triggerSubscriptionCreated`
- `triggerSubscriptionActivated`
- `triggerSubscriptionRenewed`
- `triggerSubscriptionCancelled`
- `triggerSubscriptionPaused`
- `triggerSubscriptionResumed`
- `triggerSubscriptionExpired`
- `triggerSubscriptionPastDue`
- `triggerTrialStarted`
- `triggerTrialExpiring`
- `triggerTrialExpired`
- `triggerPlanChanged`

**Invoice Events:**

- `triggerInvoiceCreated`
- `triggerInvoiceFinalized`
- `triggerInvoicePaid`
- `triggerInvoicePaymentFailed`
- `triggerInvoiceVoided`
- `triggerInvoiceOverdue`

**Payment Events:**

- `triggerPaymentProcessing`
- `triggerPaymentSucceeded`
- `triggerPaymentFailed`
- `triggerPaymentRefunded`

**Customer Events:**

- `triggerCustomerCreated`
- `triggerCustomerUpdated`
- `triggerCustomerDeleted`

**Plan Events:**

- `triggerPlanCreated`
- `triggerPlanUpdated`
- `triggerPlanArchived`

**Usage Events:**

- `triggerUsageRecorded`
- `triggerUsageUpdated`

---

#### Option 2: Using Event-Specific Functions

For more control over the payload, use the event-specific functions in `svixEvents.ts`:

```typescript
import { internal } from "./_generated/api";

// Send subscription activated webhook with custom data
await ctx.runAction(internal.svixEvents.sendSubscriptionActivated, {
  appId: subscription.appId,
  subscription: {
    id: subscription._id,
    customer_id: subscription.customerId,
    plan_id: subscription.planId,
    status: subscription.status,
    current_period_start: subscription.currentPeriodStart,
    current_period_end: subscription.currentPeriodEnd,
    activated_at: Date.now(),
  },
});
```

---

#### Option 3: Using Core sendWebhookEvent (Advanced)

For complete control, use the core function:

```typescript
import { internal } from "./_generated/api";

await ctx.runAction(internal.svixEvents.sendWebhookEvent, {
  appId: "j1234567890abcdef",
  eventType: "custom.event",
  payload: {
    custom_field: "value",
    timestamp: Date.now(),
  },
  idempotencyKey: "custom-idempotency-key", // Optional
});
```

---

### Adding New Event Types

To add a new webhook event type:

#### Step 1: Define the event in `lib/svix-events.ts`

```typescript
// Add to SVIX_EVENT_TYPES constant
export const SVIX_EVENT_TYPES = {
  // ... existing events

  // Your new event
  PRODUCT_CREATED: "product.created" as const,
  PRODUCT_UPDATED: "product.updated" as const,
} as const;

// Add payload type
export interface ProductCreatedPayload {
  product: {
    id: string;
    name: string;
    price: number;
    created_at: number;
  };
}
```

#### Step 2: Create helper in `convex/svixEvents.ts`

```typescript
/**
 * Send product.created webhook
 */
export const sendProductCreated = internalAction({
  args: {
    appId: v.id("apps"),
    product: v.object({
      id: v.id("products"),
      name: v.string(),
      price: v.number(),
      created_at: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const payload = createWebhookPayload(
      SVIX_EVENT_TYPES.PRODUCT_CREATED,
      { product: args.product },
      args.appId,
    );

    await sendWebhookEvent(ctx, {
      appId: args.appId,
      eventType: SVIX_EVENT_TYPES.PRODUCT_CREATED,
      payload,
      idempotencyKey: generateEventId("product", args.product.id),
    });
  },
});
```

#### Step 3: Add convenience trigger (optional)

```typescript
// In convex/webhookTriggers.ts

/**
 * Trigger product.created webhook
 */
export const triggerProductCreated = internalAction({
  args: {
    appId: v.id("apps"),
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.runQuery(internal.products.getProduct, {
      productId: args.productId,
    });

    if (!product) {
      throw new Error("Product not found");
    }

    await ctx.runAction(internal.svixEvents.sendProductCreated, {
      appId: args.appId,
      product: {
        id: product._id,
        name: product.name,
        price: product.price,
        created_at: product._creationTime,
      },
    });
  },
});
```

#### Step 4: Use in your code

```typescript
// Trigger the webhook
await ctx.runAction(internal.webhookTriggers.triggerProductCreated, {
  appId: product.appId,
  productId: product._id,
});
```

---

### Broadcasting Webhooks to Multiple Apps

To send a webhook to multiple apps (e.g., platform-wide announcements):

```typescript
import { internal } from "./_generated/api";

await ctx.runAction(internal.svixEvents.broadcastWebhookEvent, {
  appIds: ["app1_id", "app2_id", "app3_id"],
  eventType: "platform.maintenance",
  payload: {
    message: "Scheduled maintenance on Jan 25, 2026",
    start_time: "2026-01-25T02:00:00Z",
    end_time: "2026-01-25T04:00:00Z",
  },
});
```

---

### Error Handling Best Practices

Webhook sending should NEVER block critical operations:

```typescript
// ✅ GOOD: Async webhook sending (non-blocking)
const subscriptionId = await ctx.db.insert("subscriptions", {
  // ... subscription data
});

// Schedule webhook to run after this mutation completes
ctx.scheduler.runAfter(
  0,
  internal.webhookTriggers.triggerSubscriptionCreated,
  {
    appId: args.appId,
    subscriptionId,
  }
);

return { success: true, subscriptionId };

// ❌ BAD: Don't await webhook sending in critical path
const subscriptionId = await ctx.db.insert("subscriptions", { ... });
await ctx.runAction(internal.webhookTriggers.triggerSubscriptionCreated, {
  // ... this blocks the subscription creation!
});
```

**Why This Matters:**

- If Svix API is down, critical operations still succeed
- Users don't see errors due to webhook failures
- Webhooks are still sent (scheduled for immediate execution)
- System remains resilient to external service failures

---

### Checking Webhook Configuration

```typescript
import { internal } from "./_generated/api";

// Check if app has webhooks configured
const config = await ctx.runQuery(internal.svixEndpoints.getWebhookConfig, {
  appId: "j1234567890abcdef",
});

if (config.configured) {
  console.log("Webhook URL:", config.webhook.url);
  console.log("Svix Endpoint:", config.webhook.svixEndpointId);
  console.log("Status:", config.webhook.status);
}
```

---

## For End-Users (SaaS Developers)

### Setting Up Webhooks

#### Step 1: Navigate to Webhook Settings

1. Log into your CrediBill account
2. Select your application
3. Go to **Settings** → **Webhooks**

#### Step 2: Configure Your Endpoint

1. Enter your webhook URL (must be HTTPS)
   - Example: `https://api.yoursaas.com/webhooks/credibill`
2. Click **Save Configuration**
3. Copy the webhook secret (starts with `whsec_`)

**Important:** Store the webhook secret securely. You'll need it to verify webhook signatures.

#### Step 3: Test Your Integration

1. Click **Send Test** button
2. Check your server receives the test webhook
3. Verify signature verification works
4. If successful, you're ready to receive real events!

---

### Receiving Webhooks

#### Node.js / Express Example

```javascript
const express = require("express");
const { Webhook } = require("svix");

const app = express();

// Use raw body for signature verification
app.post(
  "/webhooks/credibill",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const webhookSecret = process.env.CREDIBILL_WEBHOOK_SECRET;

    // Get Svix headers
    const svixId = req.headers["svix-id"];
    const svixTimestamp = req.headers["svix-timestamp"];
    const svixSignature = req.headers["svix-signature"];

    // Verify signature
    const wh = new Webhook(webhookSecret);
    let payload;

    try {
      payload = wh.verify(req.body, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch (err) {
      console.error("Invalid signature:", err);
      return res.status(400).json({ error: "Invalid signature" });
    }

    // Process webhook based on event type
    switch (payload.type) {
      case "subscription.created":
        await handleSubscriptionCreated(payload.data);
        break;

      case "subscription.activated":
        await handleSubscriptionActivated(payload.data);
        break;

      case "invoice.paid":
        await handleInvoicePaid(payload.data);
        break;

      case "payment.failed":
        await handlePaymentFailed(payload.data);
        break;

      default:
        console.log("Unhandled event type:", payload.type);
    }

    // Always return 200 for valid webhooks
    res.status(200).json({ received: true });
  },
);

app.listen(3000, () => {
  console.log("Webhook server running on port 3000");
});
```

---

#### Next.js App Router Example

```typescript
// app/api/webhooks/credibill/route.ts
import { headers } from "next/headers";
import { Webhook } from "svix";

export async function POST(req: Request) {
  const webhookSecret = process.env.CREDIBILL_WEBHOOK_SECRET!;

  // Get headers
  const headersList = headers();
  const svixId = headersList.get("svix-id");
  const svixTimestamp = headersList.get("svix-timestamp");
  const svixSignature = headersList.get("svix-signature");

  // Get body
  const body = await req.text();

  // Verify signature
  const wh = new Webhook(webhookSecret);
  let payload;

  try {
    payload = wh.verify(body, {
      "svix-id": svixId!,
      "svix-timestamp": svixTimestamp!,
      "svix-signature": svixSignature!,
    });
  } catch (err) {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Process the webhook
  console.log("Received webhook:", payload.type);

  // Handle different event types
  // ... your event handlers

  return Response.json({ received: true });
}
```

---

### Webhook Event Types

Your webhook endpoint will receive these event types:

#### Subscription Events

- `subscription.created` - New subscription created
- `subscription.activated` - Payment successful, subscription active
- `subscription.renewed` - Subscription renewed for new period
- `subscription.cancelled` - Subscription cancelled
- `subscription.paused` - Subscription paused
- `subscription.resumed` - Subscription resumed from pause
- `subscription.expired` - Subscription expired
- `subscription.past_due` - Payment failed, grace period active
- `subscription.trial_started` - Trial period started
- `subscription.trial_expiring` - Trial expires soon (3 days notice)
- `subscription.trial_expired` - Trial period ended
- `subscription.plan_changed` - Plan upgraded/downgraded

#### Invoice Events

- `invoice.created` - New invoice generated
- `invoice.finalized` - Invoice finalized and ready for payment
- `invoice.paid` - Invoice paid successfully
- `invoice.payment_failed` - Invoice payment failed
- `invoice.voided` - Invoice cancelled/voided
- `invoice.overdue` - Invoice is overdue

#### Payment Events

- `payment.processing` - Payment is being processed
- `payment.succeeded` - Payment completed successfully
- `payment.failed` - Payment failed
- `payment.refunded` - Payment was refunded

#### Customer Events

- `customer.created` - New customer created
- `customer.updated` - Customer details updated
- `customer.deleted` - Customer deleted

#### Plan Events

- `plan.created` - New plan created
- `plan.updated` - Plan details updated
- `plan.archived` - Plan archived (no new subscriptions)

#### Usage Events

- `usage.recorded` - Usage data recorded
- `usage.updated` - Usage data updated

---

### Webhook Payload Structure

All webhooks follow this structure:

```typescript
{
  "type": "subscription.activated",  // Event type
  "data": {                           // Event-specific data
    "subscription": { ... },
    "payment": { ... }
  },
  "event_id": "evt_xxx",             // Unique event ID (idempotency)
  "created_at": "2026-01-20T12:34:56.789Z",  // ISO 8601 timestamp
  "app_id": "j1234567890abcdef"      // Your app ID
}
```

---

### Best Practices

#### 1. Respond Quickly

```javascript
// ✅ GOOD: Process async, respond immediately
app.post("/webhooks", async (req, res) => {
  // Verify signature
  const payload = verifyWebhook(req);

  // Respond immediately
  res.status(200).json({ received: true });

  // Process asynchronously
  processWebhookAsync(payload).catch(console.error);
});

// ❌ BAD: Don't wait for processing
app.post("/webhooks", async (req, res) => {
  const payload = verifyWebhook(req);

  // This is slow!
  await updateDatabase(payload);
  await sendEmails(payload);
  await syncToThirdParty(payload);

  res.status(200).json({ received: true });
});
```

#### 2. Implement Idempotency

```javascript
async function handleWebhook(payload) {
  const eventId = payload.event_id;

  // Check if already processed
  const existing = await db.webhookEvents.findOne({ eventId });
  if (existing) {
    console.log("Event already processed:", eventId);
    return;
  }

  // Process the webhook
  await processEvent(payload);

  // Store event ID to prevent duplicate processing
  await db.webhookEvents.create({
    eventId,
    processedAt: new Date(),
  });
}
```

#### 3. Handle All Event Types

```javascript
function handleWebhook(payload) {
  switch (payload.type) {
    case "subscription.created":
      return handleSubscriptionCreated(payload);
    case "subscription.activated":
      return handleSubscriptionActivated(payload);
    // ... other cases
    default:
      // Don't fail on unknown events (future compatibility)
      console.log("Unknown event type:", payload.type);
      return;
  }
}
```

#### 4. Use the Webhook Dashboard

- Click **View Dashboard** in CrediBill settings
- View all webhook deliveries
- See response codes and bodies
- Retry failed webhooks manually
- Test your endpoint

---

### Troubleshooting

#### Webhooks Not Received

**Check:**

1. Webhook URL is correct and accessible
2. Server is running and accepting HTTPS connections
3. No firewall blocking Svix IPs
4. Endpoint returns 2xx status code

**Test:**

```bash
# Test your endpoint is accessible
curl -X POST https://your-api.com/webhooks/credibill \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### Signature Verification Fails

**Common Causes:**

1. Wrong webhook secret (copy from CrediBill UI)
2. Body modified before verification (use raw body)
3. Server clock skew (Svix validates timestamp)

**Solution:**

```javascript
// Use Svix SDK - it handles all edge cases
const { Webhook } = require("svix");
const wh = new Webhook(secret);
const payload = wh.verify(rawBody, headers);
```

#### Missing Events

**Check:**

1. Webhook URL configured in CrediBill
2. Event actually occurred (check CrediBill logs)
3. Svix dashboard for delivery attempts
4. Your endpoint returned 2xx (or Svix will retry)

---

### Security Considerations

#### Always Verify Signatures

```javascript
// ✅ GOOD: Verify every webhook
const wh = new Webhook(secret);
const payload = wh.verify(body, headers);

// ❌ BAD: Never skip verification
const payload = JSON.parse(body); // Dangerous!
```

#### Use HTTPS Only

CrediBill enforces HTTPS, but ensure:

- Valid SSL certificate
- No self-signed certificates in production
- Certificate not expired

#### Protect Your Webhook Secret

```javascript
// ✅ GOOD: Use environment variables
const secret = process.env.CREDIBILL_WEBHOOK_SECRET;

// ❌ BAD: Never hardcode secrets
const secret = "whsec_abc123..."; // Don't do this!
```

#### Implement Rate Limiting

```javascript
// Protect against replay attacks
const rateLimit = require("express-rate-limit");

app.use(
  "/webhooks",
  rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 100, // max 100 requests per minute
  }),
);
```

---

## Support

### Documentation

- **Webhook Events:** See `WEBHOOK_EVENTS.md` for all event schemas
- **Testing:** See `TESTING_GUIDE.md` for testing procedures
- **Svix Docs:** https://docs.svix.com

### Debugging Tools

1. **Svix Dashboard**
   - View all webhook deliveries
   - See delivery attempts and responses
   - Manually retry failed webhooks

2. **Convex Logs**
   - Check for webhook sending errors
   - View Svix API responses

3. **Test Tools**
   - Use webhook.site for quick testing
   - Use ngrok for local development
   - Use Svix CLI for advanced debugging

---

**Usage Guide Complete** ✅
