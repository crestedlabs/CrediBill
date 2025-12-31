# Outgoing Webhooks System

## Overview

Your MVP now has a complete outgoing webhook system that sends real-time notifications to your clients when subscription events occur. This is essential since your business model is:

- **You (CrediBill)**: Track subscriptions, billing periods, usage, and renewals
- **Your Clients**: Handle their own payment collection based on your webhooks

## How It Works

### 1. **Webhook Configuration** (Per App)

Each app can configure:

- **Webhook URL**: Where to send notifications (e.g., `https://client-api.com/webhooks/credibill`)
- **Webhook Secret** (optional): For HMAC-SHA256 signature verification

Configuration is in: Settings → Webhooks tab

### 2. **Webhook Events**

Your system sends webhooks for these events:

| Event                       | When Triggered                                      | Payload Includes                                      |
| --------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `subscription.created`      | New subscription created                            | subscription, customer, plan                          |
| `subscription.activated`    | Payment successful, subscription active             | payment, subscription_id, customer_id, invoice_id     |
| `subscription.renewed`      | Subscription renewed for new period                 | subscription, customer, plan                          |
| `subscription.cancelled`    | Subscription cancelled (immediate or at period end) | subscription, customer                                |
| `subscription.plan_changed` | Customer changed plans                              | subscription, customer, old_plan, new_plan, proration |
| `payment.failed`            | Payment attempt failed                              | payment, subscription_id, customer_id, invoice_id     |
| `test.webhook`              | Test button clicked                                 | test message                                          |

### 3. **Webhook Payload Format**

```json
{
  "event": "subscription.created",
  "data": {
    "subscription": {...},
    "customer": {...},
    "plan": {...}
  },
  "timestamp": 1642534567890,
  "app_id": "k123abc..."
}
```

### 4. **Webhook Headers**

```
Content-Type: application/json
User-Agent: CrediBill-Webhooks/1.0
X-Webhook-Event: subscription.created
X-Delivery-Attempt: 1
X-Webhook-Signature: a1b2c3... (if secret configured)
```

### 5. **Signature Verification**

If you configure a webhook secret, your clients can verify authenticity:

```javascript
// Node.js example
const crypto = require("crypto");

function verifyWebhook(payload, signature, secret) {
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(JSON.stringify(payload));
  const expectedSignature = hmac.digest("hex");

  return signature === expectedSignature;
}

// In your webhook handler
app.post("/webhooks/credibill", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const isValid = verifyWebhook(req.body, signature, YOUR_SECRET);

  if (!isValid) {
    return res.status(401).send("Invalid signature");
  }

  // Process webhook...
});
```

### 6. **Retry Logic**

If webhook delivery fails:

- **Retry 1**: After 1 minute
- **Retry 2**: After 5 minutes
- **Retry 3**: After 15 minutes
- **After 3 failures**: Webhook marked as failed

Success = HTTP status 200-299

### 7. **Webhook Delivery Log**

The Webhooks settings tab shows:

- Event type
- Status (success/failed/pending)
- Number of attempts
- HTTP response code
- Last attempt timestamp

## Files Created/Modified

### Backend

- `convex/webhookDelivery.ts` - NEW: Webhook delivery system
  - `queueWebhook` - Queue webhook for delivery
  - `deliverWebhook` - Send HTTP request with signature
  - `listWebhookDeliveries` - View delivery history
- `convex/apps.ts` - MODIFIED: Added webhook management
  - `updateWebhookConfig` - Save webhook URL/secret
  - `testWebhook` - Send test webhook
  - `getAppSettings` - Returns webhook config

- `convex/subscriptions.ts` - MODIFIED: Added webhook triggers
  - `createSubscription` - Sends `subscription.created`
  - `renewSubscription` - Sends `subscription.renewed`
  - `manageSubscription` (cancel) - Sends `subscription.cancelled`
  - `changeSubscription` - Sends `subscription.plan_changed`

- `convex/schema.ts` - MODIFIED: Added webhook fields
  - `apps.webhookUrl` - Webhook endpoint URL
  - `apps.webhookSecret` - Secret for signature
  - `webhookDeliveries` table - Delivery history

### Frontend

- `components/settings/settings-webhooks-section.tsx` - REPLACED
  - Webhook configuration form
  - Event documentation
  - Delivery history table
  - Test webhook button

## Usage for Your Clients

Your clients should:

1. **Set up webhook endpoint**

   ```
   POST https://their-api.com/webhooks/credibill
   ```

2. **Handle events**

   ```javascript
   switch (event) {
     case "subscription.created":
       // Activate customer's account
       // Start their trial/billing period
       break;

     case "subscription.renewed":
       // Collect payment
       // Extend access for next period
       break;

     case "subscription.cancelled":
       // Disable customer's access
       // Send goodbye email
       break;

     case "subscription.plan_changed":
       // Update customer's features
       // If upgrade, collect proration amount
       break;
   }
   ```

3. **Return 200 OK quickly**
   - Process webhook async
   - Return success immediately
   - CrediBill will retry if you don't respond

## Example Client Flow

### Scenario: Customer creates subscription

1. **Client calls your API**:

   ```bash
   POST /api/subscriptions
   {
     "customer_id": "cust_123",
     "plan_id": "plan_abc"
   }
   ```

2. **You create subscription** (already working)

3. **CrediBill sends webhook** (NEW):

   ```bash
   POST https://client-api.com/webhooks/credibill
   {
     "event": "subscription.created",
     "data": {
       "subscription": {
         "status": "trialing",
         "trialEndsAt": 1643534567890,
         "nextPaymentDate": 1643534567890
       },
       "customer": {...},
       "plan": {...}
     }
   }
   ```

4. **Client handles webhook**:
   ```javascript
   // Client's code
   async function handleSubscriptionCreated(data) {
     const { subscription, customer, plan } = data;

     // Activate customer's account
     await activateCustomer(customer.externalId, plan.features);

     // Schedule payment collection for trialEndsAt
     await schedulePayment(subscription.nextPaymentDate, plan.baseAmount);
   }
   ```

## Testing

1. Configure webhook URL in Settings → Webhooks
2. Click "Send Test" to verify connection
3. Create a subscription to test `subscription.created`
4. Cancel a subscription to test `subscription.cancelled`
5. Change subscription plan to test `subscription.plan_changed`
6. View delivery log for debugging

## What's Next

Consider adding:

- Cron job to send `payment.due` webhooks before `nextPaymentDate`
- Invoice created webhooks
- Usage threshold webhooks
- Failed payment attempt webhooks
- Webhook retry dashboard with manual retry
- Webhook signing with timestamp to prevent replay attacks
- Webhook event filtering (let clients choose which events to receive)

## Security Notes

- Always validate webhook signatures if secret is configured
- Use HTTPS for webhook URLs
- Consider IP allowlisting
- Implement idempotency (same webhook may be delivered multiple times)
- Log all webhook deliveries for debugging
- Rate limit webhook endpoints

Your clients now have real-time visibility into subscription events! 🎉
