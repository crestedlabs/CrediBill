/**
 * Utility functions for parsing and displaying user-friendly error messages
 */

export interface UserFriendlyError {
  message: string;
  code?: string;
}

/**
 * Parse a Convex error and extract the user-friendly message
 * Handles both string errors and structured error objects
 */
export function parseConvexError(error: any): string {
  if (!error) return "An unexpected error occurred";

  // If the error has a message property, use that
  let errorMessage = error.message || error.toString();

  // Try to extract user-friendly error from ConvexError
  try {
    // Check if the error message contains a JSON-like error object
    if (errorMessage.includes('{"message":')) {
      const jsonStart = errorMessage.indexOf('{"message":');
      const jsonEnd = errorMessage.indexOf("}", jsonStart) + 1;
      const errorJson = errorMessage.substring(jsonStart, jsonEnd);
      const parsedError = JSON.parse(errorJson);
      return parsedError.message || "An error occurred";
    }

    // Check for common error patterns and make them user-friendly
    if (errorMessage.includes("ConvexError:")) {
      const convexErrorStart = errorMessage.indexOf("ConvexError: ") + 13;
      const convexErrorEnd = errorMessage.indexOf("\n", convexErrorStart);
      const convexErrorMessage = errorMessage.substring(
        convexErrorStart,
        convexErrorEnd > 0 ? convexErrorEnd : errorMessage.length
      );
      return convexErrorMessage.trim();
    }

    // Handle validation errors
    if (errorMessage.includes("ArgumentValidationError")) {
      return "Please check your input and try again";
    }

    // Handle authentication errors
    if (
      errorMessage.includes("Unauthenticated") ||
      errorMessage.includes("not authenticated")
    ) {
      return "Please sign in to continue";
    }

    // Handle permission errors
    if (
      errorMessage.includes("Unauthorized") ||
      errorMessage.includes("not authorized")
    ) {
      return "You don't have permission to perform this action";
    }

    // If no specific pattern matches, clean up the generic message
    // Remove technical details like file paths, request IDs, etc.
    return cleanGenericError(errorMessage);
  } catch (e) {
    // If parsing fails, return a cleaned generic message
    return cleanGenericError(errorMessage);
  }
}

/**
 * Clean up generic error messages by removing technical details
 */
function cleanGenericError(errorMessage: string): string {
  // Remove request IDs
  errorMessage = errorMessage.replace(/\[Request ID: [^\]]+\]/g, "");

  // Remove "Server Error" prefix
  errorMessage = errorMessage.replace(/^Server Error\s*/g, "");

  // Remove file paths (convex/...)
  errorMessage = errorMessage.replace(/convex\/[^\s]+/g, "");

  // Remove stack traces (lines starting with "at ")
  errorMessage = errorMessage.replace(/\s+at [^\n]+/g, "");

  // Remove newlines and extra whitespace
  errorMessage = errorMessage.replace(/\s+/g, " ").trim();

  // If the error is still too technical, provide a generic message
  if (
    errorMessage.includes("function") ||
    errorMessage.includes("module") ||
    errorMessage.includes("TypeError") ||
    errorMessage.includes("ReferenceError") ||
    errorMessage.length > 150
  ) {
    return "Something went wrong. Please try again or contact support if the problem persists";
  }

  return errorMessage || "An unexpected error occurred";
}

/**
 * Get user-friendly error messages for common error codes
 */
export function getErrorMessage(code: string): string {
  const errorMessages: Record<string, string> = {
    DUPLICATE_SUBSCRIPTION:
      "This customer already has an active subscription to this plan",
    PLAN_NOT_FOUND: "The selected plan could not be found",
    PLAN_ARCHIVED: "This plan is no longer available for new subscriptions",
    PLAN_APP_MISMATCH:
      "This plan is not available for the selected application",
    CUSTOMER_NOT_FOUND: "Customer not found",
    SUBSCRIPTION_NOT_FOUND: "Subscription not found",
    INVALID_PAYMENT_METHOD: "Invalid payment method selected",
    INSUFFICIENT_PERMISSIONS:
      "You don't have permission to perform this action",
    VALIDATION_ERROR: "Please check your input and try again",
    AUTHENTICATION_ERROR: "Please sign in to continue",
  };

  return errorMessages[code] || "An error occurred";
}
