"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useMediaQuery } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  FormInputField,
  FormTextareaField,
  FormSelectField,
  FormNumberField,
} from "@/components/form/form-fields";
import { toast } from "sonner";
import { Loader2, Zap, TrendingUp, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Id } from "@/convex/_generated/dataModel";

interface EditPlanDialogProps {
  plan: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function EditPlanDialog({
  plan,
  open,
  onOpenChange,
  onSuccess,
}: EditPlanDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const handleSuccess = () => {
    onOpenChange(false);
    onSuccess?.();
  };

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Plan</DialogTitle>
            <DialogDescription>
              Update your pricing plan. Changes may affect existing
              subscriptions.
            </DialogDescription>
          </DialogHeader>
          <EditPlanForm plan={plan} onSuccess={handleSuccess} />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[96vh]">
        <div className="overflow-y-auto">
          <DrawerHeader className="text-left">
            <DrawerTitle>Edit Plan</DrawerTitle>
            <DrawerDescription>
              Update your pricing plan. Changes may affect existing
              subscriptions.
            </DrawerDescription>
          </DrawerHeader>
          <EditPlanForm
            plan={plan}
            onSuccess={handleSuccess}
            className="px-4"
          />
          <DrawerFooter className="pt-2">
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

interface EditPlanFormProps {
  plan: any;
  onSuccess?: () => void;
  className?: string;
}

function EditPlanForm({ plan, onSuccess, className }: EditPlanFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: plan?.name || "",
    description: plan?.description || "",
    pricingModel: (plan?.pricingModel || "flat") as "flat" | "usage" | "hybrid",
    baseAmount: plan?.baseAmount as number | undefined,
    currency: plan?.currency || "USD",
    interval: (plan?.interval || "monthly") as
      | "monthly"
      | "quarterly"
      | "yearly"
      | "one-time",
    usageMetric: plan?.usageMetric || "",
    unitPrice: plan?.unitPrice as number | undefined,
    freeUnits: plan?.freeUnits as number | undefined,
    status: (plan?.status || "active") as "active" | "archived",
    mode: (plan?.mode || "live") as "live" | "test",
  });

  const updatePlanMutation = useMutation(api.plans.updatePlan);

  // Update form data when plan changes
  useEffect(() => {
    if (plan) {
      setFormData({
        name: plan.name,
        description: plan.description || "",
        pricingModel: plan.pricingModel,
        baseAmount: plan.baseAmount,
        currency: plan.currency,
        interval: plan.interval,
        usageMetric: plan.usageMetric || "",
        unitPrice: plan.unitPrice,
        freeUnits: plan.freeUnits,
        status: plan.status,
        mode: plan.mode,
      });
    }
  }, [plan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Form submitted, formData:", formData);

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

    console.log("Validation passed, starting update...");
    setIsSubmitting(true);

    // Show immediate loading toast
    toast.loading("Updating plan...", { id: "update-plan" });

    try {
      console.log("Calling updatePlanMutation with planId:", plan._id);
      const result = await updatePlanMutation({
        planId: plan._id,
        name: formData.name,
        description: formData.description,
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

      console.log("Update result:", result);

      // Dismiss loading toast
      toast.dismiss("update-plan");

      if (result.hasActiveSubscriptions) {
        toast.success("Plan updated successfully!", {
          description: `${result.affectedSubscriptions} active subscription(s) may be affected`,
        });
      } else {
        toast.success("Plan updated successfully!", {
          description: `${formData.name} has been updated`,
        });
      }

      onSuccess?.();
    } catch (error: any) {
      console.error("Update error:", error);
      toast.dismiss("update-plan");
      toast.error("Failed to update plan", {
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

  if (!plan) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn("space-y-6 relative", className)}
    >
      {/* Loading overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-4 rounded-lg shadow-lg flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span className="text-sm font-medium text-slate-900">
              Updating plan...
            </span>
          </div>
        </div>
      )}

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
          disabled={isSubmitting}
        />

        <FormTextareaField
          label="Description"
          value={formData.description || ""}
          onChange={(value) =>
            setFormData((prev) => ({ ...prev, description: value }))
          }
          placeholder="Brief description of what this plan includes..."
          disabled={isSubmitting}
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
                disabled={isSubmitting}
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    pricingModel: model.value,
                  }))
                }
                className={cn(
                  "flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-blue-500 hover:bg-blue-50/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
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

      {/* Flat Pricing Fields */}
      {(formData.pricingModel === "flat" ||
        formData.pricingModel === "hybrid") && (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Base Pricing</h3>
          <div className="grid grid-cols-2 gap-4">
            <FormNumberField
              label="Base Amount"
              value={formData.baseAmount || 0}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, baseAmount: value }))
              }
              placeholder="0.00"
              min={0}
              required={formData.pricingModel === "flat"}
              disabled={isSubmitting}
            />
            <FormSelectField
              label="Currency"
              value={formData.currency}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, currency: value }))
              }
              options={[
                { value: "USD", label: "USD ($)" },
                { value: "EUR", label: "EUR (€)" },
                { value: "GBP", label: "GBP (£)" },
              ]}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Usage-Based Pricing Fields */}
      {(formData.pricingModel === "usage" ||
        formData.pricingModel === "hybrid") && (
        <div className="space-y-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
          <h3 className="text-sm font-semibold text-slate-900">
            Usage-Based Pricing
          </h3>
          <FormInputField
            label="Usage Metric"
            value={formData.usageMetric}
            onChange={(value) =>
              setFormData((prev) => ({ ...prev, usageMetric: value }))
            }
            placeholder="e.g., API Calls, Storage GB, Users"
            required
            disabled={isSubmitting}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormNumberField
              label="Unit Price"
              value={formData.unitPrice || 0}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, unitPrice: value }))
              }
              placeholder="0.00"
              min={0}
              required
              disabled={isSubmitting}
            />
            <FormNumberField
              label="Free Units"
              value={formData.freeUnits || 0}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, freeUnits: value }))
              }
              placeholder="0"
              min={0}
              disabled={isSubmitting}
            />
          </div>
        </div>
      )}

      {/* Billing Interval */}
      <FormSelectField
        label="Billing Interval"
        value={formData.interval}
        onChange={(value) =>
          setFormData((prev) => ({
            ...prev,
            interval: value as typeof formData.interval,
          }))
        }
        options={[
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "yearly", label: "Yearly" },
          { value: "one-time", label: "One-time" },
        ]}
        required
        disabled={isSubmitting}
      />

      {/* Status & Mode */}
      <div className="grid grid-cols-2 gap-4">
        <FormSelectField
          label="Status"
          value={formData.status}
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              status: value as typeof formData.status,
            }))
          }
          options={[
            { value: "active", label: "Active" },
            { value: "archived", label: "Archived" },
          ]}
          required
          disabled={isSubmitting}
        />
        <FormSelectField
          label="Mode"
          value={formData.mode}
          onChange={(value) =>
            setFormData((prev) => ({
              ...prev,
              mode: value as typeof formData.mode,
            }))
          }
          options={[
            { value: "live", label: "Live" },
            { value: "test", label: "Test" },
          ]}
          required
          disabled={isSubmitting}
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="submit" disabled={!canSubmit} className="min-w-[120px]">
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Plan"
          )}
        </Button>
      </div>
    </form>
  );
}
