"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useState } from "react";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Edit,
  Trash2,
  Zap,
  TrendingUp,
  Sparkles,
  PackageOpen,
} from "lucide-react";
import { CreatePlanDialog } from "@/components/create-plan-dialog";
import { EditPlanDialog } from "@/components/edit-plan-dialog";
import { useApp } from "@/contexts/app-context";
import Link from "next/link";

export default function PlansContent() {
  return (
    <>
      <Authenticated>
        <PlansManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to manage your plans
            </p>
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
  const { selectedApp } = useApp();
  const plans = useQuery(
    api.plans.getPlansByApp,
    selectedApp?._id ? { appId: selectedApp._id } : "skip"
  );

  const isEmpty = !plans || plans.length === 0;

  // Show message if no apps exist
  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
            <p className="text-sm text-slate-600">
              Manage subscription plans for your applications
            </p>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <PackageOpen className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No apps yet
                </h2>
                <p className="text-sm text-slate-600">
                  Create your first app before you can add pricing plans.
                </p>
                <Button onClick={() => (window.location.href = "/create-app")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first app
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Plans</h1>
              <p className="text-sm text-slate-600">
                Manage subscription plans for {selectedApp?.name}
              </p>
            </div>
            {selectedApp && <CreatePlanDialog appId={selectedApp._id} />}
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                    <Plus className="h-8 w-8 text-teal-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No plans yet
                </h2>
                <p className="text-sm text-slate-600">
                  Create your first subscription plan to start accepting
                  payments.
                </p>
                {selectedApp && (
                  <CreatePlanDialog
                    appId={selectedApp._id}
                    trigger={
                      <Button className="w-full">
                        <Plus className="mr-2 h-4 w-4" />
                        Create your first plan
                      </Button>
                    }
                  />
                )}
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
              Manage subscription plans for {selectedApp?.name || "your app"}
            </p>
          </div>
          {selectedApp && <CreatePlanDialog appId={selectedApp._id} />}
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-slate-100 p-3">
              <PackageOpen className="h-6 w-6 text-slate-600" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No plans yet
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Create your first subscription plan to start billing customers
            </p>
            <div className="mt-6">
              {selectedApp && (
                <CreatePlanDialog
                  appId={selectedApp._id}
                  trigger={
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create your first plan
                    </Button>
                  }
                />
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans?.map((plan) => (
                <PlanCard key={plan._id} plan={plan} />
              ))}
            </div>

            <div className="flex items-center justify-center pt-4">
              <p className="text-sm text-slate-600">
                {plans?.length || 0} plan{plans?.length !== 1 ? "s" : ""} active
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: any }) {
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

function PlanActionMenu({
  plan,
}: {
  plan: any;
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const deletePlanMutation = useMutation(api.plans.deletePlan);

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete "${plan.name}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deletePlanMutation({ planId: plan._id });
      toast.success("Plan deleted successfully", {
        description: `${plan.name} has been removed`,
      });
    } catch (error: any) {
      toast.error("Failed to delete plan", {
        description: error.message || "Please try again",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-600"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete plan"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <EditPlanDialog
        plan={plan}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSuccess={() => {
          toast.success("Plan updated successfully");
        }}
      />
    </>
  );
}
