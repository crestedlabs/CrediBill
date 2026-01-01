"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SubscriptionFilters } from "@/components/subscriptions/subscription-filters";
import { SubscriptionsSkeleton } from "@/components/subscriptions/subscriptions-skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PackageOpen, MoreVertical, XCircle, Calendar } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "active" | "trialing" | "paused" | "cancelled" | "expired" | undefined
  >();

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchQuery);
  };

  const handleStatusFilterChange = (
    status:
      | "active"
      | "trialing"
      | "paused"
      | "cancelled"
      | "expired"
      | undefined
  ) => {
    setStatusFilter(status);
  };

  // Fetch subscriptions scoped to the selected app
  const subscriptions = useQuery(
    api.subscriptions.listSubscriptions,
    selectedApp?._id
      ? {
          appId: selectedApp._id,
          status: statusFilter,
        }
      : "skip"
  );

  // Filter client-side for search (customer name/email)
  const filteredSubscriptions =
    submittedSearch && subscriptions
      ? subscriptions.filter((sub: any) => {
          const searchLower = submittedSearch.toLowerCase();
          return (
            sub.customer?.email.toLowerCase().includes(searchLower) ||
            sub.customer?.first_name?.toLowerCase().includes(searchLower) ||
            sub.customer?.last_name?.toLowerCase().includes(searchLower)
          );
        })
      : subscriptions;

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

  const hasSubscriptions =
    filteredSubscriptions && filteredSubscriptions.length > 0;

  const statusColors: Record<string, { badge: string; bg: string }> = {
    active: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50" },
    trialing: { badge: "bg-blue-100 text-blue-800", bg: "bg-blue-50" },
    pending_payment: {
      badge: "bg-amber-100 text-amber-800",
      bg: "bg-amber-50",
    },
    past_due: { badge: "bg-orange-100 text-orange-800", bg: "bg-orange-50" },
    paused: { badge: "bg-purple-100 text-purple-800", bg: "bg-purple-50" },
    cancelled: { badge: "bg-red-100 text-red-800", bg: "bg-red-50" },
    expired: { badge: "bg-slate-100 text-slate-800", bg: "bg-slate-50" },
  };

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

      {/* Filters - Always Visible */}
      <SubscriptionFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />

      {/* Content */}
      <div className="px-4 pb-6 sm:px-6 lg:px-8">
        {!hasSubscriptions ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <PackageOpen className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No subscriptions found
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {searchQuery || statusFilter
                    ? "Try adjusting your filters"
                    : "Subscriptions will appear here when customers subscribe to plans"}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <Card className="border border-slate-200 bg-white">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b border-slate-200 bg-slate-50">
                      <tr className="text-left text-xs font-semibold text-slate-700">
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3 hidden sm:table-cell">Plan</th>
                        <th className="px-4 py-3 hidden md:table-cell">
                          Amount
                        </th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 hidden lg:table-cell">
                          Started
                        </th>
                        <th className="px-4 py-3 hidden xl:table-cell">
                          Next Payment
                        </th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubscriptions.map((subscription: any) => {
                        const status = subscription.status || "active";
                        const colors =
                          statusColors[status] || statusColors.active; // Fallback to active styling
                        const customerName = subscription.customer?.first_name
                          ? `${subscription.customer.first_name}${subscription.customer.last_name ? ` ${subscription.customer.last_name}` : ""}`
                          : subscription.customer?.email || "Unknown";

                        const formatDate = (timestamp: number | undefined) => {
                          if (!timestamp) return "—";
                          return new Date(timestamp).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          );
                        };

                        const trialEnds =
                          subscription.status === "trialing" &&
                          subscription.trialEndsAt
                            ? formatDate(subscription.trialEndsAt)
                            : "—";

                        // Handle next payment date based on status
                        let nextPayment = "—";
                        let nextPaymentLabel = "";

                        if (subscription.status === "pending_payment") {
                          // If payment is pending and the period end is in the past, it's overdue
                          const periodEnd =
                            subscription.currentPeriodEnd ||
                            subscription.nextPaymentDate;
                          if (periodEnd && periodEnd < Date.now()) {
                            nextPayment = formatDate(periodEnd);
                            nextPaymentLabel = "Overdue since";
                          } else {
                            nextPayment = periodEnd
                              ? formatDate(periodEnd)
                              : "—";
                            nextPaymentLabel = "Payment due";
                          }
                        } else if (subscription.status === "past_due") {
                          const dueDate =
                            subscription.currentPeriodEnd ||
                            subscription.nextPaymentDate;
                          nextPayment = dueDate ? formatDate(dueDate) : "—";
                          nextPaymentLabel = "Overdue since";
                        } else if (
                          subscription.status === "active" ||
                          subscription.status === "trialing"
                        ) {
                          nextPayment = subscription.nextPaymentDate
                            ? formatDate(subscription.nextPaymentDate)
                            : formatDate(subscription.currentPeriodEnd);
                        } else if (
                          subscription.status === "cancelled" ||
                          subscription.status === "expired"
                        ) {
                          nextPayment = "—";
                        }

                        const startedDate = formatDate(subscription.startDate);

                        return (
                          <tr
                            key={subscription._id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors"
                          >
                            <td className="px-4 py-4">
                              <div>
                                <div className="font-medium text-slate-900 text-sm">
                                  {customerName}
                                </div>
                                <div className="text-xs text-slate-600">
                                  {subscription.customer?.email}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-slate-900 hidden sm:table-cell">
                              {subscription.plan?.name || "Unknown Plan"}
                            </td>
                            <td className="px-4 py-4 text-sm font-medium text-slate-900 hidden md:table-cell">
                              {subscription.plan?.currency}{" "}
                              {subscription.plan?.baseAmount?.toLocaleString() ||
                                "0"}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`${colors.badge} text-xs`}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600 hidden lg:table-cell">
                              {startedDate}
                            </td>
                            <td className="px-4 py-4 text-xs hidden xl:table-cell">
                              <div>
                                <div className="font-medium text-slate-900">
                                  {nextPayment}
                                </div>
                                {nextPaymentLabel && (
                                  <div
                                    className={`text-xs mt-0.5 ${
                                      nextPaymentLabel.includes("Overdue")
                                        ? "text-red-600 font-medium"
                                        : "text-amber-600"
                                    }`}
                                  >
                                    {nextPaymentLabel}
                                  </div>
                                )}
                                {status === "trialing" &&
                                  subscription.trialEndsAt && (
                                    <div className="text-xs text-blue-600 mt-0.5">
                                      Trial ends
                                    </div>
                                  )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                              <SubscriptionActionMenu
                                subscriptionId={subscription._id}
                                customerEmail={
                                  subscription.customer?.email || ""
                                }
                                planName={subscription.plan?.name || ""}
                                status={subscription.status}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center pt-4">
              <p className="text-sm text-slate-600">
                Showing {filteredSubscriptions.length} subscription
                {filteredSubscriptions.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubscriptionActionMenu({
  subscriptionId,
  customerEmail,
  planName,
  status,
}: {
  subscriptionId: string;
  customerEmail: string;
  planName: string;
  status: string;
}) {
  const { selectedApp } = useApp();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateStatusMutation = useMutation(
    api.subscriptions.updateSubscriptionStatus
  );

  const handleCancelAtPeriodEnd = async () => {
    setIsProcessing(true);
    try {
      await updateStatusMutation({
        subscriptionId: subscriptionId as any,
        action: "cancel_at_period_end",
      });

      const message =
        status === "trialing"
          ? "Subscription will cancel at trial end"
          : "Subscription will cancel at period end";

      toast.success(message, {
        description: `${customerEmail} - ${planName}`,
      });

      setShowCancelDialog(false);
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to update subscription", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsProcessing(false);
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
          {(status === "active" ||
            status === "trialing" ||
            status === "pending_payment" ||
            status === "paused") && (
            <DropdownMenuItem onClick={() => setShowCancelDialog(true)}>
              <XCircle className="mr-2 h-4 w-4" />
              {status === "trialing"
                ? "Cancel at trial end"
                : "Cancel at period end"}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Cancel at Period End Confirmation */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {status === "trialing"
                ? "Cancel at Trial End"
                : "Cancel at Period End"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {status === "trialing" ? (
                <>
                  This will cancel the subscription for{" "}
                  <strong>{customerEmail}</strong> when the trial ends. They
                  will retain access until then, and no payment will be
                  collected.
                </>
              ) : (
                <>
                  This will cancel the subscription for{" "}
                  <strong>{customerEmail}</strong> at the end of the current
                  billing period. They will retain access until then.
                </>
              )}
              <br />
              <br />
              Plan: <strong>{planName}</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>
              Go Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelAtPeriodEnd}
              disabled={isProcessing}
              className="bg-red-600 hover:bg-red-700"
            >
              {isProcessing ? "Scheduling..." : "Schedule Cancellation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
