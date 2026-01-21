# Svix Webhook Integration - Testing Guide

## Overview

This guide provides comprehensive testing procedures for the Svix webhook integration in CrediBill.

## Prerequisites

- ✅ All 10 implementation steps completed
- ✅ Svix API keys configured in Convex environment variables
- ✅ At least one CrediBill app created
- ✅ Webhook endpoint URL available for testing

## Test Environment Setup

### 1. Local Webhook Testing Setup

For local testing, you'll need a way to receive webhooks. Choose one:

#### Option A: Use webhook.site (Quick Testing)

1. Go to [https://webhook.site](https://webhook.site)
2. Copy your unique URL (e.g., `https://webhook.site/your-unique-id`)
3. Use this URL in CrediBill webhook configuration

#### Option B: Use ngrok (Recommended for Development)

```bash
# Install ngrok
npm install -g ngrok

# Start your local server (example: Express on port 3000)
node your-local-server.js

# Expose your local server
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

#### Option C: Use Svix CLI (Best for Testing)

```bash
# Install Svix CLI
npm install -g svix

# Listen for webhooks locally
svix listen http://localhost:3000/webhooks

# This creates a temporary URL and forwards webhooks to your local server
```

## Test Scenarios

### Test 1: App Creation and Svix Application Lifecycle

**Objective:** Verify that creating a CrediBill app automatically creates a Svix application.

**Steps:**

1. Create a new CrediBill app through the UI
2. Check that the app is created successfully
3. Verify `svixAppId` is populated in the database

**Expected Results:**

- ✅ App created with status `active`
- ✅ `svixAppId` field populated (format: `app_xxx`)
- ✅ No errors in Convex logs
- ✅ Svix application visible in Svix dashboard

**Validation:**

```typescript
// Check in Convex dashboard data browser
// apps table → find your app → verify svixAppId field exists
```

**Troubleshooting:**

- If `svixAppId` is null: Check Convex logs for Svix API errors
- If creation fails: Verify SVIX_API_KEY_TEST is correct

---

### Test 2: Webhook Endpoint Configuration

**Objective:** Verify webhook endpoint can be configured through Svix.

**Steps:**

1. Navigate to Settings → Webhooks
2. Enter your webhook URL (must be HTTPS)
3. Click "Save Configuration"
4. Verify webhook secret is displayed

**Expected Results:**

- ✅ Webhook URL saved successfully
- ✅ Webhook secret displayed (starts with `whsec_`)
- ✅ Success message shown
- ✅ Svix info banner displayed

**Validation:**

```typescript
// In Convex dashboard, check webhooks table
// Should see entry with:
// - url: your webhook URL
// - secret: generated secret
// - svixEndpointId: endpoint_xxx
```

**Troubleshooting:**

- If HTTPS validation fails: Ensure URL starts with `https://`
- If endpoint creation fails: Check Convex logs for Svix errors

---

### Test 3: Test Webhook Delivery

**Objective:** Verify test webhooks are sent through Svix.

**Steps:**

1. Configure a webhook URL (use webhook.site or ngrok)
2. Click "Send Test" button
3. Check your webhook receiver for the test payload

**Expected Payload:**

```json
{
  "type": "test.webhook",
  "data": {
    "message": "This is a test webhook from CrediBill",
    "timestamp": "2026-01-20T12:34:56.789Z",
    "app_id": "j1234567890abcdef",
    "test": true
  },
  "event_id": "evt_xxx",
  "created_at": "2026-01-20T12:34:56.789Z"
}
```

**Expected Headers:**

```
Content-Type: application/json
svix-id: msg_xxx
svix-timestamp: 1706097296
svix-signature: v1,signature_here
User-Agent: Svix-Webhooks/1.x
```

**Expected Results:**

- ✅ Test webhook received at your endpoint
- ✅ Svix signature headers present
- ✅ Payload matches expected structure
- ✅ Success message in UI

**Troubleshooting:**

- If no webhook received: Check URL is accessible (test with curl)
- If signature verification fails: Ensure using correct secret from UI

---

### Test 4: Real Event Webhook Delivery

**Objective:** Verify real events trigger webhooks through Svix.

**Steps:**

1. Configure webhook endpoint
2. Create a subscription (triggers `subscription.created`)
3. Process a successful payment (triggers `subscription.activated`)
4. Check webhook receiver for both events

**Expected Events:**

#### subscription.created

```json
{
  "type": "subscription.created",
  "data": {
    "subscription": {
      "id": "j1234567890abcdef",
      "customer_id": "j2345678901bcdefg",
      "plan_id": "j3456789012cdefgh",
      "status": "pending_payment",
      "trial_start": null,
      "trial_end": null,
      "created_at": "2026-01-20T12:34:56.789Z"
    }
  },
  "event_id": "evt_xxx",
  "created_at": "2026-01-20T12:34:56.789Z"
}
```

#### subscription.activated

```json
{
  "type": "subscription.activated",
  "data": {
    "subscription": {
      "id": "j1234567890abcdef",
      "status": "active",
      "activated_at": "2026-01-20T12:35:30.123Z"
    },
    "payment": {
      "id": "j4567890123defghi",
      "amount": 5000,
      "currency": "ugx"
    }
  },
  "event_id": "evt_yyy",
  "created_at": "2026-01-20T12:35:30.123Z"
}
```

**Expected Results:**

- ✅ Both webhooks received in correct order
- ✅ All required fields present in payload
- ✅ Svix signatures valid
- ✅ Delivery logged in outgoingWebhookLogs table

**Troubleshooting:**

- If events missing: Check payment provider webhook processing
- If order wrong: Check Convex scheduler timing

---

### Test 5: Webhook Dashboard Access

**Objective:** Verify customers can access Svix dashboard for debugging.

**Steps:**

1. Configure webhook endpoint
2. Send test webhook
3. Click "View Dashboard" button
4. Verify dashboard opens with webhook data

**Expected Results:**

- ✅ Dashboard URL generated (expires in 1 hour)
- ✅ New window/tab opens with Svix dashboard
- ✅ Test webhook visible in dashboard
- ✅ Can see delivery attempts, responses, timing

**Dashboard Features to Verify:**

- Event list with timestamps
- Delivery attempts (success/failure)
- Response codes and bodies
- Retry attempts (if any)
- Endpoint configuration
- Event filtering

**Troubleshooting:**

- If dashboard link fails: Check app has svixAppId
- If access denied: Regenerate dashboard URL (1-hour expiry)

---

### Test 6: Webhook Retry Behavior

**Objective:** Verify Svix automatically retries failed deliveries.

**Steps:**

1. Configure webhook to a failing endpoint (e.g., `https://httpstat.us/500`)
2. Trigger an event (create subscription)
3. Check Svix dashboard for retry attempts

**Expected Results:**

- ✅ Initial delivery fails (500 error)
- ✅ Svix automatically schedules retries
- ✅ Retry schedule follows exponential backoff
- ✅ Dashboard shows all retry attempts
- ✅ Eventually marked as failed after max retries

**Svix Retry Schedule:**

- Attempt 1: Immediate
- Attempt 2: ~5 minutes later
- Attempt 3: ~30 minutes later
- Attempt 4: ~2 hours later
- Attempt 5: ~5 hours later

**Validation:**

Check Svix dashboard:

- Navigate to the failed message
- View "Attempts" tab
- Verify retry timing matches schedule

**Troubleshooting:**

- If no retries: Verify endpoint truly failed (check response code)
- If retries stop early: Check Svix plan limits

---

### Test 7: Signature Verification

**Objective:** Verify webhook signatures can be verified using Svix SDK.

**Sample Verification Code (Node.js):**

```javascript
const { Webhook } = require("svix");

// Your webhook endpoint handler
app.post("/webhooks/credibill", (req, res) => {
  const webhookSecret = "whsec_your_secret_from_credibill_ui";

  // Get Svix signature headers
  const svixId = req.headers["svix-id"];
  const svixTimestamp = req.headers["svix-timestamp"];
  const svixSignature = req.headers["svix-signature"];

  // Verify the signature
  const wh = new Webhook(webhookSecret);

  try {
    const payload = wh.verify(JSON.stringify(req.body), {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });

    // Signature is valid, process the webhook
    console.log("Valid webhook:", payload);

    // Process based on event type
    switch (payload.type) {
      case "subscription.created":
        handleSubscriptionCreated(payload.data);
        break;
      case "subscription.activated":
        handleSubscriptionActivated(payload.data);
        break;
      // ... other event types
    }

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Invalid signature:", err);
    res.status(400).json({ error: "Invalid signature" });
  }
});
```

**Expected Results:**

- ✅ Valid signatures accepted
- ✅ Invalid signatures rejected (400 error)
- ✅ Timestamp validation prevents replay attacks

**Troubleshooting:**

- If verification fails: Check secret matches UI display
- If timestamp error: Ensure server clock is accurate (NTP)

---

### Test 8: Multiple Event Types

**Objective:** Verify all event types are delivered correctly.

**Events to Test:**

1. **Subscription Events:**
   - ✅ subscription.created
   - ✅ subscription.activated
   - ✅ subscription.renewed
   - ✅ subscription.cancelled
   - ✅ subscription.past_due
   - ✅ subscription.expired

2. **Invoice Events:**
   - ✅ invoice.created
   - ✅ invoice.finalized
   - ✅ invoice.paid
   - ✅ invoice.payment_failed
   - ✅ invoice.voided

3. **Payment Events:**
   - ✅ payment.processing
   - ✅ payment.succeeded
   - ✅ payment.failed

4. **Customer Events:**
   - ✅ customer.created
   - ✅ customer.updated
   - ✅ customer.deleted

5. **Plan Events:**
   - ✅ plan.created
   - ✅ plan.updated
   - ✅ plan.archived

**Testing Approach:**

For each event:

1. Trigger the event through normal app flow
2. Verify webhook received at endpoint
3. Check payload structure matches documentation
4. Verify all required fields present

---

### Test 9: App Deletion Cleanup

**Objective:** Verify Svix application is cleaned up when app is deleted.

**Steps:**

1. Create a test app
2. Configure webhooks
3. Note the `svixAppId`
4. Delete the app
5. Check Svix dashboard to confirm application deleted

**Expected Results:**

- ✅ App deleted from CrediBill
- ✅ Svix application deleted (async, may take a moment)
- ✅ No errors in Convex logs
- ✅ Svix application no longer visible in dashboard

**Troubleshooting:**

- If Svix app remains: Check Convex logs for deletion errors
- If deletion fails: May need manual cleanup in Svix dashboard

---

### Test 10: Performance and Scalability

**Objective:** Verify system handles high webhook volume.

**Load Test Scenario:**

1. Create 10 subscriptions rapidly
2. Process payments for all 10
3. Verify all webhooks delivered

**Expected Results:**

- ✅ All 20 webhooks sent (10 created + 10 activated)
- ✅ No rate limit errors from Svix
- ✅ All deliveries complete within reasonable time
- ✅ No webhook loss or duplication

**Performance Metrics:**

- Webhook latency: < 2 seconds from event to Svix
- Delivery time: < 5 seconds to endpoint (good network)
- System throughput: 100+ webhooks/minute

---

## Integration Test Checklist

Use this checklist to verify complete integration:

### Setup Phase

- [ ] Svix API keys configured
- [ ] Environment variables set in Convex
- [ ] Webhook endpoint ready to receive

### Application Lifecycle

- [ ] App creation triggers Svix application creation
- [ ] `svixAppId` populated in database
- [ ] App deletion triggers Svix application cleanup

### Endpoint Management

- [ ] Webhook URL configuration works
- [ ] HTTPS validation enforced
- [ ] Webhook secret generated and displayed
- [ ] Endpoint ID stored in database

### Event Delivery

- [ ] Test webhooks send successfully
- [ ] Real events trigger webhooks
- [ ] Payload structure correct
- [ ] Svix signature headers present
- [ ] Delivery logged in database

### Dashboard Access

- [ ] Dashboard button visible when configured
- [ ] Dashboard URL generates successfully
- [ ] Dashboard shows webhook history
- [ ] Time-limited access works (1 hour)

### Error Handling

- [ ] Failed deliveries trigger automatic retries
- [ ] Retry schedule follows exponential backoff
- [ ] Permanently failed deliveries marked correctly
- [ ] Svix API errors logged appropriately

### Security

- [ ] Signature verification works
- [ ] Invalid signatures rejected
- [ ] HTTPS-only enforcement
- [ ] Timestamp validation prevents replays

### Legacy System

- [ ] Old webhook retry cron disabled
- [ ] Old functions marked deprecated
- [ ] New system handles all deliveries
- [ ] No conflicts between old/new systems

---

## Common Issues and Solutions

### Issue: Webhooks not being sent

**Symptoms:** Events occur but no webhooks delivered

**Diagnosis:**

1. Check if webhook URL configured
2. Verify `svixEndpointId` in webhooks table
3. Check Convex logs for errors
4. Verify Svix API key valid

**Solution:**

```typescript
// Check webhook configuration
// In Convex dashboard → Data → webhooks table
// Verify: url, svixEndpointId, status fields

// Check logs
// Convex dashboard → Logs → Search for "svix" or "webhook"
```

---

### Issue: Invalid signature errors

**Symptoms:** Endpoint rejects webhooks due to signature mismatch

**Diagnosis:**

1. Verify using correct webhook secret
2. Check server clock is accurate
3. Ensure using Svix SDK for verification

**Solution:**

```javascript
// Ensure secret matches UI
const secret = "whsec_xxx"; // Copy from CrediBill UI

// Use Svix SDK (handles timestamp validation)
const { Webhook } = require("svix");
const wh = new Webhook(secret);

// Don't manually verify - use SDK
const payload = wh.verify(body, headers);
```

---

### Issue: Dashboard access fails

**Symptoms:** Dashboard button doesn't work or access denied

**Diagnosis:**

1. Check app has `svixAppId`
2. Verify Svix API key valid
3. Check dashboard URL not expired (1 hour limit)

**Solution:**

```typescript
// Regenerate dashboard access
// Click "View Dashboard" button again
// New URL generated with fresh 1-hour expiry
```

---

## Success Criteria

Your Svix integration is fully functional when:

- ✅ All 10 test scenarios pass
- ✅ Integration checklist 100% complete
- ✅ No errors in Convex logs
- ✅ Webhooks visible in Svix dashboard
- ✅ Signature verification works
- ✅ Dashboard access functional
- ✅ Legacy system fully deprecated

---

## Next Steps

After testing:

1. **Production Deployment:**
   - Set up `SVIX_API_KEY_LIVE` environment variable
   - Switch apps to live mode
   - Test with real payment providers

2. **Monitoring:**
   - Set up Svix webhook alerts
   - Monitor delivery success rate
   - Track webhook latency

3. **Documentation:**
   - Share webhook documentation with customers
   - Provide integration examples
   - Document all event types

4. **Optimization:**
   - Consider event filtering per endpoint
   - Implement idempotency in webhook handlers
   - Add webhook event logging/analytics

---

## Support Resources

- **Svix Documentation:** https://docs.svix.com
- **Svix Status Page:** https://status.svix.com
- **CrediBill Webhook Events:** See WEBHOOK_EVENTS.md
- **Convex Logs:** https://dashboard.convex.dev

---

**Testing Status:** Ready for comprehensive testing ✅
