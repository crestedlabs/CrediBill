/**
 * Currency formatting utilities for consistent currency display across the app
 */

export const formatCurrency = (amount: number, currency: string): string => {
  // Show actual values without division
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatCurrencySimple = (
  amount: number,
  currency: string
): string => {
  // Show actual values without division
  return `${currency} ${amount.toLocaleString()}`;
};
