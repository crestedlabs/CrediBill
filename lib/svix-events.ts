import { Id } from "../convex/_generated/dataModel";

// ============================================================================
// SVIX EVENT TYPE CONSTANTS
// ============================================================================

/**
 * Svix event types for CrediBill webhooks
 * Using dot notation for hierarchical event organization
 */
export const SVIX_EVENT_TYPES = {
  // ==================== SUBSCRIPTION EVENTS ====================

  /** Fired when a new subscription is created */
  SUBSCRIPTION_CREATED: "subscription.created",

  /** Fired when a subscription becomes active (after trial or first payment) */
  SUBSCRIPTION_ACTIVATED: "subscription.activated",

  /** Fired when a subscription is successfully renewed */
  SUBSCRIPTION_RENEWED: "subscription.renewed",

  /** Fired when a subscription is cancelled */
  SUBSCRIPTION_CANCELLED: "subscription.cancelled",

  /** Fired when a subscription's plan is changed (upgrade/downgrade) */
  SUBSCRIPTION_PLAN_CHANGED: "subscription.plan_changed",

  /** Fired when a subscription's trial period expires */
  SUBSCRIPTION_TRIAL_EXPIRED: "subscription.trial_expired",

  /** Fired when a subscription enters past_due status (payment failed) */
  SUBSCRIPTION_PAST_DUE: "subscription.past_due",

  /** Fired when a subscription is paused */
  SUBSCRIPTION_PAUSED: "subscription.paused",

  /** Fired when a subscription is resumed from paused state */
  SUBSCRIPTION_RESUMED: "subscription.resumed",

  /** Fired when subscription enters grace period after payment failure */
  SUBSCRIPTION_GRACE_PERIOD_STARTED: "subscription.grace_period_started",

  /** Fired when subscription exits grace period */
  SUBSCRIPTION_GRACE_PERIOD_ENDED: "subscription.grace_period_ended",

  // ==================== INVOICE EVENTS ====================

  /** Fired when a new invoice is created */
  INVOICE_CREATED: "invoice.created",

  /** Fired when an invoice is successfully paid */
  INVOICE_PAID: "invoice.paid",

  /** Fired when an invoice becomes overdue */
  INVOICE_OVERDUE: "invoice.overdue",

  /** Fired when an invoice is voided/cancelled */
  INVOICE_VOIDED: "invoice.voided",

  /** Fired when an invoice payment fails */
  INVOICE_PAYMENT_FAILED: "invoice.payment_failed",

  /** Fired when invoice is finalized and ready for payment */
  INVOICE_FINALIZED: "invoice.finalized",

  // ==================== CUSTOMER EVENTS ====================

  /** Fired when a new customer is created */
  CUSTOMER_CREATED: "customer.created",

  /** Fired when customer information is updated */
  CUSTOMER_UPDATED: "customer.updated",

  /** Fired when a customer is deleted */
  CUSTOMER_DELETED: "customer.deleted",

  /** Fired when customer status changes (active/inactive/blocked) */
  CUSTOMER_STATUS_CHANGED: "customer.status_changed",

  // ==================== PAYMENT EVENTS ====================

  /** Fired when a payment is due */
  PAYMENT_DUE: "payment.due",

  /** Fired when a payment attempt fails */
  PAYMENT_FAILED: "payment.failed",

  /** Fired when a payment is successfully processed */
  PAYMENT_SUCCEEDED: "payment.succeeded",

  /** Fired when a payment is refunded */
  PAYMENT_REFUNDED: "payment.refunded",

  /** Fired when payment processing starts */
  PAYMENT_PROCESSING: "payment.processing",

  // ==================== PLAN EVENTS ====================

  /** Fired when a new plan is created */
  PLAN_CREATED: "plan.created",

  /** Fired when a plan is updated */
  PLAN_UPDATED: "plan.updated",

  /** Fired when a plan is archived */
  PLAN_ARCHIVED: "plan.archived",

  // ==================== USAGE EVENTS ====================

  /** Fired when usage is recorded */
  USAGE_RECORDED: "usage.recorded",

  /** Fired when usage summary is generated */
  USAGE_SUMMARY_GENERATED: "usage.summary_generated",

  /** Fired when usage limit is exceeded */
  USAGE_LIMIT_EXCEEDED: "usage.limit_exceeded",

  // ==================== TEST EVENTS ====================

  /** Test webhook event for verification */
  TEST_WEBHOOK: "test.webhook",
} as const;

/**
 * Type-safe event type string
 */
export type SvixEventType =
  (typeof SVIX_EVENT_TYPES)[keyof typeof SVIX_EVENT_TYPES];

/**
 * Get all available event types as an array
 */
export function getAllEventTypes(): SvixEventType[] {
  return Object.values(SVIX_EVENT_TYPES);
}

/**
 * Get event types by category
 */
export function getEventTypesByCategory(
  category:
    | "subscription"
    | "invoice"
    | "customer"
    | "payment"
    | "plan"
    | "usage"
    | "test",
): SvixEventType[] {
  const prefix = category === "test" ? "test." : `${category}.`;
  return getAllEventTypes().filter((type) => type.startsWith(prefix));
}

// ============================================================================
// WEBHOOK PAYLOAD STRUCTURE
// ============================================================================

/**
 * Base webhook payload structure
 * All webhooks sent through Svix follow this format
 */
export interface WebhookPayload<T = any> {
  /** Event type (e.g., "subscription.created") */
  event: SvixEventType;

  /** Event data - the actual content varies by event type */
  data: T;

  /** ISO 8601 timestamp when the event occurred */
  timestamp: string;

  /** CrediBill app ID that generated this event */
  app_id: string;

  /** Unique event ID for idempotency and tracking */
  event_id: string;

  /** API version (for future versioning) */
  api_version?: string;
}

// ============================================================================
// EVENT DATA TYPES
// ============================================================================

/**
 * Subscription event data
 */
export interface SubscriptionEventData {
  subscription_id: string;
  customer_id: string;
  plan_id: string;
  status:
    | "active"
    | "trialing"
    | "pending_payment"
    | "paused"
    | "cancelled"
    | "past_due";
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  trial_ends_at?: number;
  next_payment_date?: number;
  metadata?: Record<string, any>;
}

/**
 * Invoice event data
 */
export interface InvoiceEventData {
  invoice_id: string;
  invoice_number: string;
  subscription_id: string;
  customer_id: string;
  amount_due: number;
  amount_paid?: number;
  currency: string;
  status: "draft" | "open" | "paid" | "failed" | "void";
  due_date?: number;
  period_start: number;
  period_end: number;
  line_items: Array<{
    description: string;
    quantity: number;
    unit_amount: number;
    total_amount: number;
    type: "plan" | "usage" | "one_time";
  }>;
}

/**
 * Customer event data
 */
export interface CustomerEventData {
  customer_id: string;
  email: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  status?: "active" | "inactive" | "blocked";
  type?: "individual" | "business";
  metadata?: Record<string, any>;
}

/**
 * Payment event data
 */
export interface PaymentEventData {
  payment_id: string;
  invoice_id?: string;
  subscription_id?: string;
  customer_id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "refunded";
  payment_method: string;
  failure_reason?: string;
  provider_transaction_id?: string;
}

/**
 * Plan event data
 */
export interface PlanEventData {
  plan_id: string;
  name: string;
  description?: string;
  pricing_model: "flat" | "usage" | "hybrid";
  base_amount?: number;
  currency: string;
  interval: "monthly" | "quarterly" | "yearly" | "one-time";
  trial_days?: number;
  status: "active" | "archived";
}

/**
 * Usage event data
 */
export interface UsageEventData {
  usage_event_id: string;
  subscription_id: string;
  customer_id: string;
  metric: string;
  quantity: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

/**
 * Test webhook data
 */
export interface TestWebhookData {
  message: string;
  test_id: string;
  app_id: string;
  timestamp: number;
}

// ============================================================================
// PAYLOAD CREATION HELPERS
// ============================================================================

/**
 * Create a webhook payload with consistent structure
 */
export function createWebhookPayload<T = any>(params: {
  eventType: SvixEventType;
  data: T;
  appId: Id<"apps"> | string;
  eventId?: string;
  apiVersion?: string;
}): WebhookPayload<T> {
  return {
    event: params.eventType,
    data: params.data,
    timestamp: new Date().toISOString(),
    app_id: params.appId,
    event_id: params.eventId || generateEventId(),
    api_version: params.apiVersion || "2026-01-20",
  };
}

/**
 * Generate a unique event ID
 * Format: evt_<timestamp>_<random>
 */
export function generateEventId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `evt_${timestamp}_${random}`;
}

/**
 * Create a subscription webhook payload
 */
export function createSubscriptionPayload(params: {
  eventType: Extract<SvixEventType, `subscription.${string}`>;
  subscriptionData: SubscriptionEventData;
  appId: Id<"apps"> | string;
  eventId?: string;
}): WebhookPayload<SubscriptionEventData> {
  return createWebhookPayload({
    eventType: params.eventType,
    data: params.subscriptionData,
    appId: params.appId,
    eventId: params.eventId,
  });
}

/**
 * Create an invoice webhook payload
 */
export function createInvoicePayload(params: {
  eventType: Extract<SvixEventType, `invoice.${string}`>;
  invoiceData: InvoiceEventData;
  appId: Id<"apps"> | string;
  eventId?: string;
}): WebhookPayload<InvoiceEventData> {
  return createWebhookPayload({
    eventType: params.eventType,
    data: params.invoiceData,
    appId: params.appId,
    eventId: params.eventId,
  });
}

/**
 * Create a customer webhook payload
 */
export function createCustomerPayload(params: {
  eventType: Extract<SvixEventType, `customer.${string}`>;
  customerData: CustomerEventData;
  appId: Id<"apps"> | string;
  eventId?: string;
}): WebhookPayload<CustomerEventData> {
  return createWebhookPayload({
    eventType: params.eventType,
    data: params.customerData,
    appId: params.appId,
    eventId: params.eventId,
  });
}

/**
 * Create a payment webhook payload
 */
export function createPaymentPayload(params: {
  eventType: Extract<SvixEventType, `payment.${string}`>;
  paymentData: PaymentEventData;
  appId: Id<"apps"> | string;
  eventId?: string;
}): WebhookPayload<PaymentEventData> {
  return createWebhookPayload({
    eventType: params.eventType,
    data: params.paymentData,
    appId: params.appId,
    eventId: params.eventId,
  });
}

/**
 * Create a test webhook payload
 */
export function createTestWebhookPayload(params: {
  appId: Id<"apps"> | string;
  message?: string;
}): WebhookPayload<TestWebhookData> {
  return createWebhookPayload({
    eventType: SVIX_EVENT_TYPES.TEST_WEBHOOK,
    data: {
      message: params.message || "This is a test webhook from CrediBill",
      test_id: generateEventId(),
      app_id: params.appId,
      timestamp: Date.now(),
    },
    appId: params.appId,
  });
}

// ============================================================================
// EVENT TYPE HELPERS
// ============================================================================

/**
 * Check if an event type is valid
 */
export function isValidEventType(
  eventType: string,
): eventType is SvixEventType {
  return getAllEventTypes().includes(eventType as SvixEventType);
}

/**
 * Get human-readable event description
 */
export function getEventDescription(eventType: SvixEventType): string {
  const descriptions: Record<SvixEventType, string> = {
    // Subscriptions
    "subscription.created": "A new subscription was created",
    "subscription.activated": "A subscription became active",
    "subscription.renewed": "A subscription was renewed",
    "subscription.cancelled": "A subscription was cancelled",
    "subscription.plan_changed": "A subscription's plan was changed",
    "subscription.trial_expired": "A subscription's trial period expired",
    "subscription.past_due": "A subscription is past due",
    "subscription.paused": "A subscription was paused",
    "subscription.resumed": "A subscription was resumed",
    "subscription.grace_period_started": "A subscription entered grace period",
    "subscription.grace_period_ended": "A subscription exited grace period",

    // Invoices
    "invoice.created": "A new invoice was created",
    "invoice.paid": "An invoice was paid",
    "invoice.overdue": "An invoice became overdue",
    "invoice.voided": "An invoice was voided",
    "invoice.payment_failed": "An invoice payment failed",
    "invoice.finalized": "An invoice was finalized",

    // Customers
    "customer.created": "A new customer was created",
    "customer.updated": "A customer was updated",
    "customer.deleted": "A customer was deleted",
    "customer.status_changed": "A customer's status changed",

    // Payments
    "payment.due": "A payment is due",
    "payment.failed": "A payment failed",
    "payment.succeeded": "A payment succeeded",
    "payment.refunded": "A payment was refunded",
    "payment.processing": "A payment is processing",

    // Plans
    "plan.created": "A new plan was created",
    "plan.updated": "A plan was updated",
    "plan.archived": "A plan was archived",

    // Usage
    "usage.recorded": "Usage was recorded",
    "usage.summary_generated": "A usage summary was generated",
    "usage.limit_exceeded": "A usage limit was exceeded",

    // Test
    "test.webhook": "Test webhook event",
  };

  return descriptions[eventType] || "Unknown event";
}

/**
 * Get event category from event type
 */
export function getEventCategory(eventType: SvixEventType): string {
  const [category] = eventType.split(".");
  return category;
}
