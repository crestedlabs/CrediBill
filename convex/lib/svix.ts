"use node";

import { Svix } from "svix";

// ============================================================================
// SVIX CLIENT CONFIGURATION
// ============================================================================

/**
 * Get Svix client instance
 *
 * @param mode - "test" or "live" mode for the Svix API
 * @returns Svix client instance
 * @throws Error if SVIX_API_KEY is not configured
 */
export function getSvixClient(mode: "test" | "live" = "live"): Svix {
  // Get API key from environment
  const apiKey =
    mode === "live"
      ? process.env.SVIX_API_KEY_LIVE
      : process.env.SVIX_API_KEY_TEST;

  if (!apiKey) {
    throw new Error(
      `Svix API key not configured for ${mode} mode. ` +
        `Please set SVIX_API_KEY_${mode.toUpperCase()} in your Convex environment variables.`,
    );
  }

  return new Svix(apiKey);
}

/**
 * Test Svix connection
 *
 * @param mode - "test" or "live" mode
 * @returns True if connection is successful
 */
export async function testSvixConnection(
  mode: "test" | "live" = "live",
): Promise<boolean> {
  try {
    const svix = getSvixClient(mode);
    // Try to list applications as a connection test
    await svix.application.list({ limit: 1 });
    return true;
  } catch (error: any) {
    console.error(
      `[Svix] Connection test failed for ${mode} mode:`,
      error.message,
    );
    return false;
  }
}

// ============================================================================
// APPLICATION MANAGEMENT
// ============================================================================

export interface CreateSvixApplicationParams {
  name: string;
  uid?: string; // Unique identifier (we'll use appId)
}

export interface SvixApplicationResponse {
  id: string;
  name: string;
  uid?: string;
  createdAt: Date;
}

/**
 * Create a Svix application
 * Each CrediBill app maps to one Svix application
 */
export async function createSvixApplication(
  params: CreateSvixApplicationParams,
  mode: "test" | "live" = "live",
): Promise<SvixApplicationResponse> {
  try {
    const svix = getSvixClient(mode);
    const app = await svix.application.create({
      name: params.name,
      uid: params.uid,
    });

    console.log(`[Svix] Created application: ${app.id} (${params.name})`);

    return {
      id: app.id,
      name: app.name,
      uid: app.uid ?? undefined,
      createdAt: app.createdAt,
    };
  } catch (error: any) {
    console.error("[Svix] Failed to create application:", error.message);
    throw new Error(`Failed to create Svix application: ${error.message}`);
  }
}

/**
 * Get a Svix application by ID
 */
export async function getSvixApplication(
  svixAppId: string,
  mode: "test" | "live" = "live",
): Promise<SvixApplicationResponse | null> {
  try {
    const svix = getSvixClient(mode);
    const app = await svix.application.get(svixAppId);

    return {
      id: app.id,
      name: app.name,
      uid: app.uid ?? undefined,
      createdAt: app.createdAt,
    };
  } catch (error: any) {
    if (error.message?.includes("404")) {
      return null;
    }
    console.error("[Svix] Failed to get application:", error.message);
    throw error;
  }
}

/**
 * Delete a Svix application
 */
export async function deleteSvixApplication(
  svixAppId: string,
  mode: "test" | "live" = "live",
): Promise<void> {
  try {
    const svix = getSvixClient(mode);
    await svix.application.delete(svixAppId);
    console.log(`[Svix] Deleted application: ${svixAppId}`);
  } catch (error: any) {
    // Don't throw if already deleted (404)
    if (error.message?.includes("404")) {
      console.log(`[Svix] Application ${svixAppId} already deleted`);
      return;
    }
    console.error("[Svix] Failed to delete application:", error.message);
    throw new Error(`Failed to delete Svix application: ${error.message}`);
  }
}

// ============================================================================
// ENDPOINT MANAGEMENT
// ============================================================================

export interface CreateSvixEndpointParams {
  url: string;
  description?: string;
  version?: number;
  filterTypes?: string[]; // Event types to receive
  channels?: string[];
}

export interface SvixEndpointResponse {
  id: string;
  url: string;
  version: number;
  description?: string;
  filterTypes?: string[];
  channels?: string[];
  disabled: boolean;
  createdAt: Date;
}

/**
 * Create a webhook endpoint in Svix
 */
export async function createSvixEndpoint(
  svixAppId: string,
  params: CreateSvixEndpointParams,
  mode: "test" | "live" = "live",
): Promise<SvixEndpointResponse> {
  try {
    const svix = getSvixClient(mode);

    // Don't send filterTypes to avoid validation errors
    // Svix will deliver all events to the endpoint
    const endpoint = await svix.endpoint.create(svixAppId, {
      url: params.url,
      description: params.description,
      version: params.version || 1,
    });

    console.log(`[Svix] Created endpoint: ${endpoint.id} -> ${params.url}`);

    return {
      id: endpoint.id,
      url: endpoint.url,
      version: endpoint.version,
      description: endpoint.description,
      filterTypes: endpoint.filterTypes ?? undefined,
      channels: endpoint.channels ?? undefined,
      disabled: endpoint.disabled ?? false,
      createdAt: endpoint.createdAt,
    };
  } catch (error: any) {
    console.error("[Svix] Failed to create endpoint:", error.message);
    throw new Error(`Failed to create Svix endpoint: ${error.message}`);
  }
}

/**
 * Update a Svix endpoint
 */
export async function updateSvixEndpoint(
  svixAppId: string,
  endpointId: string,
  params: Partial<CreateSvixEndpointParams>,
  mode: "test" | "live" = "live",
): Promise<SvixEndpointResponse> {
  try {
    const svix = getSvixClient(mode);
    // Fetch current endpoint to get existing values
    const current = await svix.endpoint.get(svixAppId, endpointId);
    const endpoint = await svix.endpoint.update(svixAppId, endpointId, {
      url: params.url ?? current.url,
      description: params.description,
      filterTypes: params.filterTypes ?? current.filterTypes ?? undefined,
      channels: params.channels ?? current.channels ?? undefined,
    });

    console.log(`[Svix] Updated endpoint: ${endpointId}`);

    return {
      id: endpoint.id,
      url: endpoint.url,
      version: endpoint.version,
      description: endpoint.description,
      filterTypes: endpoint.filterTypes ?? undefined,
      channels: endpoint.channels ?? undefined,
      disabled: endpoint.disabled ?? false,
      createdAt: endpoint.createdAt,
    };
  } catch (error: any) {
    console.error("[Svix] Failed to update endpoint:", error.message);
    throw new Error(`Failed to update Svix endpoint: ${error.message}`);
  }
}

/**
 * Disable/Enable a Svix endpoint
 */
export async function toggleSvixEndpoint(
  svixAppId: string,
  endpointId: string,
  disabled: boolean,
  mode: "test" | "live" = "live",
): Promise<void> {
  try {
    const svix = getSvixClient(mode);
    const current = await svix.endpoint.get(svixAppId, endpointId);
    await svix.endpoint.update(svixAppId, endpointId, {
      url: current.url,
      disabled,
    });
    console.log(
      `[Svix] ${disabled ? "Disabled" : "Enabled"} endpoint: ${endpointId}`,
    );
  } catch (error: any) {
    console.error("[Svix] Failed to toggle endpoint:", error.message);
    throw new Error(
      `Failed to ${disabled ? "disable" : "enable"} Svix endpoint: ${error.message}`,
    );
  }
}

/**
 * Delete a Svix endpoint
 */
export async function deleteSvixEndpoint(
  svixAppId: string,
  endpointId: string,
  mode: "test" | "live" = "live",
): Promise<void> {
  try {
    const svix = getSvixClient(mode);
    await svix.endpoint.delete(svixAppId, endpointId);
    console.log(`[Svix] Deleted endpoint: ${endpointId}`);
  } catch (error: any) {
    if (error.message?.includes("404")) {
      console.log(`[Svix] Endpoint ${endpointId} already deleted`);
      return;
    }
    console.error("[Svix] Failed to delete endpoint:", error.message);
    throw new Error(`Failed to delete Svix endpoint: ${error.message}`);
  }
}

/**
 * Get endpoint secret for signature verification
 */
export async function getSvixEndpointSecret(
  svixAppId: string,
  endpointId: string,
  mode: "test" | "live" = "live",
): Promise<string> {
  try {
    const svix = getSvixClient(mode);
    const secret = await svix.endpoint.getSecret(svixAppId, endpointId);
    return secret.key;
  } catch (error: any) {
    console.error("[Svix] Failed to get endpoint secret:", error.message);
    throw new Error(`Failed to get Svix endpoint secret: ${error.message}`);
  }
}

// ============================================================================
// MESSAGE SENDING
// ============================================================================

export interface SendSvixMessageParams {
  eventType: string;
  payload: any;
  eventId?: string; // For idempotency
  channels?: string[];
}

export interface SvixMessageResponse {
  id: string;
  eventType: string;
  eventId?: string;
  timestamp: Date;
}

/**
 * Send a webhook message through Svix
 */
export async function sendSvixMessage(
  svixAppId: string,
  params: SendSvixMessageParams,
  mode: "test" | "live" = "live",
): Promise<SvixMessageResponse> {
  try {
    const svix = getSvixClient(mode);
    const message = await svix.message.create(svixAppId, {
      eventType: params.eventType,
      payload: params.payload,
      eventId: params.eventId,
      channels: params.channels,
    });

    console.log(`[Svix] Sent message: ${message.id} (${params.eventType})`);

    return {
      id: message.id,
      eventType: message.eventType,
      eventId: message.eventId ?? undefined,
      timestamp: message.timestamp,
    };
  } catch (error: any) {
    console.error("[Svix] Failed to send message:", error.message);
    throw new Error(`Failed to send Svix message: ${error.message}`);
  }
}

// ============================================================================
// DASHBOARD ACCESS
// ============================================================================

export interface SvixDashboardAccess {
  url: string;
  token: string;
}

/**
 * Generate a dashboard access URL for customers
 * This allows customers to view their webhook logs in Svix's UI
 */
export async function generateDashboardAccess(
  svixAppId: string,
  mode: "test" | "live" = "live",
): Promise<SvixDashboardAccess> {
  try {
    const svix = getSvixClient(mode);
    const dashboard = await svix.authentication.dashboardAccess(svixAppId);

    console.log(`[Svix] Generated dashboard access for app: ${svixAppId}`);

    return {
      url: dashboard.url,
      token: dashboard.token,
    };
  } catch (error: any) {
    console.error("[Svix] Failed to generate dashboard access:", error.message);
    throw new Error(
      `Failed to generate Svix dashboard access: ${error.message}`,
    );
  }
}

// ============================================================================
// MESSAGE ATTEMPTS (for debugging)
// ============================================================================

export interface SvixMessageAttempt {
  id: string;
  endpointId: string;
  url: string;
  status: number; // HTTP status code
  response: string;
  responseStatusCode: number;
  timestamp: Date;
  triggerType: string;
}

/**
 * Get delivery attempts for a specific message
 * Useful for debugging webhook delivery issues
 */
export async function getMessageAttempts(
  svixAppId: string,
  messageId: string,
  mode: "test" | "live" = "live",
): Promise<SvixMessageAttempt[]> {
  try {
    const svix = getSvixClient(mode);
    const attempts = await svix.messageAttempt.listByMsg(svixAppId, messageId);

    return attempts.data.map((attempt) => ({
      id: attempt.id,
      endpointId: attempt.endpointId,
      url: attempt.url,
      status: attempt.status,
      response: attempt.response,
      responseStatusCode: attempt.responseStatusCode,
      timestamp: attempt.timestamp,
      triggerType: String(attempt.triggerType),
    }));
  } catch (error: any) {
    console.error("[Svix] Failed to get message attempts:", error.message);
    throw new Error(`Failed to get Svix message attempts: ${error.message}`);
  }
}

/**
 * List recent messages for an application
 */
export async function listRecentMessages(
  svixAppId: string,
  limit: number = 50,
  mode: "test" | "live" = "live",
): Promise<SvixMessageResponse[]> {
  try {
    const svix = getSvixClient(mode);
    const messages = await svix.message.list(svixAppId, { limit });

    return messages.data.map((msg) => ({
      id: msg.id,
      eventType: msg.eventType,
      eventId: msg.eventId ?? undefined,
      timestamp: msg.timestamp,
    }));
  } catch (error: any) {
    console.error("[Svix] Failed to list messages:", error.message);
    throw new Error(`Failed to list Svix messages: ${error.message}`);
  }
}
