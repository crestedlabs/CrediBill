# Plans Page Updates - App Context & Delete Function

## Changes Made

### 1. ✅ Fixed Header to Use App from Context

**File:** `/components/plans-content.tsx`

**Before:**

```tsx
const apps = useQuery(api.apps.getUserApps, {});
const selectedApp = apps?.[0]; // TODO: Add app selector

// Header showing:
Manage subscription plans for {selectedApp?.name}
```

**After:**

```tsx
const { selectedApp } = useApp(); // From context

// Header showing:
Manage subscription plans for {selectedApp?.name}
```

**Benefits:**

- ✅ Uses the globally selected app from AppContext
- ✅ Syncs with app switcher in navigation
- ✅ Shows correct app name when user switches apps
- ✅ Consistent with organization context pattern

---

### 2. ✅ Implemented Delete Plan Functionality

#### Backend Mutation

**File:** `/convex/plans.ts`

Created `deletePlan` mutation with:

- **Authorization checks**: Only owners and admins can delete plans
- **Safety validation**: Prevents deletion if plan has active subscriptions
- **Error handling**: Clear error messages for different scenarios

```typescript
export const deletePlan = mutation({
  args: {
    planId: v.id("plans"),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate user
    // 2. Get plan and verify existence
    // 3. Verify user has owner/admin access to organization
    // 4. Check for active subscriptions
    // 5. Delete plan if safe
  },
});
```

**Safety Features:**

- ✅ Can't delete plan with active subscriptions
- ✅ Shows helpful error: "Cannot delete plan with X active subscription(s). Please cancel or migrate subscriptions first."
- ✅ Only owners and admins can delete
- ✅ Requires explicit user confirmation

#### Frontend Implementation

**File:** `/components/plans-content.tsx`

Updated `PlanActionMenu` component:

- **Confirmation dialog**: Native browser confirm before deletion
- **Loading state**: Shows "Deleting..." during operation
- **Toast notifications**: Success/error feedback
- **Error handling**: Displays specific error messages

**User Flow:**

1. User clicks ⋮ menu on plan card
2. User clicks "Delete plan"
3. Browser shows confirmation: "Are you sure you want to delete '[Plan Name]'? This action cannot be undone."
4. User confirms
5. Plan is deleted (if no active subscriptions)
6. Success toast: "Plan deleted successfully - [Plan Name] has been removed"
7. Plan card disappears from UI (Convex reactivity)

---

## Testing Checklist

### App Context Integration

- [ ] Switch to different app in app switcher
- [ ] Navigate to `/plans`
- [ ] Verify header shows correct app name: "Manage subscription plans for [App Name]"
- [ ] Create a plan → should be created for the selected app
- [ ] Switch to another app → plans should update to show that app's plans

### Delete Functionality

- [ ] **Happy Path**: Delete a plan with no subscriptions
  - Click ⋮ menu
  - Click "Delete plan"
  - Confirm deletion
  - Verify success toast appears
  - Verify plan disappears from list
- [ ] **With Active Subscriptions**: Try to delete plan with subscriptions
  - Should show error: "Cannot delete plan with X active subscription(s)"
  - Plan should NOT be deleted
- [ ] **Permission Check**: Try as non-owner/non-admin (if possible)
  - Should show error: "Only owners and admins can delete plans"
- [ ] **Cancel Flow**: Start delete but cancel
  - Click ⋮ menu
  - Click "Delete plan"
  - Click "Cancel" in confirmation
  - Plan should remain (no action taken)

---

## Code Structure

### Components Updated

1. **PlansManager**
   - Now uses `useApp()` hook
   - Removed independent app fetching
   - Uses `selectedApp` from context

2. **PlanCard**
   - Passes `planId` and `planName` to action menu
   - No changes to display logic

3. **PlanActionMenu** (new implementation)
   - Accepts `planId` and `planName` props
   - Uses `useMutation(api.plans.deletePlan)`
   - Manages loading state with `useState`
   - Shows confirmation dialog
   - Handles success/error with toast notifications

### Backend Updates

1. **plans.ts** - Added `deletePlan` mutation
   - Full authorization flow
   - Active subscription check
   - Safe deletion with error handling

---

## Error Messages

### User-Facing Errors:

1. **Plan not found**: "Plan not found"
2. **No permission**: "Only owners and admins can delete plans"
3. **Has subscriptions**: "Cannot delete plan with X active subscription(s). Please cancel or migrate subscriptions first."
4. **Unauthorized**: "Unauthorized" (if not logged in)

### Success Messages:

- **Plan deleted**: "Plan deleted successfully - [Plan Name] has been removed"

---

## Future Enhancements (Not Implemented)

These features are stubbed in the UI but not yet functional:

- [ ] **Edit plan** - Opens edit dialog/form
- [ ] **Archive plan** - Soft delete (status = "archived")
- [ ] **Restore archived plan** - Unarchive functionality
- [ ] **Bulk delete** - Select multiple plans to delete at once
- [ ] **Delete confirmation modal** - Replace browser confirm with custom modal

---

## Technical Notes

### Convex Reactivity

- When a plan is deleted, Convex automatically updates all queries
- The `plans` array in `PlansManager` updates instantly
- UI re-renders automatically to remove deleted plan
- No manual refresh needed!

### TypeScript Types

- Used `Id<"plans">` for type safety
- Props properly typed in `PlanActionMenu`
- Mutation args validated by Convex schema

### UX Considerations

- Native `confirm()` is simple but not customizable
- Consider replacing with shadcn AlertDialog for:
  - Better styling
  - More control over message
  - Custom buttons
  - Better mobile experience

---

**Summary:** Plans page now correctly uses the app from context, and users can safely delete plans with proper authorization and validation! 🎉
