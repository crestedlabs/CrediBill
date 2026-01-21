/**
 * Subscription Status Helpers
 *
 * Centralized logic for computing subscription status based on current state and dates.
 * This ensures the UI displays accurate, real-time status regardless of database state.
 */

import { Doc } from "./_generated/dataModel";

/**
 * Compute the real-time status of a subscription
 *
 * This function determines what the subscription status SHOULD be based on:
 * - Current database status
 * - Trial end date
 * - Current period end date
 * - Grace period settings
 * - Current time
 *
 * @param subscription - The subscription document
 * @param gracePeriodDays - Grace period from app settings (REQUIRED - no default)
 * @param now - Current timestamp (defaults to Date.now())
 * @returns The computed real-time status
 */
export function computeSubscriptionStatus(
  subscription: Doc<"subscriptions">,
  gracePeriodDays: number,
  now: number = Date.now(),
): Doc<"subscriptions">["status"] {
  const dbStatus = subscription.status;

  // Terminal states - these never change automatically
  if (dbStatus === "cancelled") {
    return dbStatus;
  }

  // Paused state - manual intervention required
  if (dbStatus === "paused") {
    return dbStatus;
  }

  // Check if trial has expired
  if (dbStatus === "trialing") {
    if (subscription.trialEndsAt && now >= subscription.trialEndsAt) {
      // Trial has expired - should be pending_payment
      // NOTE: Cron job should update this, but we compute it here for UI accuracy
      return "pending_payment";
    }
    return "trialing";
  }

  // Check if subscription is past due (grace period expired)
  // IMPORTANT: pending_payment without dates means awaiting first payment - NO grace period check
  if (dbStatus === "pending_payment" || dbStatus === "active") {
    // If currentPeriodEnd is undefined, subscription is awaiting first payment
    // Cannot compute grace period expiry without a period end date
    if (!subscription.currentPeriodEnd) {
      return "pending_payment"; // Still waiting for first payment
    }

    // Calculate grace period deadline
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;
    const graceDeadline = subscription.currentPeriodEnd + gracePeriodMs;

    if (now > graceDeadline) {
      // Grace period has expired - should be past_due
      // NOTE: Cron job should update this, but we compute it here for UI accuracy
      return "past_due";
    }

    // Within grace period - return current status
    return dbStatus;
  }

  // Past due state - payment required to reactivate
  if (dbStatus === "past_due") {
    return dbStatus;
  }

  // Fallback to database status
  return dbStatus;
}

/**
 * Get a human-readable description of the subscription status
 */
export function getStatusDescription(
  status: Doc<"subscriptions">["status"],
): string {
  switch (status) {
    case "active":
      return "Active subscription with access to services";
    case "trialing":
      return "In trial period - no payment required yet";
    case "pending_payment":
      return "Awaiting first payment to activate";
    case "past_due":
      return "Payment overdue - access may be limited";
    case "paused":
      return "Subscription paused by user";
    case "cancelled":
      return "Subscription cancelled - no further billing";
    default:
      return "Unknown status";
  }
}

/**
 * Check if a subscription is considered "active" for access purposes
 * This includes subscriptions in trial or with grace period
 */
export function hasActiveAccess(
  subscription: Doc<"subscriptions">,
  gracePeriodDays: number,
  now: number = Date.now(),
): boolean {
  const computedStatus = computeSubscriptionStatus(
    subscription,
    gracePeriodDays,
    now,
  );

  // Access is granted for: active, trialing, and pending_payment (within grace)
  // Grace period check is implicit in computeSubscriptionStatus
  return (
    computedStatus === "active" ||
    computedStatus === "trialing" ||
    computedStatus === "pending_payment"
  );
}

/**
 * Check if a subscription can be cancelled
 */
export function canBeCancelled(subscription: Doc<"subscriptions">): boolean {
  return (
    subscription.status === "active" ||
    subscription.status === "trialing" ||
    subscription.status === "pending_payment" ||
    subscription.status === "paused"
  );
}

/**
 * Check if a subscription can be paused
 */
export function canBePaused(subscription: Doc<"subscriptions">): boolean {
  return subscription.status === "active" || subscription.status === "trialing";
}

/**
 * Check if a subscription can be resumed
 */
export function canBeResumed(subscription: Doc<"subscriptions">): boolean {
  return subscription.status === "paused";
}
