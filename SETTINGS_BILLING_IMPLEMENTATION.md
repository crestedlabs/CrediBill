# Settings Billing Tab Implementation

## Overview
Implemented fully functional Billing Settings tab with the same UX patterns as General Settings - real data fetching, smart save button, validation, and proper authorization.

---

## Changes Made

### 1. ✅ Updated Backend Mutation

**File:** `/convex/apps.ts`

Extended `updateAppSettings` mutation to include billing fields:

```typescript
export const updateAppSettings = mutation({
  args: {
    appId: v.id("apps"),
    // General settings (already had)
    defaultCurrency: v.optional(...),
    timezone: v.optional(...),
    language: v.optional(...),
    // ✅ NEW: Billing settings
    defaultPaymentMethod: v.optional(...),
    retryPolicy: v.optional(...),
    defaultTrialLength: v.optional(v.number()),
    gracePeriod: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // ... authorization checks ...
    // ✅ Validation for trial length (0-365 days)
    // ✅ Validation for grace period (0-30 days)
    // ✅ Patch only provided fields
  },
});
```

**Validations Added:**
- Trial Length: Must be between 0 and 365 days
- Grace Period: Must be between 0 and 30 days
- Shows specific error messages for validation failures

**Note:** `getAppSettings` query already returned all billing fields, so no changes needed there.

---

### 2. ✅ Implemented Functional Billing Settings

**File:** `/components/settings-billing.tsx`

Completely rewrote with full functionality:

#### State Management
```typescript
const { selectedApp } = useApp(); // From context
const appSettings = useQuery(api.apps.getAppSettings, ...); // Fetch real data
const updateSettings = useMutation(api.apps.updateAppSettings); // Save mutation

// Local form state
const [paymentMethod, setPaymentMethod] = useState("");
const [retryPolicy, setRetryPolicy] = useState("");
const [trialLength, setTrialLength] = useState(14);
const [gracePeriod, setGracePeriod] = useState(3);
const [isSaving, setIsSaving] = useState(false);
```

#### Loading State
- Shows loading spinner while fetching settings
- Prevents interaction until data loads

#### Form Initialization
```typescript
useEffect(() => {
  if (appSettings) {
    setPaymentMethod(appSettings.defaultPaymentMethod);
    setRetryPolicy(appSettings.retryPolicy);
    setTrialLength(appSettings.defaultTrialLength);
    setGracePeriod(appSettings.gracePeriod);
  }
}, [appSettings]);
```

#### Change Detection
```typescript
const hasChanges =
  appSettings &&
  (paymentMethod !== appSettings.defaultPaymentMethod ||
   retryPolicy !== appSettings.retryPolicy ||
   trialLength !== appSettings.defaultTrialLength ||
   gracePeriod !== appSettings.gracePeriod);
```

#### Client-Side Validation
```typescript
// Before saving, validate number ranges
if (trialLength < 0 || trialLength > 365) {
  toast.error("Invalid trial length", {
    description: "Trial length must be between 0 and 365 days"
  });
  return;
}

if (gracePeriod < 0 || gracePeriod > 30) {
  toast.error("Invalid grace period", {
    description: "Grace period must be between 0 and 30 days"
  });
  return;
}
```

#### Save Button UX (Same as General Tab)
- **Disabled when:** No changes made OR currently saving
- **States:** "Save Changes" / "Saving..." with spinner
- **After save:** Auto-disables (no changes) until next edit

---

## Settings Available

### Payment Configuration

#### 1. Default Payment Method
- **Type:** Select dropdown
- **Options:**
  - 📱 Mobile Money
  - 💳 Credit Card
  - 🏦 Bank Transfer
- **Purpose:** Default payment method for new subscriptions

#### 2. Payment Retry Policy
- **Type:** Select dropdown with icons
- **Options:**
  - 🔄 Automatic Retries (green)
  - ⏱️ Manual Review (amber)
  - 🔴 No Retries (red)
- **Purpose:** How to handle failed payment attempts

### Trial & Billing Cycles

#### 3. Default Trial Length
- **Type:** Number input (0-365)
- **Unit:** Days
- **Validation:** Shows error if outside range
- **Help text:** "0-365 days"

#### 4. Grace Period
- **Type:** Number input (0-30)
- **Unit:** Days
- **Validation:** Shows error if outside range
- **Help text:** "0-30 days"

#### 5. Billing Cycle (Read-only)
- **Display:** "Plan-level (set per plan)"
- **Help text:** "Each plan defines its own billing interval"
- **Why read-only:** After billing cycle refactor, this is now plan-specific

---

## User Experience Flow

### 1. Page Load
```
User clicks "Billing" tab
  ↓
Shows loading spinner
  ↓
Fetches billing settings from Convex
  ↓
Populates form with current values
  ↓
Save button DISABLED (no changes)
```

### 2. User Makes Changes
```
User changes Payment Method from "Mobile Money" to "Credit Card"
  ↓
hasChanges = true
  ↓
Save button ENABLES
```

### 3. User Saves
```
User clicks "Save Changes"
  ↓
Client validates trial length & grace period
  ↓
Button shows "Saving..." with spinner
  ↓
Mutation runs with authorization check
  ↓
Success: Toast + button disables
Error: Toast with error message
```

### 4. Validation Errors
```
User sets trial length to 400 days
  ↓
Clicks save
  ↓
Client validation catches it
  ↓
Shows error toast: "Trial length must be between 0 and 365 days"
  ↓
User can correct and try again
```

---

## Features Implemented

### ✅ Real Data Fetching
- Uses `api.apps.getAppSettings` query
- Fetches for `selectedApp` from context
- Shows loading state

### ✅ Controlled Form Inputs
- Select dropdowns use `value` and `onValueChange`
- Number inputs use `value` and `onChange`
- Immediate state updates

### ✅ Smart Save Button
- Only enabled when changes exist
- Disabled during save
- Loading spinner feedback
- Clear state transitions

### ✅ Validation (Two Layers)
**Client-side:**
- Range check before sending (0-365 days, 0-30 days)
- Shows toast error if invalid

**Server-side:**
- Mutation validates ranges again
- Prevents invalid data even if client bypassed
- Returns error message

### ✅ Authorization
- Backend checks owner/admin role
- Same protection as general settings

### ✅ Toast Notifications
- Success: "Billing settings updated successfully"
- Validation error: Specific message
- Save error: Shows backend error

### ✅ Billing Cycle Note
- Read-only field explains plan-level decision
- Reflects the refactor we did earlier
- Clear helper text

---

## Differences from General Tab

### Similar:
- ✅ Same loading state pattern
- ✅ Same change detection logic
- ✅ Same save button UX
- ✅ Same toast notifications
- ✅ Same authorization

### Different:
- ✅ Number inputs instead of all selects
- ✅ Client-side validation for number ranges
- ✅ Billing cycle field is read-only (not editable)
- ✅ Help text under number inputs showing valid ranges

---

## Error Messages

### Client Validation
1. **Invalid trial length:** "Trial length must be between 0 and 365 days"
2. **Invalid grace period:** "Grace period must be between 0 and 30 days"

### Server Validation
1. **Trial length out of range:** "Trial length must be between 0 and 365 days"
2. **Grace period out of range:** "Grace period must be between 0 and 30 days"
3. **Unauthorized:** "Only owners and admins can update app settings"

### Success
- "Billing settings updated successfully - Your changes have been saved"

---

## Code Quality

### Consistent Patterns
- Same pattern as General Settings
- Reusable approach for future tabs
- TypeScript type safety
- Proper state management

### Input Handling
- Number inputs parse with `parseInt(e.target.value) || 0`
- Prevents NaN values
- Min/max attributes on inputs for browser validation
- Additional validation before save

### UX Considerations
- Visual feedback at every step
- Clear error messages
- Disabled states prevent mistakes
- Loading states show progress

---

## Testing Checklist

### Happy Path
- [ ] Navigate to Settings → Billing tab
- [ ] Verify current values load correctly
- [ ] Save button should be DISABLED
- [ ] Change payment method → Button ENABLES
- [ ] Change trial length to 30 → Button still enabled
- [ ] Click save → Shows "Saving..."
- [ ] Success toast appears
- [ ] Button DISABLES again
- [ ] Refresh page → Values persisted

### Validation
- [ ] Set trial length to 400 → Shows error on save
- [ ] Set trial length to -5 → Shows error on save
- [ ] Set grace period to 50 → Shows error on save
- [ ] Set grace period to -1 → Shows error on save
- [ ] Set valid values (14, 3) → Saves successfully

### Authorization
- [ ] Try as owner → Should work ✅
- [ ] Try as admin → Should work ✅
- [ ] Try as member → Should show error ❌

### Change Detection
- [ ] Change value then change back → Button DISABLES
- [ ] Change multiple fields → All save together
- [ ] No changes → Button stays disabled

### Edge Cases
- [ ] Type letters in number field → Defaults to 0
- [ ] Empty number field → Defaults to 0
- [ ] Click save multiple times → Only one request

---

## Billing Cycle Explanation

The billing cycle field is **read-only** with this explanation:

**Display:** "Plan-level (set per plan)"  
**Help text:** "Each plan defines its own billing interval"

**Why?**
- After the billing refactor, apps no longer have a single billing cycle
- Each plan can have its own interval (monthly, quarterly, yearly, one-time)
- This allows flexibility (e.g., offer both monthly and annual plans)
- The field serves as a reminder to set billing intervals when creating plans

---

## Future Enhancements

Could be added later:
- [ ] **Retry schedule configuration** - How many retries, timing
- [ ] **Payment provider settings** - API keys, webhooks
- [ ] **Dunning management** - Email templates for failed payments
- [ ] **Tax settings** - Tax rates, VAT handling
- [ ] **Proration settings** - How to handle mid-cycle changes

---

**Summary:** Billing Settings tab now fully functional with real data fetching, smart save button, validation (client + server), authorization checks, and excellent UX matching the General tab! 🎉
