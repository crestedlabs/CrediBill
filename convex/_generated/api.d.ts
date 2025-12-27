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
import type * as lib_paymentAdapters_dpo from "../lib/paymentAdapters/dpo.js";
import type * as lib_paymentAdapters_factory from "../lib/paymentAdapters/factory.js";
import type * as lib_paymentAdapters_flutterwave from "../lib/paymentAdapters/flutterwave.js";
import type * as lib_paymentAdapters_index from "../lib/paymentAdapters/index.js";
import type * as lib_paymentAdapters_pawapay from "../lib/paymentAdapters/pawapay.js";
import type * as lib_paymentAdapters_pesapal from "../lib/paymentAdapters/pesapal.js";
import type * as lib_paymentAdapters_types from "../lib/paymentAdapters/types.js";
import type * as organizations from "../organizations.js";
import type * as outgoingWebhookMutations from "../outgoingWebhookMutations.js";
import type * as outgoingWebhookQueries from "../outgoingWebhookQueries.js";
import type * as outgoingWebhooks from "../outgoingWebhooks.js";
import type * as overview from "../overview.js";
import type * as paymentProviders from "../paymentProviders.js";
import type * as paymentProvidersNode from "../paymentProvidersNode.js";
import type * as payments from "../payments.js";
import type * as paymentsNode from "../paymentsNode.js";
import type * as plans from "../plans.js";
import type * as subscriptions from "../subscriptions.js";
import type * as usage from "../usage.js";
import type * as users from "../users.js";
import type * as webhookActions from "../webhookActions.js";
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
  "lib/paymentAdapters/dpo": typeof lib_paymentAdapters_dpo;
  "lib/paymentAdapters/factory": typeof lib_paymentAdapters_factory;
  "lib/paymentAdapters/flutterwave": typeof lib_paymentAdapters_flutterwave;
  "lib/paymentAdapters/index": typeof lib_paymentAdapters_index;
  "lib/paymentAdapters/pawapay": typeof lib_paymentAdapters_pawapay;
  "lib/paymentAdapters/pesapal": typeof lib_paymentAdapters_pesapal;
  "lib/paymentAdapters/types": typeof lib_paymentAdapters_types;
  organizations: typeof organizations;
  outgoingWebhookMutations: typeof outgoingWebhookMutations;
  outgoingWebhookQueries: typeof outgoingWebhookQueries;
  outgoingWebhooks: typeof outgoingWebhooks;
  overview: typeof overview;
  paymentProviders: typeof paymentProviders;
  paymentProvidersNode: typeof paymentProvidersNode;
  payments: typeof payments;
  paymentsNode: typeof paymentsNode;
  plans: typeof plans;
  subscriptions: typeof subscriptions;
  usage: typeof usage;
  users: typeof users;
  webhookActions: typeof webhookActions;
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
