"use client";

import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  XCircle,
  Search,
  Columns3,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseConvexError } from "@/lib/error-utils";

type Subscription = {
  _id: string;
  status: string;
  computedStatus?: string;
  startDate?: number;
  currentPeriodStart?: number;
  currentPeriodEnd?: number;
  trialEndsAt?: number;
  customer?: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
  plan?: {
    name: string;
    baseAmount?: number;
    currency: string;
  };
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  trialing: "bg-blue-100 text-blue-800",
  pending_payment: "bg-amber-100 text-amber-800",
  past_due: "bg-orange-100 text-orange-800",
  paused: "bg-purple-100 text-purple-800",
  cancelled: "bg-red-100 text-red-800",
};

const formatDate = (timestamp: number | undefined) => {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface SubscriptionsTableProps {
  data: Subscription[];
}

export function SubscriptionsTable({ data }: SubscriptionsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({
    // Show only 6 columns by default
    customer: true,
    plan: true,
    status: true,
    startDate: false,
    currentPeriodStart: true,
    currentPeriodEnd: true,
    trialEndsAt: true,
    actions: false,
  });
  const [selectedSubscription, setSelectedSubscription] =
    useState<Subscription | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateStatusMutation = useMutation(
    api.subscriptions.updateSubscriptionStatus,
  );

  const columns = useMemo<ColumnDef<Subscription>[]>(
    () => [
      {
        accessorKey: "customer",
        id: "customer",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Customer
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const customer = row.original.customer;
          const customerName = customer?.first_name
            ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ""}`
            : customer?.email || "Unknown";

          return (
            <div className="px-2">
              <div className="font-medium text-slate-900 text-sm">
                {customerName}
              </div>
              <div className="text-xs text-slate-600">{customer?.email}</div>
            </div>
          );
        },
      },
      {
        accessorKey: "plan",
        id: "plan",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Plan
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-sm text-slate-900">
            {row.original.plan?.name || "Unknown Plan"}
          </div>
        ),
      },
      {
        accessorKey: "status",
        id: "status",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const status =
            row.original.computedStatus || row.original.status || "active";
          return (
            <div className="px-2">
              <Badge className={`${statusColors[status]} text-xs`}>
                {status.charAt(0).toUpperCase() +
                  status.slice(1).replace(/_/g, " ")}
              </Badge>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value) return true;
          const status = row.original.computedStatus || row.original.status;
          return status === value;
        },
      },
      {
        accessorKey: "startDate",
        id: "startDate",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Customer Since
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600">
            {row.original.startDate ? formatDate(row.original.startDate) : "—"}
          </div>
        ),
      },
      {
        accessorKey: "currentPeriodStart",
        id: "currentPeriodStart",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Sub Starts
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600">
            {row.original.currentPeriodStart
              ? formatDate(row.original.currentPeriodStart)
              : "—"}
          </div>
        ),
      },
      {
        accessorKey: "currentPeriodEnd",
        id: "currentPeriodEnd",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Sub Ends
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600">
            {row.original.currentPeriodEnd
              ? formatDate(row.original.currentPeriodEnd)
              : "—"}
          </div>
        ),
      },
      {
        accessorKey: "trialEndsAt",
        id: "trialEndsAt",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Trial Ends
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600">
            {row.original.trialEndsAt
              ? formatDate(row.original.trialEndsAt)
              : "—"}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right pr-2">Actions</div>,
        cell: ({ row }) => {
          const subscription = row.original;
          const status = subscription.status;

          return (
            <div className="text-right pr-2">
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
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedSubscription(subscription);
                        setShowCancelDialog(true);
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      {status === "trialing"
                        ? "Cancel at trial end"
                        : "Cancel at period end"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [],
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchValue = String(filterValue).toLowerCase();
      const subscription = row.original;

      if (subscription.customer?.email?.toLowerCase().includes(searchValue)) {
        return true;
      }

      if (
        subscription.customer?.first_name?.toLowerCase().includes(searchValue)
      ) {
        return true;
      }

      if (
        subscription.customer?.last_name?.toLowerCase().includes(searchValue)
      ) {
        return true;
      }

      if (subscription.plan?.name?.toLowerCase().includes(searchValue)) {
        return true;
      }

      return false;
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  const handleCancelAtPeriodEnd = async () => {
    if (!selectedSubscription) return;

    setIsProcessing(true);
    try {
      await updateStatusMutation({
        subscriptionId: selectedSubscription._id as any,
        action: "cancel_at_period_end",
      });

      const message =
        selectedSubscription.status === "trialing"
          ? "Subscription will cancel at trial end"
          : "Subscription will cancel at period end";

      toast.success(message, {
        description: `${selectedSubscription.customer?.email} - ${selectedSubscription.plan?.name}`,
      });

      setShowCancelDialog(false);
      setSelectedSubscription(null);
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
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Global Search and Column Visibility */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search by customer name or email..."
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 bg-white h-10"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10">
                <Columns3 className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                  const columnLabels: Record<string, string> = {
                    customer: "Customer",
                    plan: "Plan",
                    status: "Status",
                    startDate: "Customer Since",
                    currentPeriodStart: "Sub Starts",
                    currentPeriodEnd: "Sub Ends",
                    trialEndsAt: "Trial Ends",
                  };

                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {columnLabels[column.id] || column.id}
                    </DropdownMenuCheckboxItem>
                  );
                })}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: "All", value: "" },
              { label: "Active", value: "active" },
              { label: "Trialing", value: "trialing" },
              { label: "Pending Payment", value: "pending_payment" },
              { label: "Past Due", value: "past_due" },
              { label: "Paused", value: "paused" },
              { label: "Cancelled", value: "cancelled" },
            ] as const
          ).map((filter) => {
            const isSelected =
              (table.getColumn("status")?.getFilterValue() as string) ===
                filter.value ||
              (!table.getColumn("status")?.getFilterValue() &&
                filter.value === "");

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  table
                    .getColumn("status")
                    ?.setFilterValue(filter.value || undefined)
                }
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                  isSelected
                    ? "bg-teal-600 text-white hover:bg-teal-700"
                    : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-slate-50"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    <div className="text-slate-500">
                      No subscriptions found.
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-slate-600">
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} subscription
          {table.getFilteredRowModel().rows.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="text-sm text-slate-600">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {(selectedSubscription?.computedStatus ||
                selectedSubscription?.status) === "trialing"
                ? "Cancel at Trial End"
                : "Cancel at Period End"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {(selectedSubscription?.computedStatus ||
                selectedSubscription?.status) === "trialing" ? (
                <>
                  This will cancel the subscription for{" "}
                  <strong>{selectedSubscription?.customer?.email}</strong> when
                  the trial ends. They will retain access until then, and no
                  payment will be collected.
                </>
              ) : (
                <>
                  This will cancel the subscription for{" "}
                  <strong>{selectedSubscription?.customer?.email}</strong> at
                  the end of the current billing period. They will retain access
                  until then.
                </>
              )}
              <br />
              <br />
              Plan: <strong>{selectedSubscription?.plan?.name}</strong>
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
