"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  createPlanDefaults,
  type CreatePlanFormData,
} from "@/lib/schemas/create-plan.schema";
import {
  FormInputField,
  FormTextareaField,
  FormSelectField,
  FormNumberField,
} from "@/components/form/form-fields";
import { Id } from "@/convex/_generated/dataModel";
import { Loader2, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePlanFormProps {
  appId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  className?: string;
}

export function CreatePlanForm({
  appId,
  onSuccess,
  onCancel,
  className,
}: CreatePlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreatePlanFormData>({
    ...createPlanDefaults,
    appId,
  });

  const createPlanMutation = useMutation(api.plans.createPlan);
  const app = useQuery(api.apps.getAppSettings, { appId: appId as Id<"apps"> });

  // Set currency from app when loaded
  useEffect(() => {
    if (app?.defaultCurrency) {
      setFormData((prev) => ({ ...prev, currency: app.defaultCurrency }));
    }
  }, [app?.defaultCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (formData.name.length < 3) {
      toast.error("Plan name must be at least 3 characters");
      return;
    }

    if (formData.pricingModel === "flat" && !formData.baseAmount) {
      toast.error("Base amount is required for flat pricing");
      return;
    }

    if (
      (formData.pricingModel === "usage" ||
        formData.pricingModel === "hybrid") &&
      !formData.usageMetric
    ) {
      toast.error("Usage metric is required for usage-based pricing");
      return;
    }

    if (
      (formData.pricingModel === "usage" ||
        formData.pricingModel === "hybrid") &&
      !formData.unitPrice
    ) {
      toast.error("Unit price is required for usage-based pricing");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPlanMutation({
        name: formData.name,
        description: formData.description,
        appId: appId as Id<"apps">,
        pricingModel: formData.pricingModel,
        baseAmount: formData.baseAmount,
        currency: formData.currency,
        interval: formData.interval,
        usageMetric: formData.usageMetric,
        unitPrice: formData.unitPrice,
        freeUnits: formData.freeUnits,
        status: formData.status,
        mode: formData.mode,
      });

      toast.success("Plan created successfully!", {
        description: `${formData.name} is now available`,
      });

      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to create plan", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.name.length >= 3 && !isSubmitting;

  const pricingModels = [
    {
      value: "flat" as const,
      label: "Flat Rate",
      description: "Fixed recurring price",
      icon: Zap,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      value: "usage" as const,
      label: "Usage-Based",
      description: "Pay per use",
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      value: "hybrid" as const,
      label: "Hybrid",
      description: "Base + usage",
      icon: BarChart3,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-6", className)}>
      {/* Plan Name & Description */}
      <div className="space-y-4">
        <FormInputField
          label="Plan Name"
          value={formData.name}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, name: value }))
          }
          placeholder="e.g., Professional Plan"
          required
        />

        <FormTextareaField
          label="Description"
          value={formData.description || ""}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, description: value }))
          }
          placeholder="Brief description of what this plan includes..."
        />
      </div>

      {/* Pricing Model Selection */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-slate-700">
          Pricing Model <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {pricingModels.map((model) => {
            const Icon = model.icon;
            return (
              <button
                key={model.value}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    pricingModel: model.value,
                  }))
                }
                className={cn(
                  "flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-blue-500 hover:bg-blue-50/50",
                  formData.pricingModel === model.value
                    ? "border-blue-500 bg-blue-50/50 shadow-sm"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className={cn("p-2 rounded-lg mb-2", model.bg)}>
                  <Icon className={cn("h-4 w-4", model.color)} />
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {model.label}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {model.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Pricing Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(formData.pricingModel === "flat" ||
          formData.pricingModel === "hybrid") && (
          <FormNumberField
            label="Base Amount"
            value={formData.baseAmount || 0}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, baseAmount: value }))
            }
            min={0}
            helpText="Amount in smallest currency unit (e.g., cents)"
            required={formData.pricingModel === "flat"}
          />
        )}

        <FormSelectField
          label="Currency"
          value={formData.currency}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, currency: value }))
          }
          options={[
            { value: "ugx", label: "🇺🇬 UGX" },
            { value: "kes", label: "🇰🇪 KES" },
            { value: "tzs", label: "🇹🇿 TZS" },
            { value: "rwf", label: "🇷🇼 RWF" },
            { value: "usd", label: "🇺🇸 USD" },
          ]}
          required
        />

        <FormSelectField
          label="Billing Interval"
          value={formData.interval}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, interval: value as any }))
          }
          options={[
            { value: "monthly", label: "Monthly" },
            { value: "quarterly", label: "Quarterly" },
            { value: "yearly", label: "Yearly" },
            { value: "one-time", label: "One-Time" },
          ]}
          required
        />
      </div>

      {/* Usage-Based Fields */}
      {(formData.pricingModel === "usage" ||
        formData.pricingModel === "hybrid") && (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h4 className="text-sm font-semibold text-slate-900">
            Usage-Based Pricing
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInputField
              label="Usage Metric"
              value={formData.usageMetric || ""}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, usageMetric: value }))
              }
              placeholder="e.g., api_calls, messages, storage_gb"
              required
            />

            <FormNumberField
              label="Unit Price"
              value={formData.unitPrice || 0}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, unitPrice: value }))
              }
              min={0}
              helpText="Price per unit in smallest currency unit"
              required
            />

            <FormNumberField
              label="Free Units"
              value={formData.freeUnits || 0}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, freeUnits: value }))
              }
              min={0}
              helpText="Included units before charging"
            />
          </div>
        </div>
      )}

      {/* Status & Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormSelectField
          label="Status"
          value={formData.status}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, status: value as any }))
          }
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          required
        />

        <FormSelectField
          label="Mode"
          value={formData.mode}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, mode: value as any }))
          }
          options={[
            { value: "test", label: "🧪 Test Mode" },
            { value: "live", label: "🔴 Live Mode" },
          ]}
          required
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Plan"
          )}
        </Button>
      </div>
    </form>
  );
}
