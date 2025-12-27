"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import { formatCurrencySimple } from "@/lib/currency-utils";
import { Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface SubscribeCustomerFormProps {
  appId: Id<"apps">;
  customerId: Id<"customers">;
  customerEmail: string;
  onSuccess?: () => void;
  className?: string;
}

export function SubscribeCustomerForm({
  appId,
  customerId,
  customerEmail,
  onSuccess,
  className,
}: SubscribeCustomerFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    planId: "",
    trialDays: "0",
    startDate: new Date().toISOString().split("T")[0], // Today's date
  });

  // Fetch the app to get its mode
  const app = useQuery(api.apps.getAppById, { appId });

  // Fetch active plans for this app
  const plans = useQuery(api.plans.getPlansByApp, { appId });

  const createSubscriptionMutation = useMutation(
    api.subscriptions.createSubscription
  );

  // Filter to only active plans that match the app's mode
  const activePlans =
    plans?.filter(
      (p: any) => p.status === "active" && (app ? p.mode === app.mode : true) // Match plan mode with app mode
    ) || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.planId) {
      toast.error("Please select a plan");
      return;
    }

    setIsSubmitting(true);

    try {
      const startDate = new Date(formData.startDate).getTime();
      const trialDays = parseInt(formData.trialDays);

      await createSubscriptionMutation({
        appId,
        customerId,
        planId: formData.planId as Id<"plans">,
        startDate,
        trialDays: trialDays > 0 ? trialDays : undefined,
      });

      const selectedPlan = activePlans.find(
        (p: any) => p._id === formData.planId
      );
      toast.success("Subscription created successfully", {
        description: `${customerEmail} subscribed to ${selectedPlan?.name}`,
      });

      // Reset form
      setFormData({
        planId: "",
        trialDays: "0",
        startDate: new Date().toISOString().split("T")[0],
      });

      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating subscription:", error);
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to create subscription", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = formData.planId && !isSubmitting;

  if (plans === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (activePlans.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-600">
          No active plans available. Create a plan first to subscribe customers.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* Customer Info */}
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
          <p className="text-xs text-slate-500">Subscribing</p>
          <p className="text-sm font-medium text-slate-900">{customerEmail}</p>
        </div>

        {/* Plan Selection */}
        <div className="space-y-2">
          <Label htmlFor="planId" className="text-sm font-medium">
            Select Plan <span className="text-red-500">*</span>
          </Label>
          <Select
            value={formData.planId}
            onValueChange={(value) =>
              setFormData((prev) => ({ ...prev, planId: value }))
            }
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Choose a plan..." />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((plan: any) => (
                <SelectItem key={plan._id} value={plan._id}>
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{plan.name}</span>
                    <span className="ml-4 text-xs text-slate-500">
                      {formatCurrencySimple(
                        plan.baseAmount || 0,
                        plan.currency
                      )}{" "}
                      / {plan.interval}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Trial Days */}
        <div className="space-y-2">
          <Label htmlFor="trialDays" className="text-sm font-medium">
            Trial Days
          </Label>
          <Input
            id="trialDays"
            type="number"
            min="0"
            placeholder="0"
            value={formData.trialDays}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, trialDays: e.target.value }))
            }
            disabled={isSubmitting}
            className="h-10"
          />
          <p className="text-xs text-slate-500">
            Set to 0 for no trial period. Subscription starts immediately.
          </p>
        </div>

        {/* Start Date */}
        <div className="space-y-2">
          <Label htmlFor="startDate" className="text-sm font-medium">
            Start Date
          </Label>
          <Input
            id="startDate"
            type="date"
            value={formData.startDate}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, startDate: e.target.value }))
            }
            disabled={isSubmitting}
            className="h-10"
          />
          <p className="text-xs text-slate-500">
            When the subscription should begin
          </p>
        </div>

        {/* Submit Button */}
        <Button type="submit" className="w-full h-10" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating Subscription...
            </>
          ) : (
            "Subscribe Customer"
          )}
        </Button>
      </div>
    </form>
  );
}
