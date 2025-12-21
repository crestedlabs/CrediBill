"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import {
  MoreVertical,
  Download,
  Search,
  X,
  Eye,
  RotateCcw,
  RefreshCw,
  ZapOff,
} from "lucide-react";

const mockInvoices = [
  {
    id: "INV-2024-001",
    customer: "alice.chen@company.com",
    amount: 1200.0,
    status: "Paid",
    paymentMethod: "Credit Card",
    issuedDate: "Dec 1, 2024",
    dueDate: "Dec 8, 2024",
    items: [
      {
        description: "Professional Plan - Monthly",
        quantity: 1,
        price: 1000.0,
      },
      { description: "Add-on: Analytics", quantity: 1, price: 200.0 },
    ],
    tax: 0.0,
    discount: 0.0,
    paidAt: "Dec 2, 2024",
  },
  {
    id: "INV-2024-002",
    customer: "bob.martinez@startup.io",
    amount: 450.0,
    status: "Open",
    paymentMethod: "MoMo",
    issuedDate: "Dec 10, 2024",
    dueDate: "Dec 17, 2024",
    items: [
      { description: "Starter Plan - Monthly", quantity: 1, price: 450.0 },
    ],
    tax: 0.0,
    discount: 0.0,
    paidAt: null,
  },
  {
    id: "INV-2024-003",
    customer: "carol.williams@business.com",
    amount: 3600.0,
    status: "Paid",
    paymentMethod: "Credit Card",
    issuedDate: "Nov 1, 2024",
    dueDate: "Nov 8, 2024",
    items: [
      { description: "Enterprise Plan - Annual", quantity: 1, price: 3600.0 },
    ],
    tax: 0.0,
    discount: 0.0,
    paidAt: "Nov 3, 2024",
  },
  {
    id: "INV-2024-004",
    customer: "david.johnson@enterprise.com",
    amount: 600.0,
    status: "Failed",
    paymentMethod: "MoMo",
    issuedDate: "Dec 5, 2024",
    dueDate: "Dec 12, 2024",
    items: [
      { description: "Professional Plan - Monthly", quantity: 1, price: 600.0 },
    ],
    tax: 0.0,
    discount: 0.0,
    paidAt: null,
    paymentAttempts: [
      { date: "Dec 6, 2024", status: "Failed", error: "Card declined" },
      { date: "Dec 9, 2024", status: "Failed", error: "Insufficient funds" },
    ],
  },
  {
    id: "INV-2024-005",
    customer: "eve.thompson@oldclient.com",
    amount: 1200.0,
    status: "Refunded",
    paymentMethod: "Credit Card",
    issuedDate: "Oct 15, 2024",
    dueDate: "Oct 22, 2024",
    items: [
      {
        description: "Professional Plan - Monthly",
        quantity: 1,
        price: 1200.0,
      },
    ],
    tax: 0.0,
    discount: 0.0,
    paidAt: "Oct 17, 2024",
    refunds: [
      { amount: 1200.0, reason: "Customer request", date: "Oct 25, 2024" },
    ],
  },
];

const statusConfig: Record<string, { badge: string; bg: string }> = {
  Paid: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50" },
  Open: { badge: "bg-slate-100 text-slate-800", bg: "bg-slate-50" },
  Failed: { badge: "bg-red-100 text-red-800", bg: "bg-red-50" },
  Refunded: { badge: "bg-blue-100 text-blue-800", bg: "bg-blue-50" },
  Void: { badge: "bg-slate-100 text-slate-600", bg: "bg-slate-50" },
};

export default function InvoicesContent() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedInvoice, setSelectedInvoice] = useState<
    (typeof mockInvoices)[0] | null
  >(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isEmpty = false;

  const filteredInvoices = mockInvoices.filter((inv) => {
    const matchesSearch =
      inv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.customer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const openDetails = (invoice: (typeof mockInvoices)[0]) => {
    setSelectedInvoice(invoice);
    setDetailsOpen(true);
  };

  if (isEmpty) {
    return (
      <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Invoices</h1>
            <p className="text-sm text-slate-600">
              Manage and track all billing invoices
            </p>
          </div>
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>

        <Separator className="my-2" />

        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center md:py-24">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Invoices</h1>
          <p className="text-sm text-slate-600">
            Manage and track all billing invoices
          </p>
        </div>
        <Button>
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Separator className="my-2" />

      <div className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search invoice ID or customer..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="All">All statuses</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Open">Open</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
                <SelectItem value="Refunded">Refunded</SelectItem>
                <SelectItem value="Void">Void</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          {(searchQuery || statusFilter !== "All") && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("All");
              }}
            >
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>

      <div className="hidden md:block">
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3">Invoice ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Payment Method</th>
                    <th className="px-4 py-3">Issued Date</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((invoice, idx) => {
                    const colors =
                      statusConfig[invoice.status] || statusConfig.Open;
                    return (
                      <tr
                        key={invoice.id}
                        className={`text-sm transition-colors hover:bg-slate-50 ${
                          idx !== filteredInvoices.length - 1
                            ? "border-b border-slate-200"
                            : ""
                        }`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-mono font-medium text-slate-900">
                            {invoice.id}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {invoice.customer}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          ${invoice.amount.toFixed(2)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${colors.badge}`}>
                            {invoice.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {invoice.paymentMethod}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {invoice.issuedDate}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <InvoiceActionMenu
                            invoice={invoice}
                            onViewDetails={() => openDetails(invoice)}
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
      </div>

      <div className="space-y-3 md:hidden">
        {filteredInvoices.map((invoice) => {
          const colors = statusConfig[invoice.status] || statusConfig.Open;
          return (
            <Card
              key={invoice.id}
              className={`border border-slate-200 ${colors.bg} cursor-pointer transition-all hover:border-slate-300`}
              onClick={() => openDetails(invoice)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm font-semibold text-slate-900">
                        {invoice.id}
                      </p>
                      <Badge className={`${colors.badge}`}>
                        {invoice.status}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-600">{invoice.customer}</p>

                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-900">
                        ${invoice.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {invoice.paymentMethod} • {invoice.issuedDate}
                      </p>
                    </div>
                  </div>

                  <InvoiceActionMenu
                    invoice={invoice}
                    onViewDetails={() => openDetails(invoice)}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center pt-4">
        <p className="text-sm text-slate-600">
          Showing {filteredInvoices.length} of {mockInvoices.length} invoice
          {filteredInvoices.length !== 1 ? "s" : ""}
        </p>
      </div>

      <InvoiceDetailsSheet
        invoice={selectedInvoice}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </div>
  );
}

function InvoiceActionMenu({
  invoice,
  onViewDetails,
}: {
  invoice: (typeof mockInvoices)[0];
  onViewDetails: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onViewDetails}>
          <Eye className="mr-2 h-4 w-4" />
          View details
        </DropdownMenuItem>
        {invoice.status === "Open" && (
          <>
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry payment
            </DropdownMenuItem>
          </>
        )}
        {invoice.status === "Paid" && (
          <>
            <DropdownMenuItem>
              <RotateCcw className="mr-2 h-4 w-4" />
              Create refund
            </DropdownMenuItem>
          </>
        )}
        {(invoice.status === "Open" || invoice.status === "Failed") && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <ZapOff className="mr-2 h-4 w-4" />
              Void invoice
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InvoiceDetailsSheet({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: (typeof mockInvoices)[0] | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!invoice) return null;

  const total =
    invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0) +
    invoice.tax -
    invoice.discount;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{invoice.id}</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pt-6">
          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-500">
                Customer
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {invoice.customer}
              </p>
            </div>

            <div className="flex gap-4">
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Issued
                </p>
                <p className="mt-1 text-sm text-slate-900">
                  {invoice.issuedDate}
                </p>
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Due
                </p>
                <p className="mt-1 text-sm text-slate-900">{invoice.dueDate}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Line Items
            </p>
            {invoice.items.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">
                    {item.quantity} × ${item.price.toFixed(2)}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-900">
                  ${(item.quantity * item.price).toFixed(2)}
                </p>
              </div>
            ))}
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Subtotal</p>
              <p className="text-sm text-slate-900">
                $
                {invoice.items
                  .reduce((sum, item) => sum + item.quantity * item.price, 0)
                  .toFixed(2)}
              </p>
            </div>
            {invoice.tax > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Tax</p>
                <p className="text-sm text-slate-900">
                  ${invoice.tax.toFixed(2)}
                </p>
              </div>
            )}
            {invoice.discount > 0 && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-600">Discount</p>
                <p className="text-sm text-slate-900">
                  -${invoice.discount.toFixed(2)}
                </p>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-slate-200 pt-2">
              <p className="font-medium text-slate-900">Total</p>
              <p className="text-lg font-semibold text-slate-900">
                ${total.toFixed(2)}
              </p>
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase text-slate-500">
              Status
            </p>
            <Badge className={`${statusConfig[invoice.status]?.badge}`}>
              {invoice.status}
            </Badge>

            {invoice.paidAt && (
              <div>
                <p className="text-xs font-medium text-slate-600">
                  Paid on {invoice.paidAt}
                </p>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-600">
                Payment Method: {invoice.paymentMethod}
              </p>
            </div>
          </div>

          {invoice.paymentAttempts && invoice.paymentAttempts.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Payment Attempts
                </p>
                {invoice.paymentAttempts.map((attempt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-md bg-red-50 p-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-900">
                        {attempt.date}
                      </p>
                      <p className="text-xs text-red-700">{attempt.error}</p>
                    </div>
                    <Badge variant="outline" className="text-red-700">
                      {attempt.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </>
          )}

          {invoice.refunds && invoice.refunds.length > 0 && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Refunds
                </p>
                {invoice.refunds.map((refund, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 rounded-md bg-blue-50 p-2"
                  >
                    <div>
                      <p className="text-xs font-medium text-slate-900">
                        ${refund.amount.toFixed(2)}
                      </p>
                      <p className="text-xs text-slate-600">{refund.reason}</p>
                      <p className="text-xs text-slate-500">{refund.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
