/**
 * Flutterwave Payment Adapter
 * Supports: Mobile Money (MTN, Airtel, Vodafone, Tigo), Cards (Visa, Mastercard)
 * Regions: Uganda, Kenya, Tanzania, Rwanda, Ghana, Nigeria, South Africa
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

export class FlutterwaveAdapter implements PaymentAdapter {
  readonly provider = "flutterwave" as const;

  private secretKey!: string;
  private publicKey?: string;
  private apiUrl!: string;
  private environment!: "test" | "live";

  initialize(credentials: ProviderCredentials, environment: "test" | "live"): void {
    this.secretKey = credentials.secretKey;
    this.publicKey = credentials.publicKey;
    this.environment = environment;
    this.apiUrl = credentials.apiUrl || "https://api.flutterwave.com/v3";
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      // Determine payment type based on method
      let payload: any;

      if (request.paymentMethod.startsWith("mobile_money")) {
        // Mobile Money Payment
        payload = {
          tx_ref: request.reference,
          amount: request.amount / 100, // Convert from smallest unit to main unit
          currency: request.currency,
          email: request.customerEmail,
          phone_number: request.customerPhone,
          fullname: request.customerName || "Customer",
          redirect_url: request.callbackUrl,
          meta: request.metadata,
          
          // Mobile money specific
          type: "mobile_money_uganda", // Will be mapped based on currency
          network: this.mapPaymentMethodToNetwork(request.paymentMethod),
        };
      } else if (request.paymentMethod.startsWith("card")) {
        // Card Payment (Standard)
        payload = {
          tx_ref: request.reference,
          amount: request.amount / 100,
          currency: request.currency,
          email: request.customerEmail,
          customer: {
            email: request.customerEmail,
            name: request.customerName || "Customer",
            phone_number: request.customerPhone,
          },
          customizations: {
            title: "CrediBill Payment",
            description: request.description,
          },
          redirect_url: request.callbackUrl,
          meta: request.metadata,
        };
      } else {
        throw new Error(`Unsupported payment method: ${request.paymentMethod}`);
      }

      // Make API request
      const response = await fetch(`${this.apiUrl}/charges?type=${this.getChargeType(request.paymentMethod)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          success: true,
          transactionId: data.data.id?.toString(),
          reference: request.reference,
          status: this.mapFlutterwaveStatus(data.data.status),
          paymentUrl: data.data.link, // Redirect URL for customer
          message: data.message,
          providerResponse: data,
        };
      } else {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error: data.message || "Payment initiation failed",
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
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}/verify`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          transactionId: data.data.id?.toString(),
          reference: data.data.tx_ref,
          status: this.mapFlutterwaveStatus(data.data.status),
          amount: Math.round(data.data.amount * 100), // Convert to smallest unit
          currency: data.data.currency,
          paidAt: data.data.created_at ? new Date(data.data.created_at).getTime() : undefined,
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
      // Flutterwave uses a hash verification
      const crypto = await import("crypto");
      const hash = crypto
        .createHmac("sha256", secret)
        .update(JSON.stringify(payload))
        .digest("hex");

      return {
        valid: hash === signature,
        error: hash !== signature ? "Invalid webhook signature" : undefined,
      };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  async parseWebhook(payload: any): Promise<WebhookEvent> {
    const data = payload.data || payload;
    
    return {
      event: this.mapFlutterwaveEventType(data.status),
      transactionId: data.id?.toString() || data.flw_ref,
      reference: data.tx_ref,
      amount: Math.round((data.amount || 0) * 100), // Convert to smallest unit
      currency: data.currency,
      status: this.mapFlutterwaveStatus(data.status),
      paidAt: data.created_at ? new Date(data.created_at).getTime() : Date.now(),
      failureReason: data.processor_response,
      metadata: data.meta || {},
      rawPayload: payload,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Test API key by fetching wallet balance or making a simple API call
      const response = await fetch(`${this.apiUrl}/balances`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          success: true,
          message: "Connection successful",
          providerInfo: {
            accountName: data.data?.[0]?.available_balance ? "Flutterwave Account" : undefined,
            balance: data.data?.[0]?.available_balance,
            currency: data.data?.[0]?.currency,
          },
        };
      } else {
        return {
          success: false,
          message: "Connection failed",
          error: data.message || "Invalid credentials",
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
      "card_visa",
      "card_mastercard",
    ];
  }

  async refundPayment(
    transactionId: string,
    amount?: number,
    reason?: string
  ): Promise<PaymentResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/transactions/${transactionId}/refund`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: amount ? amount / 100 : undefined, // Convert to main unit
          comments: reason,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        return {
          success: true,
          transactionId: data.data.id?.toString(),
          reference: data.data.tx_ref,
          status: "refunded",
          message: data.message,
          providerResponse: data,
        };
      } else {
        return {
          success: false,
          reference: "",
          status: "failed",
          error: data.message || "Refund failed",
          providerResponse: data,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        reference: "",
        status: "failed",
        error: error.message,
      };
    }
  }

  // Helper methods
  private mapPaymentMethodToNetwork(method: PaymentMethod): string {
    const map: Record<string, string> = {
      "mobile_money_mtn": "MTN",
      "mobile_money_airtel": "AIRTEL",
      "mobile_money_tigo": "TIGO",
      "mobile_money_vodacom": "VODAFONE",
    };
    return map[method] || "MTN";
  }

  private getChargeType(method: PaymentMethod): string {
    if (method.startsWith("mobile_money")) {
      return "mobile_money_uganda"; // Will be adjusted based on currency
    } else if (method.startsWith("card")) {
      return "card";
    }
    return "card";
  }

  private mapFlutterwaveStatus(status: string): PaymentStatus {
    const statusMap: Record<string, PaymentStatus> = {
      "successful": "success",
      "success": "success",
      "pending": "pending",
      "failed": "failed",
      "cancelled": "canceled",
      "refunded": "refunded",
    };
    return statusMap[status.toLowerCase()] || "pending";
  }

  private mapFlutterwaveEventType(status: string): "payment.success" | "payment.failed" | "payment.pending" {
    const normalizedStatus = status.toLowerCase();
    if (normalizedStatus === "successful" || normalizedStatus === "success") {
      return "payment.success";
    } else if (normalizedStatus === "failed" || normalizedStatus === "cancelled") {
      return "payment.failed";
    }
    return "payment.pending";
  }
}
