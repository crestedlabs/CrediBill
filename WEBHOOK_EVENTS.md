# Webhook Events Reference

## Overview

CrediBill uses webhooks to notify your application of payment and subscription events in real-time. This document describes all webhook events you can receive.

---

## Webhook Delivery

### Endpoint Configuration

Configure your webhook URL in CrediBill settings:

- Go to App Settings → Webhooks
- Enter your webhook URL (must be HTTPS in production)
- Save webhook secret for signature verification

### Webhook Format

All webhooks are sent as HTTP POST requests with JSON payload:

```json
{
  "event": "payment.success",
  "data": {
    "id": "txn_abc123",
    "amount": 50000,
    "currency": "UGX"
    // ... event-specific data
  },
  "timestamp": 1703721600000
}
```

### HTTP Headers

```
Content-Type: application/json
X-CrediBill-Signature: abc123def456...
X-CrediBill-Timestamp: 1703721600000
User-Agent: CrediBill-Webhooks/1.0
```

---

## Signature Verification

### Why Verify?

- Ensures webhook came from CrediBill
- Prevents webhook spoofing attacks
- Validates payload integrity

### Verification Steps

#### 1. Get webhook secret from settings

```typescript
const webhookSecret = "whsec_..."; // From CrediBill dashboard
```

#### 2. Construct signature payload

```typescript
const timestamp = req.headers["x-credibill-timestamp"];
const rawBody = req.body; // Raw JSON string
const signaturePayload = `${timestamp}.${rawBody}`;
```

#### 3. Compute HMAC-SHA256

```typescript
import crypto from "crypto";

const expectedSignature = crypto
  .createHmac("sha256", webhookSecret)
  .update(signaturePayload)
  .digest("hex");
```

#### 4. Compare signatures (timing-safe)

```typescript
const receivedSignature = req.headers["x-credibill-signature"];

const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(receivedSignature)
);

if (!isValid) {
  return res.status(401).send("Invalid signature");
}
```

### Complete Example (Node.js/Express)

```typescript
import express from "express";
import crypto from "crypto";

const app = express();

app.post(
  "/webhooks/credibill",
  express.raw({ type: "application/json" }), // Important: Get raw body
  (req, res) => {
    const signature = req.headers["x-credibill-signature"];
    const timestamp = req.headers["x-credibill-timestamp"];
    const rawBody = req.body.toString();

    // Verify signature
    const signaturePayload = `${timestamp}.${rawBody}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.CREDIBILL_WEBHOOK_SECRET)
      .update(signaturePayload)
      .digest("hex");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(signature)
      )
    ) {
      return res.status(401).send("Invalid signature");
    }

    // Parse and process webhook
    const webhook = JSON.parse(rawBody);
    handleWebhook(webhook);

    res.status(200).send("OK");
  }
);
```

---

## Payment Events

### payment.success

**Triggered:** Payment completed successfully

**Payload:**

```json
{
  "event": "payment.success",
  "data": {
    "id": "txn_abc123",
    "amount": 50000,
    "currency": "UGX",
    "status": "success",
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "invoiceId": "inv_ghi789",
    "providerTransactionId": "FLW-123456",
    "timestamp": 1703721600000
  }
}
```

**What to do:**

- Activate customer's subscription
- Grant access to features
- Send confirmation email
- Update internal billing records

---

### payment.failed

**Triggered:** Payment attempt failed

**Payload:**

```json
{
  "event": "payment.failed",
  "data": {
    "id": "txn_abc123",
    "amount": 50000,
    "currency": "UGX",
    "status": "failed",
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "invoiceId": "inv_ghi789",
    "providerTransactionId": "FLW-123456",
    "failureReason": "Insufficient funds",
    "timestamp": 1703721600000
  }
}
```

**What to do:**

- Mark subscription as past_due
- Send payment reminder email
- Optionally restrict feature access
- Schedule payment retry

---

## Subscription Events

### subscription.created

**Triggered:** New subscription created

**Payload:**

```json
{
  "event": "subscription.created",
  "data": {
    "id": "sub_abc123",
    "customerId": "cust_xyz789",
    "planId": "plan_def456",
    "status": "trialing",
    "trialEndsAt": 1704326400000,
    "currentPeriodStart": 1703721600000,
    "currentPeriodEnd": 1706313600000,
    "timestamp": 1703721600000
  }
}
```

---

### subscription.activated

**Triggered:** Subscription activated (payment successful after trial or past_due)

**Payload:**

```json
{
  "event": "subscription.activated",
  "data": {
    "id": "sub_abc123",
    "customerId": "cust_xyz789",
    "planId": "plan_def456",
    "status": "active",
    "paymentTransactionId": "txn_abc123",
    "timestamp": 1703721600000
  }
}
```

**What to do:**

- Grant full access
- Send welcome email
- Start feature usage tracking

---

### subscription.past_due

**Triggered:** Payment failed, subscription marked past_due

**Payload:**

```json
{
  "event": "subscription.past_due",
  "data": {
    "id": "sub_abc123",
    "customerId": "cust_xyz789",
    "status": "past_due",
    "failedPaymentAttempts": 1,
    "lastPaymentAttempt": 1703721600000,
    "timestamp": 1703721600000
  }
}
```

**What to do:**

- Send payment failed notification
- Optionally restrict access
- Display payment update prompt

---

### subscription.canceled

**Triggered:** Subscription canceled by customer or admin

**Payload:**

```json
{
  "event": "subscription.canceled",
  "data": {
    "id": "sub_abc123",
    "customerId": "cust_xyz789",
    "status": "canceled",
    "canceledAt": 1703721600000,
    "cancelReason": "customer_request",
    "timestamp": 1703721600000
  }
}
```

**What to do:**

- Revoke access
- Send cancellation confirmation
- Clean up customer data (if applicable)

---

### subscription.expired

**Triggered:** Subscription expired naturally (end of term, no renewal)

**Payload:**

```json
{
  "event": "subscription.expired",
  "data": {
    "id": "sub_abc123",
    "customerId": "cust_xyz789",
    "status": "expired",
    "expiredAt": 1703721600000,
    "timestamp": 1703721600000
  }
}
```

---

## Invoice Events

### invoice.generated

**Triggered:** Invoice created for billing period

**Payload:**

```json
{
  "event": "invoice.generated",
  "data": {
    "id": "inv_abc123",
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "amount": 50000,
    "currency": "UGX",
    "status": "open",
    "dueDate": 1704326400000,
    "lineItems": [
      {
        "description": "Pro Plan - January 2024",
        "amount": 30000,
        "quantity": 1
      },
      {
        "description": "API Calls - 10,000 calls",
        "amount": 20000,
        "quantity": 10000
      }
    ],
    "timestamp": 1703721600000
  }
}
```

---

### invoice.paid

**Triggered:** Invoice marked as paid (payment successful)

**Payload:**

```json
{
  "event": "invoice.paid",
  "data": {
    "id": "inv_abc123",
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "amount": 50000,
    "currency": "UGX",
    "status": "paid",
    "paidAt": 1703721600000,
    "paymentTransactionId": "txn_abc123",
    "timestamp": 1703721600000
  }
}
```

---

### invoice.payment_failed

**Triggered:** Payment attempt for invoice failed

**Payload:**

```json
{
  "event": "invoice.payment_failed",
  "data": {
    "id": "inv_abc123",
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "amount": 50000,
    "currency": "UGX",
    "status": "open",
    "paymentAttempts": 2,
    "lastFailureReason": "Insufficient funds",
    "timestamp": 1703721600000
  }
}
```

---

## Usage Events (Future)

### usage.reported

**Triggered:** Usage data submitted for metered billing

**Payload:**

```json
{
  "event": "usage.reported",
  "data": {
    "customerId": "cust_xyz789",
    "subscriptionId": "sub_def456",
    "metricType": "api_calls",
    "quantity": 1500,
    "timestamp": 1703721600000
  }
}
```

---

## Webhook Best Practices

### 1. Return 200 OK Quickly

```typescript
app.post("/webhooks", async (req, res) => {
  // Immediately acknowledge receipt
  res.status(200).send("OK");

  // Process webhook asynchronously
  processWebhookAsync(req.body);
});
```

### 2. Handle Idempotency

Same webhook may be delivered multiple times. Store event IDs:

```typescript
const eventId = `${webhook.event}_${webhook.data.id}_${webhook.timestamp}`;

if (await hasProcessedEvent(eventId)) {
  return; // Already processed
}

await processWebhook(webhook);
await markEventProcessed(eventId);
```

### 3. Implement Retry Logic

Your endpoint may be down. CrediBill retries failed webhooks:

- Retry 1: After 1 minute
- Retry 2: After 5 minutes
- Retry 3: After 15 minutes

After 3 failures, webhook marked as failed.

### 4. Validate Timestamp

Reject old webhooks to prevent replay attacks:

```typescript
const timestamp = parseInt(req.headers["x-credibill-timestamp"]);
const now = Date.now();
const age = now - timestamp;

if (age > 5 * 60 * 1000) {
  // 5 minutes
  return res.status(400).send("Webhook too old");
}
```

### 5. Log All Webhooks

Keep audit trail for debugging:

```typescript
await db.webhooks.create({
  event: webhook.event,
  payload: webhook.data,
  receivedAt: new Date(),
  processed: true,
});
```

---

## Testing Webhooks

### Local Development

Use tools to expose local server:

- [ngrok](https://ngrok.com/)
- [localtunnel](https://localtunnel.github.io/)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)

### Test Mode Webhooks

In test mode, trigger webhooks manually:

1. Go to CrediBill Dashboard → Webhooks
2. Click "Send Test Webhook"
3. Select event type
4. Click "Send"

### Webhook Logs

View webhook delivery history:

- Dashboard → Webhooks → Logs
- See delivery attempts, responses, retries
- Manually retry failed webhooks

---

## Webhook Delivery Status

| Status      | Description                                   |
| ----------- | --------------------------------------------- |
| `delivered` | Webhook successfully delivered (200 OK)       |
| `failed`    | Delivery failed (non-200 response or timeout) |
| `retrying`  | Webhook failed, retry scheduled               |
| `pending`   | Webhook queued for delivery                   |

---

## Common Issues & Solutions

### Issue: Webhooks not received

**Solutions:**

- Check webhook URL is publicly accessible
- Verify HTTPS certificate is valid
- Check firewall allows CrediBill IPs
- Look in webhook logs for delivery attempts

### Issue: Signature verification fails

**Solutions:**

- Use raw request body (not parsed JSON)
- Check webhook secret is correct
- Ensure timestamp header is included
- Use timing-safe comparison

### Issue: Duplicate webhooks

**Solutions:**

- Implement idempotency checks
- Store processed event IDs
- Handle duplicates gracefully

### Issue: Slow webhook processing

**Solutions:**

- Return 200 immediately, process async
- Use queue (Redis, RabbitMQ) for processing
- Scale webhook handler horizontally

---

## Rate Limits

- Max 100 webhooks/second per app
- Failed webhooks retry with backoff
- No limit on total webhooks

---

## Support

- Webhook debugging: Check logs in dashboard
- Signature verification issues: Contact support
- Webhook delivery problems: Check status page
