# Webhook Flow Documentation

## Overview

This document explains what happens when a PawaPay webhook is received and how the system processes it.

## Architecture

```
PawaPay → Cloudflare Worker → Convex → Your App
          (200 immediate)     (async)   (outgoing webhook)
```

## Environment Variables Setup

### Where to Store CREDIBILL_WEBHOOK_SECRET

**❌ NOT in Next.js project (.env.local)**

- The webhook secret is used by your Convex backend, not your Next.js frontend
- Never store this in your Next.js environment variables

**✅ YES in Convex Dashboard**

1. Go to: https://dashboard.convex.dev
2. Select your project
3. Click **Settings** → **Environment Variables**
4. Add new variable:
   - **Name**: `CREDIBILL_WEBHOOK_SECRET`
   - **Value**: `whsec-credibill123` (or generate a secure random string)
5. Click **Save**
6. Deploy: `npx convex deploy`

This secret must match the `WEBHOOK_SECRET` in your Cloudflare Worker.

---

## Step-by-Step Webhook Flow

### Step 1: PawaPay Sends Webhook

When a customer completes a payment, PawaPay sends a POST request to:

```
https://api.credibill.tech/v1/webhooks/pawapay?appId=YOUR_APP_ID
```

**Payload Example:**

```json
{
  "data": {
    "depositId": "123e4567-e89b-12d3-a456-426614174000",
    "status": "COMPLETED",
    "amount": "1000.00",
    "currency": "UGX",
    "phoneNumber": "+256700000000",
    "metadata": {
      "credibill_customer_id": "j1234567890",
      "credibill_subscription_id": "k9876543210"
    }
  },
  "status": "FOUND"
}
```

---

### Step 2: Cloudflare Worker Response

Your Worker receives the webhook and **immediately returns 200 OK** to PawaPay:

```typescript
return c.json({ status: "received" }, 200);
```

**Why?** PawaPay requires immediate 200 response or it marks the webhook as failed.

The Worker then forwards the data to Convex **in the background** using `waitUntil`:

```typescript
c.executionCtx.waitUntil(
  fetch("https://giant-goldfish-922.convex.site/webhooks/pawapay", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      appId: appId,
      payload: originalPayload,
    }),
  })
);
```

---

### Step 3: Convex Receives and Validates

Your Convex HTTP endpoint at `/webhooks/pawapay`:

1. **Validates webhook secret** (from header `x-webhook-secret`)
2. **Extracts data** (`appId` and `payload`)
3. **Returns 200 immediately** to Worker
4. **Schedules background processing** (async)

```typescript
await ctx.scheduler.runAfter(0, internal.webhookActions.handlePawapayWebhook, {
  payload: JSON.stringify(payload),
  appId: appId as Id<"apps">,
});
```

---

### Step 4: Background Processing in Convex

The `handlePawapayWebhook` action processes the payment:

#### 4a. Extract Payment Data

```typescript
const webhookData = JSON.parse(payload);
const depositId = webhookData.data.depositId;
const status = webhookData.data.status;
const metadata = webhookData.data.metadata;
const customerId = metadata.credibill_customer_id;
const subscriptionId = metadata.credibill_subscription_id;
```

#### 4b. Check for Duplicate (Idempotency)

```typescript
const existing = await ctx.runQuery(
  internal.webhookMutations.findExistingTransaction,
  { depositId }
);

if (existing) {
  console.log("Transaction already processed, skipping");
  return { success: true, duplicate: true };
}
```

#### 4c. Create/Update Payment Transaction

```typescript
await ctx.runMutation(internal.webhookMutations.processPayment, {
  appId,
  customerId,
  subscriptionId,
  depositId,
  status,
  amount: webhookData.data.amount,
  currency: webhookData.data.currency,
  // ... other fields
});
```

**What happens in the database:**

- New record created in `paymentTransactions` table
- Status: `pending` → `completed` (if COMPLETED) or `failed` (if FAILED)
- Linked to customer and subscription

#### 4d. Update Subscription Status

If payment is COMPLETED:

```typescript
await ctx.runMutation(internal.subscriptions.updateSubscriptionStatus, {
  subscriptionId,
  status: "active",
  currentPeriodEnd: /* calculated based on billing period */
});
```

**What happens:**

- Subscription status: `pending_payment` → `active`
- `currentPeriodStart` and `currentPeriodEnd` are set/updated
- Customer can now access your service

#### 4e. Mark Invoice as Paid

```typescript
await ctx.runMutation(internal.invoices.markInvoicePaid, {
  invoiceId,
  paidAt: Date.now(),
});
```

#### 4f. Send Outgoing Webhook to Your App

```typescript
await fetch(app.webhookUrl, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-CrediBill-Signature": hmacSignature,
  },
  body: JSON.stringify({
    event: "payment.completed",
    data: {
      customerId,
      subscriptionId,
      amount,
      currency,
      depositId,
    },
  }),
});
```

**Your app receives:**

- Event notification about the payment
- Can provision access, send confirmation emails, etc.

---

## Expected Outcomes

### ✅ Successful Payment (COMPLETED)

**Database Changes:**

1. `paymentTransactions` table:
   - New record with status: `completed`
   - Linked to customer, subscription, and invoice

2. `subscriptions` table:
   - Status: `pending_payment` → `active`
   - `currentPeriodStart`: Payment date
   - `currentPeriodEnd`: Calculated based on plan (monthly/annually)

3. `invoices` table:
   - Status: `unpaid` → `paid`
   - `paidAt`: Payment timestamp

**Webhook Delivery:**

- Your app receives: `payment.completed` event
- Delivery logged in `webhookDeliveries` table
- Viewable in CrediBill dashboard

**User Experience:**

- Customer's subscription is now active
- Access to your service is granted
- Invoice marked as paid

---

### ❌ Failed Payment (FAILED)

**Database Changes:**

1. `paymentTransactions` table:
   - New record with status: `failed`
   - Error details stored

2. `subscriptions` table:
   - Status remains: `pending_payment`
   - `paymentAttempts` incremented
   - May be marked as `suspended` after X failed attempts

**Webhook Delivery:**

- Your app receives: `payment.failed` event
- Can notify customer to retry payment

---

### 🔄 Pending Payment (PENDING)

**Database Changes:**

1. `paymentTransactions` table:
   - Record with status: `pending`
   - Waiting for customer to complete mobile money prompt

2. `subscriptions` table:
   - Status remains: `pending_payment`

**What happens next:**

- When customer completes payment, another webhook arrives with COMPLETED status
- System processes as successful payment

---

## Header Case Sensitivity

### Question: Does case matter for `X-Webhook-Secret`?

**Short Answer:** No, HTTP headers are case-insensitive.

**Technical Details:**

- HTTP/1.1 standard (RFC 7230) specifies headers are case-insensitive
- Node.js `request.headers.get()` automatically converts to lowercase
- Your code uses: `request.headers.get("x-webhook-secret")`
- Works with: `X-Webhook-Secret`, `x-webhook-secret`, `X-WEBHOOK-SECRET`, etc.

**Best Practice:**

- Use lowercase in code: `x-webhook-secret`
- Use Title-Case in documentation: `X-Webhook-Secret`
- Both work identically

---

## Testing the Flow

### 1. Configure PawaPay Dashboard

Set webhook URL to:

```
https://api.credibill.tech/v1/webhooks/pawapay?appId=YOUR_APP_ID
```

### 2. Add Environment Variable in Convex

```bash
# In Convex Dashboard → Settings → Environment Variables
CREDIBILL_WEBHOOK_SECRET=whsec-credibill123
```

### 3. Test Payment

1. Initiate a test payment in PawaPay
2. Complete mobile money payment
3. Check logs:
   - Cloudflare Worker logs
   - Convex logs (Dashboard → Logs)
   - Your app's webhook endpoint logs

### 4. Verify Database

Check Convex Dashboard → Data:

- `paymentTransactions`: Should see new record
- `subscriptions`: Status should be `active`
- `invoices`: Status should be `paid`
- `webhookDeliveries`: Should see outgoing webhook logged

---

## Troubleshooting

### Webhook Secret Mismatch

**Error:** `401 Unauthorized`
**Solution:** Verify `CREDIBILL_WEBHOOK_SECRET` in Convex matches `WEBHOOK_SECRET` in Worker

### Missing AppId

**Error:** `400 Bad Request`
**Solution:** Ensure PawaPay webhook URL includes `?appId=YOUR_APP_ID` query parameter

### Duplicate Processing

**Behavior:** Second webhook with same `depositId` is ignored
**Expected:** This is correct idempotency behavior

### Payment Not Activating Subscription

**Check:**

1. Metadata includes `credibill_customer_id` and `credibill_subscription_id`
2. Status is `COMPLETED` not `PENDING`
3. Convex logs for any errors during processing

---

## Summary

**Quick Checklist:**

- ✅ Add `CREDIBILL_WEBHOOK_SECRET` to **Convex Dashboard** (not Next.js)
- ✅ Configure PawaPay with Worker URL: `https://api.credibill.tech/v1/webhooks/pawapay?appId=...`
- ✅ Worker returns 200 immediately to PawaPay
- ✅ Convex processes payment asynchronously
- ✅ Subscription activated, invoice marked paid
- ✅ Your app receives outgoing webhook notification
- ✅ Customer gets access to service

**Processing Time:**

- PawaPay → Worker: ~100ms (immediate 200)
- Worker → Convex: ~200-500ms (async)
- Convex processing: ~500-2000ms (database updates + outgoing webhook)
- **Total:** ~1-3 seconds from payment to activation
