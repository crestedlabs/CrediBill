import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Process trial expirations
 * Runs daily at 2:00 AM UTC to check for expired trials and initiate payment
 */
crons.daily(
  "process-trial-expirations",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cronHandlers.processTrialExpirations
);

/**
 * Process recurring payments
 * Runs daily at 3:00 AM UTC to check for subscriptions due for renewal
 */
crons.daily(
  "process-recurring-payments",
  { hourUTC: 3, minuteUTC: 0 },
  internal.cronHandlers.processRecurringPayments
);

/**
 * Retry failed payments
 * Runs daily at 4:00 AM UTC to retry failed payment transactions
 */
crons.daily(
  "retry-failed-payments",
  { hourUTC: 4, minuteUTC: 0 },
  internal.cronHandlers.retryFailedPayments
);

/**
 * Clean up expired pending transactions
 * Runs daily at 5:00 AM UTC to mark expired pending transactions as failed
 */
crons.daily(
  "cleanup-expired-transactions",
  { hourUTC: 5, minuteUTC: 0 },
  internal.cronHandlers.cleanupExpiredTransactions
);

/**
 * Process webhook retries
 * Runs every 5 minutes to retry failed webhook deliveries
 */
crons.interval(
  "process-webhook-retries",
  { minutes: 5 },
  internal.cronHandlers.processWebhookRetries
);

export default crons;
