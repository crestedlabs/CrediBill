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
} from "@/components/ui/dropdown-menu";
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
  Eye,
  Search,
} from "lucide-react";
import { formatCurrency } from "@/lib/currency-utils";
import { Id } from "@/convex/_generated/dataModel";

type Invoice = {
  _id: Id<"invoices">;
  _creationTime: number;
  status: string;
  amountDue: number;
  currency: string;
  periodStart: number;
  periodEnd: number;
  dueDate?: number;
  customer?: {
    email: string;
    first_name?: string;
    last_name?: string;
  } | null;
};

const statusConfig: Record<string, { badge: string; label: string }> = {
  draft: { badge: "bg-slate-100 text-slate-800", label: "Draft" },
  open: { badge: "bg-blue-100 text-blue-800", label: "Open" },
  paid: { badge: "bg-emerald-100 text-emerald-800", label: "Paid" },
  failed: { badge: "bg-red-100 text-red-800", label: "Failed" },
  void: { badge: "bg-slate-100 text-slate-600", label: "Void" },
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface InvoicesTableProps {
  data: Invoice[];
  onViewDetails: (invoiceId: Id<"invoices">) => void;
}

export function InvoicesTable({ data, onViewDetails }: InvoicesTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Invoice>[]>(
    () => [
      {
        accessorKey: "_id",
        id: "invoiceId",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100"
            >
              Invoice ID
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const invoice = row.original;
          const customerName =
            invoice.customer?.first_name && invoice.customer?.last_name
              ? `${invoice.customer.first_name} ${invoice.customer.last_name}`
              : invoice.customer?.email || "Unknown";

          return (
            <div className="px-2">
              <div className="font-mono font-medium text-slate-900 text-sm">
                {invoice._id}
              </div>
              <div className="text-xs text-slate-500 sm:hidden">
                {customerName}
              </div>
              <div className="text-xs font-semibold text-slate-900 md:hidden mt-1">
                {formatCurrency(invoice.amountDue, invoice.currency)}
              </div>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          return row.original._id.toLowerCase().includes(value.toLowerCase());
        },
      },
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
              className="h-8 px-2 hover:bg-slate-100 hidden sm:flex"
            >
              Customer
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => {
          const customer = row.original.customer;
          const customerName =
            customer?.first_name && customer?.last_name
              ? `${customer.first_name} ${customer.last_name}`
              : customer?.email || "Unknown";

          return (
            <div className="px-2 text-slate-600 hidden sm:table-cell text-sm">
              {customerName}
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const customer = row.original.customer;
          const searchValue = value.toLowerCase();
          return (
            customer?.email.toLowerCase().includes(searchValue) ||
            customer?.first_name?.toLowerCase().includes(searchValue) ||
            customer?.last_name?.toLowerCase().includes(searchValue) ||
            false
          );
        },
        sortingFn: (rowA, rowB) => {
          const nameA =
            rowA.original.customer?.first_name ||
            rowA.original.customer?.email ||
            "";
          const nameB =
            rowB.original.customer?.first_name ||
            rowB.original.customer?.email ||
            "";
          return nameA.localeCompare(nameB);
        },
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
          const status = row.original.status;
          const statusInfo = statusConfig[status] || statusConfig.open;
          return (
            <div className="px-2">
              <Badge className={`${statusInfo.badge}`}>
                {statusInfo.label}
              </Badge>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value || value === "all") return true;
          return row.original.status === value;
        },
      },
      {
        accessorKey: "amountDue",
        id: "amount",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100 hidden md:flex"
            >
              Amount
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 font-semibold text-slate-900 hidden md:table-cell text-sm">
            {formatCurrency(row.original.amountDue, row.original.currency)}
          </div>
        ),
      },
      {
        accessorKey: "_creationTime",
        id: "issued",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100 hidden lg:flex"
            >
              Issued Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-slate-600 hidden lg:table-cell text-sm">
            {formatDate(row.original._creationTime)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right pr-2">Actions</div>,
        cell: ({ row }) => {
          const invoice = row.original;

          return (
            <div className="text-right pr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onViewDetails(invoice._id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [onViewDetails],
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
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by invoice ID or customer..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 bg-white h-10"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: "All", value: "all" },
              { label: "Draft", value: "draft" },
              { label: "Open", value: "open" },
              { label: "Paid", value: "paid" },
              { label: "Failed", value: "failed" },
              { label: "Void", value: "void" },
            ] as const
          ).map((filter) => {
            const isSelected =
              (table.getColumn("status")?.getFilterValue() as string) ===
                filter.value ||
              (!table.getColumn("status")?.getFilterValue() &&
                filter.value === "all");

            return (
              <button
                key={filter.value}
                type="button"
                onClick={() =>
                  table
                    .getColumn("status")
                    ?.setFilterValue(
                      filter.value === "all" ? undefined : filter.value,
                    )
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
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  <div className="text-slate-500">No invoices found.</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4">
        <div className="text-sm text-slate-600">
          Showing {table.getRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} invoice
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
    </>
  );
}
