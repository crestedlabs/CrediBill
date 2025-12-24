# Advanced Settings Implementation

## Overview

Implemented fully functional advanced settings with database persistence, change detection, and a save button.

## Changes Made

### 1. Schema Updates (`convex/schema.ts`)

Added four new optional boolean fields to the `apps` table:

```typescript
// Advanced settings (optional with defaults)
allowPlanDowngrades: v.optional(v.boolean()), // default true
requireBillingAddress: v.optional(v.boolean()), // default false
enableProration: v.optional(v.boolean()), // default true
autoSuspendOnFailedPayment: v.optional(v.boolean()), // default true
```

### 2. Backend Updates (`convex/apps.ts`)

#### Updated `getAppSettings` Query

Now returns advanced settings with default values:

```typescript
return {
  // ...existing fields...
  allowPlanDowngrades: app.allowPlanDowngrades ?? true,
  requireBillingAddress: app.requireBillingAddress ?? false,
  enableProration: app.enableProration ?? true,
  autoSuspendOnFailedPayment: app.autoSuspendOnFailedPayment ?? true,
};
```

#### Updated `updateAppSettings` Mutation

Now accepts and saves advanced settings:

```typescript
args: {
  // ...existing args...
  allowPlanDowngrades: v.optional(v.boolean()),
  requireBillingAddress: v.optional(v.boolean()),
  enableProration: v.optional(v.boolean()),
  autoSuspendOnFailedPayment: v.optional(v.boolean()),
}
```

### 3. Frontend Updates (`components/settings-advanced.tsx`)

#### Added Features:

- ✅ **Loading State**: Shows spinner while fetching settings
- ✅ **State Management**: Local state for each switch
- ✅ **Database Sync**: Loads current values from database on mount
- ✅ **Change Detection**: Tracks if any settings changed
- ✅ **Save Button**: Appears only when there are unsaved changes
- ✅ **Disabled States**: Switches disabled while saving
- ✅ **Toast Notifications**: Success/error feedback

#### State Management:

```typescript
const [allowPlanDowngrades, setAllowPlanDowngrades] = useState(true);
const [requireBillingAddress, setRequireBillingAddress] = useState(false);
const [enableProration, setEnableProration] = useState(true);
const [autoSuspendOnFailedPayment, setAutoSuspendOnFailedPayment] =
  useState(true);
const [hasChanges, setHasChanges] = useState(false);
```

#### Change Detection:

```typescript
useEffect(() => {
  if (settings) {
    const changed =
      allowPlanDowngrades !== settings.allowPlanDowngrades ||
      requireBillingAddress !== settings.requireBillingAddress ||
      enableProration !== settings.enableProration ||
      autoSuspendOnFailedPayment !== settings.autoSuspendOnFailedPayment;
    setHasChanges(changed);
  }
}, [
  settings,
  allowPlanDowngrades,
  requireBillingAddress,
  enableProration,
  autoSuspendOnFailedPayment,
]);
```

## Default Values

| Setting                      | Default | Description                              |
| ---------------------------- | ------- | ---------------------------------------- |
| Allow Plan Downgrades        | `true`  | Customers can switch to lower-tier plans |
| Require Billing Address      | `false` | Don't require address by default         |
| Enable Proration             | `true`  | Calculate prorated charges on upgrades   |
| Auto-suspend Failed Payments | `true`  | Suspend access after payment failures    |

## User Flow

1. **Load**: User navigates to Advanced tab
   - Spinner shows while loading
   - Settings fetched from database
   - Switches populated with current values

2. **Edit**: User toggles switches
   - Changes tracked in local state
   - "Save Changes" button appears
   - "You have unsaved changes" message shows

3. **Save**: User clicks "Save Changes"
   - Button shows "Saving..." state
   - Switches disabled during save
   - Settings saved to database
   - Success toast notification
   - "Save Changes" button disappears
   - `hasChanges` reset to false

4. **Navigate Away**: If user has unsaved changes
   - Changes are lost (browser default behavior)
   - Consider adding "unsaved changes" warning in future

## Testing Checklist

### Basic Functionality

- [ ] Load Advanced tab, verify spinner shows
- [ ] Verify switches load with correct values
- [ ] Toggle each switch, verify "Save Changes" appears
- [ ] Click "Save Changes", verify success toast
- [ ] Refresh page, verify changes persisted
- [ ] Verify switches are disabled while saving

### Change Detection

- [ ] Toggle switch ON → OFF, verify save button appears
- [ ] Toggle back to original value, verify save button disappears
- [ ] Toggle multiple switches, verify save button appears
- [ ] Save changes, verify button disappears

### Authorization

- [ ] Try to save as member (should fail with error)
- [ ] Try to save as viewer (should fail with error)
- [ ] Save as admin (should work)
- [ ] Save as owner (should work)

### Edge Cases

- [ ] Load with no app selected (should skip query)
- [ ] Toggle switches rapidly, verify state consistent
- [ ] Save with network error, verify error toast
- [ ] Multiple browser tabs, verify both update after save

## Database Migrations

**No migration needed!** All fields are optional with defaults:

- Existing apps will use default values
- New apps will use default values
- Updates save only changed fields

## Code Example

### Reading Settings

```typescript
const settings = useQuery(api.apps.getAppSettings, { appId });
// settings.allowPlanDowngrades → true (default)
// settings.requireBillingAddress → false (default)
// settings.enableProration → true (default)
// settings.autoSuspendOnFailedPayment → true (default)
```

### Saving Settings

```typescript
await updateSettings({
  appId: selectedApp._id,
  allowPlanDowngrades: false, // Changed from true
  requireBillingAddress: true, // Changed from false
  // Other fields omitted = no change
});
```

## Future Enhancements

1. **Unsaved Changes Warning**: Warn before navigating away
2. **Keyboard Shortcuts**: Cmd/Ctrl+S to save
3. **Auto-save**: Debounced auto-save after changes
4. **Reset Button**: Reset to defaults
5. **Audit Log**: Track who changed what and when
6. **Batch Update**: Update multiple settings at once
7. **Validation**: Add business logic validation

## Known Limitations

1. **No Unsaved Warning**: Browser default behavior on navigate
2. **No Undo**: Once saved, can't undo (refresh to revert unsaved)
3. **No History**: Can't see previous values or who changed them
4. **Single App**: Must save settings per app (no bulk update)

## Performance Notes

- **Query**: Fetches all settings once on mount
- **Updates**: Only changed fields sent to backend
- **Re-renders**: Minimal, only on state changes
- **Network**: One query on mount, one mutation on save

## Security

✅ **Authorization enforced**:

- Only owner/admin can update settings
- All users can view settings
- Backend validation on mutation

✅ **Type safety**:

- TypeScript ensures correct types
- Convex validators on backend
- No invalid values possible

✅ **Error handling**:

- Network errors caught and displayed
- Authorization errors shown to user
- Validation errors prevent save

## Deployment

1. **Deploy Convex schema changes**:

   ```bash
   npx convex dev
   ```

2. **Verify in Convex dashboard**:
   - Check `apps` table has new fields
   - Test query returns default values
   - Test mutation updates fields

3. **Test in browser**:
   - Navigate to Settings → Advanced
   - Toggle switches and save
   - Refresh and verify persistence

## Summary

✅ **Schema updated** with 4 new optional boolean fields
✅ **Backend updated** to read/write advanced settings
✅ **Frontend updated** with full state management
✅ **Change detection** shows save button only when needed
✅ **Loading states** for better UX
✅ **Authorization** enforced (owner/admin only)
✅ **Toast notifications** for feedback
✅ **Default values** for backward compatibility

**Ready to deploy and test!** 🚀
