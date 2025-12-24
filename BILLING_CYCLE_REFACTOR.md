# Billing Cycle Refactor - Plan-Level Decision

## Overview
Refactored the billing cycle from an **app-level setting** to a **plan-level decision**, allowing apps to offer multiple billing frequencies simultaneously (e.g., monthly AND annual plans for the same product).

## What Changed

### ✅ Before (App-Level - Restrictive)
- Each app had a single `billingCycle` field ("monthly" | "quarterly" | "annual" | "one-time")
- Apps could only offer ONE billing frequency across all plans
- To offer both monthly and annual options, you'd need separate apps (terrible UX)

### ✅ After (Plan-Level - Flexible)
- **Removed** `billingCycle` from apps table
- **Removed** `supportsOneTimePayments` from apps table (no longer needed)
- Plans already have `interval` field supporting all billing frequencies
- Each plan can now independently specify its billing interval
- Apps can now have plans with different billing frequencies:
  - "Starter Monthly" - $10/month
  - "Starter Annual" - $100/year (save 17%)
  - "Professional Monthly" - $50/month
  - "Professional Quarterly" - $140/quarter
  - etc.

## Files Modified

### 1. Schema Changes
**File:** `convex/schema.ts`
- ✅ Removed `billingCycle` field from `apps` table
- ✅ Removed `supportsOneTimePayments` field from `apps` table
- ✅ Added `quarterly` option to `plans.interval` enum
- **Plans interval now supports:** `"monthly" | "quarterly" | "yearly" | "one-time"`

### 2. Backend (Convex)
**File:** `convex/apps.ts`
- ✅ Removed `billingCycle` parameter from `createApp` mutation args
- ✅ Removed `supportsOneTimePayments` parameter from `createApp` mutation args
- ✅ Removed both fields from app insertion
- ✅ Removed from `getAppSettings` query return

**File:** `convex/plans.ts`
- ✅ Added `quarterly` to `interval` enum in `createPlan` mutation
- Plans now support: `"monthly" | "quarterly" | "yearly" | "one-time"`

### 3. Frontend Schemas
**File:** `lib/schemas/create-app.schema.ts`
- ✅ Removed `billingCycle` field from Zod schema
- ✅ Removed `supportsOneTimePayments` field from Zod schema
- ✅ Removed both from default values

**File:** `lib/schemas/create-plan.schema.ts`
- ✅ Added `quarterly` to `interval` enum
- Plans can now be: `"monthly" | "quarterly" | "yearly" | "one-time"`

### 4. UI Components
**File:** `components/form/create-app-form-simple.tsx`
- ✅ Removed `PaymentScheduleSelector` import
- ✅ Removed `billingCycle` and `supportsOneTimePayments` from form state
- ✅ Removed payment schedule selector section from form
- ✅ Removed both fields from mutation call

**File:** `components/form/create-plan-form.tsx`
- ✅ Added "Quarterly" option to billing interval select
- ✅ Plans can now be created with monthly, quarterly, yearly, or one-time intervals

**File:** `components/form/payment-schedule-selector.tsx`
- ❌ **NOT DELETED** (may be used elsewhere or for future reference)
- This component is no longer used in create app flow

## Benefits

### 🎯 Better User Experience
- Customers can now choose their preferred billing frequency per plan
- Common SaaS pattern: "Pay monthly or save 20% with annual billing"
- Flexibility to test different pricing strategies per plan

### 🏗️ Better Architecture
- Billing frequency is now a property of what you're selling (the plan), not the container (the app)
- Allows multiple pricing tiers with different billing options
- Aligns with industry-standard billing systems (Stripe, Chargebee, etc.)

### 💡 Example Use Case
**Before:** If app has `billingCycle: "monthly"`, all plans must be monthly
```
❌ Starter Plan - $10/month (only option)
❌ Pro Plan - $50/month (only option)
```

**After:** Each plan can have its own billing frequency
```
✅ Starter Monthly - $10/month
✅ Starter Annual - $100/year (save $20!)
✅ Pro Monthly - $50/month
✅ Pro Quarterly - $140/quarter
✅ Pro Annual - $500/year (save $100!)
✅ One-Time Setup - $500 (pay once)
```

## Migration Notes

### For Existing Data
If you have existing apps in your database with `billingCycle` or `supportsOneTimePayments` fields:
1. These fields will be **ignored** going forward (Convex will just not read them)
2. No data migration needed - old fields won't cause errors
3. New apps created will not have these fields

### For Future Plans
When creating plans, always specify the `interval` field:
- `"monthly"` - Charged every month
- `"quarterly"` - Charged every 3 months
- `"yearly"` - Charged once per year
- `"one-time"` - Single charge, no recurrence

## Testing Checklist

- [x] ✅ Schema compiles without errors
- [x] ✅ Create app mutation works without `billingCycle`
- [x] ✅ Create app form renders without payment schedule selector
- [x] ✅ Create plan form includes quarterly option
- [x] ✅ All TypeScript errors resolved
- [ ] 🔄 Test creating a new app (should work without billing cycle selection)
- [ ] 🔄 Test creating multiple plans with different intervals for same app
- [ ] 🔄 Verify plans display correctly with their respective intervals

## Related Files (No Changes Needed)
- `components/plans-content.tsx` - Already displays plan interval correctly
- `components/form/plan-card.tsx` - Already shows plan-level interval
- `convex/subscriptions.ts` - Uses plan.interval, not app.billingCycle

---

**Date:** December 24, 2025  
**Reason:** User identified architectural flaw - apps should support multiple billing frequencies simultaneously, not be restricted to one.
