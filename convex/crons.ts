import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

/**
 * Process scheduled cancellations
 * Runs daily at 1:00 AM UTC to cancel subscriptions scheduled for period end
 */
crons.daily(
  "process-scheduled-cancellations",
  { hourUTC: 1, minuteUTC: 0 },
  internal.cronHandlers.processScheduledCancellations,
);

/**
 * Process trial expirations
 * Runs daily at 2:00 AM UTC to check for expired trials and initiate payment
 */
crons.daily(
  "process-trial-expirations",
  { hourUTC: 2, minuteUTC: 0 },
  internal.cronHandlers.processTrialExpirations,
);

/**
 * Process recurring payments
 * Runs daily at 3:00 AM UTC to check for subscriptions due for renewal
 */
crons.daily(
  "process-recurring-payments",
  { hourUTC: 3, minuteUTC: 0 },
  internal.cronHandlers.processRecurringPayments,
);

/**
 * Retry failed payments
 * Runs daily at 4:00 AM UTC to retry failed payment transactions
 */
crons.daily(
  "retry-failed-payments",
  { hourUTC: 4, minuteUTC: 0 },
  internal.cronHandlers.retryFailedPayments,
);

/**
 * Clean up expired pending transactions
 * Runs daily at 5:00 AM UTC to mark expired pending transactions as failed
 */
crons.daily(
  "cleanup-expired-transactions",
  { hourUTC: 5, minuteUTC: 0 },
  internal.cronHandlers.cleanupExpiredTransactions,
);

/**
 * Process grace period expirations
 * Runs daily at 6:00 AM UTC to mark subscriptions past grace period as past_due
 */
crons.daily(
  "process-grace-period-expirations",
  { hourUTC: 6, minuteUTC: 0 },
  internal.cronHandlers.processGracePeriodExpirations,
);

/**
 * Generate pending invoices
 * Runs daily at 7:00 AM UTC to auto-generate invoices for subscriptions past their period end
 */
crons.daily(
  "generate-pending-invoices",
  { hourUTC: 7, minuteUTC: 0 },
  internal.cronHandlers.generatePendingInvoices,
);

export default crons;
