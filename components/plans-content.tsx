"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";

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
import { MoreVertical, Plus, Edit, Archive, Trash2, Zap, Users, TrendingUp } from "lucide-react";

const mockPlans = [
  {
    id: "plan_1",
    name: "Starter",
    price: 180000,
    billingCadence: "monthly",
    status: "Active",
    activeSubscribers: 124,
    totalRevenue: 22273000,
    icon: Zap,
    iconColor: "bg-blue-500",
    iconBg: "bg-blue-50",
  },
  {
    id: "plan_2",
    name: "Professional",
    price: 730000,
    billingCadence: "monthly",
    status: "Active",
    activeSubscribers: 287,
    totalRevenue: 209510000,
    icon: TrendingUp,
    iconColor: "bg-emerald-500",
    iconBg: "bg-emerald-50",
  },
  {
    id: "plan_3",
    name: "Enterprise",
    price: 3660000,
    billingCadence: "monthly",
    status: "Active",
    activeSubscribers: 12,
    totalRevenue: 43920000,
    icon: Users,
    iconColor: "bg-purple-500",
    iconBg: "bg-purple-50",
  },
  {
    id: "plan_4",
    name: "Legacy Yearly",
    price: 3294000,
    billingCadence: "yearly",
    status: "Archived",
    activeSubscribers: 8,
    totalRevenue: 26352000,
    icon: Archive,
    iconColor: "bg-slate-400",
    iconBg: "bg-slate-50",
  },
];

export default function PlansContent() {
  return (
    <>
      <Authenticated>
        <PlansManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome to CrediBill</h1>
            <p className="text-slate-600">Please sign in to manage your plans</p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function PlansManager() {
  const [plans] = useState(mockPlans);
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
              <p className="text-sm text-slate-600">
                Manage subscription plans for this app
              </p>
            </div>
            <Button className="w-full md:w-auto h-11">
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
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
                  Create your first subscription plan to start accepting
                  payments.
                </p>
                <Button className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first plan
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
            <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
            <p className="text-sm text-slate-600">
              Manage subscription plans for this app
            </p>
          </div>
          <Button className="w-full md:w-auto h-10">
            <Plus className="mr-2 h-4 w-4" />
            Create Plan
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
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
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: (typeof mockPlans)[0] }) {
  const isArchived = plan.status === "Archived";
  const Icon = plan.icon;

  return (
    <Card className="border border-slate-200 bg-white transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${plan.iconBg}`}>
              <Icon className={`h-5 w-5 text-white ${plan.iconColor}`} />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">{plan.name}</CardTitle>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xs text-slate-500 uppercase">UGX</span>
                <span className="text-lg font-bold text-slate-900">
                  {plan.price >= 1000000 ? `${(plan.price / 1000000).toFixed(1)}M` : `${(plan.price / 1000).toFixed(0)}K`}
                </span>
                <span className="text-xs text-slate-500">/{plan.billingCadence === "monthly" ? "mo" : "yr"}</span>
              </div>
            </div>
          </div>
          <PlanActionMenu />
        </div>
      </CardHeader>

      <CardContent className="pt-3">
        <div className="flex items-center justify-between text-sm">
          <div>
            <p className="text-slate-500">Subscribers</p>
            <p className="text-lg font-semibold text-slate-900">{plan.activeSubscribers}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-500">Revenue</p>
            <p className="text-lg font-semibold text-slate-900">
              {plan.totalRevenue >= 1000000 ? `${(plan.totalRevenue / 1000000).toFixed(1)}M` : `${(plan.totalRevenue / 1000).toFixed(0)}K`}
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
