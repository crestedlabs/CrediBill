/**
 * DPO Group Payment Adapter
 * Supports: Cards (Visa, Mastercard, Amex) + Mobile Money + Alternative Payments
 * Regions: Pan-Africa (35+ countries)
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

export class DPOAdapter implements PaymentAdapter {
  readonly provider = "dpo" as const;

  private companyToken!: string;
  private serviceType!: string;
  private baseUrl!: string;
  private environment!: "test" | "live";

  initialize(
    credentials: ProviderCredentials,
    environment: "test" | "live"
  ): void {
    this.companyToken = credentials.secretKey;
    this.serviceType = credentials.merchantId || "3854";
    this.environment = environment;
    this.baseUrl = "https://secure.3gdirectpay.com";
  }

  async initiatePayment(request: PaymentRequest): Promise<PaymentResponse> {
    try {
      const xmlPayload = this.buildCreateTokenXML(request);

      const response = await fetch(`${this.baseUrl}/payv2.php?ID=createToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlPayload,
      });

      const xmlText = await response.text();
      const result = this.parseXMLResponse(xmlText);

      if (result.Result !== "000") {
        return {
          success: false,
          reference: request.reference,
          status: "failed",
          error: result.ResultExplanation || "Payment initialization failed",
        };
      }

      return {
        success: true,
        transactionId: result.TransToken,
        reference: request.reference,
        status: "initiated",
        paymentUrl: `${this.baseUrl}/payv2.php?ID=${result.TransToken}`,
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
    transactionToken: string
  ): Promise<PaymentStatusResponse> {
    try {
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <API3G>
          <CompanyToken>${this.companyToken}</CompanyToken>
          <Request>verifyToken</Request>
          <TransactionToken>${transactionToken}</TransactionToken>
        </API3G>`;

      const response = await fetch(`${this.baseUrl}/payv2.php?ID=verifyToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlPayload,
      });

      const xmlText = await response.text();
      const result = this.parseXMLResponse(xmlText);

      if (result.Result !== "000") {
        throw new Error(
          result.ResultExplanation || "Payment verification failed"
        );
      }

      const status = this.mapStatus(result.TransactionApproval);

      return {
        transactionId: transactionToken,
        reference: result.CompanyRef,
        status,
        amount: parseFloat(result.TransactionAmount || "0") * 100, // Convert to smallest unit
        currency: result.TransactionCurrency,
        paidAt: status === "success" ? Date.now() : undefined,
        providerResponse: result,
      };
    } catch (error: any) {
      throw new Error(`Payment verification failed: ${error.message}`);
    }
  }

  async verifyWebhook(payload: any): Promise<WebhookVerification> {
    // DPO verification is done by calling verifyToken
    return { valid: true };
  }

  async parseWebhook(payload: any): Promise<WebhookEvent> {
    const transactionToken =
      payload.TransactionToken || payload.transactionToken;
    const companyRef = payload.CompanyRef || payload.companyRef;

    if (!transactionToken) {
      throw new Error("Invalid webhook payload");
    }

    // Verify the payment
    const status = await this.getPaymentStatus(transactionToken);

    return {
      event: status.status === "success" ? "payment.success" : "payment.failed",
      transactionId: transactionToken,
      reference: companyRef || status.reference,
      amount: status.amount,
      currency: status.currency,
      status: status.status,
      paidAt: status.paidAt,
      rawPayload: payload,
    };
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Test by creating a minimal token request
      const xmlPayload = `<?xml version="1.0" encoding="utf-8"?>
        <API3G>
          <CompanyToken>${this.companyToken}</CompanyToken>
          <Request>createToken</Request>
          <Transaction>
            <PaymentAmount>1.00</PaymentAmount>
            <PaymentCurrency>USD</PaymentCurrency>
            <CompanyRef>test-connection</CompanyRef>
            <RedirectURL>https://example.com</RedirectURL>
            <BackURL>https://example.com</BackURL>
            <CompanyRefUnique>1</CompanyRefUnique>
            <PTL>5</PTL>
          </Transaction>
          <Services>
            <Service>
              <ServiceType>${this.serviceType}</ServiceType>
              <ServiceDescription>Connection Test</ServiceDescription>
              <ServiceDate>${new Date().toISOString().split("T")[0]}</ServiceDate>
            </Service>
          </Services>
        </API3G>`;

      const response = await fetch(`${this.baseUrl}/payv2.php?ID=createToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/xml",
        },
        body: xmlPayload,
      });

      const xmlText = await response.text();
      const result = this.parseXMLResponse(xmlText);

      if (result.Result === "000" || result.Result === "901") {
        // 901 = duplicate reference (acceptable for test)
        return {
          success: true,
          message: "Successfully connected to DPO API",
        };
      }

      return {
        success: false,
        message: "Failed to authenticate with DPO",
        error: result.ResultExplanation || "Authentication failed",
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
      "mobile_money_vodacom",
    ];
  }

  private buildCreateTokenXML(request: PaymentRequest): string {
    const amount = (request.amount / 100).toFixed(2); // Convert to main unit
    const currency = request.currency.toUpperCase();
    const reference = request.reference;

    return `<?xml version="1.0" encoding="utf-8"?>
      <API3G>
        <CompanyToken>${this.companyToken}</CompanyToken>
        <Request>createToken</Request>
        <Transaction>
          <PaymentAmount>${amount}</PaymentAmount>
          <PaymentCurrency>${currency}</PaymentCurrency>
          <CompanyRef>${reference}</CompanyRef>
          <RedirectURL>${request.callbackUrl || "https://example.com/success"}</RedirectURL>
          <BackURL>${request.callbackUrl || "https://example.com/cancel"}</BackURL>
          <CompanyRefUnique>1</CompanyRefUnique>
          <PTL>5</PTL>
          ${request.customerEmail ? `<customerEmail>${request.customerEmail}</customerEmail>` : ""}
          ${request.customerPhone ? `<customerPhone>${request.customerPhone}</customerPhone>` : ""}
          ${request.customerName ? `<customerName>${request.customerName}</customerName>` : ""}
        </Transaction>
        <Services>
          <Service>
            <ServiceType>${this.serviceType}</ServiceType>
            <ServiceDescription>${request.description}</ServiceDescription>
            <ServiceDate>${new Date().toISOString().split("T")[0]}</ServiceDate>
          </Service>
        </Services>
      </API3G>`;
  }

  private parseXMLResponse(xml: string): Record<string, string> {
    const result: Record<string, string> = {};
    const regex = /<([^>]+)>([^<]*)<\/\1>/g;
    let match;

    while ((match = regex.exec(xml)) !== null) {
      result[match[1]] = match[2];
    }

    return result;
  }

  private mapStatus(approval: string): PaymentStatus {
    if (approval === "1") return "success";
    if (approval === "0") return "failed";
    if (approval === "2") return "canceled";
    return "pending";
  }
}
