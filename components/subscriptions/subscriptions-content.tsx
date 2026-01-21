"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SubscriptionsSkeleton } from "@/components/subscriptions/subscriptions-skeleton";
import { SubscriptionsTable } from "@/components/subscriptions/subscriptions-table";
import { Button } from "@/components/ui/button";
import { PackageOpen } from "lucide-react";

export default function SubscriptionsContent() {
  return (
    <>
      <Authenticated>
        <SubscriptionsManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to manage subscriptions
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

function SubscriptionsManager() {
  const { selectedApp } = useApp();

  // Fetch subscriptions scoped to the selected app
  const subscriptions = useQuery(
    api.subscriptions.listSubscriptions,
    selectedApp?._id
      ? {
          appId: selectedApp._id,
        }
      : "skip",
  );

  // No app selected state
  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              Subscriptions
            </h1>
            <p className="text-sm text-slate-600">
              Manage customer subscriptions
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
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    No app selected
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Select an app to view its subscriptions
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (subscriptions === undefined) {
    return <SubscriptionsSkeleton />;
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
              {subscriptions.length} subscription
              {subscriptions.length !== 1 ? "s" : ""} in {selectedApp.name}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {subscriptions.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <PackageOpen className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No subscriptions yet
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Subscriptions will appear here when customers subscribe to
                  plans
                </p>
              </div>
            </div>
          </div>
        ) : (
          <SubscriptionsTable data={subscriptions} />
        )}
        </div>
      </div>
    </div>
  );
}
