/**
 * Cron Job Handlers
 *
 * These functions are triggered by scheduled cron jobs to automate
 * payment processing, trial conversions, and transaction cleanup.
 */

import { internalAction, internalMutation } from "./_generated/server";
import { internal, api } from "./_generated/api";

/**
 * Process trial expirations
 * Finds subscriptions whose trial period has ended and notifies clients
 * (Since we don't initiate payments, clients will handle payment collection)
 */
export const processTrialExpirations = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const now = Date.now();

    // Find all subscriptions with expired trials
    const subscriptions: any[] = await ctx.runQuery(
      internal.cronQueries.getExpiredTrials,
      { now },
    );

    console.log(
      `[Cron] Found ${subscriptions.length} expired trials to process`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each expired trial
    for (const subscription of subscriptions) {
      try {
        // Mark trial as expired - client will handle payment collection
        await ctx.runMutation(internal.cronMutations.markTrialExpired, {
          subscriptionId: subscription._id,
        });

        // Generate invoice for the upcoming billing period
        await ctx.runMutation(internal.invoices.generateInvoiceInternal, {
          subscriptionId: subscription._id,
          periodStart: now,
          periodEnd: now, // Period will be set properly when payment is received
        });

        // Send webhook to client so they can collect payment
        await ctx.runMutation(internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "subscription.trial_expired",
          payload: {
            subscription_id: subscription._id,
            customer_id: subscription.customerId,
            trial_ended_at: subscription.trialEndsAt,
            payment_due_at: subscription.currentPeriodEnd,
          },
        });

        successCount++;
        console.log(
          `[Cron] Successfully processed trial for subscription ${subscription._id}`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error processing trial for subscription ${subscription._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Trial expiration processing complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return {
      processed: subscriptions.length,
      succeeded: successCount,
      failed: failureCount,
    };
  },
});

/**
 * Process recurring payments
 * Finds subscriptions due for renewal and sends payment due notifications
 * (Since we don't initiate payments, clients will handle payment collection)
 */
export const processRecurringPayments = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const now = Date.now();

    // Find all subscriptions due for payment
    const subscriptions: any[] = await ctx.runQuery(
      internal.cronQueries.getDueSubscriptions,
      { now },
    );

    console.log(
      `[Cron] Found ${subscriptions.length} subscriptions due for payment`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Send webhook to client so they can collect payment
        await ctx.runMutation(internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "payment.due",
          payload: {
            subscription_id: subscription._id,
            customer_id: subscription.customerId,
            amount_due: subscription.planSnapshot?.baseAmount || 0,
            currency: subscription.planSnapshot?.currency || "USD",
            due_date: subscription.currentPeriodEnd,
            billing_period: {
              start: subscription.currentPeriodStart,
              end: subscription.currentPeriodEnd,
            },
          },
        });

        successCount++;
        console.log(
          `[Cron] Successfully notified client about payment due for subscription ${subscription._id}`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error processing payment due notification for subscription ${subscription._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Payment due notification processing complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return {
      processed: subscriptions.length,
      succeeded: successCount,
      failed: failureCount,
    };
  },
});

/**
 * Retry failed payments
 * Finds failed payment transactions and retries them based on retry rules
 */
export const retryFailedPayments = internalAction({
  handler: async (
    ctx,
  ): Promise<{
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
  }> => {
    const now = Date.now();

    // Find failed transactions eligible for retry
    const transactions: any[] = await ctx.runQuery(
      internal.cronQueries.getRetryableTransactions,
      { now },
    );

    console.log(
      `[Cron] Found ${transactions.length} failed transactions eligible for retry`,
    );

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    // Process each failed transaction
    for (const transaction of transactions) {
      try {
        // Check if we've exceeded max retry attempts (e.g., 3 attempts)
        if (transaction.attemptNumber >= 3) {
          skippedCount++;
          console.log(
            `[Cron] Skipping transaction ${transaction._id}: max retries exceeded`,
          );
          continue;
        }

        // Since we don't initiate payments, we don't retry them
        // Clients handle payment retries in their own systems
        skippedCount++;
        console.log(
          `[Cron] Skipped transaction ${transaction._id}: payment retries handled by client`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error retrying transaction ${transaction._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Retry processing complete: ${successCount} succeeded, ${failureCount} failed, ${skippedCount} skipped`,
    );

    return {
      processed: transactions.length,
      succeeded: successCount,
      failed: failureCount,
      skipped: skippedCount,
    };
  },
});

/**
 * Cleanup expired transactions
 * Marks pending transactions that have exceeded their expiration time as failed
 */
export const cleanupExpiredTransactions = internalAction({
  handler: async (ctx): Promise<{ processed: number; cleaned: number }> => {
    const now = Date.now();

    // Find expired pending transactions
    const transactions: any[] = await ctx.runQuery(
      internal.cronQueries.getExpiredTransactions,
      { now },
    );

    console.log(
      `[Cron] Found ${transactions.length} expired pending transactions to cleanup`,
    );

    let cleanedCount = 0;

    // Mark each as failed
    for (const transaction of transactions) {
      try {
        await ctx.runMutation(internal.cronMutations.markTransactionExpired, {
          transactionId: transaction._id,
        });
        cleanedCount++;
      } catch (error: any) {
        console.error(
          `[Cron] Error marking transaction ${transaction._id} as expired:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Cleanup complete: ${cleanedCount} transactions marked as expired`,
    );

    return {
      processed: transactions.length,
      cleaned: cleanedCount,
    };
  },
});

/**
 * Process webhook retries
 * @deprecated This function is no longer used - Svix handles all webhook retries automatically
 *
 * The manual webhook retry system has been replaced by Svix which provides
 * automatic retries with exponential backoff. This function is kept for backward
 * compatibility but the cron job that calls it has been disabled in crons.ts.
 *
 * Finds failed webhooks that need to be retried and attempts redelivery
 */
export const processWebhookRetries = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    console.log(
      "[Cron] Webhook retries are disabled - Svix handles retries automatically",
    );
    return { processed: 0, succeeded: 0, failed: 0 };

    /* Legacy implementation - commented out
    const now = Date.now();

    // Find all webhooks pending retry
    const webhooks: any[] = await ctx.runQuery(
      internal.outgoingWebhookQueries.getPendingRetries,
      { now, limit: 50 }
    );

    console.log(`[Cron] Found ${webhooks.length} webhook retries to process`);

    if (webhooks.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    let succeeded = 0;
    let failed = 0;

    for (const webhook of webhooks) {
      try {
        const result = await ctx.runAction(
          internal.outgoingWebhooks.retryWebhook,
          {
            webhookLogId: webhook._id,
          }
        );

        if (result.success) {
          succeeded++;
        } else {
          failed++;

          // Mark as permanently failed if max attempts reached
          if (webhook.attemptNumber >= webhook.maxAttempts) {
            await ctx.runMutation(
              internal.outgoingWebhookMutations.markWebhookFailed,
              {
                webhookLogId: webhook._id,
              }
            );
          }
        }
      } catch (error: any) {
        console.error(`[Cron] Error retrying webhook ${webhook._id}:`, error);
        failed++;
      }
    }

    console.log(
      `[Cron] Webhook retries complete: ${succeeded} succeeded, ${failed} failed`
    );

    return {
      processed: webhooks.length,
      succeeded,
      failed,
    };
    */
  },
});

/**
 * Process grace period expirations
 * Finds subscriptions past their grace period and marks them as past_due
 */
export const processGracePeriodExpirations = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const now = Date.now();

    // Find subscriptions past their grace period
    const subscriptions: any[] = await ctx.runQuery(
      internal.cronQueries.getGracePeriodExpiredSubscriptions,
      { now },
    );

    console.log(
      `[Cron] Found ${subscriptions.length} subscriptions past grace period`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Mark subscription as past_due
        await ctx.runMutation(internal.cronMutations.markSubscriptionPastDue, {
          subscriptionId: subscription._id,
        });

        // Send webhook
        await ctx.runMutation(internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "subscription.past_due",
          payload: {
            subscription_id: subscription._id,
            customer_id: subscription.customerId,
            grace_period_expired: subscription.graceDeadline,
            failed_payment_attempts: subscription.failedPaymentAttempts || 0,
          },
        });

        successCount++;
        console.log(
          `[Cron] Successfully marked subscription ${subscription._id} as past_due`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error processing grace period expiration for subscription ${subscription._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Grace period expiration processing complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return {
      processed: subscriptions.length,
      succeeded: successCount,
      failed: failureCount,
    };
  },
});

/**
 * Process scheduled cancellations
 * Cancels subscriptions that have reached their period end with cancelAtPeriodEnd=true
 */
export const processScheduledCancellations = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const now = Date.now();

    // Find subscriptions scheduled for cancellation
    const subscriptions: any[] = await ctx.runQuery(
      internal.cronQueries.getScheduledCancellations,
      { now },
    );

    console.log(
      `[Cron] Found ${subscriptions.length} subscriptions scheduled for cancellation`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Cancel the subscription
        await ctx.runMutation(
          internal.cronMutations.cancelSubscriptionAtPeriodEnd,
          {
            subscriptionId: subscription._id,
          },
        );

        // Send cancellation webhook (customer info already in subscription object)
        await ctx.runMutation(internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "subscription.cancelled",
          payload: {
            subscription_id: subscription._id,
            customer_id: subscription.customerId,
            cancelled_at: now,
            reason: "Scheduled cancellation at period end",
          },
        });

        successCount++;
        console.log(
          `[Cron] Successfully cancelled subscription ${subscription._id} at period end`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error cancelling subscription ${subscription._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Scheduled cancellation processing complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return {
      processed: subscriptions.length,
      succeeded: successCount,
      failed: failureCount,
    };
  },
});

/**
 * Generate pending invoices
 * Automatically creates invoices for subscriptions past their period end
 */
export const generatePendingInvoices = internalAction({
  handler: async (
    ctx,
  ): Promise<{ processed: number; succeeded: number; failed: number }> => {
    const now = Date.now();

    // Find subscriptions needing invoices
    const subscriptions: any[] = await ctx.runQuery(
      internal.cronQueries.getSubscriptionsNeedingInvoices,
      { now },
    );

    console.log(
      `[Cron] Found ${subscriptions.length} subscriptions needing invoices`,
    );

    let successCount = 0;
    let failureCount = 0;

    // Process each subscription
    for (const subscription of subscriptions) {
      try {
        // Generate invoice
        await ctx.runMutation(internal.invoices.generateInvoiceInternal, {
          subscriptionId: subscription._id,
          periodStart: subscription.currentPeriodStart,
          periodEnd: subscription.currentPeriodEnd,
        });

        // Send webhook
        await ctx.runMutation(internal.webhookDelivery.queueWebhook, {
          appId: subscription.appId,
          event: "invoice.created",
          payload: {
            subscription_id: subscription._id,
            customer_id: subscription.customerId,
            period_start: subscription.currentPeriodStart,
            period_end: subscription.currentPeriodEnd,
          },
        });

        successCount++;
        console.log(
          `[Cron] Successfully generated invoice for subscription ${subscription._id}`,
        );
      } catch (error: any) {
        failureCount++;
        console.error(
          `[Cron] Error generating invoice for subscription ${subscription._id}:`,
          error,
        );
      }
    }

    console.log(
      `[Cron] Invoice generation complete: ${successCount} succeeded, ${failureCount} failed`,
    );

    return {
      processed: subscriptions.length,
      succeeded: successCount,
      failed: failureCount,
    };
  },
});
