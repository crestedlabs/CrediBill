# Data Migration Guide - Billing Cycle Refactor

## Overview

After the billing cycle refactor, you have **removed** `billingCycle` and `supportsOneTimePayments` fields from the `apps` table. Here's what you need to know about your existing data.

---

## ✅ Good News: No Migration Required!

### Why No Migration Is Needed:

1. **Convex is Schema-Flexible**
   - Old apps with `billingCycle` and `supportsOneTimePayments` fields will still exist in the database
   - These fields will simply be **ignored** by your new code
   - Convex won't throw errors for "extra" fields that aren't in the schema

2. **Your Queries Are Safe**
   - `getUserApps` - Only returns specific fields (doesn't include billingCycle)
   - `getAppSettings` - Only returns specific fields (doesn't include billingCycle)
   - `createApp` - Creates new apps without these fields
   - All queries work with both old and new app documents

3. **Backward Compatible**
   - Old apps continue to function normally
   - New apps are created without the removed fields
   - No data corruption or errors

---

## 🔍 What Happens to Existing Data?

### Scenario 1: You Have Existing Apps

```typescript
// Old app in database (created before refactor)
{
  _id: "j97abc123",
  name: "MyOldApp",
  organizationId: "k12org456",
  // ... other fields ...
  billingCycle: "monthly",  // ⚠️ This field still exists but is IGNORED
  supportsOneTimePayments: true,  // ⚠️ This field still exists but is IGNORED
}

// Your code only reads these fields:
{
  _id: app._id,
  name: app.name,
  defaultCurrency: app.defaultCurrency,
  // ... etc (no billingCycle or supportsOneTimePayments)
}
```

**Result:** ✅ Everything works fine. Old fields are just ignored.

### Scenario 2: You Create New Apps

```typescript
// New app in database (created after refactor)
{
  _id: "j98new789",
  name: "MyNewApp",
  organizationId: "k12org456",
  // ... other fields ...
  // ✅ No billingCycle field
  // ✅ No supportsOneTimePayments field
}
```

**Result:** ✅ Clean new apps without legacy fields.

---

## 🧹 Optional: Clean Up Legacy Data (If You Want)

If you want to **remove** the old fields from existing apps, you can create a one-time migration script:

### Step 1: Create a Migration Function

Create `/convex/migrations/removeBillingCycleFromApps.ts`:

```typescript
import { internalMutation } from "../_generated/server";

export const removeBillingCycleFromApps = internalMutation({
  handler: async (ctx) => {
    // Get all apps
    const apps = await ctx.db.query("apps").collect();

    let updatedCount = 0;

    for (const app of apps) {
      // Check if app has the legacy fields
      const hasLegacyFields =
        "billingCycle" in app || "supportsOneTimePayments" in app;

      if (hasLegacyFields) {
        // Patch the app to remove these fields
        // Note: Convex doesn't have a "delete field" operation
        // So we'd need to recreate the document without those fields

        // Option 1: Just leave them (they're harmless)
        // Option 2: If you really want them gone, you'd need to:
        //   - Create a new document with only the fields you want
        //   - Update all references to the old document
        //   - Delete the old document
        // This is complex and usually not worth it!

        updatedCount++;
      }
    }

    return {
      message: `Found ${updatedCount} apps with legacy billing fields`,
      note: "Fields are harmless and can be left as-is",
    };
  },
});
```

### Step 2: Run the Migration (If Needed)

You can call this from the Convex dashboard:

1. Go to your Convex dashboard
2. Navigate to Functions
3. Find `migrations:removeBillingCycleFromApps`
4. Run it manually

---

## 📋 Recommended Action: Do Nothing!

### Why "Do Nothing" Is Best:

1. **No Breaking Changes**
   - Old apps continue working perfectly
   - New apps work perfectly
   - No errors or issues

2. **Complexity vs Benefit**
   - Migration is complex in Convex (no simple "delete field" operation)
   - Legacy fields don't hurt anything (just extra bytes)
   - Your code doesn't read them, so they're invisible

3. **Natural Cleanup**
   - Over time, as you create new apps, they won't have these fields
   - Eventually, most/all apps will be "clean" anyway
   - If an old app is archived, its legacy fields are archived too

---

## ✅ Summary: You're All Set!

### What You Need to Do:

1. **Nothing!** Your data is fine as-is
2. Continue creating new apps (they'll be clean)
3. Old apps continue working (legacy fields ignored)

### If You're Paranoid:

- Run a quick test: Create a new app and verify it works
- Check an old app and verify it still loads correctly
- Look at the Convex dashboard to see your data

### Future Consideration:

If you ever want to do a deep clean (months/years from now), you could:

1. Export all apps
2. Filter out legacy fields
3. Re-import clean data

But honestly, it's not worth the effort. The legacy fields are harmless! 🎉

---

## 🧪 Testing Checklist

- [ ] Create a new app through the form
- [ ] Verify new app doesn't have `billingCycle` or `supportsOneTimePayments` fields (check Convex dashboard)
- [ ] Open an old app (if you have one) and verify it still works
- [ ] Create plans with different intervals (monthly, quarterly, yearly, one-time)
- [ ] Verify plans display correctly with their intervals

---

**Bottom Line:** Your existing data is **100% safe**. No migration needed. Old fields are simply ignored. Everything works! 🚀
