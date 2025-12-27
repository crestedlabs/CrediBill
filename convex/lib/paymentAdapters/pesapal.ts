/**
 * Pesapal Payment Adapter
 * Supports: Cards (Visa, Mastercard) + Mobile Money (M-Pesa, Airtel Money)
 * Regions: Kenya, Uganda, Tanzania, Rwanda
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

export class PesapalAdapter implements PaymentAdapter {
  readonly provider = "pesapal" as const;

  private apiKey!: string;
  private apiSecret!: string;
  private merchantId!: string;
  private baseUrl!: string;
  private environment!: "test" | "live";

  initialize(
    credentials: ProviderCredentials,
    environment: "test" | "live"
  ): void {
    this.apiKey = credentials.publicKey || "";
    this.apiSecret = credentials.secretKey;
    this.merchantId = credentials.merchantId || "";
    this.environment = environment;
    this.baseUrl =
      environment === "live"
        ? "https://pay.pesapal.com/v3"
        : "https://cybqa.pesapal.com/pesapalv3";
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const payload = {
        id: request.reference,
        currency: request.currency.toUpperCase(),
        amount: request.amount / 100, // Convert from smallest unit
        description: request.description,
        callback_url: request.callbackUrl,
        notification_id: this.merchantId,
        billing_address: {
          email_address: request.customerEmail,
          phone_number: request.customerPhone || "",
          country_code: this.getCountryCode(request.currency),
          first_name: request.customerName?.split(" ")[0] || "",
          last_name: request.customerName?.split(" ").slice(1).join(" ") || "",
        },
      };

      const response = await fetch(
        `${this.baseUrl}/api/Transactions/SubmitOrderRequest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error:
            data.error?.message ||
            data.message ||
            "Payment initialization failed",
        };
      }

      return {
        success: true,
        transactionId: data.order_tracking_id,
        reference: request.reference,
        status: "initiated",
        paymentUrl: data.redirect_url,
      };
    } catch (error: any) {
      return {
        success: false,
        reference: request.reference,
        status: "failed",
        error: error.message,
      };
    }
  }

  async getPaymentStatus(
    transactionId: string
  ): Promise<PaymentStatusResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await fetch(
        `${this.baseUrl}/api/Transactions/GetTransactionStatus?orderTrackingId=${transactionId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error("Payment verification failed");
      }

      const statusLower = data.payment_status_description?.toLowerCase() || "";
      const status = this.mapStatus(statusLower);

      return {
        transactionId: data.order_tracking_id,
        reference: data.merchant_reference,
        status,
        amount: data.amount * 100, // Convert to smallest unit
        currency: data.currency,
        paidAt: status === "success" ? Date.now() : undefined,
        providerResponse: data,
      };
    } catch (error: any) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async verifyWebhook(
    payload: any,
    signature: string
  ): Promise<WebhookVerification> {
    // Pesapal uses IPN (Instant Payment Notification)
    // Verification is done by querying the transaction status
    return { valid: true };
  }

  async parseWebhook(payload: any): Promise<WebhookEvent> {
    const orderTrackingId = payload.OrderTrackingId;
    const merchantReference = payload.OrderMerchantReference;

    if (!orderTrackingId) {
      throw new Error("Invalid webhook payload");
    }

    // Verify the payment status
    const status = await this.getPaymentStatus(orderTrackingId);

    return {
      event: status.status === "success" ? "payment.success" : "payment.failed",
      transactionId: orderTrackingId,
      reference: merchantReference || status.reference,
      amount: status.amount,
      currency: status.currency,
      status: status.status,
      paidAt: status.paidAt,
      rawPayload: payload,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const token = await this.getAccessToken();

      if (token) {
        return {
          success: true,
          message: "Successfully connected to Pesapal API",
        };
      }

      return {
        success: false,
        message: "Failed to authenticate with Pesapal",
        error: "Authentication failed",
      };
    } catch (error: any) {
      return {
        success: false,
        message: "Connection test failed",
        error: error.message,
      };
    }
  }

  getSupportedMethods(): PaymentMethod[] {
    return [
      "card_visa",
      "card_mastercard",
      "mobile_money_mtn",
      "mobile_money_airtel",
    ];
  }

  private async getAccessToken(): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/Auth/RequestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        consumer_key: this.apiKey,
        consumer_secret: this.apiSecret,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to get access token");
    }

    const data = await response.json();
    return data.token;
  }

  private getCountryCode(currency: string): string {
    const currencyMap: Record<string, string> = {
      kes: "KE",
      ugx: "UG",
      tzs: "TZ",
      rwf: "RW",
      usd: "US",
    };
    return currencyMap[currency.toLowerCase()] || "KE";
  }

  private mapStatus(status: string): PaymentStatus {
    if (status === "completed" || status === "success") return "success";
    if (status === "failed" || status === "invalid") return "failed";
    if (status === "cancelled") return "canceled";
    if (status === "processing") return "processing";
    return "pending";
  }
}
