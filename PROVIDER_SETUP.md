# Provider Setup Guides

## Overview

This guide walks through setting up each payment provider integration with CrediBill. Each provider has unique requirements and testing procedures.

---

## General Requirements

### For All Providers

1. Active merchant account with the provider
2. API credentials (keys/secrets)
3. Webhook URL configured
4. Test environment for development

### CrediBill Configuration Steps

1. Log in to CrediBill dashboard
2. Go to Settings → Payment Providers
3. Click "Add Provider"
4. Select provider from dropdown
5. Enter credentials
6. Choose environment (Test/Live)
7. Set as primary provider (optional)
8. Save and test connection

---

## Flutterwave

### Coverage

- **Countries:** Uganda, Kenya, Rwanda, Nigeria, Ghana, South Africa
- **Payment Methods:** Mobile Money (MTN, Airtel, Tigo), Cards (Visa, Mastercard), Bank Transfer
- **Currencies:** UGX, KES, RWF, NGN, GHS, ZAR, USD

### Getting Started

#### 1. Create Flutterwave Account

- Go to [Flutterwave](https://dashboard.flutterwave.com/signup)
- Complete business verification
- Wait for account approval (1-3 business days)

#### 2. Get API Credentials

**Test Mode:**

1. Log in to Flutterwave dashboard
2. Go to Settings → API
3. Copy "Public Key (Test)" - `FLWPUBK_TEST-xxx`
4. Copy "Secret Key (Test)" - `FLWSECK_TEST-xxx`

**Live Mode:**

1. Complete business verification
2. Get approval from Flutterwave
3. Switch to Live mode in dashboard
4. Copy "Public Key (Live)" - `FLWPUBK-xxx`
5. Copy "Secret Key (Live)" - `FLWSECK-xxx`

#### 3. Configure Webhook

1. In Flutterwave dashboard, go to Settings → Webhooks
2. Set webhook URL: `https://your-credibill-instance.com/webhooks/flutterwave`
3. Copy webhook hash for signature verification
4. Enable webhook notifications

#### 4. Add to CrediBill

```
Provider: Flutterwave
Public Key: FLWPUBK_TEST-xxx or FLWPUBK-xxx
Secret Key: FLWSECK_TEST-xxx or FLWSECK-xxx
Webhook Secret: Your webhook hash
Environment: Test or Live
```

### Testing

#### Test Cards

```
Card Number: 5531886652142950
CVV: 564
Expiry: 09/32
PIN: 3310
OTP: 12345
```

#### Test Mobile Money Numbers

**MTN Uganda:**

```
Phone: +256772000000
Status: Success
```

**Airtel Uganda:**

```
Phone: +256700000000
Status: Success
```

#### Common Test Scenarios

- Success: Use numbers/cards above
- Insufficient funds: Use `+256772000001`
- Invalid account: Use `+256772000002`

### Webhook Format

```json
{
  "event": "charge.completed",
  "data": {
    "id": 123456,
    "tx_ref": "your-reference",
    "flw_ref": "FLW-REF",
    "amount": 50000,
    "currency": "UGX",
    "status": "successful",
    "customer": {
      "email": "customer@example.com",
      "phone_number": "+256772123456"
    }
  }
}
```

### Resources

- [Flutterwave Docs](https://developer.flutterwave.com/docs)
- [API Reference](https://developer.flutterwave.com/reference)
- [Test Credentials](https://developer.flutterwave.com/docs/integration-guides/testing-helpers)

---

## PawaPay

### Coverage

- **Countries:** Uganda, Kenya, Tanzania, Rwanda, Zambia, Mozambique
- **Payment Methods:** Mobile Money only (MTN, Airtel, Tigo, Vodacom)
- **Currencies:** UGX, KES, TZS, RWF, ZMW, MZN

### Getting Started

#### 1. Create PawaPay Account

- Contact PawaPay sales: [hello@pawapay.io](mailto:hello@pawapay.io)
- Complete KYC verification
- Sign merchant agreement
- Receive API credentials

#### 2. Get API Credentials

**Test Mode:**

```
API Token: Bearer test_xxx
Deposit URL: https://api.sandbox.pawapay.io
```

**Live Mode:**

```
API Token: Bearer prod_xxx
Deposit URL: https://api.pawapay.io
```

#### 3. Configure Webhook

1. Contact PawaPay support
2. Provide webhook URL: `https://your-credibill-instance.com/webhooks/pawapay`
3. Request webhook secret for signature verification
4. PawaPay will configure on their end

#### 4. Add to CrediBill

```
Provider: PawaPay
API Token: Bearer test_xxx or Bearer prod_xxx
API URL: https://api.sandbox.pawapay.io (test) or https://api.pawapay.io (live)
Webhook Secret: Provided by PawaPay
Environment: Test or Live
```

### Testing

#### Test Mobile Money Numbers

**MTN Uganda (Success):**

```
Phone: +256777000001
MSISDN: 256777000001
```

**Airtel Kenya (Success):**

```
Phone: +254733000001
MSISDN: 254733000001
```

**Failed Transaction:**

```
Phone: +256777000002
Result: Insufficient funds
```

#### Test Scenarios

- Instant success: +256777000001
- Delayed success (5s): +256777000003
- Failed (insufficient): +256777000002
- Failed (invalid): +256777000004

### Webhook Format

```json
{
  "depositId": "dep_abc123",
  "status": "COMPLETED",
  "requestedAmount": "50000",
  "depositedAmount": "50000",
  "currency": "UGX",
  "country": "UGA",
  "correspondent": "MTN_MOMO_UGA",
  "payer": {
    "type": "MSISDN",
    "address": "256777123456"
  },
  "created": "2024-01-15T10:30:00Z"
}
```

### Resources

- [PawaPay Docs](https://docs.pawapay.io/)
- [API Reference](https://docs.pawapay.io/api-reference)
- [Sandbox Guide](https://docs.pawapay.io/sandbox)

---

## Pesapal

### Coverage

- **Countries:** Kenya, Uganda, Tanzania, Rwanda, Malawi, Zambia
- **Payment Methods:** Cards (Visa, Mastercard), Mobile Money (M-Pesa, Airtel Money, Tigo Pesa)
- **Currencies:** KES, UGX, TZS, RWF, MWK, ZMW, USD

### Getting Started

#### 1. Create Pesapal Account

- Go to [Pesapal](https://www.pesapal.com/)
- Register as merchant
- Complete business verification
- Wait for approval

#### 2. Get API Credentials

**Test Mode:**

1. Log in to Pesapal dashboard
2. Go to Settings → API Integration
3. Copy "Consumer Key (Demo)" - `qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW`
4. Copy "Consumer Secret (Demo)" - `osGQ364R49cXKeOYSpaOnT++rHs=`

**Live Mode:**

1. Switch to Live mode
2. Copy "Consumer Key (Live)"
3. Copy "Consumer Secret (Live)"

#### 3. Configure IPN (Webhook)

1. In Pesapal dashboard, go to Settings → IPN
2. Set IPN URL: `https://your-credibill-instance.com/webhooks/pesapal`
3. Enable IPN notifications
4. Save settings

#### 4. Add to CrediBill

```
Provider: Pesapal
Consumer Key: qkio1BGGYAXTu2JOfm7XSXNruoZsrqEW (test) or live key
Consumer Secret: osGQ364R49cXKeOYSpaOnT++rHs= (test) or live secret
IPN URL: https://your-credibill-instance.com/webhooks/pesapal
Environment: Test or Live
```

### Testing

#### Test Cards

**Visa (Success):**

```
Card Number: 4111111111111111
CVV: 123
Expiry: 12/25
```

**Mastercard (Success):**

```
Card Number: 5500000000000004
CVV: 123
Expiry: 12/25
```

#### Test M-Pesa

```
Phone: +254722000000
PIN: Use any
Result: Success
```

#### Test Scenarios

- Success: Use cards above
- Insufficient funds: Card 4000000000000002
- Declined: Card 4000000000000069

### Webhook Format (IPN)

```json
{
  "OrderTrackingId": "abc-123-def",
  "OrderMerchantReference": "your-reference",
  "OrderNotificationType": "COMPLETED",
  "Status": "COMPLETED"
}
```

### Resources

- [Pesapal Docs](https://developer.pesapal.com/)
- [API v3 Reference](https://developer.pesapal.com/api-3-0)
- [IPN Guide](https://developer.pesapal.com/how-to-integrate/ipn)

---

## DPO (Direct Pay Online)

### Coverage

- **Countries:** Pan-Africa (40+ countries)
- **Payment Methods:** Cards (Visa, Mastercard, American Express), Mobile Money, EFT
- **Currencies:** Multiple African currencies + USD, EUR, GBP

### Getting Started

#### 1. Create DPO Account

- Contact DPO sales: [https://www.directpay.online/](https://www.directpay.online/)
- Complete merchant application
- Provide business documentation
- Wait for approval (3-5 business days)

#### 2. Get API Credentials

**Test Mode:**

```
Company Token: 9F416C11-127B-4DE2-AC7A-D5E4E4CAA09C
Service Type: 3854 (test)
API URL: https://secure.3gdirectpay.com/
```

**Live Mode:**

```
Company Token: Your unique token
Service Type: Your service type
API URL: https://secure.3gdirectpay.com/
```

#### 3. Configure Callback URL

1. Log in to DPO portal
2. Go to Settings → Integration
3. Set Callback URL: `https://your-credibill-instance.com/webhooks/dpo`
4. Save settings

#### 4. Add to CrediBill

```
Provider: DPO
Company Token: 9F416C11-127B-4DE2-AC7A-D5E4E4CAA09C (test) or live token
Service Type: 3854 (test) or live service type
API URL: https://secure.3gdirectpay.com/
Environment: Test or Live
```

### Testing

#### Test Cards

**Visa (Success):**

```
Card Number: 4000000000000002
CVV: 123
Expiry: 12/25
```

**Mastercard (Success):**

```
Card Number: 5200000000000007
CVV: 123
Expiry: 12/25
```

#### Test Mobile Money

```
Select MTN Mobile Money
Phone: Any valid number
Result: Simulated success
```

#### Test Scenarios

- Approved: 4000000000000002
- Declined: 4000000000000010
- Insufficient funds: 4000000000000028

### Webhook Format

```xml
<?xml version="1.0" encoding="utf-8"?>
<API3G>
  <CompanyToken>9F416C11-127B-4DE2-AC7A-D5E4E4CAA09C</CompanyToken>
  <Result>000</Result>
  <ResultExplanation>Transaction Paid</ResultExplanation>
  <TransactionToken>ABC-123-DEF</TransactionToken>
  <TransactionRef>your-reference</TransactionRef>
  <TransactionAmount>500.00</TransactionAmount>
  <TransactionCurrency>UGX</TransactionCurrency>
  <TransactionStatus>Paid</TransactionStatus>
</API3G>
```

### Resources

- [DPO Docs](https://www.directpay.online/docs/)
- [API Guide](https://www.directpay.online/docs/api-guide/)
- [Test Cards](https://www.directpay.online/docs/test-cards/)

---

## Multi-Provider Strategy

### Recommended Setup

#### Primary + Backup

1. Set one provider as primary (default for all payments)
2. Add backup provider for failover
3. CrediBill automatically fails over if primary unavailable

#### Country-Specific Routing

Configure different providers per country:

```
Uganda: Flutterwave (primary), PawaPay (backup)
Kenya: PawaPay (primary), Pesapal (backup)
Tanzania: PawaPay (primary), DPO (backup)
Multi-country: DPO (cards), Flutterwave (mobile money)
```

#### Payment Method Routing

Route by payment method:

```
Mobile Money: PawaPay (lower fees)
Cards: DPO or Pesapal (better card support)
Bank Transfer: Flutterwave
```

---

## Common Issues

### Issue: Test credentials not working

**Solution:**

- Ensure using test/sandbox credentials
- Check environment is set to "Test"
- Verify credentials copied correctly (no extra spaces)

### Issue: Webhook not received

**Solution:**

- Check webhook URL is publicly accessible (use ngrok for local)
- Verify HTTPS certificate is valid
- Check firewall allows provider IPs
- Test webhook manually from provider dashboard

### Issue: Payment stuck in pending

**Solution:**

- Check provider dashboard for payment status
- Verify customer completed payment flow
- Some mobile money payments take 1-5 minutes
- Check webhook logs for delivery issues

### Issue: Signature verification fails

**Solution:**

- Use exact webhook secret from provider
- Don't add/remove characters
- Check webhook secret in CrediBill matches provider
- Retry test connection

---

## Production Checklist

Before going live:

### Provider Setup

- [ ] Live credentials obtained
- [ ] Business verification completed
- [ ] Webhook URL configured (HTTPS)
- [ ] Test connection successful
- [ ] Webhook signature verified

### CrediBill Configuration

- [ ] Environment set to "Live"
- [ ] Primary provider selected
- [ ] Backup provider configured (optional)
- [ ] Webhook URL points to production
- [ ] Test payment completed in test mode

### Testing

- [ ] Test successful payment
- [ ] Test failed payment
- [ ] Test webhook delivery
- [ ] Test signature verification
- [ ] Test retry logic

### Monitoring

- [ ] Payment logs reviewed
- [ ] Webhook logs monitored
- [ ] Error alerts configured
- [ ] Success rate tracked

---

## Support Contacts

### Provider Support

- **Flutterwave:** [hi@flutterwavego.com](mailto:hi@flutterwavego.com)
- **PawaPay:** [hello@pawapay.io](mailto:hello@pawapay.io)
- **Pesapal:** [support@pesapal.com](mailto:support@pesapal.com)
- **DPO:** [support@directpay.online](mailto:support@directpay.online)

### CrediBill Support

- Technical issues: [Your support email]
- Integration help: [Your integration email]
- Billing questions: [Your billing email]
