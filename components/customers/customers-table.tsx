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
  Eye,
  Mail,
  Trash2,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { parseConvexError } from "@/lib/error-utils";
import { ViewCustomerDialog } from "@/components/customers/view-customer-dialog";

type Customer = {
  _id: string;
  _creationTime: number;
  email: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  activeSubscriptionCount: number;
};

const statusColors: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-slate-100 text-slate-800",
  blocked: "bg-red-100 text-red-800",
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

interface CustomersTableProps {
  data: Customer[];
  appId: string;
}

export function CustomersTable({ data, appId }: CustomersTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCustomerMutation = useMutation(api.customers.deleteCustomer);

  const columns = useMemo<ColumnDef<Customer>[]>(
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
          const customer = row.original;
          const displayName = customer.first_name
            ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ""}`
            : customer.email;

          return (
            <div className="px-2">
              <div className="font-medium text-slate-900 text-sm">
                {displayName}
              </div>
              <div className="text-xs text-slate-600 sm:hidden">
                {customer.email}
              </div>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          const customer = row.original;
          const searchValue = value.toLowerCase();
          return (
            customer.email.toLowerCase().includes(searchValue) ||
            customer.first_name?.toLowerCase().includes(searchValue) ||
            customer.last_name?.toLowerCase().includes(searchValue) ||
            false
          );
        },
        sortingFn: (rowA, rowB) => {
          const nameA = rowA.original.first_name || rowA.original.email;
          const nameB = rowB.original.first_name || rowB.original.email;
          return nameA.localeCompare(nameB);
        },
      },
      {
        accessorKey: "email",
        id: "email",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100 hidden sm:flex"
            >
              Email
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600 hidden sm:table-cell">
            {row.original.email}
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
          const status = row.original.status || "active";
          return (
            <div className="px-2">
              <Badge className={`${statusColors[status]} text-xs`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>
          );
        },
        filterFn: (row, id, value) => {
          if (!value) return true;
          return row.original.status === value;
        },
      },
      {
        accessorKey: "_creationTime",
        id: "joined",
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
              className="h-8 px-2 hover:bg-slate-100 hidden lg:flex"
            >
              Joined
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          );
        },
        cell: ({ row }) => (
          <div className="px-2 text-xs text-slate-600 hidden lg:table-cell">
            {formatDate(row.original._creationTime)}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right pr-2">Actions</div>,
        cell: ({ row }) => {
          const customer = row.original;

          return (
            <div className="text-right pr-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowViewDialog(true);
                    }}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Mail className="mr-2 h-4 w-4" />
                    Send email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
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

  const handleDelete = async () => {
    if (!selectedCustomer) return;

    setIsDeleting(true);
    try {
      await deleteCustomerMutation({
        customerId: selectedCustomer._id as any,
        force: false,
      });
      toast.success("Customer deleted successfully", {
        description: `${selectedCustomer.email} has been removed`,
      });
      setShowDeleteDialog(false);
      setSelectedCustomer(null);
    } catch (error: any) {
      const userFriendlyMessage = parseConvexError(error);
      toast.error("Failed to delete customer", {
        description: userFriendlyMessage,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        {/* Global Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search by customer name or email..."
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-10 bg-white h-10"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: "All", value: "" },
              { label: "Active", value: "active" },
              { label: "Inactive", value: "inactive" },
              { label: "Blocked", value: "blocked" },
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
                  <div className="text-slate-500">No customers found.</div>
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
          {table.getFilteredRowModel().rows.length} customer
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

      {/* View Customer Dialog */}
      {selectedCustomer && (
        <ViewCustomerDialog
          customerId={selectedCustomer._id as any}
          open={showViewDialog}
          onOpenChange={setShowViewDialog}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{selectedCustomer?.email}</strong>? This action cannot be
              undone. The customer must have no active subscriptions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? "Deleting..." : "Delete Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
