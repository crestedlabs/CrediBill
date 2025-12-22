"use client";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import { CheckCircle, AlertTriangle, Calendar, DollarSign } from "lucide-react";

type SubscriptionStatus =
  | "TRIALING"
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELED"
  | "EXPIRED";

const mockSummaryData = [
  {
    label: "Active Subscriptions",
    value: "846",
    change: "+3.2%",
    icon: CheckCircle,
    iconColor: "text-emerald-600",
    valueColor: "text-emerald-600",
  },
  {
    label: "Trials Expiring Soon",
    value: "12",
    change: "Next 7 days",
    icon: Calendar,
    iconColor: "text-amber-600",
    valueColor: "text-amber-600",
  },
  {
    label: "Past Due Subscriptions",
    value: "9",
    change: "Urgent",
    icon: AlertTriangle,
    iconColor: "text-red-600",
    valueColor: "text-red-600",
  },
  {
    label: "MRR",
    value: "852K",
    currency: "UGX",
    change: "This month",
    icon: DollarSign,
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
  },
];

const mockStatusBreakdown = [
  {
    status: "TRIALING",
    count: 12,
    color: "bg-blue-500",
    textColor: "text-blue-700",
    label: "Trialing",
  },
  {
    status: "ACTIVE",
    count: 842,
    color: "bg-emerald-500",
    textColor: "text-emerald-700",
    label: "Active",
  },
  {
    status: "PAST_DUE",
    count: 9,
    color: "bg-red-500",
    textColor: "text-red-700",
    label: "Past Due",
  },
  {
    status: "CANCELED",
    count: 24,
    color: "bg-slate-400",
    textColor: "text-slate-700",
    label: "Canceled",
  },
  {
    status: "EXPIRED",
    count: 3,
    color: "bg-slate-300",
    textColor: "text-slate-600",
    label: "Expired",
  },
];

const mockRecentActivity = [
  {
    id: 1,
    time: "2 hours ago",
    event: "Payment processed",
    subscription: "sub_Ja8k9...",
    app: "Main App",
    status: "ACTIVE" as SubscriptionStatus,
  },
  {
    id: 2,
    time: "5 hours ago",
    event: "Trial started",
    subscription: "sub_Tx39d...",
    app: "Marketing",
    status: "TRIALING" as SubscriptionStatus,
  },
  {
    id: 3,
    time: "1 day ago",
    event: "Subscription canceled",
    subscription: "sub_Bx22z...",
    app: "Internal",
    status: "CANCELED" as SubscriptionStatus,
  },
  {
    id: 4,
    time: "2 days ago",
    event: "Payment failed",
    subscription: "sub_Dv88c...",
    app: "Main App",
    status: "PAST_DUE" as SubscriptionStatus,
  },
];

export default function OverviewContent() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
          <p className="text-sm text-slate-600">
            Billing and subscription health at a glance
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {mockSummaryData.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Card key={idx} className="border border-slate-200 bg-white">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="text-xs font-medium text-slate-600">
                          {item.label}
                        </p>
                        <div className="flex items-baseline gap-1">
                          {item.currency && (
                            <span className="text-lg font-medium text-slate-500 uppercase tracking-wide">
                              {item.currency}
                            </span>
                          )}
                          <span
                            className={`text-3xl font-bold ${item.valueColor}`}
                          >
                            {item.currency ? item.value : item.value}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-600">
                          {item.change}
                        </p>
                      </div>
                      <div
                        className={`rounded-lg bg-slate-50 p-2 ${item.iconColor}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Status Breakdown & Recent Activity */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Subscription Status Breakdown */}
            <Card className="border border-slate-200 bg-white">
              <CardHeader>
                <CardTitle className="text-base">Subscription Status</CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockStatusBreakdown.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-3 w-3 rounded-full ${item.color}`}
                        ></div>
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-slate-500">
                            {item.status}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-semibold">{item.count}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card className="border border-slate-200 bg-white lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent Activity</CardTitle>
                <CardDescription>Latest subscription events</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-t border-slate-200 bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-700">
                        <th className="px-4 py-3">When</th>
                        <th className="px-4 py-3">Event</th>
                        <th className="px-4 py-3">Subscription</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockRecentActivity.map((item, idx) => (
                        <tr
                          key={idx}
                          className="border-t border-slate-200 text-sm"
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {item.time}
                          </td>
                          <td className="px-4 py-3">{item.event}</td>
                          <td className="px-4 py-3 font-mono text-slate-600">
                            {item.subscription}
                          </td>
                          <td className="px-4 py-3">
                            <Badge 
                              className={`text-xs ${
                                item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                                item.status === 'TRIALING' ? 'bg-blue-100 text-blue-800' :
                                item.status === 'PAST_DUE' ? 'bg-red-100 text-red-800' :
                                item.status === 'CANCELED' ? 'bg-slate-100 text-slate-700' :
                                'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {item.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="justify-between border-t border-slate-200 text-xs text-slate-600">
                <span>Showing {mockRecentActivity.length} recent events</span>
                <Button variant="link" size="sm" className="text-xs">
                  View all events
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Footer note */}
          <div className="rounded-lg bg-white border border-slate-200 p-4">
            <p className="text-sm text-slate-700">
              💡 <span className="font-medium">Tip:</span> Use the status
              breakdown to identify subscriptions requiring action. Contact
              support for billing inquiries.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
