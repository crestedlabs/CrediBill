/**
 * Payment Adapter Types
 * Provider-agnostic interfaces for payment processing
 * All adapters must implement these interfaces
 */

// Supported payment providers
export type PaymentProvider =
  | "flutterwave"
  | "pawapay"
  | "pesapal"
  | "dpo"
  | "paystack"
  | "stripe";

// Payment methods supported across providers
export type PaymentMethod =
  | "mobile_money_mtn"
  | "mobile_money_airtel"
  | "mobile_money_tigo"
  | "mobile_money_vodacom"
  | "card_visa"
  | "card_mastercard"
  | "bank_transfer"
  | "other";

// Payment status (canonical across all providers)
export type PaymentStatus =
  | "pending"
  | "initiated"
  | "processing"
  | "success"
  | "failed"
  | "canceled"
  | "refunded";

// Webhook event types (normalized)
export type WebhookEventType =
  | "payment.success"
  | "payment.failed"
  | "payment.pending"
  | "payment.canceled"
  | "payment.refunded";

/**
 * Provider Credentials
 * Each provider has different credential requirements
 */
export interface ProviderCredentials {
  publicKey?: string; // Optional: Some providers use public keys
  secretKey: string; // Required: API secret key (encrypted in storage)
  merchantId?: string; // Optional: Some providers use merchant IDs
  apiUrl?: string; // Optional: Custom API endpoint
}

/**
 * Payment Request
 * Data needed to initiate a payment
 */
export interface PaymentRequest {
  amount: number; // Amount in smallest currency unit (cents, pence, etc.)
  currency: string; // ISO currency code (UGX, KES, etc.)
  customerPhone?: string; // Phone number for mobile money
  customerEmail: string; // Customer email
  customerName?: string; // Customer name
  reference: string; // Our internal reference (unique)
  description: string; // Payment description
  paymentMethod: PaymentMethod; // Which method to use
  callbackUrl?: string; // Optional callback URL
  metadata?: Record<string, any>; // Additional data
}

/**
 * Payment Response
 * Standardized response from payment initiation
 */
export interface PaymentResponse {
  success: boolean;
  transactionId?: string; // Provider's transaction ID
  reference: string; // Our reference echoed back
  status: PaymentStatus;
  paymentUrl?: string; // Redirect URL for customer (cards)
  message?: string; // Human-readable message
  error?: string; // Error message if failed
  providerResponse?: any; // Raw provider response
}

/**
 * Payment Status Query Response
 */
export interface PaymentStatusResponse {
  transactionId: string;
  reference: string;
  status: PaymentStatus;
  amount: number;
  currency: string;
  paidAt?: number; // Timestamp when payment completed
  failureReason?: string;
  providerResponse?: any;
}

/**
 * Webhook Event
 * Normalized webhook data from provider
 */
export interface WebhookEvent {
  event: WebhookEventType;
  transactionId: string; // Provider's transaction ID
  reference: string; // Our internal reference
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: number; // Timestamp
  failureReason?: string;
  failureCode?: string;
  metadata?: Record<string, any>;
  rawPayload: any; // Original webhook payload
}

/**
 * Webhook Verification Result
 */
export interface WebhookVerification {
  valid: boolean;
  error?: string;
}

/**
 * Connection Test Result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  providerInfo?: {
    merchantId?: string;
    accountName?: string;
    balance?: number;
    currency?: string;
  };
  error?: string;
}

/**
 * Payment Adapter Interface
 * All payment providers must implement this interface
 */
export interface PaymentAdapter {
  /**
   * Provider identifier
   */
  readonly provider: PaymentProvider;

  /**
   * Initialize the adapter with credentials
   */
  initialize(credentials: ProviderCredentials, environment: "test" | "live"): void;

  /**
   * Initiate a payment request
   * Returns transaction details and payment URL if applicable
   */
  initiatePayment(request: PaymentRequest): Promise<PaymentResponse>;

  /**
   * Check payment status
   * Query the provider for the current status of a payment
   */
  getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse>;

  /**
   * Verify webhook signature
   * Ensures the webhook came from the provider
   */
  verifyWebhook(
    payload: any,
    signature: string,
    secret: string
  ): Promise<WebhookVerification>;

  /**
   * Parse webhook payload
   * Convert provider-specific webhook to normalized format
   */
  parseWebhook(payload: any): Promise<WebhookEvent>;

  /**
   * Test connection to provider
   * Validates credentials and checks API availability
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Get supported payment methods for this provider
   */
  getSupportedMethods(): PaymentMethod[];

  /**
   * Refund a payment (if supported)
   */
  refundPayment?(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResponse>;
}

/**
 * Adapter Factory
 * Creates the appropriate adapter based on provider type
 */
export interface AdapterFactory {
  createAdapter(provider: PaymentProvider): PaymentAdapter;
}
