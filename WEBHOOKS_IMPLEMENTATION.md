# Webhooks Implementation

## Overview

Implemented fully functional webhooks section in app settings following the same patterns as the general and billing tabs. API keys section remains as dummy UI as requested (no secure store).

## Files Created/Modified

### Backend (Convex)

#### `convex/schema.ts`

- Added `webhooks` table with fields:
  - `organizationId`: Reference to organization
  - `appId`: Reference to app
  - `url`: Webhook endpoint URL
  - `events`: Array of event types to subscribe to
  - `status`: "active" or "inactive"
  - `secret`: Optional secret for signature verification
  - `description`: Optional description
- Indexes: `by_app`, `by_org`, `by_status`

#### `convex/webhooks.ts` (New)

Created mutations and queries with owner/admin authorization:

- `getWebhooksByApp` - Query to fetch webhooks for a specific app
- `createWebhook` - Create new webhook (validates URL format, requires at least one event)
- `deleteWebhook` - Delete webhook
- `updateWebhookStatus` - Toggle webhook active/inactive
- `updateWebhook` - Update webhook details (URL, events, description)

All mutations enforce owner/admin authorization via `organizationMembers` table.

### Frontend Components

#### `components/add-webhook-dialog.tsx` (New)

Responsive dialog for adding webhooks:

- **Desktop**: Full dialog (≥768px)
- **Mobile**: Bottom drawer (<768px)
- Features:
  - URL input with validation
  - Multi-select event checkboxes (11 predefined events)
  - Status selector (active/inactive)
  - Optional description textarea
  - Loading states and validation
  - Toast notifications

#### `components/settings-webhooks.tsx` (Modified)

Updated webhooks section to be fully functional:

- Real-time data fetching with `useQuery`
- Loading spinner while fetching
- Empty state when no webhooks exist
- Webhook list displaying:
  - URL in code block
  - Description (if provided)
  - Status badge (active/inactive)
  - Events list
- Dropdown actions:
  - Activate/Deactivate webhook
  - Delete webhook (with confirmation dialog)
- Add Webhook button opens responsive dialog
- API Keys section unchanged (remains dummy UI)

#### `hooks/use-mobile.ts` (Modified)

Added `useMediaQuery` hook for responsive dialog/drawer switching.

## Webhook Events

Available events for subscription:

- `subscription.created`
- `subscription.updated`
- `subscription.cancelled`
- `invoice.created`
- `invoice.paid`
- `invoice.failed`
- `payment.succeeded`
- `payment.failed`
- `refund.created`
- `customer.created`
- `customer.updated`

## Authorization

All webhook mutations enforce owner/admin access:

- Queries require organization membership
- Mutations require owner or admin role
- Enforced at backend level (not client-side)

## UX Patterns

Follows same patterns as general/billing tabs:

- Loading states with spinners
- Toast notifications for success/error
- Change detection (in form)
- Disabled states during operations
- Confirmation dialogs for destructive actions
- Empty states with helpful messaging

## Testing

To test:

1. Navigate to app settings → Webhooks tab
2. Click "Add Webhook"
3. Enter URL, select events, set status
4. Save and verify webhook appears in list
5. Test activate/deactivate toggle
6. Test delete with confirmation
7. Verify responsive behavior (resize browser)

## Notes

- Checkbox component was added via shadcn CLI
- API types regenerated with `npx convex dev`
- All TypeScript errors resolved
- API keys section intentionally left as dummy UI (no secure store implementation)
