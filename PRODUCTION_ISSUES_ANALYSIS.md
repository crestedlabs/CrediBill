# Critical Production Issues & Analysis

## 🔍 Issues Found

### 1. ❌ **OrganizationId in Webhooks - UNNECESSARY**

**Problem:** PawaPay webhook handler requires organizationId but it's redundant
**Location:** `convex/webhookActionsPawapay.ts`

**Why it's there:**

- For logging webhooks to `webhookLogs` table (which requires organizationId)
- For creating transactions in `paymentTransactions` table

**Why it's redundant:**

- `app` already contains `organizationId`
- We fetch the app from `appId` anyway: `const app = await ctx.runQuery(internal.apps.get, { id: args.appId })`
- `app.organizationId` is always available

**Impact:** Adds unnecessary data passing, no security benefit

---

### 2. ❌ **Test Webhook Failure - NO WEBHOOK URL CONFIGURED**

**Problem:** Test webhook fails when app has no webhookUrl set
**Location:** `convex/apps.ts:638`

```typescript
if (!app.webhookUrl) {
  throw new Error("No webhook URL configured");
}
```

**Why this happens:**

- During development, apps may not have webhook URLs configured
- Test webhook should either:
  1. Skip if no URL (silent)
  2. Return helpful message (not throw error)

**Fix needed:** Make it graceful, not crash

---

### 3. ⚠️ **Trial Expiration Flow - MISSING GRACE PERIOD**

**Current Flow:**

```
Trial Expires → Status: "past_due" → Webhook: trial_expired
```

**Problems:**

1. ❌ No grace period applied
2. ❌ Goes straight to `past_due` (harsh)
3. ❌ Should transition: `trialing` → `pending_payment` → `past_due` (after grace)

**Location:** `convex/cronMutations.ts:20`

```typescript
await ctx.db.patch(args.subscriptionId, {
  status: "past_due", // TOO HARSH!
});
```

**What SHOULD happen:**

```
1. Trial ends → status: "pending_payment"
2. Webhook: "subscription.trial_expired" sent
3. App owner initiates payment
4. After grace period (app.gracePeriod days) → status: "past_due" if no payment
```

---

### 4. ⚠️ **Subscription Renewal - NO AUTOMATIC GRACE PERIOD CHECK**

**Problem:** When subscription period ends, no automatic grace period enforcement

**Current Cron Jobs:**

- `processTrialExpirations` - Handles trial endings ✅
- `processRecurringPayments` - Sends "payment.due" webhooks ✅
- `retryFailedPayments` - Does nothing (client handles retries) ⚠️
- `cleanupExpiredTransactions` - Marks expired transactions as failed ✅

**Missing:**

- ❌ No cron to check subscriptions past their `currentPeriodEnd`
- ❌ No automatic `active` → `past_due` transition after grace period
- ❌ No enforcement of `app.gracePeriod` for active subscriptions

**What SHOULD happen:**

```
Day 0: Period ends (currentPeriodEnd)
Day 0-3: Grace period (app.gracePeriod = 3 days)
       → Status stays "active"
       → Access continues
Day 3: Grace period expires
       → Status: "past_due"
       → Webhook: "subscription.past_due"
       → Access revoked
```

**Current Reality:**

- Subscription stays `active` indefinitely
- No automatic transition to `past_due`
- Only happens when payment fails (3 attempts)

---

### 5. ⚠️ **Invoice Flow - MANUAL ONLY**

**Current State:**

- Invoices are only generated when `renewSubscription` is called manually
- No automatic invoice generation on period end
- No invoice → payment flow integration

**Location:** `convex/subscriptions.ts:789`

```typescript
await ctx.scheduler.runAfter(0, internal.invoices.generateInvoiceInternal, {
  subscriptionId: args.subscriptionId,
  periodStart: subscription.currentPeriodStart,
  periodEnd: subscription.currentPeriodEnd,
});
```

**Problems:**

1. ❌ Invoices only created on manual renewal
2. ❌ No cron job to auto-generate invoices at period end
3. ❌ No link between invoice creation and payment initiation

**What SHOULD happen:**

```
1. Subscription period ends
2. Cron generates invoice automatically
3. Invoice status: "open", due date: periodEnd + gracePeriod
4. Webhook: "invoice.created" sent to app owner
5. App owner initiates payment
6. Payment webhook received → Invoice marked "paid"
7. Subscription renewed if paid within grace period
```

---

## 📊 Current Flow vs Expected Flow

### Trial Ending (Current - WRONG)

```
Day 0: Trial ends (trialEndsAt)
       ↓
       Cron runs: processTrialExpirations
       ↓
       Status: "past_due" ❌ TOO HARSH
       ↓
       Webhook: "subscription.trial_expired"
       ↓
       No grace period applied ❌
```

### Trial Ending (Expected - CORRECT)

```
Day 0: Trial ends (trialEndsAt)
       ↓
       Cron runs: processTrialExpirations
       ↓
       Status: "pending_payment" ✅
       ↓
       Webhook: "subscription.trial_expired"
       ↓
Day 0-3: Grace period (app.gracePeriod)
       ↓
       Status: still "pending_payment"
       ↓
       Waiting for payment webhook
       ↓
Day 3: If no payment
       ↓
       Status: "past_due"
       ↓
       Webhook: "subscription.past_due"
```

### Subscription Renewal (Current - INCOMPLETE)

```
Day 0: Period ends (currentPeriodEnd)
       ↓
       Cron sends: "payment.due" webhook ✅
       ↓
       ... nothing else happens ❌
       ↓
       Subscription stays "active" forever ❌
```

### Subscription Renewal (Expected - CORRECT)

```
Day 0: Period ends (currentPeriodEnd)
       ↓
       Cron generates invoice
       ↓
       Invoice status: "open", dueDate: periodEnd + gracePeriod
       ↓
       Webhook: "invoice.created" + "payment.due"
       ↓
Day 0-3: Grace period
       ↓
       Status: "active" (access continues)
       ↓
       Waiting for payment
       ↓
       Payment received → Invoice "paid" → Subscription renewed
       ↓
Day 3: If no payment
       ↓
       Status: "past_due"
       ↓
       Webhook: "subscription.past_due"
       ↓
       Access revoked
```

---

## 🛠️ Required Fixes

### Fix 1: Remove organizationId parameter from webhook handlers

**Impact:** Code cleanup, no functional change

### Fix 2: Make test webhook graceful

```typescript
if (!app.webhookUrl) {
  return {
    success: false,
    message: "No webhook URL configured. Set one in app settings.",
  };
}
```

### Fix 3: Fix trial expiration flow

```typescript
// In cronMutations.ts
export const markTrialExpired = internalMutation({
  args: { subscriptionId: v.id("subscriptions") },
  handler: async (ctx, args) => {
    const subscription = await ctx.db.get(args.subscriptionId);
    if (!subscription) return;

    // Change status to pending_payment (not past_due)
    await ctx.db.patch(args.subscriptionId, {
      status: "pending_payment", // Awaiting first payment
      nextPaymentDate: Date.now(), // Payment due now
    });
  },
});
```

### Fix 4: Add cron for grace period enforcement

**New Cron Job:** `processGracePeriodExpirations`

- Runs daily
- Finds subscriptions with `currentPeriodEnd + gracePeriod < now`
- Status is still `active` or `pending_payment`
- Transitions to `past_due`
- Sends `subscription.past_due` webhook

### Fix 5: Add automatic invoice generation

**New Cron Job:** `generatePendingInvoices`

- Runs daily
- Finds subscriptions where `currentPeriodEnd <= now`
- No invoice exists for current period
- Generates invoice automatically
- Sends `invoice.created` webhook

---

## 📋 Sensible Defaults Check

| Setting                  | Default             | Is it sensible?    | Recommendation             |
| ------------------------ | ------------------- | ------------------ | -------------------------- |
| `gracePeriod`            | 3 days              | ⚠️ Maybe too short | **7 days** is standard     |
| Trial → pending_payment  | ❌ Goes to past_due | ❌ No              | Fix: pending_payment first |
| Grace period enforcement | ❌ Not automatic    | ❌ No              | Fix: Add cron              |
| Invoice generation       | ❌ Manual only      | ❌ No              | Fix: Auto-generate         |
| cancelAtPeriodEnd        | true (now)          | ✅ Yes             | ✅ Good default            |
| Webhook retries          | Every 5 min         | ✅ Yes             | ✅ Good                    |
| Payment retry limit      | 3 attempts          | ✅ Yes             | ✅ Standard                |

---

## 🎯 Priority Fixes

### HIGH PRIORITY (Production Blockers)

1. ✅ Fix trial expiration (pending_payment not past_due)
2. ✅ Add grace period enforcement cron
3. ✅ Make test webhook graceful

### MEDIUM PRIORITY (User Experience)

4. ✅ Auto-generate invoices
5. ✅ Remove redundant organizationId param
6. ✅ Increase default gracePeriod to 7 days

### LOW PRIORITY (Nice to Have)

7. Add dunning emails (reminder before past_due)
8. Add invoice.overdue webhook
9. Add automatic suspension after X days past_due

---

## ✅ What's Working Well

1. ✅ **Webhook delivery system** - Retries, signatures, logging
2. ✅ **Payment webhook processing** - Activates subscriptions correctly
3. ✅ **Metadata extraction** - Links payments to customers/subscriptions
4. ✅ **Cancel at period end** - Proper default behavior
5. ✅ **Subscription status flow** - Most transitions are correct
6. ✅ **Cron infrastructure** - Scheduled jobs run reliably

---

## 📝 Summary

**Main Issues:**

1. Trial expiration too harsh (past_due immediately)
2. No automatic grace period enforcement
3. No automatic invoice generation
4. Test webhook crashes instead of being helpful

**Impact:**

- Trials can't convert properly
- Subscriptions don't respect grace periods
- Invoice flow doesn't work automatically
- Development experience is poor

**Next Steps:**

1. Apply all HIGH PRIORITY fixes
2. Test trial → payment flow end-to-end
3. Test subscription renewal with grace period
4. Verify invoice generation works
