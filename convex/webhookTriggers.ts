/**
 * Webhook Trigger Utilities
 *
 * This file provides convenient helper functions to trigger webhooks
 * from anywhere in your Convex backend code.
 *
 * Usage Example:
 * ```typescript
 * import { triggerSubscriptionCreated } from "./webhookTriggers";
 *
 * // In your subscription creation mutation:
 * const subscriptionId = await ctx.db.insert("subscriptions", {...});
 *
 * // Trigger webhook
 * await triggerSubscriptionCreated(ctx, {
 *   appId: subscription.appId,
 *   subscription: subscription,
 * });
 * ```
 */

import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { SVIX_EVENT_TYPES } from "../lib/svix-events";

// Type for scheduler context (mutations/actions that have ctx.scheduler)
type SchedulerContext = {
  scheduler: {
    runAfter: (delayMs: number, fn: any, args: any) => void;
  };
};

// ============================================================================
// SUBSCRIPTION WEBHOOKS
// ============================================================================

export async function triggerSubscriptionCreated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    subscription: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendSubscriptionWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.SUBSCRIPTION_CREATED,
    subscriptionData: {
      subscription_id: params.subscription._id,
      customer_id: params.subscription.customerId,
      plan_id: params.subscription.planId,
      status: params.subscription.status,
      current_period_start: params.subscription.currentPeriodStart,
      current_period_end: params.subscription.currentPeriodEnd,
      trial_ends_at: params.subscription.trialEndsAt,
    },
  });
}

export async function triggerSubscriptionActivated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    subscription: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendSubscriptionWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.SUBSCRIPTION_ACTIVATED,
    subscriptionData: {
      subscription_id: params.subscription._id,
      customer_id: params.subscription.customerId,
      plan_id: params.subscription.planId,
      status: params.subscription.status,
      current_period_start: params.subscription.currentPeriodStart,
      current_period_end: params.subscription.currentPeriodEnd,
      next_payment_date: params.subscription.nextPaymentDate,
    },
  });
}

export async function triggerSubscriptionRenewed(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    subscription: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendSubscriptionWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.SUBSCRIPTION_RENEWED,
    subscriptionData: {
      subscription_id: params.subscription._id,
      customer_id: params.subscription.customerId,
      plan_id: params.subscription.planId,
      status: params.subscription.status,
      current_period_start: params.subscription.currentPeriodStart,
      current_period_end: params.subscription.currentPeriodEnd,
      next_payment_date: params.subscription.nextPaymentDate,
    },
  });
}

export async function triggerSubscriptionCancelled(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    subscription: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendSubscriptionWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.SUBSCRIPTION_CANCELLED,
    subscriptionData: {
      subscription_id: params.subscription._id,
      customer_id: params.subscription.customerId,
      plan_id: params.subscription.planId,
      status: params.subscription.status,
      cancel_at_period_end: params.subscription.cancelAtPeriodEnd,
      current_period_end: params.subscription.currentPeriodEnd,
    },
  });
}

export async function triggerSubscriptionPastDue(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    subscription: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendSubscriptionWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.SUBSCRIPTION_PAST_DUE,
    subscriptionData: {
      subscription_id: params.subscription._id,
      customer_id: params.subscription.customerId,
      plan_id: params.subscription.planId,
      status: params.subscription.status,
      current_period_end: params.subscription.currentPeriodEnd,
    },
  });
}

// ============================================================================
// INVOICE WEBHOOKS
// ============================================================================

export async function triggerInvoiceCreated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    invoice: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendInvoiceWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.INVOICE_CREATED,
    invoiceData: {
      invoice_id: params.invoice._id,
      invoice_number: params.invoice.invoiceNumber,
      subscription_id: params.invoice.subscriptionId,
      customer_id: params.invoice.customerId,
      amount_due: params.invoice.amountDue,
      amount_paid: params.invoice.amountPaid,
      currency: params.invoice.currency,
      status: params.invoice.status,
      due_date: params.invoice.dueDate,
      period_start: params.invoice.periodStart,
      period_end: params.invoice.periodEnd,
      line_items: params.invoice.lineItems,
    },
  });
}

export async function triggerInvoicePaid(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    invoice: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendInvoiceWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.INVOICE_PAID,
    invoiceData: {
      invoice_id: params.invoice._id,
      invoice_number: params.invoice.invoiceNumber,
      subscription_id: params.invoice.subscriptionId,
      customer_id: params.invoice.customerId,
      amount_due: params.invoice.amountDue,
      amount_paid: params.invoice.amountPaid,
      currency: params.invoice.currency,
      status: params.invoice.status,
      period_start: params.invoice.periodStart,
      period_end: params.invoice.periodEnd,
      line_items: params.invoice.lineItems,
    },
  });
}

export async function triggerInvoicePaymentFailed(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    invoice: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendInvoiceWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.INVOICE_PAYMENT_FAILED,
    invoiceData: {
      invoice_id: params.invoice._id,
      invoice_number: params.invoice.invoiceNumber,
      subscription_id: params.invoice.subscriptionId,
      customer_id: params.invoice.customerId,
      amount_due: params.invoice.amountDue,
      currency: params.invoice.currency,
      status: params.invoice.status,
      due_date: params.invoice.dueDate,
    },
  });
}

// ============================================================================
// CUSTOMER WEBHOOKS
// ============================================================================

export async function triggerCustomerCreated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    customer: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendCustomerWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.CUSTOMER_CREATED,
    customerData: {
      customer_id: params.customer._id,
      email: params.customer.email,
      phone: params.customer.phone,
      first_name: params.customer.first_name,
      last_name: params.customer.last_name,
      type: params.customer.type,
      status: params.customer.status,
      metadata: params.customer.metadata,
    },
  });
}

export async function triggerCustomerUpdated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    customer: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendCustomerWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.CUSTOMER_UPDATED,
    customerData: {
      customer_id: params.customer._id,
      email: params.customer.email,
      phone: params.customer.phone,
      first_name: params.customer.first_name,
      last_name: params.customer.last_name,
      type: params.customer.type,
      status: params.customer.status,
      metadata: params.customer.metadata,
    },
  });
}

// ============================================================================
// PAYMENT WEBHOOKS
// ============================================================================

export async function triggerPaymentSucceeded(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    payment: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendPaymentWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.PAYMENT_SUCCEEDED,
    paymentData: {
      payment_id: params.payment._id,
      invoice_id: params.payment.invoiceId,
      subscription_id: params.payment.subscriptionId,
      customer_id: params.payment.customerId,
      amount: params.payment.amount,
      currency: params.payment.currency,
      status: params.payment.status,
      payment_method: params.payment.paymentMethod,
      provider_transaction_id: params.payment.providerTransactionId,
    },
  });
}

export async function triggerPaymentFailed(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    payment: any;
    failureReason?: string;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendPaymentWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.PAYMENT_FAILED,
    paymentData: {
      payment_id: params.payment._id,
      invoice_id: params.payment.invoiceId,
      subscription_id: params.payment.subscriptionId,
      customer_id: params.payment.customerId,
      amount: params.payment.amount,
      currency: params.payment.currency,
      status: params.payment.status,
      payment_method: params.payment.paymentMethod,
      failure_reason: params.failureReason || params.payment.failureReason,
    },
  });
}

// ============================================================================
// PLAN WEBHOOKS
// ============================================================================

export async function triggerPlanCreated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    plan: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendPlanWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.PLAN_CREATED,
    planData: {
      plan_id: params.plan._id,
      name: params.plan.name,
      description: params.plan.description,
      pricing_model: params.plan.pricingModel,
      base_amount: params.plan.baseAmount,
      currency: params.plan.currency,
      interval: params.plan.interval,
      trial_days: params.plan.trialDays,
      status: params.plan.status,
    },
  });
}

export async function triggerPlanUpdated(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    plan: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendPlanWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.PLAN_UPDATED,
    planData: {
      plan_id: params.plan._id,
      name: params.plan.name,
      description: params.plan.description,
      pricing_model: params.plan.pricingModel,
      base_amount: params.plan.baseAmount,
      currency: params.plan.currency,
      interval: params.plan.interval,
      trial_days: params.plan.trialDays,
      status: params.plan.status,
    },
  });
}

// ============================================================================
// USAGE WEBHOOKS
// ============================================================================

export async function triggerUsageRecorded(
  ctx: SchedulerContext,
  params: {
    appId: Id<"apps">;
    usageEvent: any;
  },
) {
  ctx.scheduler.runAfter(0, internal.svixEvents.sendUsageWebhook, {
    appId: params.appId,
    eventType: SVIX_EVENT_TYPES.USAGE_RECORDED,
    usageData: {
      usage_event_id: params.usageEvent._id,
      subscription_id: params.usageEvent.subscriptionId,
      customer_id: params.usageEvent.customerId,
      metric: params.usageEvent.metric,
      quantity: params.usageEvent.quantity,
      timestamp: params.usageEvent.timestamp,
      metadata: params.usageEvent.metadata,
    },
  });
}
