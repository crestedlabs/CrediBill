# CrediBill API Usage Guide

## Overview

This guide explains how to use CrediBill's API for subscription management. Most operations (subscriptions, cancellations, etc.) should be done via API rather than through the dashboard UI.

## 🔑 Authentication

All API requests require an API key in the `Authorization` header:

```
Authorization: Bearer sk_live_abc123xyz...
```

## 📋 Subscription Management

### Cancel Subscription

**Default behavior:** Cancels at period end (customer retains access until billing period completes)

**Endpoint:** `DELETE /api/subscriptions/{subscriptionId}`

**Query Parameters:**

- `cancelAtPeriodEnd` (optional): `true` (default) or `false`

**Examples:**

Cancel at period end (customer keeps access):

```bash
curl -X DELETE "https://your-app.convex.site/api/subscriptions/abc123" \
  -H "Authorization: Bearer sk_live_abc123xyz"
```

Cancel immediately (revokes access now):

```bash
curl -X DELETE "https://your-app.convex.site/api/subscriptions/abc123?cancelAtPeriodEnd=false" \
  -H "Authorization: Bearer sk_live_abc123xyz"
```

**Webhooks Sent:**

- `subscription.cancel_scheduled` - When cancelling at period end
- `subscription.cancelled` - When cancelled immediately or when period ends

---

## 💳 Payment Provider Integration

### PawaPay Webhook Metadata

When initiating payments with PawaPay, **always include metadata** to link payments to CrediBill entities:

```javascript
// Your payment initiation request to PawaPay
{
  depositId: "uuid-you-generate",
  amount: "10000",
  currency: "UGX",
  payer: {
    phone: "+256700000000"
  },
  metadata: {
    // REQUIRED: Link payment to CrediBill entities
    credibill_customer_id: "k17abc123...",     // CrediBill customer ID
    credibill_subscription_id: "k27xyz789...", // CrediBill subscription ID
    credibill_invoice_id: "k37def456..."       // Optional: CrediBill invoice ID
  }
}
```

**Why this matters:**

- PawaPay only returns `depositId` and payment status
- CrediBill needs to know which customer/subscription the payment is for
- Metadata connects external payments to your CrediBill records

### Webhook Flow

```
1. You initiate payment with PawaPay (include metadata)
2. PawaPay processes payment and sends webhook to CrediBill
3. CrediBill extracts metadata to link payment to customer/subscription
4. CrediBill activates subscription if payment successful
5. CrediBill sends webhook to your app with full details
```

---

## 📊 Subscription Creation

**Endpoint:** `POST /api/subscriptions`

**Request Body:**

```json
{
  "customerId": "k17abc123...",
  "planId": "k27xyz789..."
}
```

**Subscription Status Flow:**

1. **trialing** - If plan has trial period (no payment required yet)
2. **pending_payment** - If plan has no trial (waiting for first payment)
3. **active** - After successful payment or trial ends with payment
4. **past_due** - After 3 failed payment attempts
5. **cancelled** - User cancelled subscription
6. **expired** - One-time plan completed
7. **paused** - Temporarily paused (API only)

**Important:** Non-trial subscriptions start as `pending_payment` and require payment confirmation before activation.

---

## 🔔 Webhook Events

Your app receives these webhooks when subscription states change:

### Subscription Events

- `subscription.created` - New subscription created
- `subscription.activated` - Subscription activated after payment
- `subscription.cancel_scheduled` - Scheduled to cancel at period end
- `subscription.cancelled` - Subscription cancelled
- `subscription.past_due` - Payment failures (3+ attempts)

### Payment Events

- `payment.completed` - Payment successful
- `payment.failed` - Payment failed

### Webhook Payload Example

```json
{
  "event": "subscription.activated",
  "subscription": {
    "_id": "k27xyz789...",
    "customerId": "k17abc123...",
    "planId": "k27def456...",
    "status": "active",
    "currentPeriodStart": 1640000000000,
    "currentPeriodEnd": 1642592000000,
    "lastPaymentDate": 1640000000000
  },
  "customer": {
    "_id": "k17abc123...",
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  },
  "first_payment": true
}
```

---

## 🎯 API-Only Operations

These operations are **only available via API** (not in dashboard UI):

### Subscription Operations

- ✅ Create subscription
- ✅ Cancel subscription (immediate or at period end)
- ✅ Pause subscription
- ✅ Resume subscription
- ✅ Change subscription plan

### Customer Operations

- ✅ Subscribe customer to plan
- ✅ Change customer's plan

### Why API-Only?

These are business-critical operations that should be:

- Integrated into your app's user flows
- Logged and audited in your system
- Handled programmatically for automation
- Controlled with your business logic

---

## 🛡️ Best Practices

### 1. Always Use Metadata

Include `credibill_customer_id` and `credibill_subscription_id` in payment provider metadata

### 2. Default to Cancel at Period End

Let customers finish their paid period before losing access:

```bash
# Good: Customer keeps access until period ends
DELETE /api/subscriptions/{id}

# Use sparingly: Immediate cancellation
DELETE /api/subscriptions/{id}?cancelAtPeriodEnd=false
```

### 3. Handle Webhooks Properly

- Verify webhook signatures (when implemented)
- Process webhooks idempotently (same webhook may arrive multiple times)
- Respond with 200 OK quickly (process async if needed)
- Store webhook data for debugging

### 4. Monitor Payment Status

- Track `pending_payment` subscriptions
- Handle `past_due` status (failed payments)
- Retry failed payments with backoff strategy

### 5. Provide Self-Service

Build UI in your app for customers to:

- View subscription details
- Cancel subscription (call API)
- Update payment method (call API)
- View billing history

---

## 📞 Support

For API questions or issues:

1. Check webhook logs in CrediBill dashboard
2. Review payment transaction history
3. Contact support with transaction IDs

---

## 🔄 Migration from Manual UI

If you were using CrediBill UI for subscriptions:

1. Build subscription management into your app
2. Use CrediBill API endpoints
3. Implement webhook handlers
4. Test in test mode before going live
5. Monitor for successful transition

The CrediBill dashboard is now **read-only** for subscriptions - view data but create/modify via API.
