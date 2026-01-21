# Svix Webhook Integration - Setup Guide

## Overview

This guide covers the setup required for the Svix webhook integration in CrediBill.

## Prerequisites

1. A Svix account ([sign up at svix.com](https://www.svix.com))
2. Access to your Convex dashboard for environment variable configuration

## Step 1: Get Your Svix API Keys

### Option 1: Using Svix Cloud (Recommended for Production)

1. Go to [dashboard.svix.com](https://dashboard.svix.com)
2. Sign in or create an account
3. Navigate to **Settings** → **API Keys**
4. You'll see two types of API keys:
   - **Test Mode Key** - For development and testing
   - **Live Mode Key** - For production

5. Copy both keys (they start with `sk_test_` and `sk_live_`)

### Option 2: Self-Hosted Svix (Advanced)

If you're self-hosting Svix:

1. Follow [Svix self-hosting guide](https://docs.svix.com/self-hosting)
2. Generate API keys from your self-hosted instance
3. Note your custom API endpoint URL

## Step 2: Configure Convex Environment Variables

### Add Variables to Convex

1. Go to your [Convex Dashboard](https://dashboard.convex.dev)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add the following variables:

```bash
# Required: Svix API Keys
SVIX_API_KEY_TEST=sk_test_your_test_api_key_here
SVIX_API_KEY_LIVE=sk_live_your_live_api_key_here
```

### Alternative: Using Convex CLI

You can also set these via the Convex CLI:

```bash
# Set test mode key
npx convex env set SVIX_API_KEY_TEST sk_test_your_test_api_key_here

# Set live mode key
npx convex env set SVIX_API_KEY_LIVE sk_live_your_live_api_key_here
```

## Step 3: Verify Installation

The Svix SDK is already included in your `package.json`:

```json
{
  "dependencies": {
    "svix": "^1.82.0"
  }
}
```

If you need to update or reinstall:

```bash
npm install svix@latest
```

## Step 4: Test Connection

After setting up environment variables, the system will automatically test the connection when:

1. Creating a new app (Svix application will be created)
2. Configuring webhooks (Svix endpoint will be created)

You can also test manually by running the connection test (this will be available in Step 1 completion).

## Security Best Practices

### 🔒 Keep Your API Keys Safe

1. **Never commit API keys** to version control
2. **Use different keys** for test and production
3. **Rotate keys periodically** (Svix dashboard → API Keys → Rotate)
4. **Limit key permissions** if using custom roles

### 🔄 Key Rotation

If you need to rotate your Svix API keys:

1. Generate new keys in Svix dashboard
2. Update environment variables in Convex
3. Redeploy your Convex functions (happens automatically)
4. Revoke old keys in Svix dashboard after verification

## Troubleshooting

### Error: "Svix API key not configured"

**Problem:** Environment variables are not set

**Solution:**

1. Verify variables are set in Convex dashboard
2. Check spelling: `SVIX_API_KEY_TEST` and `SVIX_API_KEY_LIVE`
3. Redeploy Convex functions: `npx convex deploy`

### Error: "Authentication failed"

**Problem:** API key is invalid or expired

**Solution:**

1. Verify the key is correct (starts with `sk_test_` or `sk_live_`)
2. Check the key hasn't been revoked in Svix dashboard
3. Ensure you're using the right key for the mode (test vs live)

### Error: "Failed to create Svix application"

**Problem:** Network issues or Svix service unavailable

**Solution:**

1. Check [Svix Status Page](https://status.svix.com)
2. Verify your network allows outbound HTTPS to `api.svix.com`
3. Check Convex function logs for detailed error messages

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     CrediBill (Convex)                       │
│                                                              │
│  Environment Variables:                                      │
│  - SVIX_API_KEY_TEST  = sk_test_...                         │
│  - SVIX_API_KEY_LIVE  = sk_live_...                         │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /convex/lib/svix.ts                                   │ │
│  │  - getSvixClient(mode)                                 │ │
│  │  - createSvixApplication()                             │ │
│  │  - createSvixEndpoint()                                │ │
│  │  - sendSvixMessage()                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTPS API Calls
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    Svix Service                              │
│                    (api.svix.com)                            │
│                                                              │
│  - Application Management                                    │
│  - Endpoint Management                                       │
│  - Message Delivery                                          │
│  - Automatic Retries                                         │
│  - Signature Generation                                      │
│  - Dashboard UI                                              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Webhook Delivery
                          ▼
┌─────────────────────────────────────────────────────────────┐
│             Customer Webhook Endpoints                       │
│             (Your SaaS Applications)                         │
└─────────────────────────────────────────────────────────────┘
```

## What's Next?

After completing this setup:

1. ✅ **Step 1 Complete** - Svix client configured
2. ⏭️ **Step 2** - Schema migration (add Svix ID fields)
3. ⏭️ **Step 3** - Event type definitions
4. ⏭️ **Step 4** - Application lifecycle management
5. ⏭️ **Step 5** - Endpoint management
6. ⏭️ **Step 6** - Event delivery
7. ⏭️ **Step 7** - Dashboard access
8. ⏭️ **Step 8** - UI updates
9. ⏭️ **Step 9** - Deprecate old system
10. ⏭️ **Step 10** - Testing & docs

## Additional Resources

- [Svix Documentation](https://docs.svix.com)
- [Svix Node.js SDK](https://github.com/svix/svix-webhooks/tree/main/javascript)
- [Svix API Reference](https://api.svix.com/docs)
- [Webhook Best Practices](https://docs.svix.com/receiving/introduction)

## Support

If you encounter issues:

1. Check Convex function logs in your dashboard
2. Check [Svix Status](https://status.svix.com)
3. Review error messages in the console
4. Contact Svix support if needed

---

**Status:** ✅ Step 1 Complete - Ready for Step 2!
