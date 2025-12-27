/**
 * Adapter Factory
 * Creates appropriate payment adapter based on provider type
 */

import type { PaymentAdapter, PaymentProvider } from "./types";
import { FlutterwaveAdapter } from "./flutterwave";
import { PawaPayAdapter } from "./pawapay";
import { PesapalAdapter } from "./pesapal";
import { DPOAdapter } from "./dpo";

/**
 * Create a payment adapter instance for the specified provider
 * Note: The adapter must be initialized with credentials before use
 */
export function createPaymentAdapter(
  provider: PaymentProvider,
  credentials: { publicKey?: string; secretKey: string; merchantId?: string; apiUrl?: string },
  environment: "test" | "live"
): PaymentAdapter {
  let adapter: PaymentAdapter;

  switch (provider) {
    case "flutterwave":
      adapter = new FlutterwaveAdapter();
      break;
    case "pawapay":
      adapter = new PawaPayAdapter();
      break;
    case "pesapal":
      adapter = new PesapalAdapter();
      break;
    case "dpo":
      adapter = new DPOAdapter();
      break;
    case "paystack":
    case "stripe":
      throw new Error(`${provider} adapter not yet implemented`);
    default:
      throw new Error(`Unknown payment provider: ${provider}`);
  }

  // Initialize with credentials
  adapter.initialize(credentials, environment);
  return adapter;
}

/**
 * Check if a provider is supported
 */
export function isProviderSupported(provider: string): provider is PaymentProvider {
  const supported: PaymentProvider[] = ["flutterwave", "pawapay", "pesapal", "dpo"];
  return supported.includes(provider as PaymentProvider);
}

/**
 * Get list of all supported providers
 */
export function getSupportedProviders(): PaymentProvider[] {
  return ["flutterwave", "pawapay", "pesapal", "dpo"];
}

/**
 * Get provider display names
 */
export function getProviderDisplayName(provider: PaymentProvider): string {
  const names: Record<PaymentProvider, string> = {
    flutterwave: "Flutterwave",
    pawapay: "PawaPay",
    pesapal: "Pesapal",
    dpo: "DPO Group",
    paystack: "Paystack",
    stripe: "Stripe",
  };
  return names[provider] || provider;
}

/**
 * Get provider descriptions
 */
export function getProviderDescription(provider: PaymentProvider): string {
  const descriptions: Record<PaymentProvider, string> = {
    flutterwave: "Mobile Money (MTN, Airtel, Tigo, Vodacom) + Cards (Visa, Mastercard) across Africa",
    pawapay: "Mobile Money only (MTN, Airtel, Tigo) - East Africa focused",
    pesapal: "Cards + Mobile Money - East Africa",
    dpo: "Cards + Alternative payments - Africa-wide",
    paystack: "Cards + Bank transfers + Mobile money - West Africa focused",
    stripe: "Global card payments + bank transfers",
  };
  return descriptions[provider] || "";
}

/**
 * Get provider regions
 */
export function getProviderRegions(provider: PaymentProvider): string[] {
  const regions: Record<PaymentProvider, string[]> = {
    flutterwave: ["Uganda", "Kenya", "Tanzania", "Rwanda", "Ghana", "Nigeria", "South Africa"],
    pawapay: ["Uganda", "Kenya", "Tanzania", "Rwanda", "Zambia", "Malawi", "Ghana"],
    pesapal: ["Uganda", "Kenya", "Tanzania", "Rwanda"],
    dpo: ["Africa-wide"],
    paystack: ["Nigeria", "Ghana", "Kenya", "South Africa"],
    stripe: ["Global"],
  };
  return regions[provider] || [];
}
