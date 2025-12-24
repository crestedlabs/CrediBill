import { z } from "zod";

// Define the Zod schema for creating an app
export const createAppSchema = z.object({
  // Basic Information
  name: z
    .string()
    .min(1, "App name is required")
    .min(3, "App name must be at least 3 characters")
    .max(100, "App name must be less than 100 characters"),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),

  organizationId: z.string().min(1, "Organization is required"),

  // Regional Settings
  defaultCurrency: z.enum(["ugx", "kes", "tzs", "rwf", "usd"], {
    message: "Please select a valid currency",
  }),

  timezone: z.enum(["eat", "cat", "wat"], {
    message: "Please select a valid timezone",
  }),

  language: z.enum(["en", "sw", "fr"], {
    message: "Please select a valid language",
  }),

  // Payment Settings
  defaultPaymentMethod: z.enum(["momo", "credit-card", "bank"], {
    message: "Please select a valid payment method",
  }),

  retryPolicy: z.enum(["automatic", "manual", "none"], {
    message: "Please select a valid retry policy",
  }),

  // Billing Settings
  defaultTrialLength: z
    .number()
    .int("Trial length must be a whole number")
    .min(0, "Trial length cannot be negative")
    .max(365, "Trial length cannot exceed 365 days"),

  gracePeriod: z
    .number()
    .int("Grace period must be a whole number")
    .min(0, "Grace period cannot be negative")
    .max(30, "Grace period cannot exceed 30 days"),
});

// Infer the TypeScript type from the Zod schema
export type CreateAppFormData = z.infer<typeof createAppSchema>;

// Default values for the form
export const createAppDefaults: CreateAppFormData = {
  name: "",
  description: "",
  organizationId: "",
  defaultCurrency: "ugx",
  timezone: "eat",
  language: "en",
  defaultPaymentMethod: "momo",
  retryPolicy: "automatic",
  defaultTrialLength: 14,
  gracePeriod: 3,
};
