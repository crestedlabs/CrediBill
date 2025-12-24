# Apps Context Fix

## Issue

In the Organization Details page, under the "Applications" tab, the apps list was not respecting the selected organization context. When switching organizations, users would still see apps from other organizations.

## Root Cause

The `AppsContent` component was calling `api.apps.getUserApps` with an empty object `{}`:

```typescript
// BEFORE - Wrong
const apps = useQuery(api.apps.getUserApps, {});
```

This caused the backend to default to the user's first organization, not the currently selected one.

## Solution

Updated `AppsContent` to use the organization context and pass the selected organization ID:

```typescript
// AFTER - Correct
import { useOrganization } from "@/contexts/organization-context";

function AppsManager() {
  const { selectedOrg } = useOrganization();
  const apps = useQuery(
    api.apps.getUserApps,
    selectedOrg?._id ? { organizationId: selectedOrg._id } : "skip"
  );
  // ...
}
```

## Changes Made

### File: `components/apps-content.tsx`

1. **Added import**:

   ```typescript
   import { useOrganization } from "@/contexts/organization-context";
   ```

2. **Updated query**:
   ```typescript
   const { selectedOrg } = useOrganization();
   const apps = useQuery(
     api.apps.getUserApps,
     selectedOrg?._id ? { organizationId: selectedOrg._id } : "skip"
   );
   ```

## Behavior Now

### Before Fix

- User switches from Org A to Org B
- Apps list still shows Org A's apps ❌
- Confusing and incorrect behavior

### After Fix

- User switches from Org A to Org B
- Apps list immediately updates to show Org B's apps ✅
- Correct context-aware behavior

## Testing

### Test Case 1: Organization Switching

1. Go to Organization Details page
2. Click "Applications" tab
3. Note which apps are shown
4. Switch to different organization (using org switcher)
5. **Expected**: Apps list updates to show only selected org's apps ✅

### Test Case 2: Multiple Organizations

1. Create apps in Organization A
2. Create apps in Organization B
3. Switch between organizations
4. **Expected**: Each organization shows only its own apps ✅

### Test Case 3: Empty State

1. Switch to an organization with no apps
2. **Expected**: "No apps yet" empty state shown ✅

### Test Case 4: Query Skipping

1. If selectedOrg is undefined/null
2. **Expected**: Query is skipped (doesn't run) ✅

## Backend Context

The `getUserApps` query already supported filtering by organization:

```typescript
export const getUserApps = query({
  args: { organizationId: v.optional(v.id("organizations")) },
  handler: async (ctx, { organizationId }) => {
    // If organizationId provided, use it
    // Otherwise, default to user's first organization
    // ...
  },
});
```

The fix simply ensures the frontend passes the correct organization ID.

## Related Components

This fix ensures consistency across the app:

| Component              | Context Used    | Status          |
| ---------------------- | --------------- | --------------- |
| `apps-content.tsx`     | ✅ Organization | **Fixed**       |
| `settings-*` pages     | ✅ App          | Already correct |
| `organization-details` | ✅ Organization | Already correct |
| `create-app` page      | ✅ Organization | Already correct |

## Impact

✅ **User Experience**: Apps now correctly filtered by organization
✅ **Data Integrity**: Users only see their organization's apps
✅ **Context Consistency**: All pages respect selected contexts
✅ **No Breaking Changes**: Backward compatible fix

## Summary

Fixed organization context issue in the Applications tab. Apps are now correctly filtered by the selected organization, ensuring users only see apps that belong to the currently selected organization.

**Changed**: 1 file
**Lines changed**: ~10 lines
**Breaking changes**: None
**Migration needed**: No
