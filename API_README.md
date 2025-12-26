# CrediBill API Documentation

## Overview

The CrediBill API allows external applications to integrate with your billing platform. You can create customers, manage subscriptions, record usage events, and retrieve invoices programmatically.

**Base URL**: `https://your-domain.convex.site`

## Authentication

All API endpoints require authentication using API keys. Include your API key in the `Authorization` header:

```
Authorization: Bearer pk_live_your_api_key_here
```

### API Key Scopes

- `read` - View customers, invoices, subscriptions
- `write` - Create customers, subscriptions, record usage
- `admin` - Full access (not yet implemented)

### Getting Your API Key

1. Navigate to your app settings in the CrediBill dashboard
2. Go to the "API Keys" section
3. Click "Create API Key"
4. Select the appropriate scopes for your integration
5. Copy the generated key (it will only be shown once)

## Endpoints

### 1. Customers

#### Create Customer

Creates a new customer in your app.

```http
POST /api/customers
```

**Request Body:**

```json
{
  "email": "customer@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "phone": "+256700123456"
}
```

**Response:**

```json
{
  "success": true,
  "customerId": "j57abc123def456"
}
```

#### List Customers

Gets all customers for your app.

```http
GET /api/customers
```

**Response:**

```json
{
  "customers": [
    {
      "_id": "j57abc123def456",
      "email": "customer@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+256700123456",
      "appId": "j57xyz789abc123",
      "_creationTime": 1703123456789
    }
  ]
}
```

#### Get Specific Customer

Gets a single customer by ID.

```http
GET /api/customers?customerId=j57abc123def456
```

**Response:**

```json
{
  "customer": {
    "_id": "j57abc123def456",
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "phone": "+256700123456",
    "appId": "j57xyz789abc123",
    "_creationTime": 1703123456789
  }
}
```

### 2. Subscriptions

#### Create Subscription

Subscribes a customer to a plan.

```http
POST /api/subscriptions
```

**Request Body:**

```json
{
  "customerId": "j57abc123def456",
  "planId": "j57plan789xyz123",
  "startDate": 1703123456789,
  "trialDays": 14
}
```

**Parameters:**

- `customerId` (required) - ID of the customer
- `planId` (required) - ID of the plan to subscribe to
- `startDate` (optional) - Unix timestamp when subscription starts (defaults to now)
- `trialDays` (optional) - Number of trial days (defaults to plan setting)

**Response:**

```json
{
  "success": true,
  "subscriptionId": "j57sub456def789"
}
```

### 3. Usage Tracking

#### Record Usage Event

Records usage for a subscription (for usage-based or hybrid plans).

```http
POST /api/usage
```

**Request Body:**

```json
{
  "subscriptionId": "j57sub456def789",
  "quantity": 100,
  "metric": "api_calls",
  "eventId": "event_12345_unique",
  "metadata": {
    "endpoint": "/v1/users",
    "method": "GET",
    "timestamp": "2024-01-01T10:00:00Z"
  }
}
```

**Parameters:**

- `subscriptionId` (required) - ID of the subscription
- `quantity` (required) - Number of units consumed (must be positive)
- `metric` (required) - Usage metric (must match the plan's usage metric)
- `eventId` (optional) - Unique identifier to prevent duplicate events
- `metadata` (optional) - Additional data about the usage event

**Response:**

```json
{
  "success": true,
  "usageEventId": "j57usage789abc456",
  "duplicate": false
}
```

**Duplicate Detection:**
If you provide an `eventId` that already exists, the API returns the existing event:

```json
{
  "success": true,
  "usageEventId": "j57usage789abc456",
  "duplicate": true
}
```

### 4. Invoices

#### List Invoices

Gets invoices for your app.

```http
GET /api/invoices
```

**Query Parameters:**

- `customerId` (optional) - Filter by customer ID
- `status` (optional) - Filter by status: `draft`, `open`, `paid`, `failed`, `void`

**Examples:**

```http
GET /api/invoices
GET /api/invoices?customerId=j57abc123def456
GET /api/invoices?status=paid
GET /api/invoices?customerId=j57abc123def456&status=open
```

**Response:**

```json
{
  "invoices": [
    {
      "_id": "j57inv123abc789",
      "invoiceNumber": "INV-2024-001",
      "customerId": "j57abc123def456",
      "subscriptionId": "j57sub456def789",
      "amountDue": 2500,
      "amountPaid": 0,
      "currency": "ugx",
      "status": "open",
      "periodStart": 1703123456789,
      "periodEnd": 1705801856789,
      "dueDate": 1706406656789,
      "lineItems": [
        {
          "description": "Professional Plan - Monthly",
          "quantity": 1,
          "unitAmount": 1500,
          "totalAmount": 1500,
          "type": "plan"
        },
        {
          "description": "API Calls - Usage (1000 calls)",
          "quantity": 500,
          "unitAmount": 2,
          "totalAmount": 1000,
          "type": "usage"
        }
      ],
      "_creationTime": 1703123456789
    }
  ]
}
```

#### Get Specific Invoice

Gets a single invoice by ID.

```http
GET /api/invoices?invoiceId=j57inv123abc789
```

**Response:**

```json
{
  "invoice": {
    "_id": "j57inv123abc789",
    "invoiceNumber": "INV-2024-001",
    "customerId": "j57abc123def456",
    "subscriptionId": "j57sub456def789",
    "amountDue": 2500,
    "amountPaid": 0,
    "currency": "ugx",
    "status": "open",
    "periodStart": 1703123456789,
    "periodEnd": 1705801856789,
    "dueDate": 1706406656789,
    "lineItems": [
      {
        "description": "Professional Plan - Monthly",
        "quantity": 1,
        "unitAmount": 1500,
        "totalAmount": 1500,
        "type": "plan"
      }
    ],
    "metadata": {
      "planName": "Professional Plan",
      "customerEmail": "customer@example.com",
      "generatedAt": 1703123456789,
      "autoGenerated": true
    },
    "_creationTime": 1703123456789
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request (missing required fields, validation errors)
- `401` - Unauthorized (invalid or missing API key)
- `403` - Forbidden (API key lacks required permissions)
- `404` - Not Found (resource doesn't exist or not accessible)
- `500` - Internal Server Error

**Error Response Format:**

```json
{
  "error": "Missing required field: email"
}
```

**Common Errors:**

1. **Invalid API Key**

```json
{
  "error": "Invalid API key"
}
```

2. **Insufficient Permissions**

```json
{
  "error": "API key lacks write permissions"
}
```

3. **Resource Not Found**

```json
{
  "error": "Customer not found"
}
```

4. **Validation Error**

```json
{
  "error": "Quantity must be a positive number"
}
```

## Code Examples

### Node.js (using fetch)

```javascript
const apiKey = "pk_live_your_api_key_here";
const baseUrl = "https://your-domain.convex.site";

// Create a customer
async function createCustomer(email, firstName, lastName) {
  const response = await fetch(`${baseUrl}/api/customers`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      first_name: firstName,
      last_name: lastName,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data.customerId;
}

// Record usage
async function recordUsage(subscriptionId, quantity, metric) {
  const response = await fetch(`${baseUrl}/api/usage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      subscriptionId,
      quantity,
      metric,
      eventId: `event_${Date.now()}_${Math.random()}`,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data;
}

// Usage examples
(async () => {
  try {
    const customerId = await createCustomer("john@example.com", "John", "Doe");
    console.log("Created customer:", customerId);

    await recordUsage("sub_123", 100, "api_calls");
    console.log("Usage recorded successfully");
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
```

### Python (using requests)

```python
import requests
import json
from datetime import datetime

API_KEY = 'pk_live_your_api_key_here'
BASE_URL = 'https://your-domain.convex.site'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

def create_customer(email, first_name, last_name):
    data = {
        'email': email,
        'first_name': first_name,
        'last_name': last_name
    }

    response = requests.post(
        f'{BASE_URL}/api/customers',
        headers=headers,
        json=data
    )

    if response.status_code != 201:
        raise Exception(response.json().get('error'))

    return response.json()['customerId']

def record_usage(subscription_id, quantity, metric):
    data = {
        'subscriptionId': subscription_id,
        'quantity': quantity,
        'metric': metric,
        'eventId': f'event_{int(datetime.now().timestamp())}'
    }

    response = requests.post(
        f'{BASE_URL}/api/usage',
        headers=headers,
        json=data
    )

    if response.status_code not in [200, 201]:
        raise Exception(response.json().get('error'))

    return response.json()

# Usage examples
try:
    customer_id = create_customer('jane@example.com', 'Jane', 'Smith')
    print(f'Created customer: {customer_id}')

    result = record_usage('sub_456', 250, 'api_calls')
    print(f'Usage recorded: {result}')
except Exception as e:
    print(f'Error: {e}')
```

### cURL Examples

```bash
# Create customer
curl -X POST https://your-domain.convex.site/api/customers \
  -H "Authorization: Bearer pk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }'

# Record usage
curl -X POST https://your-domain.convex.site/api/usage \
  -H "Authorization: Bearer pk_live_your_api_key_here" \
  -H "Content-Type: application/json" \
  -d '{
    "subscriptionId": "j57sub456def789",
    "quantity": 100,
    "metric": "api_calls",
    "eventId": "unique_event_123"
  }'

# List invoices
curl -X GET "https://your-domain.convex.site/api/invoices?status=paid" \
  -H "Authorization: Bearer pk_live_your_api_key_here"
```

## Rate Limits

- **API Key Tier**: 1,000 requests per minute per API key
- **Burst Allowance**: Up to 100 requests in a 10-second window
- **Usage Endpoint**: Higher limit of 10,000 requests per minute (for high-frequency usage tracking)

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Requests allowed per window
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when the window resets

## Best Practices

### 1. Usage Tracking

- **Use unique `eventId`s** to prevent duplicate usage events
- **Batch usage events** when possible instead of individual API calls
- **Include metadata** for debugging and analytics
- **Handle duplicates gracefully** - the API returns existing events for duplicate `eventId`s

### 2. Error Handling

- **Always check response status codes**
- **Log API responses** for debugging
- **Implement exponential backoff** for rate-limited requests
- **Validate data locally** before sending to reduce API calls

### 3. Security

- **Never expose API keys** in client-side code
- **Use environment variables** for API keys
- **Rotate API keys regularly**
- **Use minimum required scopes** for each integration

### 4. Performance

- **Cache customer and subscription data** when possible
- **Use bulk operations** when available
- **Implement proper error handling** to avoid unnecessary retries

## Webhooks (Coming Soon)

CrediBill will support webhooks to notify your application of events:

- `invoice.created` - New invoice generated
- `invoice.paid` - Invoice marked as paid
- `subscription.created` - New subscription created
- `subscription.cancelled` - Subscription cancelled
- `customer.created` - New customer added

## Support

For API support, please:

1. Check this documentation first
2. Review your API key permissions
3. Test with cURL to isolate issues
4. Contact support with specific error messages and request IDs

---

**Happy building with CrediBill! 🚀**
