# Permission System Guide

## Overview

We've implemented a DRY (Don't Repeat Yourself) permission system for app settings using custom hooks and reusable components.

## How to Use

### 1. Import the Hook and Components

```tsx
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import {
  PermissionAwareField,
  PermissionAwareSection,
} from "@/components/ui/permission-aware";
```

### 2. Get Permission Flags in Your Component

```tsx
export default function MySettingsComponent() {
  const {
    canManageApp, // owner, admin
    canManageSettings, // owner, admin
    canManagePlans, // owner, admin
    canManageCustomers, // owner, admin, member
    canManageWebhooks, // owner, admin
    canManageApiKeys, // owner, admin
    userRole, // actual role: owner | admin | member | viewer
  } = useAppPermissions();

  // ... rest of your component
}
```

### 3. Wrap Individual Fields

For single input fields or small groups:

```tsx
<PermissionAwareField
  canEdit={canManageSettings}
  message={getPermissionMessage(["owner", "admin"])}
>
  <Input value={value} onChange={handleChange} disabled={!canManageSettings} />
  <Button disabled={!canManageSettings}>Save</Button>
</PermissionAwareField>
```

### 4. Wrap Entire Sections

For entire card sections with multiple fields:

```tsx
<Card>
  <CardHeader>
    <CardTitle>Webhook Settings</CardTitle>
  </CardHeader>
  <CardContent>
    <PermissionAwareSection
      canEdit={canManageWebhooks}
      message="⚠️ Only owners and admins can manage webhooks."
    >
      {/* All fields here will be disabled with banner at top */}
      <Input disabled={!canManageWebhooks} />
      <Select disabled={!canManageWebhooks} />
      <Button disabled={!canManageWebhooks}>Save</Button>
    </PermissionAwareSection>
  </CardContent>
</Card>
```

## Permission Levels

| Role   | Can Do                                          |
| ------ | ----------------------------------------------- |
| Owner  | Everything + delete organization                |
| Admin  | Manage app, settings, plans, webhooks, API keys |
| Member | Manage customers, subscriptions, invoices       |
| Viewer | View only                                       |

## Components Included

### `useAppPermissions()` Hook

Returns all permission flags and user role.

### `getPermissionMessage(roles)` Function

Generates appropriate warning messages:

- `["owner"]` → "⚠️ Only organization owners..."
- `["owner", "admin"]` → "⚠️ Only owners and admins..."
- `["owner", "admin", "member"]` → "⚠️ Only owners, admins, and members..."

### `<PermissionAwareField>` Component

- Disables children when no permission
- Shows inline warning message below
- Props: `canEdit`, `message` (optional), `className` (optional)

### `<PermissionAwareSection>` Component

- Disables entire section when no permission
- Shows banner alert at top
- Props: `canEdit`, `message` (optional)

## Example: Full Settings File

```tsx
import {
  useAppPermissions,
  getPermissionMessage,
} from "@/hooks/use-app-permissions";
import { PermissionAwareField } from "@/components/ui/permission-aware";

export default function SettingsWebhooks() {
  const { canManageWebhooks } = useAppPermissions();
  const [url, setUrl] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Webhook URL</CardTitle>
      </CardHeader>
      <CardContent>
        <PermissionAwareField
          canEdit={canManageWebhooks}
          message={getPermissionMessage(["owner", "admin"])}
        >
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={!canManageWebhooks}
          />
          <Button disabled={!canManageWebhooks}>Save Webhook</Button>
        </PermissionAwareField>
      </CardContent>
    </Card>
  );
}
```

## Files to Update

Apply this pattern to:

- ✅ `settings-general.tsx` (done)
- ⏳ `settings-billing.tsx`
- ⏳ `settings-webhooks.tsx`
- ⏳ `settings-api-keys-section.tsx`
- ⏳ Plans page (create, edit, delete)
- ⏳ Customers page (create, edit)
- ⏳ Invoices page (create, edit)
