"use node";

/**
 * Webhook Actions
 *
 * This file re-exports all webhook handlers from provider-specific modules.
 */

// Export PawaPay handlers
export { handlePawapayWebhook } from "./webhookActionsPawapay";
