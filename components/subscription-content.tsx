"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Plus,
  Eye,
  Pause,
  RotateCcw,
  Trash2,
} from "lucide-react";

const mockSubscriptions = [
  {
    id: "sub_1",
    customer: "alice@company.com",
    plan: "Professional",
    status: "Active",
    date: "Renews Jan 15, 2025",
    provider: "PawaPay",
  },
  {
    id: "sub_2",
    customer: "bob@startup.io",
    plan: "Starter",
    status: "Trialing",
    date: "Trial ends Dec 28, 2024",
    provider: "PawaPay",
  },
  {
    id: "sub_3",
    customer: "carol@business.com",
    plan: "Enterprise",
    status: "Active",
    date: "Renews Jan 10, 2025",
    provider: "FlutterWave",
  },
  {
    id: "sub_4",
    customer: "david@company.com",
    plan: "Professional",
    status: "Past Due",
    date: "Was due Dec 15, 2024",
    provider: "DPO GROUP",
  },
  {
    id: "sub_5",
    customer: "eve@oldclient.com",
    plan: "Professional",
    status: "Canceled",
    date: "Canceled Nov 20, 2024",
    provider: "PesaPal",
  },
];

const statusColors: Record<
  string,
  { bg: string; text: string; badge: string }
> = {
  Active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    badge: "bg-emerald-100 text-emerald-800",
  },
  Trialing: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
  },
  "Past Due": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
  },
  Canceled: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-700",
  },
  Expired: {
    bg: "bg-slate-50",
    text: "text-slate-700",
    badge: "bg-slate-100 text-slate-700",
  },
};

const filterOptions = [
  "All",
  "Trialing",
  "Active",
  "Past Due",
  "Canceled",
  "Expired",
];

export default function SubscriptionContent() {
  const [activeFilter, setActiveFilter] = useState("All");
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Subscriptions
              </h1>
              <p className="text-sm text-slate-600">
                View and manage subscription lifecycles
              </p>
            </div>
            <Button className="w-full md:w-auto h-10">
              <Plus className="mr-2 h-4 w-4" />
              Create Subscription
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-20">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <Plus className="h-8 w-8 text-slate-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No subscriptions yet
                </h2>
                <p className="text-sm text-slate-600">
                  Create a subscription to get started with billing management.
                </p>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first subscription
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Subscriptions
            </h1>
            <p className="text-sm text-slate-600">
              View and manage subscription lifecycles
            </p>
          </div>
          <Button className="w-full md:w-auto h-10">
            <Plus className="mr-2 h-4 w-4" />
            Create Subscription
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap gap-2">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                  activeFilter === filter
                    ? "bg-slate-900 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          <div className="hidden md:block">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-700">
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Provider</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockSubscriptions.map((sub, idx) => {
                        const colors =
                          statusColors[sub.status] || statusColors.Active;
                        return (
                          <tr
                            key={sub.id}
                            className={`text-sm ${
                              idx !== mockSubscriptions.length - 1
                                ? "border-b border-slate-200"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-4">
                              <p className="font-medium text-slate-900">
                                {sub.customer}
                              </p>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {sub.plan}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`${colors.badge}`}>
                                {sub.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {sub.date}
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-500">
                              {sub.provider}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <SubscriptionActionMenu />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3 md:hidden">
            {mockSubscriptions.map((sub) => {
              const colors = statusColors[sub.status] || statusColors.Active;
              return (
                <Card
                  key={sub.id}
                  className={`border border-slate-200 bg-white`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${colors.badge}`}>
                            {sub.status}
                          </Badge>
                        </div>

                        <p className="text-sm font-medium text-slate-900">
                          {sub.customer}
                        </p>

                        <div className="space-y-1">
                          <p className="text-sm text-slate-600">
                            {sub.plan} plan
                          </p>
                          <p className="text-xs text-slate-600">{sub.date}</p>
                        </div>
                      </div>

                      <SubscriptionActionMenu />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex items-center justify-center pt-4">
            <p className="text-sm text-slate-600">
              Showing {mockSubscriptions.length} subscription
              {mockSubscriptions.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubscriptionActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pause className="mr-2 h-4 w-4" />
          Pause subscription
        </DropdownMenuItem>
        <DropdownMenuItem>
          <RotateCcw className="mr-2 h-4 w-4" />
          Resume subscription
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Cancel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
