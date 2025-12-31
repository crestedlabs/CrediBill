"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, Sparkles, Users, Copy, Check } from "lucide-react";
import { PlanActionMenu } from "./plan-action-menu";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";

interface PlanCardProps {
  plan: any;
}

export function PlanCard({ plan }: PlanCardProps) {
  const isArchived = plan.status === "archived";
  const [copied, setCopied] = useState(false);
  const stats = useQuery(api.plans.getPlanStats, {
    planId: plan._id as Id<"plans">,
  });

  const handleCopyPlanId = async () => {
    try {
      await navigator.clipboard.writeText(plan._id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy plan ID:", err);
    }
  };

  // Format price based on pricing model
  const formatPrice = () => {
    if (plan.pricingModel === "flat" && plan.baseAmount) {
      return plan.baseAmount.toLocaleString();
    }
    if (plan.pricingModel === "usage" && plan.unitPrice) {
      return `${plan.unitPrice.toLocaleString()}/unit`;
    }
    if (plan.pricingModel === "hybrid") {
      const base = plan.baseAmount || 0;
      const unit = plan.unitPrice || 0;
      return `${base.toLocaleString()} + ${unit.toLocaleString()}/unit`;
    }
    return "Custom";
  };

  // Get icon based on pricing model
  const getIcon = () => {
    if (plan.pricingModel === "flat") return Zap;
    if (plan.pricingModel === "usage") return TrendingUp;
    return Sparkles;
  };

  const Icon = getIcon();

  // Format interval for display
  const formatInterval = () => {
    switch (plan.interval) {
      case "monthly":
        return "Monthly";
      case "quarterly":
        return "Quarterly";
      case "yearly":
        return "Yearly";
      case "one-time":
        return "One-Time";
      default:
        return plan.interval;
    }
  };

  return (
    <Card
      className={`border transition-all hover:shadow-md flex flex-col ${
        isArchived
          ? "border-slate-300 bg-slate-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <CardHeader className="pb-3 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle
                className={`text-base font-semibold ${
                  isArchived ? "text-slate-600" : "text-slate-900"
                }`}
              >
                {plan.name}
              </CardTitle>
              <Badge
                variant="outline"
                className="text-xs font-medium border-slate-300 text-slate-700 shrink-0"
              >
                {formatInterval()}
              </Badge>
              <Badge
                variant={isArchived ? "secondary" : "default"}
                className={
                  isArchived
                    ? "shrink-0"
                    : "bg-[var(--color-teal)] hover:bg-[var(--color-teal)]/90 shrink-0"
                }
              >
                {plan.mode}
              </Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xs text-slate-500 uppercase">
                {plan.currency}
              </span>
              <span
                className={`text-lg font-bold ${
                  isArchived ? "text-slate-600" : "text-slate-900"
                }`}
              >
                {formatPrice()}
              </span>
              {plan.interval !== "one-time" && (
                <span className="text-xs text-slate-500">
                  /
                  {plan.interval === "monthly"
                    ? "mo"
                    : plan.interval === "quarterly"
                      ? "qtr"
                      : "yr"}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-start gap-2 shrink-0">
            <PlanActionMenu plan={plan} />
          </div>
        </div>
        {plan.description && (
          <p className="mt-2 text-sm text-slate-600 break-words line-clamp-2">
            {plan.description}
          </p>
        )}

        {/* Plan ID Copy Button */}
        <div className="mt-3 flex items-center justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyPlanId}
            className="h-8 px-3 text-xs gap-2"
            title="Copy Plan ID"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Plan ID</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-3 mt-auto">
        <div className="flex items-center justify-between px-2 py-1 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Users className="h-4 w-4" />
            <span className="font-medium">Subscribers</span>
          </div>
          <p
            className={`text-xl font-bold ${
              isArchived ? "text-slate-500" : "text-blue-600"
            }`}
          >
            {stats?.subscriberCount ?? "-"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
