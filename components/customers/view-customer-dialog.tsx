"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Mail,
  Phone,
  User,
  Calendar,
  Tag,
  ExternalLink,
  Building,
  UserCircle,
} from "lucide-react";

interface ViewCustomerDialogProps {
  customerId: Id<"customers">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ViewCustomerDialog({
  customerId,
  open,
  onOpenChange,
}: ViewCustomerDialogProps) {
  const customer = useQuery(
    api.customers.getCustomer,
    open ? { customerId } : "skip",
  );

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const statusColors: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    inactive: "bg-slate-100 text-slate-800",
    blocked: "bg-red-100 text-red-800",
  };

  const typeIcons: Record<string, React.ReactNode> = {
    individual: <UserCircle className="h-4 w-4 text-slate-600" />,
    business: <Building className="h-4 w-4 text-slate-600" />,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-slate-600" />
            Customer Details
          </DialogTitle>
          <DialogDescription>
            Complete information about this customer
          </DialogDescription>
        </DialogHeader>

        {!customer ? (
          <CustomerDetailsSkeleton />
        ) : (
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Information
              </h3>
              <div className="grid gap-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      Full Name
                    </p>
                    <p className="text-sm text-slate-600">
                      {customer.first_name || customer.last_name
                        ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim()
                        : "—"}
                    </p>
                  </div>
                  {customer.type && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      {typeIcons[customer.type]}
                      <span className="capitalize">{customer.type}</span>
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    Email
                  </p>
                  <p className="text-sm text-slate-600 font-mono">
                    {customer.email}
                  </p>
                </div>

                {customer.phone && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-slate-500" />
                        Phone
                      </p>
                      <p className="text-sm text-slate-600 font-mono">
                        {customer.phone}
                      </p>
                    </div>
                  </>
                )}

                <Separator />

                <div className="space-y-1">
                  <p className="text-sm font-medium text-slate-900 flex items-center gap-2">
                    <Tag className="h-3.5 w-3.5 text-slate-500" />
                    Status
                  </p>
                  <Badge
                    className={`${statusColors[customer.status || "active"]} text-xs`}
                  >
                    {(customer.status || "active").charAt(0).toUpperCase() +
                      (customer.status || "active").slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* External Integration */}
            {customer.externalCustomerId && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <ExternalLink className="h-4 w-4" />
                    External Integration
                  </h3>
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-900">
                      External ID
                    </p>
                    <p className="text-sm text-slate-600 font-mono break-all">
                      {customer.externalCustomerId}
                    </p>
                  </div>
                </div>
              </>
            )}

            {/* Metadata */}
            {customer.metadata && Object.keys(customer.metadata).length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Metadata
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <pre className="text-xs text-slate-700 overflow-x-auto">
                      {JSON.stringify(customer.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </>
            )}

            {/* System Information */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                System Information
              </h3>
              <div className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Customer ID:</span>
                  <span className="font-mono text-slate-900 text-xs">
                    {customer._id}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Created:</span>
                  <span className="text-slate-900">
                    {formatDate(customer._creationTime)}
                  </span>
                </div>
              </div>
            </div>

            {/* Active Subscriptions */}
            {customer.subscriptions && customer.subscriptions.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Subscriptions
                  </h3>
                  <div className="space-y-2">
                    {customer.subscriptions.map((sub) => {
                      const statusColors: Record<string, string> = {
                        active: "bg-emerald-100 text-emerald-800",
                        trialing: "bg-blue-100 text-blue-800",
                        pending_payment: "bg-amber-100 text-amber-800",
                        paused: "bg-slate-100 text-slate-800",
                        cancelled: "bg-red-100 text-red-800",
                        past_due: "bg-orange-100 text-orange-800",
                      };
                      return (
                        <div
                          key={sub._id}
                          className="rounded-lg border border-slate-200 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900">
                              {sub.plan?.name || "Unknown Plan"}
                            </p>
                            <Badge
                              className={`${statusColors[sub.status]} text-xs`}
                            >
                              {sub.status.charAt(0).toUpperCase() +
                                sub.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                            <div>
                              <span className="font-medium">Started:</span>{" "}
                              {sub.startDate
                                ? new Date(sub.startDate).toLocaleDateString()
                                : "—"}
                            </div>
                            {sub.plan && (
                              <div>
                                <span className="font-medium">Plan:</span>{" "}
                                {sub.plan.currency}{" "}
                                {sub.plan.baseAmount?.toLocaleString()}/
                                {sub.plan.interval}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-900">
                          Active Subscriptions
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Total count of active/trialing subscriptions
                        </p>
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {
                          customer.subscriptions.filter(
                            (s) =>
                              s.status === "active" || s.status === "trialing",
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Invoices Summary */}
            {customer.invoices && customer.invoices.length > 0 && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-slate-900">
                    Invoices Summary
                  </h3>
                  <div className="rounded-lg bg-slate-50 p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Total Invoices:</span>
                      <span className="font-semibold text-slate-900">
                        {customer.invoices.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Paid:</span>
                      <span className="text-emerald-600 font-semibold">
                        {
                          customer.invoices.filter((i) => i.status === "paid")
                            .length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Open:</span>
                      <span className="text-amber-600 font-semibold">
                        {
                          customer.invoices.filter((i) => i.status === "open")
                            .length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CustomerDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-20 w-full" />
      </div>
    </div>
  );
}
