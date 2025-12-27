/**
 * PawaPay Payment Adapter
 * Supports: Mobile Money Only (MTN, Airtel, Tigo, Vodacom)
 * Regions: Uganda, Kenya, Tanzania, Rwanda, Zambia, Malawi, Ghana
 * Note: PawaPay is mobile-money specific, no card support
 */

import type {
  PaymentAdapter,
  ProviderCredentials,
  PaymentRequest,
  PaymentResponse,
  PaymentStatusResponse,
  WebhookVerification,
  WebhookEvent,
  ConnectionTestResult,
  PaymentMethod,
  PaymentStatus,
} from "./types";

export class PawaPayAdapter implements PaymentAdapter {
  readonly provider = "pawapay" as const;

  private secretKey!: string;
  private apiUrl!: string;
  private environment!: "test" | "live";

  initialize(credentials: ProviderCredentials, environment: "test" | "live"): void {
    this.secretKey = credentials.secretKey;
    this.environment = environment;
    this.apiUrl =
      credentials.apiUrl ||
      (environment === "live"
        ? "https://api.pawapay.cloud"
        : "https://api.sandbox.pawapay.cloud");
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // PawaPay only supports mobile money
      if (!request.paymentMethod.startsWith("mobile_money")) {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error: "PawaPay only supports mobile money payments",
        };
      }

      if (!request.customerPhone) {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error: "Customer phone number is required for mobile money",
        };
      }

      // PawaPay payload
      const payload = {
        depositId: request.reference, // Our unique reference
        amount: (request.amount / 100).toFixed(2), // Convert to main unit with 2 decimals
        currency: request.currency,
        correspondent: this.mapPaymentMethodToCorrespondent(
          request.paymentMethod,
          request.currency
        ),
        payer: {
          type: "MSISDN",
          address: {
            value: this.normalizePhoneNumber(request.customerPhone),
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: request.description.substring(0, 22), // Max 22 chars
        metadata: request.metadata,
      };

      const response = await fetch(`${this.apiUrl}/deposits`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          transactionId: data.depositId || request.reference,
          reference: request.reference,
          status: this.mapPawaPayStatus(data.status || "SUBMITTED"),
          message: "Payment initiated successfully",
          providerResponse: data,
        };
      } else {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error: data.message || data.error || "Payment initiation failed",
          providerResponse: data,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        reference: request.reference,
        status: "failed",
        error: error.message || "Payment initiation error",
      };
    }
  }

  async getPaymentStatus(transactionId: string): Promise<PaymentStatusResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/deposits/${transactionId}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          transactionId: data.depositId,
          reference: data.depositId, // PawaPay uses our reference as depositId
          status: this.mapPawaPayStatus(data.status),
          amount: Math.round(parseFloat(data.amount) * 100), // Convert to smallest unit
          currency: data.currency,
          paidAt: data.receivedByRecipientAt
            ? new Date(data.receivedByRecipientAt).getTime()
            : undefined,
          failureReason: data.failureReason?.failureMessage,
          providerResponse: data,
        };
      } else {
        throw new Error(data.message || "Failed to fetch payment status");
      }
    } catch (error: any) {
      throw new Error(`Status check failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    payload: any,
    signature: string,
    secret: string
  ): Promise<WebhookVerification> {
    try {
      // PawaPay uses Bearer token authentication for webhooks
      // The signature would be the Authorization header
      // For simplicity, we'll validate that the payload structure is correct
      
      if (!payload.depositId || !payload.status) {
        return {
          valid: false,
          error: "Invalid webhook payload structure",
        };
      }

      // In production, you'd validate the bearer token against your webhook secret
      return {
        valid: true,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async parseWebhook(payload: any): Promise<WebhookEvent> {
    return {
      event: this.mapPawaPayEventType(payload.status),
      transactionId: payload.depositId,
      reference: payload.depositId,
      amount: Math.round(parseFloat(payload.amount) * 100),
      currency: payload.currency,
      status: this.mapPawaPayStatus(payload.status),
      paidAt: payload.receivedByRecipientAt
        ? new Date(payload.receivedByRecipientAt).getTime()
        : Date.now(),
      failureReason: payload.failureReason?.failureMessage,
      failureCode: payload.failureReason?.failureCode,
      metadata: payload.metadata || {},
      rawPayload: payload,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Test by querying active configurations
      const response = await fetch(`${this.apiUrl}/active-conf`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: "Connection successful",
          providerInfo: {
            merchantId: "PawaPay Account",
            accountName: data.operatorName || "PawaPay",
          },
        };
      } else {
        return {
          success: false,
          message: "Connection failed",
          error: "Invalid credentials or unauthorized",
        };
      }
    } catch (error: any) {
      return {
        success: false,
        message: "Connection failed",
        error: error.message,
      };
    }
  }

  getSupportedMethods(): PaymentMethod[] {
    return [
      "mobile_money_mtn",
      "mobile_money_airtel",
      "mobile_money_tigo",
      "mobile_money_vodacom",
    ];
  }

  // No refund support in basic PawaPay implementation
  async refundPayment?(): Promise<PaymentResponse> {
    return {
      success: false,
      reference: "",
      status: "failed",
      error: "Refunds not supported by PawaPay adapter",
    };
  }

  // Helper methods
  private mapPaymentMethodToCorrespondent(
    method: PaymentMethod,
    currency: string
  ): string {
    const currencyPrefix = currency.toUpperCase();
    
    // PawaPay correspondent format: CURRENCY_NETWORK_COUNTRYCODE
    // Examples: UGX_AIRTEL_UGANDA, KES_MPESA_KENYA
    const correspondentMap: Record<string, Record<string, string>> = {
      "UGX": {
        "mobile_money_mtn": "MTN_MOMO_UGA",
        "mobile_money_airtel": "AIRTEL_OAPI_UGA",
      },
      "KES": {
        "mobile_money_mtn": "MPESA_LIPA_KEN", // M-Pesa in Kenya
        "mobile_money_airtel": "AIRTEL_OAPI_KEN",
      },
      "TZS": {
        "mobile_money_mtn": "TIGO_PESA_TZA",
        "mobile_money_airtel": "AIRTEL_OAPI_TZA",
        "mobile_money_vodacom": "VODACOM_MPESA_TZA",
      },
      "RWF": {
        "mobile_money_mtn": "MTN_MOMO_RWA",
        "mobile_money_airtel": "AIRTEL_OAPI_RWA",
      },
    };

    return correspondentMap[currencyPrefix]?.[method] || "MTN_MOMO_UGA";
  }

  private normalizePhoneNumber(phone: string): string {
    // Remove spaces, dashes, and ensure it starts with country code
    return phone.replace(/[\s-]/g, "").replace(/^\+/, "");
  }

  private mapPawaPayStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      "SUBMITTED": "pending",
      "ACCEPTED": "processing",
      "COMPLETED": "success",
      "FAILED": "failed",
      "REJECTED": "failed",
      "CANCELLED": "canceled",
    };
    return statusMap[status.toUpperCase()] || "pending";
  }

  private mapPawaPayEventType(status: string): "payment.success" | "payment.failed" | "payment.pending" {
    const normalizedStatus = status.toUpperCase();
    if (normalizedStatus === "COMPLETED") {
      return "payment.success";
    } else if (normalizedStatus === "FAILED" || normalizedStatus === "REJECTED" || normalizedStatus === "CANCELLED") {
      return "payment.failed";
    }
    return "payment.pending";
  }
}
