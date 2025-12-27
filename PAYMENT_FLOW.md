# Payment Flow Documentation

## Overview

CrediBill handles subscription billing and payment collection for SaaS applications using African payment providers (Flutterwave, PawaPay, Pesapal, DPO).

---

## Architecture

### Multi-Tenant Design

- Each SaaS app connects their own payment provider accounts
- Credentials stored encrypted per app
- Payments flow directly to SaaS app's provider account
- CrediBill orchestrates but doesn't hold funds

### Key Components

1. **Payment Providers** - SaaS apps configure providers in settings
2. **Payment Orchestration** - Automated payment initiation
3. **Webhook Handling** - Receive payment confirmations from providers
4. **Outgoing Webhooks** - Notify SaaS apps of payment events
5. **Cron Jobs** - Automated billing cycles

---

## Payment Lifecycle

### 1. Trial to Paid Conversion

**Trigger:** Trial period expires
**Process:**

- Cron job (daily 2 AM UTC) checks expired trials
- System creates invoice from subscription + usage data
- Gets app's primary payment provider
- Initiates payment via provider adapter
- Creates payment transaction record
- Returns payment reference/URL

**Files Involved:**

- `convex/cronHandlers.ts` - processTrialExpirations
- `convex/payments.ts` - initiateSubscriptionPayment
- `convex/paymentsNode.ts` - Provider adapter calls

### 2. Recurring Payments

**Trigger:** Subscription renewal date reached
**Process:**

- Cron job (daily 3 AM UTC) checks due subscriptions
- Generates invoice for next billing period
- Includes metered usage charges
- Initiates payment automatically
- Updates subscription billing dates

**Files Involved:**

- `convex/cronHandlers.ts` - processRecurringPayments
- `convex/payments.ts` - processRecurringPayment

### 3. Payment Confirmation

**Trigger:** Provider sends webhook
**Process:**

- Webhook received at `/webhooks/{provider}`
- Signature verification (HMAC/SHA256)
- Replay attack prevention
- Idempotency check
- Transaction status update
- Invoice marked as paid (if successful)
- Outgoing webhook sent to SaaS app

**Files Involved:**

- `convex/http.ts` - Webhook routes
- `convex/webhookActions.ts` - Handler functions
- `convex/webhookQueries.ts` - Transaction lookups
- `convex/webhookMutations.ts` - Status updates
- `convex/outgoingWebhooks.ts` - Customer notifications

### 4. Failed Payment Handling

**Trigger:** Payment fails or webhook indicates failure
**Process:**

- Subscription status: ACTIVE → PAST_DUE
- Failed attempt counter increments
- Retry scheduled (exponential backoff)
- Cron job (daily 4 AM UTC) retries failed payments
- After 3 failures, subscription remains PAST_DUE
- SaaS app notified via webhook

**Files Involved:**

- `convex/cronHandlers.ts` - retryFailedPayments
- `convex/webhookMutations.ts` - updateTransactionFromWebhook

---

## Payment Providers

### Supported Providers

#### Flutterwave

- **Coverage:** Uganda, Kenya, Rwanda, Nigeria
- **Payment Methods:** Mobile Money (MTN, Airtel), Cards, Bank Transfer
- **Webhook Signature:** SHA256 hash via `verif-hash` header
- **Test Mode:** Yes

#### PawaPay

- **Coverage:** Uganda, Kenya, Tanzania
- **Payment Methods:** Mobile Money only (MTN, Airtel, Vodacom)
- **Webhook Signature:** HMAC-SHA256 via `X-Signature` header
- **Test Mode:** Yes

#### Pesapal

- **Coverage:** East Africa
- **Payment Methods:** Cards, Mobile Money
- **Webhook Signature:** OAuth + API verification
- **Test Mode:** Yes

#### DPO (Direct Pay Online)

- **Coverage:** Africa-wide
- **Payment Methods:** Cards, Bank Transfer
- **Webhook Signature:** XML API verification with CompanyToken
- **Test Mode:** Yes

---

## Security Features

### Webhook Signature Verification

- **Timing-safe comparison** - Prevents timing attack side channels
- **HMAC-SHA256** - Industry standard signature verification
- **Replay attack prevention** - 5-minute tolerance, 24-hour max age
- **Idempotency** - Duplicate webhook detection via event ID search

### Credential Encryption

- **AES-256-GCM** - Encryption for stored credentials
- **SHA256 key derivation** - Secure key management
- **Per-app encryption** - Isolated credential storage

### Race Condition Protection

- **Terminal state guards** - Prevents overwriting success/canceled/refunded states
- **Atomic updates** - Transaction updates are transactional

---

## Cron Jobs Schedule

| Job                    | Frequency   | Time (UTC) | Purpose                                 |
| ---------------------- | ----------- | ---------- | --------------------------------------- |
| Trial Expirations      | Daily       | 2:00 AM    | Convert expired trials to paid          |
| Recurring Payments     | Daily       | 3:00 AM    | Process subscription renewals           |
| Failed Payment Retries | Daily       | 4:00 AM    | Retry failed transactions               |
| Cleanup Expired        | Daily       | 5:00 AM    | Mark old pending transactions as failed |
| Webhook Retries        | Every 5 min | -          | Retry failed outgoing webhooks          |

---

## Database Schema

### Payment Providers Table

```typescript
{
  organizationId: Id<"organizations">,
  appId: Id<"apps">,
  provider: "flutterwave" | "pawapay" | "pesapal" | "dpo" | "paystack" | "stripe",
  credentials: {
    publicKey?: string,
    secretKeyEncrypted: string,
    merchantId?: string,
    apiUrl?: string
  },
  environment: "test" | "live",
  isPrimary: boolean,
  isActive: boolean,
  webhookSecret?: string
}
```

### Payment Transactions Table

```typescript
{
  organizationId: Id<"organizations">,
  appId: Id<"apps">,
  customerId: Id<"customers">,
  subscriptionId?: Id<"subscriptions">,
  invoiceId?: Id<"invoices">,
  amount: number,
  currency: string,
  paymentProviderId: Id<"paymentProviders">,
  providerTransactionId?: string,
  providerReference?: string,
  paymentMethod: "mobile_money_mtn" | "card_visa" | ...,
  status: "pending" | "initiated" | "processing" | "success" | "failed" | "canceled" | "refunded",
  attemptNumber: number,
  isRetry: boolean,
  providerResponse?: any,
  initiatedAt: number,
  completedAt?: number,
  expiresAt?: number
}
```

### Webhook Logs Table (Incoming)

```typescript
{
  organizationId: Id<"organizations">,
  appId: Id<"apps">,
  provider: "flutterwave" | "pawapay" | "pesapal" | "dpo" | ...,
  event: string,
  payload: any,
  status: "received" | "processing" | "processed" | "failed" | "ignored",
  signatureValid?: boolean,
  paymentTransactionId?: Id<"paymentTransactions">,
  subscriptionId?: Id<"subscriptions">,
  receivedAt: number,
  processedAt?: number
}
```

---

## Error Handling

### Common Scenarios

1. **Provider API Down**
   - Transaction marked as failed
   - Retry scheduled for later
   - SaaS app notified via webhook

2. **Invalid Credentials**
   - Payment initiation fails
   - Provider connection marked as error
   - Alert sent to SaaS app admin

3. **Webhook Signature Mismatch**
   - Webhook rejected
   - Logged for security audit
   - No state changes

4. **Duplicate Webhooks**
   - Idempotency check catches duplicate
   - Webhook logged as "ignored"
   - No duplicate processing

---

## Testing & Development

### Test Mode

- All providers support sandbox/test mode
- Configure via `environment: "test"` in provider settings
- Test credentials don't process real money
- Test webhooks can be triggered manually

### Local Development

- Webhook endpoints require public URL
- Use ngrok or similar for local testing
- Convex dev server handles webhook routes

---

## API Integration Examples

### For SaaS Apps Using CrediBill

#### 1. Configure Payment Provider

```typescript
// In your app's settings page
await convex.mutation(api.paymentProviders.addPaymentProvider, {
  appId: currentApp._id,
  provider: "flutterwave",
  credentials: {
    publicKey: "FLWPUBK_TEST-xxx",
    secretKey: "FLWSECK_TEST-xxx",
  },
  environment: "test",
  isPrimary: true,
});
```

#### 2. Handle Webhook Events

```typescript
// Your app's webhook endpoint
app.post("/webhooks/credibill", (req, res) => {
  const { event, data } = req.body;

  switch (event) {
    case "payment.success":
      // Activate customer's subscription
      activateFeatures(data.customerId);
      break;

    case "payment.failed":
      // Notify customer, restrict access
      suspendAccount(data.customerId);
      break;
  }

  res.status(200).send("OK");
});
```

---

## Monitoring & Observability

### Logs Available

- All webhook deliveries (incoming/outgoing)
- Payment transaction history
- Provider connection status
- Retry attempts and outcomes

### Metrics to Track

- Payment success rate per provider
- Average payment processing time
- Webhook delivery success rate
- Failed payment retry effectiveness

---

## Best Practices

1. **Always verify webhook signatures** in your app
2. **Handle idempotent webhooks** - same event may arrive multiple times
3. **Use test mode first** before going live
4. **Monitor failed payments** regularly
5. **Keep provider credentials secure** - never log or expose
6. **Set up webhook retries** in your app (CrediBill retries too)
7. **Test all payment methods** your customers will use

---

## Support & Resources

### Provider Documentation Links

- [Flutterwave API Docs](https://developer.flutterwave.com/docs)
- [PawaPay API Docs](https://docs.pawapay.io/)
- [Pesapal API Docs](https://developer.pesapal.com/)
- [DPO API Docs](https://www.directpay.online/docs/)

### Contact

- Technical support: [Your support email]
- Integration help: [Your integration email]
- Status page: [Your status page URL]
