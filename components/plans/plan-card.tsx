"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Sparkles } from "lucide-react";
import { PlanActionMenu } from "./plan-action-menu";

interface PlanCardProps {
  plan: any;
}

export function PlanCard({ plan }: PlanCardProps) {
  const isArchived = plan.status === "archived";

  // Format price based on pricing model
  const formatPrice = () => {
    if (plan.pricingModel === "flat" && plan.baseAmount) {
      const amount = plan.baseAmount / 100; // Convert from smallest unit
      return amount >= 1000000
        ? `${(amount / 1000000).toFixed(1)}M`
        : `${(amount / 1000).toFixed(0)}K`;
    }
    if (plan.pricingModel === "usage" && plan.unitPrice) {
      const amount = plan.unitPrice / 100;
      return `${amount.toFixed(2)}/unit`;
    }
    if (plan.pricingModel === "hybrid") {
      const base = plan.baseAmount ? plan.baseAmount / 100 : 0;
      const unit = plan.unitPrice ? plan.unitPrice / 100 : 0;
      return base >= 1000000
        ? `${(base / 1000000).toFixed(1)}M + ${unit.toFixed(2)}/unit`
        : `${(base / 1000).toFixed(0)}K + ${unit.toFixed(2)}/unit`;
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
      className={`border transition-all hover:shadow-md ${
        isArchived
          ? "border-slate-300 bg-slate-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                isArchived ? "bg-slate-400" : "bg-[var(--color-teal)]"
              }`}
            >
              <Icon className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle
                className={`text-base font-semibold ${
                  isArchived ? "text-slate-600" : "text-slate-900"
                }`}
              >
                {plan.name}
              </CardTitle>
              <div className="flex items-baseline gap-1 mt-0.5">
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
                    /{plan.interval === "monthly" ? "mo" : "yr"}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs font-medium border-slate-300 text-slate-700"
            >
              {formatInterval()}
            </Badge>
            <Badge
              variant={isArchived ? "secondary" : "default"}
              className={
                isArchived
                  ? ""
                  : "bg-[var(--color-teal)] hover:bg-[var(--color-teal)]/90"
              }
            >
              {plan.mode}
            </Badge>
            <PlanActionMenu plan={plan} />
          </div>
        </div>
        {plan.description && (
          <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
        )}
      </CardHeader>

      <CardContent className="pt-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-slate-500">Subscribers</p>
            <p
              className={`text-lg font-semibold ${
                isArchived ? "text-slate-600" : "text-slate-900"
              }`}
            >
              0
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Revenue</p>
            <p
              className={`text-lg font-semibold ${
                isArchived ? "text-slate-600" : "text-slate-900"
              }`}
            >
              0
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
