# PawaPay Integration Test Checklist

## Prerequisites Setup

### 1. Environment Variables in Convex Dashboard

- [ ] Go to: https://dashboard.convex.dev → Your Project → Settings → Environment Variables
- [ ] Add: `CREDIBILL_WEBHOOK_SECRET` = `whsec-credibill123` (or your secret)
- [ ] Deploy: `npx convex deploy`
- [ ] Verify deployment successful

### 2. Cloudflare Worker Configuration

- [ ] Worker URL: `https://api.credibill.tech`
- [ ] Endpoint: `/v1/webhooks/pawapay`
- [ ] `WEBHOOK_SECRET` in worker matches Convex `CREDIBILL_WEBHOOK_SECRET`
- [ ] Worker forwards to: `https://giant-goldfish-922.convex.site/webhooks/pawapay`

### 3. PawaPay Dashboard Configuration

- [ ] Configure webhook URL: `https://api.credibill.tech/v1/webhooks/pawapay?appId={YOUR_APP_ID}`
- [ ] Replace `{YOUR_APP_ID}` with actual Convex app ID (format: `jxxxxxxxxxxxxx`)

---

## Data Setup (Create via CrediBill Dashboard)

### Step 1: Create Customer

- [ ] Go to: Customers page
- [ ] Click "Create Customer"
- [ ] Enter:
  - Email: `test@example.com`
  - First Name: `Test`
  - Last Name: `Customer`
  - Phone: `+256700000000`
- [ ] Save and **copy Customer ID** (format: `jxxxxxxxxxxxxx`)

### Step 2: Create Plan

- [ ] Go to: Plans page
- [ ] Click "Create Plan"
- [ ] Enter:
  - Name: `Monthly Plan`
  - Pricing Model: `flat_rate`
  - Amount: `20000`
  - Currency: `UGX`
  - Interval: `monthly`
- [ ] Save and **copy Plan ID**

### Step 3: Create Subscription

- [ ] Go to: Subscriptions page (or use API)
- [ ] Create subscription with:
  - Customer ID: (from Step 1)
  - Plan ID: (from Step 2)
  - Trial: `No` (so it goes to `pending_payment`)
- [ ] **Copy Subscription ID**
- [ ] Verify status shows: `pending_payment`
- [ ] An invoice should be auto-generated
- [ ] **Copy Invoice ID** (format: `jxxxxxxxxxxxxx`)

---

## PawaPay Deposit Initiation

### Required Metadata Fields

When creating a deposit in PawaPay, include these in the `metadata` object:

```json
{
  "amount": "20000.00",
  "currency": "UGX",
  "correspondent": "MTN_MOMO_UGA",
  "payer": {
    "type": "MSISDN",
    "address": {
      "value": "+256700000000"
    }
  },
  "customerTimestamp": "2026-01-01T10:30:00Z",
  "statementDescription": "Subscription Payment",
  "metadata": {
    "credibill_customer_id": "jxxxxxxxxxxxxx",
    "credibill_subscription_id": "jxxxxxxxxxxxxx",
    "credibill_invoice_id": "jxxxxxxxxxxxxx"
  }
}
```

**CRITICAL:**

- ✅ Use **Convex IDs** (format: `jxxxxxxxxxxxxx`)
- ❌ NOT invoice numbers (format: `INV-2026-001`)
- ✅ `credibill_customer_id` is **REQUIRED**
- ✅ `credibill_subscription_id` is **OPTIONAL** (but recommended)
- ✅ `credibill_invoice_id` is **OPTIONAL**

---

## Expected Flow

### 1. Initial State (Before Payment)

```
Subscription Status: pending_payment
Invoice Status: pending
Transaction: None
currentPeriodStart: Dec 29, 2025 (or creation date)
currentPeriodEnd: Dec 29, 2025
nextPaymentDate: Dec 29, 2025
```

### 2. PawaPay Sends Webhook (ACCEPTED status)

```
Worker receives → Returns 200 immediately
Worker forwards to Convex in background
Convex validates secret → Returns 200
Convex schedules async processing
```

**Expected Transaction Created:**

- Status: `pending`
- Provider: `pawapay`
- Linked to: customer, subscription, invoice

### 3. PawaPay Sends Webhook (COMPLETED status)

```
Worker receives → Returns 200
Convex processes payment
```

**Expected Updates:**

**Transaction:**

- Status: `pending` → `completed`
- `completedAt`: Timestamp

**Subscription:**

- Status: `pending_payment` → `active`
- `currentPeriodStart`: Payment date (Jan 1, 2026)
- `currentPeriodEnd`: Payment date + 30 days (Jan 31, 2026)
- `nextPaymentDate`: Jan 31, 2026
- `lastPaymentDate`: Jan 1, 2026
- `failedPaymentAttempts`: 0

**Invoice:**

- Status: `pending` → `paid`
- `paidAt`: Payment timestamp
- `amountPaid`: 20000

**Outgoing Webhook Sent:**

- Event: `subscription.activated`
- Payload includes subscription, customer, and `first_payment: true`

---

## Verification Steps

### Check Convex Dashboard Logs

1. Go to: https://dashboard.convex.dev → Your Project → Logs
2. Search for: `[PawaPay]`
3. Expected logs:
   ```
   [PawaPay] Webhook received
   [PawaPay] Extracted metadata: { customerId: "j...", subscriptionId: "j...", invoiceId: "j...", depositId: "..." }
   [PawaPay] Processing deposit status: COMPLETED
   [PawaPay] Transaction created/updated
   [PawaPay] Subscription activated
   ```

### Check Tables in Convex Dashboard

1. **paymentTransactions**
   - [ ] New record exists
   - [ ] `providerTransactionId` matches PawaPay `depositId`
   - [ ] `status` = `completed`
   - [ ] `amount` = 20000
   - [ ] `currency` = `UGX`
   - [ ] Linked to correct customer, subscription, invoice

2. **subscriptions**
   - [ ] Status = `active`
   - [ ] `currentPeriodStart` = payment date
   - [ ] `currentPeriodEnd` = payment date + 30 days
   - [ ] `lastPaymentDate` = payment timestamp
   - [ ] `failedPaymentAttempts` = 0

3. **invoices**
   - [ ] Status = `paid`
   - [ ] `paidAt` timestamp exists
   - [ ] `amountPaid` = 20000

4. **webhookDeliveries**
   - [ ] New record with event: `subscription.activated`
   - [ ] Status should be `success` or `pending`
   - [ ] Check your app's webhook endpoint received it

### Check CrediBill Dashboard

1. **Subscriptions Page**
   - [ ] Status shows: `Active`
   - [ ] Next Payment shows: Jan 31, 2026 (30 days from payment)
   - [ ] Started date: Jan 1, 2026

2. **Invoices Page**
   - [ ] Invoice shows ID (Convex ID, not INV-xxx)
   - [ ] Status: `Paid`
   - [ ] Paid date: Jan 1, 2026

3. **Transactions (if you have a page)**
   - [ ] Transaction appears
   - [ ] Linked to subscription and invoice

---

## Common Issues and Solutions

### Issue 1: 401 Unauthorized

**Cause:** Webhook secret mismatch
**Solution:**

- Check `CREDIBILL_WEBHOOK_SECRET` in Convex Dashboard
- Check `WEBHOOK_SECRET` in Cloudflare Worker
- Ensure they match exactly
- Redeploy: `npx convex deploy`

### Issue 2: 400 Bad Request - Missing appId

**Cause:** Worker not including appId in payload
**Solution:**

- Verify PawaPay webhook URL includes: `?appId={YOUR_APP_ID}`
- Check Cloudflare Worker forwards: `{ appId, payload }`

### Issue 3: ArgumentValidationError - invoiceId

**Cause:** Using invoice number (`INV-2026-001`) instead of Convex ID
**Solution:**

- Use Convex ID format: `jxxxxxxxxxxxxx`
- Get from invoice page or API response

### Issue 4: Missing required metadata: customerId

**Cause:** `credibill_customer_id` not in PawaPay deposit metadata
**Solution:**

- Add to metadata when creating deposit in PawaPay
- Must be Convex customer ID, not email

### Issue 5: Subscription not activating

**Possible causes:**

1. Deposit status is not `COMPLETED` (check PawaPay logs)
2. Transaction already processed (check for duplicate `depositId`)
3. Subscription status is not `pending_payment` (check before payment)
4. Customer ID mismatch (verify IDs match)

### Issue 6: Invoice not marking as paid

**Possible causes:**

1. `invoiceId` not in metadata (optional, but won't link)
2. Invoice doesn't exist (verify invoice was created)
3. Invoice already paid (check current status)

---

## Test Scenarios

### Scenario 1: On-Time First Payment

```
1. Create subscription → Status: pending_payment
2. Payment received same day → Status: active
3. Period: Jan 1 - Jan 31 (full 30 days)
```

### Scenario 2: Late First Payment

```
1. Created: Dec 29, Status: pending_payment
2. Payment: Jan 1 (3 days late)
3. Result: Service activates Jan 1
4. Period: Jan 1 - Jan 31 (customer pays for service starting Jan 1)
```

### Scenario 3: Renewal Payment (On-Time)

```
1. Active subscription, currentPeriodEnd: Jan 31
2. Payment: Jan 31
3. Result: Period extends to Feb 28
4. New period: Jan 31 - Feb 28
```

### Scenario 4: Renewal Payment (Late)

```
1. Active subscription, currentPeriodEnd: Jan 31
2. Payment: Feb 5 (5 days late)
3. Result: Service was suspended Jan 31 - Feb 5
4. New period: Feb 5 - Mar 7 (customer only pays for time after payment)
```

### Scenario 5: Failed Payment

```
1. PawaPay sends status: FAILED
2. Transaction status: failed
3. Subscription stays: pending_payment (or active if renewal)
4. failedPaymentAttempts incremented
5. After 3 failures: Status → past_due
```

---

## Production Readiness Checklist

- [ ] Environment variable `CREDIBILL_WEBHOOK_SECRET` uses strong random string
- [ ] Cloudflare Worker deployed and accessible
- [ ] PawaPay webhook URL configured correctly
- [ ] Test deposit completed successfully end-to-end
- [ ] Logs show no errors
- [ ] All database tables updated correctly
- [ ] Outgoing webhooks delivered to your app
- [ ] Dashboard shows correct status and dates
- [ ] Late payment scenario tested
- [ ] Failed payment scenario tested
- [ ] Renewal payment tested

---

## Quick Reference

### Webhook Flow

```
PawaPay → https://api.credibill.tech/v1/webhooks/pawapay?appId=X
         → Cloudflare Worker (200 immediate)
         → https://giant-goldfish-922.convex.site/webhooks/pawapay
         → Convex HTTP Handler (validates secret, returns 200)
         → Async Action: handlePawapayWebhook
         → Mutation: createTransactionFromWebhook
         → Subscription activation
         → Invoice paid
         → Outgoing webhook to your app
```

### Key IDs Format

- App ID: `jxxxxxxxxxxxxx` (from Convex)
- Customer ID: `jxxxxxxxxxxxxx` (from Convex)
- Subscription ID: `jxxxxxxxxxxxxx` (from Convex)
- Invoice ID: `jxxxxxxxxxxxxx` (from Convex)
- Deposit ID: PawaPay's UUID format

### Metadata Template

```json
{
  "credibill_customer_id": "jxxxxxxxxxxxxx",
  "credibill_subscription_id": "jxxxxxxxxxxxxx",
  "credibill_invoice_id": "jxxxxxxxxxxxxx"
}
```

**Remember:** Customer ID is REQUIRED, others are optional but recommended.
