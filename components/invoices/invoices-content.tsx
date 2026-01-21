"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Download, PackageOpen, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import Link from "next/link";

const statusConfig: Record<string, { badge: string; label: string }> = {
  draft: { badge: "bg-slate-100 text-slate-800", label: "Draft" },
  open: { badge: "bg-blue-100 text-blue-800", label: "Open" },
  paid: { badge: "bg-emerald-100 text-emerald-800", label: "Paid" },
  failed: { badge: "bg-red-100 text-red-800", label: "Failed" },
  void: { badge: "bg-slate-100 text-slate-600", label: "Void" },
};

export default function InvoicesContent() {
  return (
    <>
      <Authenticated>
        <InvoicesManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to manage your invoices
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

function InvoicesManager() {
  const { selectedApp } = useApp();
  const [selectedInvoiceId, setSelectedInvoiceId] =
    useState<Id<"invoices"> | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const invoices = useQuery(
    api.invoices.listInvoices,
    selectedApp?._id
      ? {
          appId: selectedApp._id,
        }
      : "skip",
  );

  const openDetails = (invoiceId: Id<"invoices">) => {
    setSelectedInvoiceId(invoiceId);
    setDetailsOpen(true);
  };

  // Show no apps state
  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-600">
              Manage and track all invoices
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
                    Select an app to manage its invoices
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
  if (invoices === undefined) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">
                Invoices
              </h1>
              <p className="text-sm text-slate-600">
                Manage and track all billing invoices
              </p>
            </div>
            <Button className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="animate-pulse space-y-4">
            <div className="h-10 bg-slate-200 rounded"></div>
            <div className="h-64 bg-slate-200 rounded"></div>
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
            <h1 className="text-2xl font-semibold text-slate-900">Invoices</h1>
            <p className="text-sm text-slate-600">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} in{" "}
              {selectedApp.name}
            </p>
          </div>
          <Button className="bg-white border border-slate-200 text-slate-900 hover:bg-slate-50">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {invoices.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                  <Download className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <h2 className="text-lg font-semibold text-slate-900">
                No invoices yet
              </h2>
              <p className="text-sm text-slate-600">
                Invoices will appear here once billing activity occurs.
              </p>
            </div>
          </div>
        ) : (
          <InvoicesTable data={invoices} onViewDetails={openDetails} />
        )}
      </div>

      {/* Invoice Details Sheet */}
      <InvoiceDetailsSheet
        invoiceId={selectedInvoiceId}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}

function InvoiceDetailsSheet({
  invoiceId,
  open,
  onOpenChange,
}: {
  invoiceId: Id<"invoices"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const invoice = useQuery(
    api.invoices.getInvoiceById,
    invoiceId ? { invoiceId } : "skip",
  );

  if (!invoice) return null;

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const total = invoice.amountDue;
  const customerName =
    invoice.customer?.first_name && invoice.customer?.last_name
      ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
      : invoice.customer?.email || "Unknown";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto px-6">
        <SheetHeader className="px-0">
          <SheetTitle className="text-left">{invoice._id}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pt-6 px-0">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Customer
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {customerName}
              </p>
              <p className="text-xs text-slate-500">
                {invoice.customer?.email}
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Period Start
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatDate(invoice.periodStart)}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Period End
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatDate(invoice.periodEnd)}
                </p>
              </div>
            </div>

            {invoice.dueDate && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Due Date
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {formatDate(invoice.dueDate)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Line Items
            </p>
            {invoice.lineItems.map((item: any, idx: number) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} ×{" "}
                    {formatCurrency(item.unitAmount, invoice.currency)}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(item.totalAmount, invoice.currency)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <p className="font-medium text-slate-900">Total Due</p>
              <p className="text-lg font-semibold text-slate-900">
                {formatCurrency(total, invoice.currency)}
              </p>
            </div>
            {invoice.amountPaid && invoice.amountPaid > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Amount Paid</p>
                <p className="text-sm text-emerald-700 font-medium">
                  {formatCurrency(invoice.amountPaid, invoice.currency)}
                </p>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Status
            </p>
            <Badge className={`${statusConfig[invoice.status]?.badge}`}>
              {statusConfig[invoice.status]?.label}
            </Badge>

            {invoice.status === "paid" &&
              invoice.amountPaid &&
              invoice.amountPaid > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-600">
                    Paid -{" "}
                    {formatCurrency(invoice.amountPaid, invoice.currency)}
                  </p>
                </div>
              )}
          </div>

          {invoice.subscription && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Subscription
                </p>
                <p className="text-sm text-slate-600">
                  Status:{" "}
                  <span className="font-medium text-slate-900">
                    {invoice.subscription.status}
                  </span>
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
