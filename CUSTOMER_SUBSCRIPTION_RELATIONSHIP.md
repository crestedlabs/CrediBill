# Customer-Subscription Relationship in CrediBill

## 📋 Key Understanding

### Can Customers Exist Without Subscriptions?

**YES!** Customers are **independent entities** and can exist without subscriptions.

## 🔄 Customer Lifecycle

### 1. Customer Creation

```
Customer Created → No Subscription → Status: "active"
```

- Customers are created first
- They exist in your database as prospects
- They may or may not subscribe to plans

### 2. Customer Subscribes

```
Customer → Subscribes to Plan → Subscription: "pending_payment" or "trialing"
```

- Customer can have 0, 1, or multiple subscriptions
- Each subscription links to a plan
- Customer record remains unchanged

### 3. Customer Cancels Subscription

```
Customer (active) → Subscription (cancelled) → Customer still exists
```

**What Happens When They Cancel:**

- ✅ Customer record **remains in database**
- ✅ Customer status stays "active" (unless you explicitly change it)
- ✅ Subscription status changes to "cancelled"
- ✅ Historical data preserved (invoices, payments, usage)
- ✅ They can re-subscribe later
- ✅ You can still view their profile

### 4. Customer States After Cancellation

**Scenario A: Cancelled but still in database**

```typescript
Customer {
  status: "active",        // Customer account is active
  subscriptions: [
    { status: "cancelled" } // But subscription is cancelled
  ]
}
```

- Customer can browse, update profile, view history
- No active subscription = no access to paid features
- Can subscribe to a new plan anytime

**Scenario B: Multiple Subscriptions**

```typescript
Customer {
  status: "active",
  subscriptions: [
    { planId: "basic",    status: "cancelled" },  // Old subscription
    { planId: "premium",  status: "active" }      // Current subscription
  ]
}
```

- Customers can have multiple subscriptions over time
- Only one active subscription per plan typically
- Historical subscriptions show upgrade/downgrade patterns

## 🎯 Design Pattern: Separation of Concerns

### Customer Entity

**Purpose:** Identity and contact information

```typescript
Customer {
  email: "user@example.com",
  first_name: "John",
  last_name: "Doe",
  phone: "+256700000000",
  status: "active" | "inactive" | "blocked"
}
```

- Independent lifecycle
- Can exist forever
- Status controls account access, not subscription access

### Subscription Entity

**Purpose:** Plan enrollment and billing

```typescript
Subscription {
  customerId: "k17...",
  planId: "k27...",
  status: "active" | "cancelled" | "trialing" | "past_due" | ...,
  currentPeriodStart: timestamp,
  currentPeriodEnd: timestamp
}
```

- Dependent on customer
- Has its own lifecycle
- Status controls feature access

## 💡 Real-World Examples

### Example 1: Cancelled Customer

```
1. User signs up → Customer created (status: "active")
2. User subscribes → Subscription created (status: "pending_payment")
3. Payment succeeds → Subscription becomes "active"
4. User cancels → Subscription becomes "cancelled"
5. User still exists with status "active"
   - Can log in
   - Can view history
   - Can re-subscribe
   - No access to paid features
```

### Example 2: Customer With No Subscription

```
1. User signs up → Customer created
2. User browses plans but never subscribes
3. Customer exists with 0 subscriptions
4. This is normal! They're a "prospect" or "lead"
```

### Example 3: Blocked Customer

```
1. Customer violates terms
2. Admin sets customer status to "blocked"
3. Subscriptions may still be "active" in database
4. Business logic prevents access based on customer status
5. Customer cannot re-subscribe while blocked
```

## 🔑 Key Differences

### Customer Status vs Subscription Status

| Customer Status | Meaning          | Can Log In? | Can Subscribe? |
| --------------- | ---------------- | ----------- | -------------- |
| `active`        | Normal account   | ✅ Yes      | ✅ Yes         |
| `inactive`      | Dormant account  | ⚠️ Maybe    | ⚠️ Maybe       |
| `blocked`       | Banned/suspended | ❌ No       | ❌ No          |

| Subscription Status | Meaning                | Has Access?     | Is Billed? |
| ------------------- | ---------------------- | --------------- | ---------- |
| `trialing`          | Free trial period      | ✅ Yes          | ❌ Not yet |
| `pending_payment`   | Awaiting first payment | ❌ No           | ⏳ Pending |
| `active`            | Paid and current       | ✅ Yes          | ✅ Yes     |
| `past_due`          | Payment failed         | ⚠️ Grace period | ⏳ Retry   |
| `cancelled`         | User cancelled         | ❌ No\*         | ❌ No      |
| `expired`           | One-time plan ended    | ❌ No           | ❌ No      |
| `paused`            | Temporarily suspended  | ❌ No           | ❌ No      |

\* _Unless `cancelAtPeriodEnd=true`, then access until period ends_

## 🛠️ Common Operations

### Check If Customer Has Active Subscription

```typescript
const activeSubscription = customer.subscriptions.find(
  (s) => s.status === "active" || s.status === "trialing"
);

if (activeSubscription) {
  // Customer has access
} else {
  // Customer has no active subscription
}
```

### Delete Customer

```typescript
// Soft delete: Keep data, mark as inactive
await ctx.db.patch(customerId, { status: "inactive" });

// Hard delete: Requires no active subscriptions
// Will fail if customer has active subscriptions
await deleteCustomer({ customerId, force: false });
```

### Re-Subscribe Cancelled Customer

```typescript
// Customer record already exists
// Just create new subscription
await createSubscription({
  customerId: existingCustomerId,
  planId: newPlanId,
});
// Customer keeps same ID, email, history
```

## ✅ Best Practices

1. **Never delete customers automatically**
   - Keep for historical records
   - Valuable for analytics
   - May re-subscribe later

2. **Use subscription status for access control**

   ```typescript
   const hasAccess =
     subscription.status === "active" || subscription.status === "trialing";
   ```

3. **Use customer status for account control**

   ```typescript
   if (customer.status === "blocked") {
     throw new Error("Account suspended");
   }
   ```

4. **Preserve cancelled subscriptions**
   - Don't delete from database
   - Keep for billing history
   - Required for reports and analytics

5. **Allow multiple subscriptions per customer**
   - Historical data (upgrades/downgrades)
   - Different products/services
   - Family plans, add-ons, etc.

## 🎬 Summary

**What You Were Missing:**

- Customers and subscriptions are **separate entities**
- Customers can exist without subscriptions (prospects/leads)
- When a subscription is cancelled, the customer **remains active**
- Customer status ≠ Subscription status
- This is normal and expected behavior!

**The Flow:**

```
Customer (Identity) → Subscription (Service Access) → Cancellation (Service Stops)
     ↓                        ↓                              ↓
Remains Active          Status Changes              Can Re-Subscribe
```

This design gives you:

- ✅ Flexibility for trials and demos
- ✅ Re-subscription capability
- ✅ Historical data preservation
- ✅ Marketing to prospects
- ✅ Customer lifetime value tracking
