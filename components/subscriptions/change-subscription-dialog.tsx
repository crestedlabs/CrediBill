"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";
import { formatCurrencySimple } from "@/lib/currency-utils";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { useMediaQuery } from "@/hooks/use-mobile";

interface ChangeSubscriptionDialogProps {
  appId: Id<"apps">;
  customerId: Id<"customers">;
  customerEmail: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ChangeSubscriptionDialog({
  appId,
  customerId,
  customerEmail,
  open,
  onOpenChange,
  onSuccess,
}: ChangeSubscriptionDialogProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)");

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Change Subscription</DialogTitle>
            <DialogDescription>
              Switch {customerEmail} to a different plan
            </DialogDescription>
          </DialogHeader>
          <ChangeSubscriptionForm
            appId={appId}
            customerId={customerId}
            customerEmail={customerEmail}
            onSuccess={() => {
              onSuccess?.();
              onOpenChange(false);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Change Subscription</DrawerTitle>
          <DrawerDescription>
            Switch {customerEmail} to a different plan
          </DrawerDescription>
        </DrawerHeader>
        <div className="px-4">
          <ChangeSubscriptionForm
            appId={appId}
            customerId={customerId}
            customerEmail={customerEmail}
            onSuccess={() => {
              onSuccess?.();
              onOpenChange(false);
            }}
            className="px-0"
          />
        </div>
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ChangeSubscriptionForm({
  appId,
  customerId,
  customerEmail,
  onSuccess,
  className,
}: {
  appId: Id<"apps">;
  customerId: Id<"customers">;
  customerEmail: string;
  onSuccess?: () => void;
  className?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState("");

  // Fetch the app to get its mode
  const app = useQuery(api.apps.getAppById, { appId });

  // Fetch active plans for this app
  const plans = useQuery(api.plans.getPlansByApp, { appId });

  // Fetch customer's current subscription
  const subscriptions = useQuery(api.subscriptions.listSubscriptions, {
    customerId,
    appId,
  });

  const changeSubscriptionMutation = useMutation(
    api.subscriptions.changeSubscription
  );

  // Filter to only active plans that match the app's mode
  const activePlans =
    plans?.filter(
      (p: any) => p.status === "active" && (app ? p.mode === app.mode : true)
    ) || [];

  const currentSubscription = subscriptions?.find(
    (s: any) => s.status === "active" || s.status === "trialing"
  );

  const currentPlan = currentSubscription
    ? activePlans.find((p: any) => p._id === currentSubscription.planId)
    : null;

  const selectedPlan = activePlans.find((p: any) => p._id === selectedPlanId);

  // Calculate if this is an upgrade or downgrade
  const isUpgrade =
    selectedPlan &&
    currentPlan &&
    (selectedPlan.baseAmount || 0) > (currentPlan.baseAmount || 0);
  const isDowngrade =
    selectedPlan &&
    currentPlan &&
    (selectedPlan.baseAmount || 0) < (currentPlan.baseAmount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedPlanId) {
      toast.error("Please select a plan");
      return;
    }

    if (!currentSubscription) {
      toast.error("No active subscription found");
      return;
    }

    setIsSubmitting(true);

    try {
      await changeSubscriptionMutation({
        subscriptionId: currentSubscription._id,
        newPlanId: selectedPlanId as Id<"plans">,
      });

      toast.success("Subscription changed successfully", {
        description: `${customerEmail} is now on ${selectedPlan?.name}`,
      });

      setSelectedPlanId("");
      onSuccess?.();
    } catch (error: any) {
      console.error("Error changing subscription:", error);
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to change subscription", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit =
    selectedPlanId &&
    selectedPlanId !== currentPlan?._id &&
    !isSubmitting;

  if (plans === undefined || subscriptions === undefined) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!currentSubscription) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-600">
          No active subscription found for this customer.
        </p>
      </div>
    );
  }

  if (activePlans.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-sm text-slate-600">
          No active plans available.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="space-y-4">
        {/* Current Plan Info */}
        <div className="rounded-lg bg-slate-50 p-3 border border-slate-200">
          <p className="text-xs text-slate-500">Current Plan</p>
          <p className="text-sm font-medium text-slate-900">
            {currentPlan?.name || "Unknown Plan"}
          </p>
          <p className="text-xs text-slate-600">
            {formatCurrencySimple(
              currentPlan?.baseAmount || 0,
              currentPlan?.currency || "USD"
            )}{" "}
            / {currentPlan?.interval}
          </p>
        </div>

        {/* New Plan Selection */}
        <div className="space-y-2">
          <Label htmlFor="newPlanId" className="text-sm font-medium">
            New Plan <span className="text-red-500">*</span>
          </Label>
          <Select
            value={selectedPlanId}
            onValueChange={setSelectedPlanId}
            disabled={isSubmitting}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="Choose a new plan..." />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((plan: any) => (
                <SelectItem
                  key={plan._id}
                  value={plan._id}
                  disabled={plan._id === currentPlan?._id}
                >
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

        {/* Upgrade/Downgrade Indicator */}
        {selectedPlan && selectedPlan._id !== currentPlan?._id && (
          <div
            className={`rounded-lg p-3 border ${
              isUpgrade
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2">
              {isUpgrade ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              <p
                className={`text-sm font-medium ${
                  isUpgrade ? "text-green-900" : "text-red-900"
                }`}
              >
                {isUpgrade ? "Upgrade" : isDowngrade ? "Downgrade" : "Change"}
              </p>
            </div>
            <p
              className={`text-xs mt-1 ${
                isUpgrade ? "text-green-700" : "text-red-700"
              }`}
            >
              {isUpgrade
                ? currentSubscription.status === "trialing"
                  ? "Upgrade will take effect immediately. Proration applies. No charge until trial ends."
                  : "Prorated amount will be charged immediately based on unused time."
                : currentSubscription.status === "trialing"
                ? "Downgrade will take effect immediately. No proration during trial."
                : "Downgrade will take effect at next billing cycle. No proration for downgrades."}
            </p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" className="w-full h-10" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Changing Plan...
            </>
          ) : (
            "Change Plan"
          )}
        </Button>
      </div>
    </form>
  );
}
