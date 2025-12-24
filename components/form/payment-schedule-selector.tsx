"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface PaymentScheduleSelectorProps {
  value: "monthly" | "quarterly" | "annual" | "one-time";
  onChange: (value: "monthly" | "quarterly" | "annual" | "one-time") => void;
  supportsOneTimePayments: boolean;
  onToggleOneTime: (value: boolean) => void;
  error?: string;
}

const schedules = [
  {
    value: "monthly" as const,
    label: "Monthly",
    description: "Billed every month",
  },
  {
    value: "quarterly" as const,
    label: "Quarterly",
    description: "Billed every 3 months",
  },
  {
    value: "annual" as const,
    label: "Annual",
    description: "Billed once a year",
  },
] as const;

export function PaymentScheduleSelector({
  value,
  onChange,
  supportsOneTimePayments,
  onToggleOneTime,
  error,
}: PaymentScheduleSelectorProps) {
  return (
    <Card className="border-0 shadow-sm bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-lg"
            style={{
              backgroundColor: "oklch(0.95 0.05 185)",
            }}
          >
            <CreditCard
              className="h-5 w-5"
              style={{ color: "oklch(0.60 0.10 185)" }}
            />
          </div>
          <div>
            <CardTitle className="text-lg font-semibold">
              Payment Schedule
            </CardTitle>
            <CardDescription className="text-slate-500">
              Select the default billing cycle for subscriptions
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-4">
          {/* Schedule Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {schedules.map((schedule) => (
              <button
                key={schedule.value}
                type="button"
                onClick={() => onChange(schedule.value)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-lg border-2 transition-all text-left",
                  "hover:border-[oklch(0.60_0.10_185)] hover:bg-[oklch(0.98_0.02_185)]",
                  value === schedule.value
                    ? "border-[oklch(0.60_0.10_185)] bg-[oklch(0.98_0.02_185)] shadow-sm"
                    : "border-slate-200 bg-white"
                )}
              >
                <span
                  className={cn(
                    "text-sm font-semibold transition-colors",
                    value === schedule.value
                      ? "text-[oklch(0.45_0.12_185)]"
                      : "text-slate-700"
                  )}
                >
                  {schedule.label}
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  {schedule.description}
                </span>
              </button>
            ))}
          </div>

          {/* One-Time Payment Toggle */}
          <div
            className="flex items-center justify-between p-4 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: supportsOneTimePayments
                ? "oklch(0.98 0.02 185)"
                : "white",
              borderColor: supportsOneTimePayments
                ? "oklch(0.60 0.10 185)"
                : "rgb(226 232 240)",
            }}
          >
            <div className="flex-1 space-y-1">
              <Label
                htmlFor="one-time-toggle"
                className={cn(
                  "text-sm font-medium cursor-pointer transition-colors",
                  supportsOneTimePayments
                    ? "text-[oklch(0.45_0.12_185)]"
                    : "text-slate-700"
                )}
              >
                One-Time Payments
              </Label>
              <p className="text-xs text-slate-500">
                Allow customers to make single, non-recurring payments
              </p>
            </div>
            <Switch
              id="one-time-toggle"
              checked={supportsOneTimePayments}
              onCheckedChange={onToggleOneTime}
              className="data-[state=checked]:bg-[oklch(0.60_0.10_185)]"
            />
          </div>

          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
