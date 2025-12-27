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
          error: keyValidation.error || "Invalid API key",
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
      const { email, first_name, last_name, phone } = body;

      if (!email) {
        return new Response(
          JSON.stringify({ error: "Missing required field: email" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const customerId = await ctx.runMutation(api.customers.createCustomer, {
        appId,
        email,
        first_name: first_name || "",
        last_name: last_name || "",
        phone: phone || "",
      });

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
        const customers = await ctx.runQuery(api.customers.listCustomers, {
          appId,
        });

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ customers }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // Get specific customer
        const customer = await ctx.runQuery(api.customers.getCustomer, {
          customerId: customerId as Id<"customers">,
        });

        if (!customer || customer.appId !== appId) {
          return new Response(JSON.stringify({ error: "Customer not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

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

// Create subscription endpoint
http.route({
  path: "/api/subscriptions",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const auth = await authenticateApiKey(ctx, request, "write");
      if (auth.error) return auth.error;
      const { appId, apiKeyId } = auth;

      const body = await request.json();
      const { customerId, planId, startDate, trialDays } = body;

      if (!customerId || !planId) {
        return new Response(
          JSON.stringify({
            error: "Missing required fields: customerId, planId",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const subscriptionId = await ctx.runMutation(
        api.subscriptions.createSubscription,
        {
          appId,
          customerId,
          planId,
          startDate,
          trialDays,
        }
      );

      await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

      return new Response(JSON.stringify({ success: true, subscriptionId }), {
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

// List invoices endpoint
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
      const status = url.searchParams.get("status");

      if (invoiceId) {
        // Get specific invoice
        const invoice = await ctx.runQuery(api.invoices.getInvoiceById, {
          invoiceId: invoiceId as Id<"invoices">,
        });

        if (!invoice || invoice.appId !== appId) {
          return new Response(JSON.stringify({ error: "Invoice not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

        return new Response(JSON.stringify({ invoice }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      } else {
        // List invoices for the app
        const invoices = await ctx.runQuery(api.invoices.listInvoices, {
          appId,
          customerId: customerId as Id<"customers"> | undefined,
          status: status as any,
        });

        await ctx.runMutation(api.apiKeys.updateLastUsed, { apiKeyId });

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
  path: "/webhooks/flutterwave",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const signature = request.headers.get("verif-hash") || "";

    const result = await ctx.runAction(
      internal.webhookActions.handleFlutterwaveWebhook,
      {
        payload,
        signature,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * PawaPay webhook endpoint
 * Signature: X-Signature header with HMAC-SHA256
 */
http.route({
  path: "/webhooks/pawapay",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();
    const signature = request.headers.get("x-signature") || "";

    const result = await ctx.runAction(
      internal.webhookActions.handlePawapayWebhook,
      {
        payload,
        signature,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

/**
 * Pesapal webhook endpoint (IPN)
 * Uses OrderTrackingId and OrderMerchantReference for verification
 */
http.route({
  path: "/webhooks/pesapal",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();

    const result = await ctx.runAction(
      internal.webhookActions.handlePesapalWebhook,
      {
        payload,
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
  path: "/webhooks/dpo",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const payload = await request.text();

    const result = await ctx.runAction(
      internal.webhookActions.handleDpoWebhook,
      {
        payload,
      }
    );

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
