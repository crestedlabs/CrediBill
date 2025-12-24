# API Keys Testing Guide

## Quick Test Checklist

### 1. Deploy Schema ✓

```bash
npx convex dev
```

Wait for "Convex functions ready!" message.

### 2. Test API Key Creation

**Steps**:

1. Navigate to: `http://localhost:3000/settings`
2. Click "Webhooks" tab
3. Scroll to "API Keys" section
4. Click "Create API Key" button

**Form**:

- Name: `Test Key 1`
- Environment: `Test`
- Permissions: Check `read` and `write`
- Expires: `Never` (or select a date)
- Click "Create Key"

**Expected**:

- ✅ Dialog shows success with full key: `pk_test_abc123...`
- ✅ Big warning: "Save this key now!"
- ✅ Copy button works
- ✅ After clicking "Done", key appears in list as masked: `pk_test_abc1••••xyz9`

### 3. Verify Key Display

**Check**:

- ✅ Key shows with "Test" badge (blue)
- ✅ Scope badges show: "read", "write"
- ✅ Created date shows
- ✅ "Last used" says "Never" (or shows date if used)
- ✅ No expiration warning if set to "Never"
- ✅ Copy button on the card works (copies masked key)

### 4. Test Revoke

**Steps**:

1. Click dropdown menu on key card
2. Select "Revoke Key"
3. Confirmation dialog appears with warning
4. Click "Revoke"

**Expected**:

- ✅ Key status changes to "Revoked" (red badge)
- ✅ Key still visible in list
- ✅ Cannot be used for API requests

### 5. Test Authorization

**As Non-Owner**:

- ❌ Should not see API Keys section (or get error if trying to create)
- Owner/Admin only feature

### 6. Test API Verification (Backend)

**In Convex Dashboard** (https://dashboard.convex.dev):

```javascript
// Test with the key you created
const result = await api.apiKeys.verifyApiKey.run({
  secret: "pk_test_abc123...", // Paste your actual key
});

console.log(result);
// Should return: { valid: true, apiKeyId: "...", apiKey: {...} }
```

**Test with wrong key**:

```javascript
const result = await api.apiKeys.verifyApiKey.run({
  secret: "pk_test_wrongkey123",
});

console.log(result);
// Should return: { valid: false, error: "Invalid API key" }
```

**Test with revoked key**:

```javascript
// First revoke the key in UI, then test
const result = await api.apiKeys.verifyApiKey.run({
  secret: "pk_test_abc123...", // Your revoked key
});

console.log(result);
// Should return: { valid: false, error: "This API key has been revoked" }
```

### 7. Test Different Environments

**Create Live Key**:

- Name: `Production Key`
- Environment: `Live`
- Permissions: All four (read, write, webhooks, admin)
- Expires: `90 days`

**Expected**:

- ✅ Key format: `pk_live_...`
- ✅ "Live" badge (green)
- ✅ Shows expiration date
- ✅ If within 30 days of expiring, shows orange warning

### 8. Test Expiration

**Create Expired Key** (for testing):

```javascript
// In Convex dashboard, run:
const result = await api.apiKeys.createApiKey.run({
  appId: "...", // Your app ID
  name: "Expired Test",
  environment: "test",
  scopes: ["read"],
  expiresAt: Date.now() - 1000, // 1 second ago
});

// Then verify it fails:
const verify = await api.apiKeys.verifyApiKey.run({
  secret: result.secret,
});

console.log(verify);
// Should return: { valid: false, error: "This API key has expired" }
```

### 9. Test Scope Validation

**Create Key with Only "read"**:

- Verify it works for read operations
- Verify write operations should check scopes and reject if not included

### 10. Test Empty State

**Steps**:

1. Revoke all keys (or use fresh app)
2. Check API Keys section

**Expected**:

- ✅ Shows key icon
- ✅ Message: "No API keys created yet"
- ✅ Sub-message about creating keys for API access

## Common Issues

### "You do not have access to this app"

- **Cause**: Authorization check failing
- **Fix**: Ensure you're owner/admin of the organization
- **Check**: `convex/apiKeys.ts` uses `getCurrentUser()` correctly

### Can't see full key after creation

- **Expected**: Keys only show once!
- **Solution**: Create a new key

### Key verification always fails

- **Check**: Key format is correct: `pk_{env}_{32chars}`
- **Check**: Key wasn't revoked
- **Check**: Key hasn't expired
- **Debug**: Check Convex logs in dashboard

### Dialog doesn't close after creating key

- **Check**: Network request succeeded
- **Check**: No console errors
- **Fix**: Check mutation error handling

## Success Metrics

All tests passing means:

- ✅ Secure key generation working
- ✅ SHA-256 hashing implemented
- ✅ Authorization enforced
- ✅ UI properly shows/hides secrets
- ✅ Revocation works immediately
- ✅ Expiration respected
- ✅ Scopes can be verified
- ✅ Usage tracking ready

## Next Steps After Testing

Once all tests pass:

1. **Document for Team**: Share usage instructions
2. **Build API Endpoints**: Use keys in actual API routes
3. **Add Rate Limiting**: Protect against abuse
4. **Setup Monitoring**: Track key usage patterns
5. **Consider bcrypt**: For production, upgrade to bcrypt
6. **Add Webhooks**: Use keys to sign webhook payloads

## Quick Debug Commands

```bash
# Check Convex logs
cd /home/allan/Desktop/Projects/webapps/credibill
npx convex logs

# List all keys for debugging
# In Convex dashboard:
await ctx.db.query("apiKeys").collect()

# Check a specific key
await ctx.db.query("apiKeys")
  .withIndex("by_keyId", q => q.eq("keyId", "key_abc123..."))
  .unique()
```

## Production Checklist

Before deploying to production:

- [ ] Test all creation/revoke flows
- [ ] Verify authorization (only owner/admin)
- [ ] Test key verification in actual API
- [ ] Check expiration logic works
- [ ] Confirm scopes are enforced
- [ ] Add error monitoring
- [ ] Document for users
- [ ] Consider bcrypt upgrade
- [ ] Add rate limiting
- [ ] Setup alerts for key events
