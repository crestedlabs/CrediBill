"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { MoreVertical, Plus, Edit, Archive, Trash2 } from "lucide-react";

const mockPlans = [
  {
    id: "plan_1",
    name: "Starter",
    price: 49,
    billingCadence: "monthly",
    status: "Active",
    isPopular: false,
    features: [
      "Up to 10,000 requests/month",
      "Basic analytics",
      "Community support",
      "1 API key",
    ],
    activeSubscribers: 124,
    totalRevenue: 6076,
  },
  {
    id: "plan_2",
    name: "Professional",
    price: 199,
    billingCadence: "monthly",
    status: "Active",
    isPopular: true,
    features: [
      "Up to 500,000 requests/month",
      "Advanced analytics & reporting",
      "Priority email support",
      "10 API keys",
      "Webhooks & integrations",
    ],
    activeSubscribers: 287,
    totalRevenue: 57113,
  },
  {
    id: "plan_3",
    name: "Enterprise",
    price: 999,
    billingCadence: "monthly",
    status: "Active",
    isPopular: false,
    features: [
      "Unlimited requests",
      "Custom analytics",
      "24/7 phone & email support",
      "Unlimited API keys",
      "Custom integrations",
      "Dedicated account manager",
    ],
    activeSubscribers: 12,
    totalRevenue: 11988,
  },
  {
    id: "plan_4",
    name: "Legacy Yearly",
    price: 899,
    billingCadence: "yearly",
    status: "Archived",
    isPopular: false,
    features: [
      "Up to 200,000 requests/month",
      "Basic analytics",
      "Email support",
      "5 API keys",
    ],
    activeSubscribers: 8,
    totalRevenue: 7192,
  },
];

export default function PlansContent() {
  const [plans] = useState(mockPlans);
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Plans</h1>
            <p className="text-sm text-slate-600">
              Manage subscription plans for this app
            </p>
          </div>
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>

        <Separator className="my-2" />

        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center md:py-24">
          <div className="mx-auto max-w-sm space-y-4">
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                <Plus className="h-8 w-8 text-slate-600" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              No plans yet
            </h2>
            <p className="text-sm text-slate-600">
              Create your first subscription plan to start accepting payments.
            </p>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create your first plan
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Plans</h1>
          <p className="text-sm text-slate-600">
            Manage subscription plans for this app
          </p>
        </div>
        <Button className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <Separator className="my-2" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.id} plan={plan} />
        ))}
      </div>

      <div className="flex items-center justify-center pt-4">
        <p className="text-sm text-slate-600">
          {plans.length} plan{plans.length !== 1 ? "s" : ""} active
        </p>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof mockPlans)[0] }) {
  const isArchived = plan.status === "Archived";

  return (
    <Card
      className={`border border-slate-200 transition-all hover:border-slate-300 hover:shadow-md ${
        isArchived ? "opacity-75" : ""
      }`}
    >
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <div className="mt-2 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-900">
                ${plan.price}
              </span>
              <span className="text-sm text-slate-600">
                /{plan.billingCadence === "monthly" ? "month" : "year"}
              </span>
            </div>
          </div>

          <PlanActionMenu />
        </div>

        <div className="flex gap-2">
          <Badge
            variant={isArchived ? "outline" : "default"}
            className={
              isArchived
                ? "bg-slate-100 text-slate-700"
                : "bg-emerald-100 text-emerald-800"
            }
          >
            {plan.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Active Subscribers
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {plan.activeSubscribers}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">
              Revenue
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              ${(plan.totalRevenue / 1000).toFixed(1)}k
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PlanActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit plan
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Archive className="mr-2 h-4 w-4" />
          Archive plan
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete plan
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
