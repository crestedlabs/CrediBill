/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as apps from "../apps.js";
import type * as cronHandlers from "../cronHandlers.js";
import type * as cronMutations from "../cronMutations.js";
import type * as cronQueries from "../cronQueries.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as http from "../http.js";
import type * as invoices from "../invoices.js";
import type * as organizations from "../organizations.js";
import type * as outgoingWebhookMutations from "../outgoingWebhookMutations.js";
import type * as outgoingWebhookQueries from "../outgoingWebhookQueries.js";
import type * as outgoingWebhooks from "../outgoingWebhooks.js";
import type * as overview from "../overview.js";
import type * as paymentProviderCredentials from "../paymentProviderCredentials.js";
import type * as plans from "../plans.js";
import type * as providerCatalog from "../providerCatalog.js";
import type * as subscriptions from "../subscriptions.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as webhookActions from "../webhookActions.js";
import type * as webhookActionsDpo from "../webhookActionsDpo.js";
import type * as webhookActionsFlutterwave from "../webhookActionsFlutterwave.js";
import type * as webhookActionsPawapay from "../webhookActionsPawapay.js";
import type * as webhookActionsPesapal from "../webhookActionsPesapal.js";
import type * as webhookDelivery from "../webhookDelivery.js";
import type * as webhookMutations from "../webhookMutations.js";
import type * as webhookQueries from "../webhookQueries.js";
import type * as webhooks from "../webhooks.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  apps: typeof apps;
  cronHandlers: typeof cronHandlers;
  cronMutations: typeof cronMutations;
  cronQueries: typeof cronQueries;
  crons: typeof crons;
  customers: typeof customers;
  http: typeof http;
  invoices: typeof invoices;
  organizations: typeof organizations;
  outgoingWebhookMutations: typeof outgoingWebhookMutations;
  outgoingWebhookQueries: typeof outgoingWebhookQueries;
  outgoingWebhooks: typeof outgoingWebhooks;
  overview: typeof overview;
  paymentProviderCredentials: typeof paymentProviderCredentials;
  plans: typeof plans;
  providerCatalog: typeof providerCatalog;
  subscriptions: typeof subscriptions;
  usage: typeof usage;
  users: typeof users;
  webhookActions: typeof webhookActions;
  webhookActionsDpo: typeof webhookActionsDpo;
  webhookActionsFlutterwave: typeof webhookActionsFlutterwave;
  webhookActionsPawapay: typeof webhookActionsPawapay;
  webhookActionsPesapal: typeof webhookActionsPesapal;
  webhookDelivery: typeof webhookDelivery;
  webhookMutations: typeof webhookMutations;
  webhookQueries: typeof webhookQueries;
  webhooks: typeof webhooks;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
