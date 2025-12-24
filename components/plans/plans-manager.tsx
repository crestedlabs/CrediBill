"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Plus, PackageOpen } from "lucide-react";
import { CreatePlanDialog } from "@/components/create-plan-dialog";
import { PlanCard } from "@/components/plans/plan-card";
import { useApp } from "@/contexts/app-context";

export function PlansManager() {
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
      </div>
    </div>
  );
}
