# CrediBill API Documentation

All API endpoints require authentication using an API key in the Authorization header:

```
Authorization: Bearer cb_live_your_api_key_here
```

Base URL: `https://giant-goldfish-922.convex.site`

---

## Usage Tracking

### Record Usage Event

```http
POST /api/usage
Content-Type: application/json

{
  "subscriptionId": "j57abcd1234567890",
  "quantity": 100,
  "metric": "api_calls",
  "eventId": "optional-idempotency-key",
  "metadata": {
    "endpoint": "/api/users",
    "method": "GET"
  }
}
```

**Response:**

```json
{
  "success": true,
  "usageEventId": "j57xyz9876543210",
  "duplicate": false
}
```

---

## Customers

### Create Customer

```http
POST /api/customers
Content-Type: application/json

{
  "email": "customer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+256700000000",
  "externalCustomerId": "user_123_from_your_system",
  "type": "individual",
  "status": "active",
  "metadata": {
    "signup_source": "web",
    "plan_preference": "premium"
  }
}
```

**Response:**

```json
{
  "success": true,
  "customerId": "j57customer123"
}
```

### List Customers

```http
GET /api/customers
```

**Response:**

```json
{
  "customers": [
    {
      "_id": "j57customer123",
      "email": "customer@example.com",
      "first_name": "John",
      "last_name": "Doe",
      ...
    }
  ]
}
```

### Get Customer

```http
GET /api/customers?customerId=j57customer123
```

**Response:**

```json
{
  "customer": {
    "_id": "j57customer123",
    "email": "customer@example.com",
    "subscriptions": [...],
    "invoices": [...],
    ...
  }
}
```

---

## Subscriptions

### Create Subscription

```http
POST /api/subscriptions
Content-Type: application/json

{
  "customerId": "j57customer123",
  "planId": "j57plan456",
  "startDate": 1704067200000  // Optional: Unix timestamp in ms
}
```

**Response:**

```json
{
  "success": true,
  "subscriptionId": "j57subscription789"
}
```

### List Subscriptions

```http
GET /api/subscriptions

# Optional filters:
GET /api/subscriptions?customerId=j57customer123
GET /api/subscriptions?planId=j57plan456
GET /api/subscriptions?status=active
```

**Response:**

```json
{
  "subscriptions": [
    {
      "_id": "j57subscription789",
      "status": "active",
      "customer": {...},
      "plan": {...},
      ...
    }
  ]
}
```

### Get Subscription

```http
GET /api/subscriptions?subscriptionId=j57subscription789
```

**Response:**

```json
{
  "subscription": {
    "_id": "j57subscription789",
    "customer": {...},
    "plan": {...},
    "invoices": [...],
    "usageEvents": [...],
    ...
  }
}
```

### Cancel Subscription

```http
DELETE /api/subscriptions?subscriptionId=j57subscription789

# Cancel at period end (instead of immediately):
DELETE /api/subscriptions?subscriptionId=j57subscription789&cancelAtPeriodEnd=true
```

**Response:**

```json
{
  "success": true,
  "message": "Subscription cancelled"
}
```

---

## Plans

### Create Plan

```http
POST /api/plans
Content-Type: application/json

{
  "name": "Professional Plan",
  "description": "Best for growing businesses",
  "pricingModel": "hybrid",
  "baseAmount": 5000,
  "currency": "UGX",
  "interval": "monthly",
  "trialDays": 14,
  "usageMetric": "api_calls",
  "unitPrice": 10,
  "freeUnits": 1000,
  "status": "active",
  "mode": "live"
}
```

**Pricing Models:**

- `flat` - Fixed recurring price (requires `baseAmount`)
- `usage` - Pay per use (requires `usageMetric`, `unitPrice`)
- `hybrid` - Base fee + usage charges (requires all fields)

**Intervals:** `monthly`, `quarterly`, `yearly`, `one-time`

**Response:**

```json
{
  "success": true,
  "planId": "j57plan456"
}
```

### List Plans

```http
GET /api/plans
```

**Response:**

```json
{
  "plans": [
    {
      "_id": "j57plan456",
      "name": "Professional Plan",
      "pricingModel": "hybrid",
      ...
    }
  ]
}
```

### Update Plan

```http
PATCH /api/plans
Content-Type: application/json

{
  "planId": "j57plan456",
  "name": "Professional Plan (Updated)",
  "baseAmount": 6000,
  "status": "active"
}
```

**Updatable Fields:** `name`, `description`, `status`, `baseAmount`, `unitPrice`, `freeUnits`, `trialDays`

**Response:**

```json
{
  "success": true,
  "message": "Plan updated"
}
```

### Delete Plan

```http
DELETE /api/plans?planId=j57plan456
```

**Note:** Cannot delete plans with active subscriptions. Archive them instead by updating `status` to `"archived"`.

**Response:**

```json
{
  "success": true,
  "message": "Plan deleted"
}
```

---

## Invoices

### List Invoices

```http
GET /api/invoices

# Optional filters:
GET /api/invoices?customerId=j57customer123
GET /api/invoices?subscriptionId=j57subscription789
GET /api/invoices?status=paid
```

**Response:**

```json
{
  "invoices": [
    {
      "_id": "j57invoice101",
      "invoiceNumber": "INV-2025-001",
      "status": "paid",
      "customer": {...},
      "subscription": {...},
      ...
    }
  ]
}
```

### Get Invoice

```http
GET /api/invoices?invoiceId=j57invoice101
```

**Response:**

```json
{
  "invoice": {
    "_id": "j57invoice101",
    "invoiceNumber": "INV-2025-001",
    "customer": {...},
    "subscription": {...},
    ...
  }
}
```

### Update Invoice Status

```http
PATCH /api/invoices
Content-Type: application/json

{
  "invoiceId": "j57invoice101",
  "status": "paid",
  "amountPaid": 5000,
  "paidDate": 1704067200000
}
```

**Statuses:** `draft`, `pending`, `paid`, `void`, `failed`

**Response:**

```json
{
  "success": true,
  "message": "Invoice updated"
}
```

---

## API Keys

API keys can be created in the CrediBill dashboard under App Settings → API Keys.

**Scopes:**

- `read` - Read-only access to customers, subscriptions, plans, invoices
- `write` - Full access including creating and updating resources

**Security:**

- Store API keys securely (never commit to version control)
- Use environment variables
- Rotate keys periodically
- Use different keys for live and test modes

---

## Webhooks

Configure webhook endpoints in the dashboard to receive real-time notifications about events in your CrediBill app.

**Webhook URL Format:**

```
https://your-domain.com/webhooks/{provider}/{appId}
```

**Events:** `subscription.created`, `subscription.updated`, `subscription.cancelled`, `invoice.paid`, `invoice.failed`, `customer.created`, `customer.updated`, `plan.created`, `plan.updated`, and more.

---

## Error Handling

**Common Error Responses:**

```json
{
  "error": "Missing or invalid Authorization header"
}
```

**HTTP Status Codes:**

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing required fields)
- `401` - Unauthorized (invalid API key)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

---

## Rate Limiting

Currently no rate limits are enforced, but please use the API responsibly. Rate limiting may be introduced in the future.

---

## Testing

Use test mode API keys (prefix: `cb_test_`) to test your integration without affecting live data.

**Tools:**

- Thunder Client (VS Code extension)
- Postman
- cURL
- Your favorite HTTP client

**Example cURL:**

```bash
curl -X POST https://giant-goldfish-922.convex.site/api/customers \
  -H "Authorization: Bearer cb_live_your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User"
  }'
```
