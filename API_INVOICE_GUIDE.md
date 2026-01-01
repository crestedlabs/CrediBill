# Invoice API Integration Guide

## Overview

This guide explains how to integrate with CrediBill's invoice system through the API, specifically for payment providers like PawaPay that require invoice IDs in their metadata.

---

## Understanding Invoice Availability

### Subscription Without Trial

✅ **Invoice created immediately** when subscription is created  
✅ `invoiceId` available in subscription creation response  
✅ Ready for payment initiation right away

### Subscription With Trial

❌ **No invoice during trial period**  
✅ Invoice generated when trial expires  
✅ Listen for `invoice.created` webhook  
✅ Or fetch invoice via API before payment

---

## API Endpoints

### 1. Create Subscription

**Endpoint:** `POST /api/subscriptions`

**Request:**

```json
{
  "customerId": "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
  "planId": "k57eddw6wf2c80mfrtwxfzrhbs7y5abc",
  "startDate": 1735718400000 // optional
}
```

**Response:**

```json
{
  "success": true,
  "subscriptionId": "k17fzevqgpf5y3x2ex0wr8c73d7ydhn8",
  "invoiceId": "jd7cjj4nzqznymxqka68gtcpt97yd81m", // or null if trial
  "status": "pending_payment", // or "trialing"
  "trialEndsAt": null, // or timestamp if trial active
  "nextBillingDate": null, // null until first payment received (unknown before payment)
  "paymentDueDate": 1735718400000 // When payment is expected (for pending_payment)
}
```

**Field Descriptions:**

- `subscriptionId`: Always present - use for linking payments
- `invoiceId`: Present only if invoice exists (no trial), otherwise null
- `status`: `pending_payment` (no trial) or `trialing` (trial active)
- `nextBillingDate`: When the next billing cycle ends (null until first payment - we don't know when you'll pay)
- `paymentDueDate`: When payment is expected/due (for pending_payment status)

---

### 2. Get Current Unpaid Invoice

**Endpoint:** `GET /api/invoices?subscriptionId={id}&status=open`

**Purpose:** Fetch the current unpaid invoice for a subscription

**Response (Invoice Exists):**

```json
{
  "invoice": {
    "_id": "jd7cjj4nzqznymxqka68gtcpt97yd81m",
    "subscriptionId": "k17fzevqgpf5y3x2ex0wr8c73d7ydhn8",
    "customerId": "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
    "invoiceNumber": "INV-2026-001",
    "currency": "UGX",
    "amountDue": 20000,
    "amountPaid": 0,
    "status": "open",
    "periodStart": 1735718400000,
    "periodEnd": 1738310400000,
    "dueDate": 1735718400000,
    "lineItems": [
      {
        "description": "Monthly Plan - Base Subscription",
        "quantity": 1,
        "unitAmount": 20000,
        "totalAmount": 20000,
        "type": "plan"
      }
    ],
    "customer": { ... },
    "subscription": { ... }
  }
}
```

**Response (No Invoice):**

```json
{
  "invoice": null
}
```

**When to Use:**

- Before initiating payment for trial subscriptions
- To verify invoice still exists before retry
- To get latest invoice amount if usage-based

---

### 3. List All Invoices (Optional Filters)

**Endpoint:** `GET /api/invoices?subscriptionId={id}`

**Response:**

```json
{
  "invoices": [
    { ... },
    { ... }
  ]
}
```

**Note:** When filtering by `subscriptionId` + `status=open`, returns single invoice format (see endpoint #2)

---

## Integration Patterns

### Pattern A: No Trial Subscription

**Use Case:** Immediate payment required

```javascript
// 1. Create subscription
const response = await fetch("/api/subscriptions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerId: "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
    planId: "k57eddw6wf2c80mfrtwxfzrhbs7y5abc",
  }),
});

const data = await response.json();
// data.invoiceId is available immediately!

// 2. Initiate payment with invoice
await pawapay.createDeposit({
  amount: data.invoice.amount,
  currency: data.invoice.currency,
  correspondent: "MTN_MOMO_UGA",
  payer: {
    type: "MSISDN",
    address: { value: "+256700000000" },
  },
  metadata: {
    credibill_customer_id: data.customerId,
    credibill_subscription_id: data.subscriptionId,
    credibill_invoice_id: data.invoiceId, // ✅ Available!
  },
});
```

---

### Pattern B: Trial Subscription (Webhook Approach)

**Use Case:** Invoice created when trial ends

```javascript
// 1. Create subscription with trial
const response = await fetch("/api/subscriptions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerId: "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
    planId: "k57eddw6wf2c80mfrtwxfzrhbs7y5abc", // Plan has trial
  }),
});

const data = await response.json();
// data.invoiceId is null
// data.status is "trialing"
// data.trialEndsAt shows when trial expires

// 2. Listen for webhook when trial ends
app.post("/webhooks/credibill", async (req, res) => {
  const event = req.body;

  if (event.event === "invoice.created") {
    const invoice = event.data.invoice;
    const subscription = event.data.subscription;

    // Invoice now available - initiate payment
    await pawapay.createDeposit({
      amount: invoice.amountDue,
      currency: invoice.currency,
      metadata: {
        credibill_customer_id: subscription.customerId,
        credibill_subscription_id: subscription._id,
        credibill_invoice_id: invoice._id, // ✅ Now available!
      },
    });
  }

  res.status(200).send("OK");
});
```

---

### Pattern C: Trial Subscription (Polling Approach)

**Use Case:** Check for invoice before payment

```javascript
// 1. Create subscription with trial
const subResponse = await fetch("/api/subscriptions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    customerId: "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
    planId: "k57eddw6wf2c80mfrtwxfzrhbs7y5abc",
  }),
});

const sub = await subResponse.json();

// 2. Later (when trial ends), check for invoice
const invoiceResponse = await fetch(
  `/api/invoices?subscriptionId=${sub.subscriptionId}&status=open`,
  {
    headers: { Authorization: `Bearer ${API_KEY}` },
  }
);

const { invoice } = await invoiceResponse.json();

if (invoice) {
  // Invoice exists - initiate payment
  await pawapay.createDeposit({
    metadata: {
      credibill_customer_id: sub.customerId,
      credibill_subscription_id: sub.subscriptionId,
      credibill_invoice_id: invoice._id, // ✅ Available!
    },
  });
} else {
  console.log("Trial still active or invoice already paid");
}
```

---

### Pattern D: Safe Approach (Always Fetch)

**Use Case:** Works for both trial and non-trial

```javascript
async function initiatePayment(subscriptionId, customerId) {
  // Always fetch current invoice before payment
  const response = await fetch(
    `/api/invoices?subscriptionId=${subscriptionId}&status=open`,
    {
      headers: { Authorization: `Bearer ${API_KEY}` },
    }
  );

  const { invoice } = await response.json();

  if (!invoice) {
    throw new Error("No unpaid invoice found (trial active or already paid)");
  }

  // Invoice exists - safe to initiate payment
  await pawapay.createDeposit({
    amount: invoice.amountDue,
    currency: invoice.currency,
    metadata: {
      credibill_customer_id: customerId,
      credibill_subscription_id: subscriptionId,
      credibill_invoice_id: invoice._id, // ✅ Always available here!
    },
  });
}
```

---

## PawaPay Integration

### Metadata Requirements

When creating a deposit in PawaPay, include these fields:

```json
{
  "metadata": {
    "credibill_customer_id": "j974h1ant05rs6tv2je8zfb8vn7ydnb6",
    "credibill_subscription_id": "k17fzevqgpf5y3x2ex0wr8c73d7ydhn8",
    "credibill_invoice_id": "jd7cjj4nzqznymxqka68gtcpt97yd81m"
  }
}
```

**Field Requirements:**

- ✅ `credibill_customer_id` - **REQUIRED**
- ✅ `credibill_subscription_id` - **OPTIONAL** (but recommended)
- ✅ `credibill_invoice_id` - **OPTIONAL**

**Important:**

- System works without `invoiceId` - payment still links to subscription
- Invoice will still get marked paid if linked later
- Subscription will still activate based on payment

---

## Webhook Events

### `subscription.created`

Fired when subscription is created

```json
{
  "event": "subscription.created",
  "data": {
    "subscription": { ... },
    "customer": { ... },
    "plan": { ... }
  }
}
```

### `invoice.created`

Fired when invoice is generated (including when trial ends)

```json
{
  "event": "invoice.created",
  "data": {
    "invoice": {
      "_id": "jd7cjj4nzqznymxqka68gtcpt97yd81m",
      "subscriptionId": "k17fzevqgpf5y3x2ex0wr8c73d7ydhn8",
      "amountDue": 20000,
      "currency": "UGX",
      "status": "open",
      ...
    },
    "subscription": { ... },
    "customer": { ... }
  }
}
```

### `subscription.activated`

Fired when first payment succeeds

```json
{
  "event": "subscription.activated",
  "data": {
    "subscription": {
      "status": "active",
      "currentPeriodStart": 1735718400000,
      "currentPeriodEnd": 1738310400000,
      ...
    },
    "customer": { ... },
    "first_payment": true
  }
}
```

---

## Best Practices

### ✅ DO:

1. **Use subscription creation response** for no-trial scenarios
2. **Listen for webhooks** for trial scenarios
3. **Make invoiceId optional** in your payment flow
4. **Always include customerId and subscriptionId** in metadata
5. **Fetch invoice before payment** if you want to be extra safe

### ❌ DON'T:

1. **Don't assume invoice exists** for trial subscriptions
2. **Don't use invoice numbers** (`INV-2026-001`) - use Convex IDs
3. **Don't retry without checking** invoice still exists
4. **Don't make payment fail** if invoiceId is missing

---

## Error Handling

### Invoice Not Found

```javascript
const { invoice } = await fetch(...).then(r => r.json());

if (!invoice) {
  // Could be:
  // 1. Trial still active
  // 2. Invoice already paid
  // 3. Subscription cancelled
  // 4. No subscription found
}
```

### Handling Missing Invoice During Payment

```javascript
// Payment succeeds even without invoiceId
await pawapay.createDeposit({
  metadata: {
    credibill_customer_id: customerId,
    credibill_subscription_id: subscriptionId,
    // invoiceId omitted - payment still works!
  },
});
```

---

## Timeline Examples

### Example 1: No Trial

```
Day 0:
  - Create subscription
  - Invoice generated immediately
  - invoiceId available in response
  - Initiate payment
  - Payment succeeds
  - Subscription activates

Day 30:
  - Renewal invoice generated automatically
  - Webhook: invoice.created
  - Initiate payment
  - Payment succeeds
  - Subscription period extends
```

### Example 2: 7-Day Trial

```
Day 0:
  - Create subscription
  - No invoice (trial active)
  - invoiceId is null
  - Customer uses service

Day 7:
  - Trial expires (cron job)
  - Invoice generated
  - Webhook: invoice.created
  - Initiate payment
  - Payment succeeds
  - Subscription activates

Day 37:
  - Renewal invoice generated
  - Webhook: invoice.created
  - Initiate payment
  - etc.
```

---

## Testing Checklist

- [ ] Create subscription without trial
- [ ] Verify `invoiceId` in response
- [ ] Initiate payment with invoice ID
- [ ] Verify payment webhook processes
- [ ] Verify subscription activates
- [ ] Verify invoice marked paid
- [ ] Create subscription with trial
- [ ] Verify `invoiceId` is null
- [ ] Wait for trial to expire (or test cron)
- [ ] Verify invoice generated via webhook
- [ ] Fetch invoice via API
- [ ] Verify invoice ID is valid
- [ ] Initiate payment
- [ ] Verify subscription activates

---

## Summary

**Key Takeaways:**

1. Invoice availability depends on trial status
2. Always check subscription creation response first
3. Use webhooks or polling for trial subscriptions
4. InvoiceId is optional but recommended
5. System is resilient - works without invoice link
6. Use Convex IDs, not invoice numbers

**Recommended Pattern:**

- **Simple apps:** Use subscription response (Pattern A)
- **Apps with trials:** Use webhooks (Pattern B)
- **Maximum safety:** Always fetch before payment (Pattern D)
