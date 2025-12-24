# API Keys Implementation

## Overview
Implemented a production-grade API key management system with secure hashing, granular permissions, and comprehensive lifecycle management.

## Security Features

### Key Generation
- **Format**: `pk_{environment}_{random32chars}` (e.g., `pk_live_a1b2c3...`)
- **Key ID**: `key_{first16chars}` for database lookups
- **Cryptographically Secure**: Uses `crypto.subtle.digest` with SHA-256
- **Unique**: 32 random hex characters per key

### Storage
- **Hashed Secrets**: Keys are hashed using SHA-256 before storage
- **Never Retrieved**: Full key shown ONLY ONCE at creation
- **Display Format**: `pk_live_abc1••••xyz9` (prefix + suffix only)
- **Verification**: Constant-time comparison via hashing

### Authorization
- **Owner/Admin Only**: Only organization owners and admins can create/revoke keys
- **Membership Checks**: Uses `by_org_user` index for efficient lookups
- **Role Enforcement**: Backend validation on all mutations

## Schema

```typescript
apiKeys: defineTable({
  organizationId: v.id("organizations"),
  appId: v.id("apps"),
  name: v.string(),                    // User-friendly name
  keyId: v.string(),                   // Unique identifier for lookups
  hashedSecret: v.string(),            // SHA-256 hash of the full key
  keyPrefix: v.string(),               // First 12 chars: "pk_live_abc1"
  keySuffix: v.string(),               // Last 4 chars: "xyz9"
  environment: "test" | "live",        // Separate test/production keys
  scopes: string[],                    // ["read", "write", "webhooks", "admin"]
  status: "active" | "revoked",        // Soft delete (revoke, not delete)
  expiresAt?: number,                  // Optional expiration timestamp
  lastUsedAt?: number,                 // Track usage
  createdBy: v.id("users"),            // Audit trail
})
```

**Indexes**:
- `by_keyId`: Fast key verification lookups
- `by_app`: List keys for an app
- `by_org`: Organization-level queries
- `by_status`: Filter active/revoked keys

## API Endpoints

### `createApiKey`
**Mutation** - Create a new API key

**Args**:
- `appId`: App to create key for
- `name`: Descriptive name
- `environment`: "test" or "live"
- `scopes`: Array of permissions
- `expiresAt`: Optional expiration date

**Returns**:
```typescript
{
  success: true,
  apiKeyId: Id<"apiKeys">,
  secret: "pk_live_abc123...",  // Full key - ONLY shown once
  keyPrefix: "pk_live_abc1",
  keySuffix: "xyz9",
  message: "API key created successfully..."
}
```

**Validation**:
- Owner/admin only
- Valid scopes: read, write, webhooks, admin
- At least one scope required
- Expiration must be future date

### `getApiKeysByApp`
**Query** - List all keys for an app

**Returns**: Array of keys (without `hashedSecret`):
```typescript
{
  _id, _creationTime,
  name, keyPrefix, keySuffix,
  environment, scopes, status,
  expiresAt?, lastUsedAt?
}
```

### `revokeApiKey`
**Mutation** - Revoke (soft delete) a key

**Args**: `apiKeyId`

**Effects**:
- Sets `status: "revoked"`
- Key immediately stops working
- Cannot be un-revoked (security best practice)

### `updateApiKeyName`
**Mutation** - Rename a key

**Args**: `apiKeyId`, `name`

### `verifyApiKey`
**Query** - Verify a key (used by your API)

**Args**: `secret` (the full key)

**Returns**:
```typescript
{
  valid: boolean,
  error?: string,  // If invalid
  apiKeyId?: Id<"apiKeys">,
  apiKey?: {
    _id, organizationId, appId,
    environment, scopes
  }
}
```

**Checks**:
1. Key format valid
2. Key exists in database
3. Status is "active" (not revoked)
4. Not expired
5. Secret matches hash

### `updateLastUsed`
**Mutation** - Update last used timestamp

Call this after successful key verification to track usage.

## Available Scopes

- **read**: View data (customers, invoices, subscriptions)
- **write**: Create and modify data
- **webhooks**: Manage webhooks
- **admin**: Full access to all operations

## UI Components

### `CreateApiKeyDialog`
**Features**:
- Responsive (Dialog on desktop, Drawer on mobile)
- Multi-step: Creation form → Display secret once
- Warning alerts about saving the key
- Copy to clipboard functionality
- Scope selection with descriptions
- Environment selector (test/live)
- Expiration options (30/60/90/180/365 days or never)

**UX Flow**:
1. User fills form (name, environment, scopes, expiration)
2. Submits → Key generated
3. Full key displayed with copy button + warning
4. User must copy before closing
5. After close, key never shown again

### `SettingsWebhooks` (Updated)
**Features**:
- Real-time key listing with loading states
- Empty state when no keys exist
- Display format: `pk_live_abc1••••xyz9`
- Environment badges (Test/Live)
- Status badges (Active/Revoked)
- Scope tags
- Last used + expiration dates
- Copy masked key to clipboard
- Revoke action with confirmation dialog

## Usage Example

### Creating a Key (Frontend)
```typescript
const result = await createApiKey({
  appId: selectedApp._id,
  name: "Production Server",
  environment: "live",
  scopes: ["read", "write"],
  expiresAt: Date.now() + (90 * 24 * 60 * 60 * 1000), // 90 days
});

// result.secret contains the full key - show it to user
console.log(result.secret); // pk_live_a1b2c3d4e5f6...
```

### Verifying a Key (API Endpoint)
```typescript
// In your API route handler
const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");

const verification = await ctx.runQuery(api.apiKeys.verifyApiKey, {
  secret: apiKey
});

if (!verification.valid) {
  return new Response(verification.error, { status: 401 });
}

// Check scopes
if (!verification.apiKey.scopes.includes("write")) {
  return new Response("Insufficient permissions", { status: 403 });
}

// Update last used (fire and forget)
ctx.runMutation(api.apiKeys.updateLastUsed, {
  apiKeyId: verification.apiKeyId
});

// Proceed with request...
```

## Security Best Practices

✅ **Implemented**:
- Keys hashed before storage (SHA-256)
- Full key shown only once at creation
- Soft delete (revoke, don't delete)
- Environment separation (test/live)
- Granular scopes/permissions
- Expiration support
- Owner/admin authorization
- Usage tracking (lastUsedAt)
- Constant-time verification

✅ **UI/UX**:
- Big warning when showing secret
- Copy to clipboard functionality
- Masked display after creation
- Confirmation dialogs for destructive actions
- Status indicators (active/revoked/expired)

## Future Enhancements

🔮 **Possible Additions**:
- **Rate Limiting**: Per-key rate limits
- **IP Whitelisting**: Restrict keys to specific IPs
- **Webhook Signatures**: Use keys to sign webhook payloads (HMAC-SHA256)
- **Audit Logs**: Detailed key usage history
- **2FA for Creation**: Require 2FA to create live keys
- **Key Rotation**: Create new key + deprecate old with grace period
- **Usage Analytics**: API calls per key, bandwidth, errors
- **Alerts**: Email on suspicious activity or expiring keys
- **bcrypt**: Upgrade to bcrypt via Node.js action for stronger hashing

## Migration Notes

**For Existing Users**:
- No migration needed - this is a new feature
- Old apps work without API keys
- API keys are optional enhancement

**Database**:
- New table: `apiKeys`
- No changes to existing tables
- Indexes created automatically

## Testing Checklist

- [ ] Create test environment key
- [ ] Create live environment key
- [ ] Verify key in API request
- [ ] Revoke key and verify it stops working
- [ ] Test expiration (create with past date)
- [ ] Test scopes (verify insufficient permissions error)
- [ ] Test as non-owner (should fail)
- [ ] Copy key to clipboard
- [ ] Verify masked display after creation
- [ ] Check lastUsedAt updates after verification

## Documentation for Users

**How to Use API Keys**:

1. Go to Settings → Webhooks tab
2. Scroll to "API Keys" section
3. Click "Create API Key"
4. Fill in details:
   - **Name**: Descriptive name (e.g., "Production Server")
   - **Environment**: Test (for development) or Live (for production)
   - **Permissions**: Select what the key can do
   - **Expiration**: Optional security measure
5. Click "Create Key"
6. **IMPORTANT**: Copy the key now - you won't see it again!
7. Store it securely (password manager, environment variables)
8. Use in API requests:
   ```bash
   curl -H "Authorization: Bearer pk_live_abc123..." \
     https://api.credibill.com/v1/customers
   ```
