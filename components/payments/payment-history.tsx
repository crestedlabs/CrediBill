"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, User, Calendar, FileText } from "lucide-react";

interface PaymentHistoryProps {
  invoiceId: Id<"invoices">;
  currency: string;
}

export function PaymentHistory({ invoiceId, currency }: PaymentHistoryProps) {
  const payments = useQuery(api.payments.listPaymentsByInvoice, {
    invoiceId,
  });

  // Format currency with proper divisor
  const formatAmount = (amount: number) => {
    const divisor =
      currency === "UGX" ||
      currency === "KES" ||
      currency === "TZS" ||
      currency === "RWF"
        ? 1
        : 100;
    return (amount / divisor).toFixed(divisor === 1 ? 0 : 2);
  };

  if (payments === undefined) {
    return <PaymentHistorySkeleton />;
  }

  if (payments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
              <CreditCard className="h-6 w-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600">No payments recorded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const statusColors: Record<string, string> = {
    completed: "bg-emerald-100 text-emerald-800",
    pending: "bg-amber-100 text-amber-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-slate-100 text-slate-800",
  };

  const paymentMethodLabels: Record<string, string> = {
    momo: "Mobile Money",
    "credit-card": "Credit Card",
    bank: "Bank Transfer",
    cash: "Cash",
    other: "Other",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payments.map((payment: any, index: number) => (
            <div
              key={payment._id}
              className={`rounded-lg border border-slate-200 bg-white p-4 ${
                index !== payments.length - 1 ? "mb-4" : ""
              }`}
            >
              {/* Header - Amount and Status */}
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <div className="text-lg font-semibold text-slate-900">
                    {currency} {formatAmount(payment.amount)}
                  </div>
                  <div className="text-xs text-slate-500">
                    {new Date(payment.paidAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
                <Badge className={statusColors[payment.status]}>
                  {payment.status.charAt(0).toUpperCase() +
                    payment.status.slice(1)}
                </Badge>
              </div>

              {/* Payment Details */}
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <div className="flex items-center gap-2 text-sm">
                  <CreditCard className="h-4 w-4 text-slate-400" />
                  <span className="text-slate-600">
                    {paymentMethodLabels[payment.paymentMethod] ||
                      payment.paymentMethod}
                  </span>
                  {payment.provider && payment.provider !== "manual" && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      {payment.provider}
                    </Badge>
                  )}
                </div>

                {payment.providerPaymentId && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      Ref: {payment.providerPaymentId}
                    </span>
                  </div>
                )}

                {payment.recordedByUser && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-slate-400" />
                    <span className="text-slate-600">
                      Recorded by {payment.recordedByUser.name}
                    </span>
                  </div>
                )}

                {payment.notes && (
                  <div className="mt-2 rounded bg-slate-50 p-2 text-xs text-slate-600">
                    {payment.notes}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Summary */}
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm">
            <div className="flex justify-between">
              <span className="font-medium text-emerald-900">
                Total Paid ({payments.length} payment
                {payments.length !== 1 ? "s" : ""}):
              </span>
              <span className="font-semibold text-emerald-900">
                {currency}{" "}
                {formatAmount(
                  payments
                    .filter((p: any) => p.status === "completed")
                    .reduce((sum: number, p: any) => sum + p.amount, 0)
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payment History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
