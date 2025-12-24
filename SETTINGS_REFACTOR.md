# Settings Refactor & Security Enhancements

## Overview

This update refactors the settings-webhooks component into smaller, modular sections and implements comprehensive security measures including proper authorization checks and cascade deletion.

## Changes Summary

### 1. Component Refactoring

#### Before

- **settings-webhooks.tsx**: 453 lines, handling both API keys and webhooks

#### After

- **settings-webhooks.tsx**: 18 lines, composition component
- **settings-api-keys-section.tsx**: 226 lines, API keys management
- **settings-webhooks-section.tsx**: 226 lines, webhooks management

**Benefits**:

- ✅ Improved maintainability
- ✅ Better code organization
- ✅ Easier testing and debugging
- ✅ Reusable components
- ✅ Clearer separation of concerns

### 2. Advanced Settings Tab Enhancement

#### Updated: `components/settings-advanced.tsx`

**New Features**:

- ✅ Working delete app functionality
- ✅ Confirmation dialog with app name verification
- ✅ Detailed list of what will be deleted
- ✅ Loading states during deletion
- ✅ Automatic redirect after deletion

**UI Improvements**:

- Red border on danger zone card
- Clear warning about cascade deletion
- Type-to-confirm pattern for safety
- Disabled state while processing

### 3. Cascade Deletion Implementation

#### Added: `convex/apps.ts::deleteApp` mutation

**Deletion Order** (to respect foreign key relationships):

1. API Keys (webhooks and apps reference)
2. Webhooks (apps reference)
3. Payments (invoices reference)
4. Invoices (subscriptions reference)
5. Usage Summaries (subscriptions reference)
6. Usage Events (subscriptions reference)
7. Subscriptions (customers and plans reference)
8. Plans (apps reference)
9. Customers (apps reference)
10. App itself

**Returns**:

```typescript
{
  success: true,
  message: "App and all associated data deleted successfully",
  deletedCounts: {
    apiKeys: number,
    webhooks: number,
    payments: number,
    invoices: number,
    usageSummaries: number,
    usageEvents: number,
    subscriptions: number,
    plans: number,
    customers: number,
  }
}
```

**Authorization**:

- ✅ Owner/admin only
- ✅ Organization membership verified
- ✅ User authentication required

### 4. Authorization Audit

All settings mutations now enforce owner/admin access:

#### ✅ API Keys (`convex/apiKeys.ts`)

- `createApiKey`: Owner/admin only
- `revokeApiKey`: Owner/admin only
- `updateApiKeyName`: Owner/admin only
- `getApiKeysByApp`: Any member (read-only)

#### ✅ Webhooks (`convex/webhooks.ts`)

- `createWebhook`: Owner/admin only
- `deleteWebhook`: Owner/admin only
- `updateWebhookStatus`: Owner/admin only
- `updateWebhook`: Owner/admin only
- `getWebhooksByApp`: Any member (read-only)

#### ✅ App Settings (`convex/apps.ts`)

- `updateAppSettings`: Owner/admin only (general & billing)
- `deleteApp`: Owner/admin only (advanced)
- `getAppSettings`: Any member (read-only)

#### ✅ Authorization Pattern (Consistent across all mutations)

```typescript
// 1. Get current user
const user = await getCurrentUser(ctx);
if (!user) throw new Error("Unauthorized");

// 2. Get the resource
const resource = await ctx.db.get(resourceId);
if (!resource) throw new Error("Resource not found");

// 3. Verify membership
const membership = await ctx.db
  .query("organizationMembers")
  .withIndex("by_org_user", (q) =>
    q.eq("organizationId", resource.organizationId).eq("userId", user._id)
  )
  .unique();

if (!membership) {
  throw new Error("Access denied");
}

// 4. Check role (for mutations)
if (membership.role !== "owner" && membership.role !== "admin") {
  throw new Error("Only owners and admins can perform this action");
}
```

### 5. Data Integrity

**Orphaned Data Prevention**:

- ✅ No orphaned API keys when app is deleted
- ✅ No orphaned webhooks when app is deleted
- ✅ No orphaned customers when app is deleted
- ✅ No orphaned subscriptions when app is deleted
- ✅ No orphaned invoices when app is deleted
- ✅ No orphaned payments when app is deleted
- ✅ No orphaned usage events when app is deleted
- ✅ No orphaned plans when app is deleted

**Database Indexes Used**:

- `by_app` index for fast lookups
- `by_org_user` composite index for authorization
- Filter queries where indexes don't exist (usageEvents, usageSummaries)

## File Structure

```
components/
├── settings-webhooks.tsx          (18 lines) - Composition component
├── settings-api-keys-section.tsx  (226 lines) - API keys UI
├── settings-webhooks-section.tsx  (226 lines) - Webhooks UI
└── settings-advanced.tsx          (174 lines) - Updated with delete

convex/
├── apps.ts                        (390+ lines) - Added deleteApp mutation
├── apiKeys.ts                     (370+ lines) - Already secured
└── webhooks.ts                    (268+ lines) - Already secured
```

## Security Checklist

- [x] All mutations require authentication
- [x] All write operations require owner/admin role
- [x] Read operations require organization membership
- [x] Cascade deletion prevents orphaned data
- [x] Confirmation dialogs for destructive actions
- [x] Type-to-confirm for app deletion
- [x] Loading states prevent double-submission
- [x] Error handling with user-friendly messages

## User Roles Matrix

| Action                  | Owner | Admin | Member | Viewer |
| ----------------------- | ----- | ----- | ------ | ------ |
| View settings           | ✅    | ✅    | ✅     | ✅     |
| Update general settings | ✅    | ✅    | ❌     | ❌     |
| Update billing settings | ✅    | ✅    | ❌     | ❌     |
| Create API keys         | ✅    | ✅    | ❌     | ❌     |
| Revoke API keys         | ✅    | ✅    | ❌     | ❌     |
| Create webhooks         | ✅    | ✅    | ❌     | ❌     |
| Update webhooks         | ✅    | ✅    | ❌     | ❌     |
| Delete webhooks         | ✅    | ✅    | ❌     | ❌     |
| Delete app              | ✅    | ✅    | ❌     | ❌     |

## Testing Checklist

### API Keys

- [ ] Create API key as owner
- [ ] Create API key as admin
- [ ] Try to create API key as member (should fail)
- [ ] Revoke API key
- [ ] Delete app, verify API keys are deleted

### Webhooks

- [ ] Create webhook as owner
- [ ] Create webhook as admin
- [ ] Try to create webhook as member (should fail)
- [ ] Toggle webhook status
- [ ] Delete webhook
- [ ] Delete app, verify webhooks are deleted

### App Deletion

- [ ] Try to delete without typing app name (button disabled)
- [ ] Type wrong app name (should show error)
- [ ] Type correct app name and delete
- [ ] Verify all related data is deleted:
  - [ ] API keys
  - [ ] Webhooks
  - [ ] Customers
  - [ ] Subscriptions
  - [ ] Plans
  - [ ] Invoices
  - [ ] Payments
  - [ ] Usage events
- [ ] Verify redirect to /apps page

### Authorization

- [ ] Try to access settings as non-member (should fail)
- [ ] Try to update settings as member (should fail)
- [ ] Try to update settings as viewer (should fail)
- [ ] Update settings as admin (should work)
- [ ] Update settings as owner (should work)

## Deployment Notes

1. **Deploy convex changes first**:

   ```bash
   npx convex dev
   ```

   This will:
   - Add the `deleteApp` mutation
   - Ensure all indexes exist

2. **Test in development** before production:
   - Create a test app
   - Add test data (customers, subscriptions, webhooks, API keys)
   - Delete the test app
   - Verify all data is removed

3. **Database backup** (recommended):
   - For production, consider backing up before enabling delete functionality
   - Convex provides automatic backups, but verify your backup strategy

## Known Limitations

1. **Large datasets**: Deleting apps with thousands of records may take time
   - Consider adding pagination or batch deletion for very large apps
   - Current implementation processes all records sequentially

2. **No soft delete**: Apps are hard-deleted, not archived
   - Consider adding `status: "deleted"` instead if you need recovery
   - Current implementation is permanent deletion

3. **No audit trail**: Deletion is logged to Convex logs but not in database
   - Consider adding an `auditLogs` table for compliance requirements

## Future Enhancements

1. **Soft Delete**: Add archived status instead of permanent deletion
2. **Audit Logs**: Track all destructive operations in database
3. **Export Before Delete**: Allow downloading app data before deletion
4. **Scheduled Deletion**: Mark for deletion, execute after N days
5. **Background Jobs**: Use Convex scheduled functions for large deletions
6. **Rollback Protection**: Add transaction-like rollback if any step fails

## Migration Guide

No database migration needed! All changes are backwards compatible:

- New components use existing data structures
- New mutation added (doesn't affect existing code)
- All existing features continue to work

Simply deploy and start using the new features.
