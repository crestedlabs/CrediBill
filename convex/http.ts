import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";
import { Id } from "./_generated/dataModel";

const http = httpRouter();

// Helper function for API key authentication
async function authenticateApiKey(
  ctx: any,
  request: Request,
  requiredScope: string
) {
  // Get API key from Authorization header
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      error: new Response(
        JSON.stringify({ error: "Missing or invalid Authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix

  // Verify API key and get app context
  const keyValidation = await ctx.runQuery(api.apiKeys.verifyApiKey, {
    secret: apiKey,
  });

  if (!keyValidation.valid || !keyValidation.apiKey) {
    return {
      error: new Response(
        JSON.stringify({
          error: keyValidation.error || "The API key is invalid",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  // Check if key has required permissions
  if (!keyValidation.apiKey.scopes.includes(requiredScope)) {
    return {
      error: new Response(
        JSON.stringify({ error: `API key lacks ${requiredScope} permissions` }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      ),
    };
  }

  return {
    appId: keyValidation.apiKey.appId,
    apiKeyId: keyValidation.apiKeyId,
    organizationId: keyValidation.apiKey.organizationId,
  };
}

// Usage tracking endpoint for external apps
http.route({
  path: "/api/usage",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Authenticate API key
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      // Parse request body
      const body = await request.json();
      const { subscriptionId, quantity, metric, eventId, metadata } = body;

      // Validate required fields
      if (!subscriptionId || !quantity || !metric) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: subscriptionId, quantity, metric",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate quantity is a number and positive
      if (typeof quantity !== "number" || quantity <= 0) {
        return new Response(
          JSON.stringify({ error: "Quantity must be a positive number" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Record the usage event with app scoping
      const result = await ctx.runMutation(
        internal.usage.recordUsageEventInternal,
        {
          subscriptionId,
          quantity,
          metric,
          timestamp: Date.now(),
          eventId: eventId || undefined,
          metadata: metadata || undefined,
          appId, // Pass appId for scoping validation
        }
      );

      // Update API key last used timestamp
      await ctx.runMutation(api.apiKeys.updateLastUsed, {
        apiKeyId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          usageEventId: result.usageEventId,
          duplicate: result.duplicate,
        }),
        {
          status: result.duplicate ? 200 : 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error recording usage:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Create customer endpoint
http.route({
  path: "/api/customers",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();
      const {
        email,
        first_name,
        last_name,
        phone,
        externalCustomerId,
        metadata,
        type,
        status,
      } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing required field: email" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const customerId = await ctx.runMutation(
        internal.customers.createCustomerInternal,
        {
          appId,
          email,
          first_name,
          last_name,
          phone,
          externalCustomerId,
          metadata,
          type,
          status,
        }
      );

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(JSON.stringify({ success: true, customerId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Get customer endpoint
http.route({
  path: "/api/customers",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "read");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const url = new URL(request.url);
      const customerId = url.searchParams.get("customerId");

      if (!customerId) {
        // List customers for the app
        const customers = await ctx.runQuery(
          internal.customers.listCustomersInternal,
          {
            appId,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ customers }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Get specific customer
        const customer = await ctx.runQuery(
          internal.customers.getCustomerInternal,
          {
            customerId: customerId as Id<"customers">,
            appId,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ customer }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Subscriptions API endpoints
http.route({
  path: "/api/subscriptions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();
      const { customerId, planId, startDate } = body;

      if (!customerId || !planId) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: customerId, planId",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const result = await ctx.runMutation(
        internal.subscriptions.createSubscriptionInternal,
        {
          appId,
          customerId,
          planId,
          startDate,
        }
      );

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(JSON.stringify({ success: true, ...result }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/subscriptions",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "read");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const url = new URL(request.url);
      const subscriptionId = url.searchParams.get("subscriptionId");
      const customerId = url.searchParams.get("customerId");
      const planId = url.searchParams.get("planId");
      const status = url.searchParams.get("status");

      if (subscriptionId) {
        // Get specific subscription
        const subscription = await ctx.runQuery(
          internal.subscriptions.getSubscriptionInternal,
          {
            subscriptionId: subscriptionId as Id<"subscriptions">,
            appId,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ subscription }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // List subscriptions with optional filters
        const subscriptions = await ctx.runQuery(
          internal.subscriptions.listSubscriptionsInternal,
          {
            appId,
            customerId: customerId
              ? (customerId as Id<"customers">)
              : undefined,
            planId: planId ? (planId as Id<"plans">) : undefined,
            status: status as any,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ subscriptions }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/subscriptions",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const url = new URL(request.url);
      const subscriptionId = url.searchParams.get("subscriptionId");
      const cancelAtPeriodEnd = url.searchParams.get("cancelAtPeriodEnd");

      if (!subscriptionId) {
        return new Response(
          JSON.stringify({ error: "Missing subscriptionId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(internal.subscriptions.cancelSubscriptionInternal, {
        subscriptionId: subscriptionId as Id<"subscriptions">,
        appId,
        cancelAtPeriodEnd: cancelAtPeriodEnd === "true",
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(
        JSON.stringify({ success: true, message: "Subscription cancelled" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Plans API endpoints
http.route({
  path: "/api/plans",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();

      const planId = await ctx.runMutation(internal.plans.createPlanInternal, {
        appId,
        ...body,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(JSON.stringify({ success: true, planId }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/plans",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "read");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const plans = await ctx.runQuery(internal.plans.getPlansByAppInternal, {
        appId,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(JSON.stringify({ plans }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/plans",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();
      const { planId, ...updates } = body;

      if (!planId) {
        return new Response(
          JSON.stringify({ error: "Missing planId in request body" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(internal.plans.updatePlanInternal, {
        planId,
        appId,
        ...updates,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(
        JSON.stringify({ success: true, message: "Plan updated" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/plans",
  method: "DELETE",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const url = new URL(request.url);
      const planId = url.searchParams.get("planId");

      if (!planId) {
        return new Response(
          JSON.stringify({ error: "Missing planId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(internal.plans.deletePlanInternal, {
        planId: planId as Id<"plans">,
        appId,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(
        JSON.stringify({ success: true, message: "Plan deleted" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Invoices API endpoints
http.route({
  path: "/api/invoices",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "read");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const url = new URL(request.url);
      const invoiceId = url.searchParams.get("invoiceId");
      const customerId = url.searchParams.get("customerId");
      const subscriptionId = url.searchParams.get("subscriptionId");
      const status = url.searchParams.get("status");

      if (invoiceId) {
        // Get specific invoice
        const invoice = await ctx.runQuery(
          internal.invoices.getInvoiceByIdInternal,
          {
            invoiceId: invoiceId as Id<"invoices">,
            appId,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ invoice }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // List invoices with optional filters
        const invoices = await ctx.runQuery(
          internal.invoices.listInvoicesInternal,
          {
            appId,
            customerId: customerId
              ? (customerId as Id<"customers">)
              : undefined,
            subscriptionId: subscriptionId
              ? (subscriptionId as Id<"subscriptions">)
              : undefined,
            status: status as any,
          }
        );

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        // If filtering by subscription and status=open, return single invoice or null
        // This makes it easier for developers to get the current unpaid invoice
        if (subscriptionId && status === "open") {
          const openInvoice = invoices[0] || null;
          return new Response(JSON.stringify({ invoice: openInvoice }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ invoices }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/api/invoices",
  method: "PATCH",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();
      const { invoiceId, status, amountPaid, paidDate } = body;

      if (!invoiceId || !status) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: invoiceId, status",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      await ctx.runMutation(internal.invoices.updateInvoiceStatusInternal, {
        invoiceId,
        appId,
        status,
        amountPaid,
        paidDate,
      });

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(
        JSON.stringify({ success: true, message: "Invoice updated" }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({ error: error.message || "Internal server error" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occured", { status: 400 });
    }
    switch (event.type) {
      case "user.created": // intentional fallthrough
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.deleted": {
        const clerkUserId = event.data.id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

// ==========================================
// PAYMENT PROVIDER WEBHOOKS
// ==========================================

/**
 * Flutterwave webhook endpoint
 * Signature: verif-hash header with SHA256 HMAC
 */
http.route({
  path: "/webhooks/flutterwave/{appId}",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const signature = request.headers.get("verif-hash") || "";
    const appId = request.url.split("/").pop() as Id<"apps">;

    const result = await ctx.runAction(
      internal.webhookActions.handleFlutterwaveWebhook,
      {
        payload,
        signature,
        appId,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * PawaPay webhook endpoint (via Cloudflare Worker)
 * Receives forwarded webhooks from Cloudflare Worker at https://api.credibill.tech
 *
 * Expected payload from Worker:
 * {
 *   appId: "j57eddw6wf2c80mfrtwxfzrhbs7y5wsd",
 *   payload: { data: {...}, status: "FOUND" }
 * }
 *
 * Authentication: X-Webhook-Secret header (case-insensitive)
 */
http.route({
  path: "/webhooks/pawapay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate webhook secret (stored in Convex environment variables)
      const EXPECTED_SECRET = process.env.CREDIBILL_WEBHOOK_SECRET;
      const providedSecret = request.headers.get("x-webhook-secret");

      if (!EXPECTED_SECRET || providedSecret !== EXPECTED_SECRET) {
        console.error("[PawaPay] Unauthorized webhook attempt");
        return new Response("Unauthorized", { status: 401 });
      }

      // Parse request body from Cloudflare Worker
      const body = await request.json();
      const { appId, payload } = body;

      if (!appId || !payload) {
        console.error("[PawaPay] Missing appId or payload in request body");
        return new Response("Bad Request", { status: 400 });
      }

      // Schedule async processing (does not block response)
      await ctx.scheduler.runAfter(
        0,
        internal.webhookActions.handlePawapayWebhook,
        {
          payload: JSON.stringify(payload),
          appId: appId as Id<"apps">,
        }
      );

      return new Response("OK", { status: 200 });
    } catch (error: any) {
      console.error("[PawaPay] Error processing webhook:", error);
      return new Response("OK", { status: 200 }); // Still return 200 for Worker
    }
  }),
});

/**
 * Pesapal webhook endpoint (IPN)
 * Uses OrderTrackingId and OrderMerchantReference for verification
 */
http.route({
  path: "/webhooks/pesapal/{appId}",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const appId = request.url.split("/").pop() as Id<"apps">;

    const result = await ctx.runAction(
      internal.webhookActions.handlePesapalWebhook,
      {
        payload,
        appId,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * DPO webhook endpoint
 * Uses CompanyToken for verification
 */
http.route({
  path: "/webhooks/dpo/{appId}",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const appId = request.url.split("/").pop() as Id<"apps">;

    const result = await ctx.runAction(
      internal.webhookActions.handleDpoWebhook,
      {
        payload,
        appId,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

http.route({
  path: "/hello-pawapay",
  method: "POST",
  handler: httpAction(async () => {
    return new Response("I acknowledge receipt", { status: 200 });
  }),
});

export default http;
