# Cloudflare Worker → Convex Integration Setup

## Architecture

```
PawaPay → Cloudflare Worker → Convex → Your Billing Engine
```

## 1. Convex Environment Variable

Add to your Convex dashboard (Settings → Environment Variables):

```
WEBHOOK_SECRET=whsec-credibill123
```

**Important:** Use a strong secret in production:

```bash
# Generate a secure secret:
openssl rand -base64 32
```

## 2. Worker Configuration

Your Cloudflare Worker sends to:

```
URL: https://giant-goldfish-922.convex.site/webhooks/pawapay
Method: POST
Headers:
  Content-Type: application/json
  X-Webhook-Secret: whsec-credibill123
Body:
  {
    "appId": "j57eddw6wf2c80mfrtwxfzrhbs7y5wsd",
    "payload": { /* original PawaPay webhook */ }
  }
```

## 3. PawaPay Configuration

Set webhook URL in PawaPay dashboard:

```
https://your-worker.workers.dev/v1/webhooks/pawapay?appId=j57eddw6wf2c80mfrtwxfzrhbs7y5wsd
```

## 4. Testing

### Test Worker → Convex:

```bash
curl -X POST "https://giant-goldfish-922.convex.site/webhooks/pawapay" \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: whsec-credibill123" \
  -d '{
    "appId": "j57eddw6wf2c80mfrtwxfzrhbs7y5wsd",
    "payload": {
      "data": {
        "depositId": "test-123",
        "status": "COMPLETED",
        "amount": "20000.00",
        "currency": "UGX",
        "metadata": {
          "credibill_customer_id": "j979fkmzz458a41sqkb0d00jyx7y6217",
          "credibill_subscription_id": "k17esf2ntxm29v2ah7k857v9wn7y737y",
          "credibill_invoice_id": "INV-2025-001"
        }
      },
      "status": "FOUND"
    }
  }'
```

### Check Convex Logs:

```bash
npx convex logs --tail
```

Look for:

- `[PawaPay] Raw webhook data:`
- `[PawaPay] Extracted metadata:`
- `[PawaPay] Status mapping:`

## 5. Expected Flow

1. **PawaPay** sends webhook to Worker
2. **Worker** returns 200 immediately (satisfies PawaPay)
3. **Worker** forwards to Convex (fire & forget)
4. **Convex** validates webhook secret
5. **Convex** schedules async processing
6. **Convex** returns 200 to Worker
7. **Handler** processes payment in background
8. **Handler** updates subscription/invoice
9. **Handler** sends webhook to your app

## 6. Security Notes

- Worker validates PawaPay signature (TODO: implement if needed)
- Convex validates Worker via shared secret
- Never expose `WEBHOOK_SECRET` in client code
- Use different secrets for sandbox/production

## 7. Monitoring

Check these if webhooks fail:

1. **PawaPay Dashboard** → Webhook delivery logs
2. **Cloudflare Dashboard** → Worker logs
3. **Convex Dashboard** → Logs & Function calls
4. **Your App** → Webhook delivery status

## 8. Provider-Agnostic Design

The webhook handler is designed to work with multiple providers:

- **PawaPay**: `{ data: {...}, status: "FOUND" }`
- **Flutterwave**: Different structure (already handled)
- **Future providers**: Add similar handlers

Key abstractions:

- Extract `data` with fallback: `webhookData.data || webhookData`
- Flexible transaction ID: `depositId || deposit_id || transactionId`
- Standard metadata keys: `credibill_*` prefix

## Troubleshooting

### Worker not receiving webhooks

- Check PawaPay webhook URL is correct
- Verify Worker is deployed and accessible
- Check Worker logs for errors

### Convex returning 401

- Verify `WEBHOOK_SECRET` is set in Convex
- Check Worker is sending correct header
- Ensure header name is `x-webhook-secret` (lowercase)

### Payments not processing

- Check Convex logs for errors
- Verify metadata contains all required IDs
- Ensure customer/subscription/invoice exist in database
