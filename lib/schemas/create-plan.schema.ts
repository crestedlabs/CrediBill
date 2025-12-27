import { z } from "zod";

// Zod schema for creating a plan
export const createPlanSchema = z.object({
  name: z
    .string()
    .min(1, "Plan name is required")
    .min(3, "Plan name must be at least 3 characters")
    .max(100, "Plan name must be less than 100 characters"),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .optional(),

  appId: z.string().min(1, "App is required"),

  pricingModel: z.enum(["flat", "usage", "hybrid"], {
    message: "Please select a valid pricing model",
  }),

  baseAmount: z
    .number()
    .int("Base amount must be a whole number")
    .min(0, "Base amount cannot be negative")
    .optional(),

  currency: z.string().min(1, "Currency is required"),

  interval: z.enum(["monthly", "quarterly", "yearly", "one-time"], {
    message: "Please select a valid billing interval",
  }),

  trialDays: z
    .number()
    .int("Trial days must be a whole number")
    .min(0, "Trial days cannot be negative")
    .max(365, "Trial days cannot exceed 365")
    .optional(),

  usageMetric: z
    .string()
    .max(100, "Usage metric must be less than 100 characters")
    .optional(),

  unitPrice: z
    .number()
    .int("Unit price must be a whole number")
    .min(0, "Unit price cannot be negative")
    .optional(),

  freeUnits: z
    .number()
    .int("Free units must be a whole number")
    .min(0, "Free units cannot be negative")
    .optional(),

  status: z.enum(["active", "archived"], {
    message: "Please select a valid status",
  }),

  mode: z.enum(["live", "test"], {
    message: "Please select a valid mode",
  }),
});

// Infer TypeScript type
export type CreatePlanFormData = z.infer<typeof createPlanSchema>;

// Default values
export const createPlanDefaults: CreatePlanFormData = {
  name: "",
  description: "",
  appId: "",
  pricingModel: "flat",
  baseAmount: 0,
  currency: "UGX",
  interval: "monthly",
  usageMetric: "",
  unitPrice: 0,
  freeUnits: 0,
  status: "active",
  mode: "test",
};
