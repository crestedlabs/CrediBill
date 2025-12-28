# Payment Flow & Webhook Architecture

## Your Business Model (Clarified)

**CrediBill is a Subscription Tracking Service, NOT a Payment Processor**

### What You DO:
- Track subscription lifecycle (created, active, trialing, cancelled, expired)
- Monitor billing periods and renewal dates
- Track usage and generate invoices
- Send webhooks to clients when events occur

### What You DON'T DO:
- ❌ Initiate payments
- ❌ Collect money from end-users
- ❌ Process credit cards or mobile money

### What Your CLIENTS Do:
- Collect payments from their end-users
- Use their own payment provider accounts (Flutterwave, PawaPay, Pesapal, DPO)
- Handle failed payments and retries
- Manage refunds

## Complete Payment Flow

### Flow Diagram
```
End User → Client App → Payment Provider → CrediBill → Client App
   (1)        (2)           (3)              (4)        (5)
```

### Step-by-Step Flow

#### 1. **End User Initiates Action**
- User clicks "Subscribe" or "Upgrade" in client's app
- User chooses payment method (mobile money, card, etc.)

#### 2. **Client Collects Payment**
```javascript
// Client's backend code
app.post('/subscribe', async (req, res) => {
  const { customerId, planId } = req.body;
  
  // Step 2a: Create subscription in CrediBill (status: pending)
  const subscription = await credibill.subscriptions.create({
    customer_id: customerId,
    plan_id: planId
  });
  
  // Step 2b: Initiate payment with THEIR payment provider
  const payment = await flutterwave.initiate({
    amount: subscription.plan.baseAmount,
    currency: 'UGX',
    customer: {...},
    tx_ref: subscription.id, // Important: Link payment to subscription
    callback_url: 'https://client-app.com/payment-callback'
  });
  
  // Step 2c: Send user to payment page
  res.json({ payment_url: payment.link });
});
```

#### 3. **Payment Provider Processes Payment**
- User completes payment (M-Pesa, card, etc.)
- Payment provider validates and processes
- Provider sends webhooks to **TWO** endpoints:
  - CrediBill webhook: `https://credibill.com/webhooks/flutterwave`
  - Client webhook: `https://client-app.com/webhooks/flutterwave`

#### 4. **CrediBill Receives Payment Notification**
```
POST https://credibill.com/webhooks/flutterwave
{
  "event": "charge.completed",
  "data": {
    "status": "successful",
    "tx_ref": "sub_k123abc...",
    "amount": 5000,
    "currency": "UGX",
    "customer": {...}
  }
}
```

CrediBill's webhook handler:
- Verifies webhook signature
- Finds transaction/subscription by reference
- Updates subscription status (pending → active)
- Creates invoice record
- Records payment
- **Sends outgoing webhook to client** ✅

#### 5. **Client Receives Confirmation**
```
POST https://client-app.com/webhooks/credibill
{
  "event": "subscription.activated",
  "data": {
    "subscription": {...},
    "payment": {...},
    "invoice": {...}
  }
}
```

Client's webhook handler:
- Verifies signature
- Activates user's account
- Enables premium features
- Sends confirmation email

## Incoming Webhook System (What You Built)

### Webhook Endpoints

Your system receives webhooks from payment providers:

| Provider | Endpoint | Signature Header |
|----------|----------|------------------|
| Flutterwave | `/webhooks/flutterwave` | `verif-hash` |
| PawaPay | `/webhooks/pawapay` | `x-pawapay-signature` |
| Pesapal | `/webhooks/pesapal` | `x-pesapal-signature` |
| DPO | `/webhooks/dpo` | `x-dpo-signature` |

### Webhook Structure

**Files:**
- `convex/http.ts` - HTTP routes for each provider
- `convex/webhookActionsFlutterwave.ts` - Flutterwave handler
- `convex/webhookActionsPawapay.ts` - PawaPay handler
- `convex/webhookActionsPesapal.ts` - Pesapal handler
- `convex/webhookActionsDpo.ts` - DPO handler

**Each Handler Does:**
1. Verify webhook signature (security)
2. Extract transaction reference
3. Find transaction in database
4. Update payment status
5. Update subscription status
6. Log webhook delivery
7. **Send outgoing webhook to client** ✅

### Configuration (How Clients Set This Up)

When a client creates an app in your system, they provide:

1. **Payment Provider Selection** (Immutable)
   - Choose: Flutterwave, PawaPay, Pesapal, or DPO
   - Stored in `apps.paymentProviderId`

2. **Provider Credentials** (Encrypted)
   - API keys, secrets, merchant IDs
   - Stored in `paymentProviderCredentials` table
   - Used to verify incoming webhooks

3. **Webhook URL** (For outgoing webhooks)
   - Where to send notifications
   - Stored in `apps.webhookUrl`
   - Example: `https://client-app.com/webhooks/credibill`

### Example Webhook Configuration Flow

```javascript
// Client configures their app in CrediBill dashboard
POST /api/apps
{
  "name": "My SaaS App",
  "payment_provider": "flutterwave", // Choose provider
  "credentials": {
    "public_key": "FLWPUBK-xxx",
    "secret_key": "FLWSECK-xxx", // Encrypted
    "webhook_secret": "xxx" // For verifying incoming webhooks
  },
  "webhook_url": "https://my-saas.com/webhooks/credibill", // For outgoing webhooks
  "webhook_secret": "my-secret-key" // For signing outgoing webhooks
}
```

## What Needs to Be Configured

### For INCOMING Webhooks (Payment Provider → CrediBill)

Clients need to configure in their payment provider dashboard:

**Flutterwave Dashboard:**
```
Webhook URL: https://credibill.com/webhooks/flutterwave
Events: charge.completed, transfer.completed
```

**PawaPay Dashboard:**
```
Webhook URL: https://credibill.com/webhooks/pawapay
Events: payment.completed, payment.failed
```

**Pesapal Dashboard:**
```
IPN URL: https://credibill.com/webhooks/pesapal
Notification Type: COMPLETED, FAILED
```

**DPO Dashboard:**
```
Callback URL: https://credibill.com/webhooks/dpo
```

### For OUTGOING Webhooks (CrediBill → Client)

Already configured in your Settings → Webhooks tab:
- Webhook URL: Client's endpoint
- Webhook Secret: For signature verification
- Events: All enabled by default

## Security Flow

### 1. Incoming Webhook Verification
```typescript
// Your code already does this
const signature = headers['verif-hash']; // Flutterwave example
const expectedSignature = calculateSignature(payload, webhookSecret);

if (signature !== expectedSignature) {
  throw new Error('Invalid signature');
}
```

### 2. Outgoing Webhook Signing
```typescript
// Your code already does this
const hmac = crypto.createHmac('sha256', clientWebhookSecret);
hmac.update(JSON.stringify(payload));
const signature = hmac.digest('hex');

headers['X-Webhook-Signature'] = signature;
```

## Common Events

### Incoming (From Payment Providers)
- `charge.completed` - Payment successful
- `charge.failed` - Payment failed
- `transfer.completed` - Refund processed
- `transfer.failed` - Refund failed

### Outgoing (To Clients)
- `subscription.created` - New subscription
- `subscription.activated` - Payment successful, subscription active
- `subscription.renewed` - Billing period renewed
- `subscription.cancelled` - Subscription ended
- `subscription.plan_changed` - Plan upgrade/downgrade
- `payment.failed` - Payment attempt failed
- `invoice.created` - New invoice generated

## What Needs to Be Removed

Since you DON'T initiate payments, these need to be cleaned up:

### Files to Review/Remove:
1. ❌ `convex/payments.ts` - Contains payment initiation logic
2. ❌ `convex/paymentsNode.ts` - Node.js payment adapter calls
3. ❌ `convex/lib/paymentAdapters/` - Adapter implementations
   - `flutterwave.ts` - `initiatePayment()` method
   - `pawapay.ts` - `initiatePayment()` method
   - `pesapal.ts` - `initiatePayment()` method
   - `dpo.ts` - `initiatePayment()` method

### What to KEEP:
✅ Webhook handlers (incoming)
✅ Webhook delivery (outgoing)
✅ Payment transaction records (for tracking)
✅ Invoice generation
✅ Subscription management

## Recommended Architecture

### Your Responsibility (CrediBill):
```typescript
// Track subscription lifecycle
subscriptions.create() → status: "pending"
subscriptions.activate() → status: "active" (after webhook)
subscriptions.renew() → extend billing period
subscriptions.cancel() → status: "cancelled"

// Generate invoices
invoices.create() → track what's owed
invoices.recordPayment() → mark as paid (after webhook)

// Send notifications
webhooks.send("subscription.activated", {...})
webhooks.send("invoice.paid", {...})
```

### Client's Responsibility:
```typescript
// Initiate payments
flutterwave.initiatePayment({
  amount: plan.price,
  customer: {...},
  tx_ref: subscription.id
})

// Handle payment callbacks
app.post('/payment-callback', async (req, res) => {
  if (req.query.status === 'successful') {
    // Wait for CrediBill webhook to confirm
  }
})

// Receive CrediBill webhooks
app.post('/webhooks/credibill', async (req, res) => {
  const { event, data } = req.body;
  
  switch (event) {
    case 'subscription.activated':
      await activateUser(data.customer.external_id);
      break;
    case 'payment.failed':
      await notifyUser(data.customer.email);
      break;
  }
})
```

## Summary

Your system is a **passive tracker** that:
1. ✅ Receives payment notifications from providers
2. ✅ Updates subscription states
3. ✅ Generates invoices and usage reports
4. ✅ Sends notifications to clients

Your system does NOT:
1. ❌ Initiate payments
2. ❌ Store credit card details
3. ❌ Process transactions
4. ❌ Handle refunds

This is the correct architecture for a subscription management platform! 🎉
