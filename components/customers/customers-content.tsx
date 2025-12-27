"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { SubscribeCustomerDialog } from "@/components/subscriptions/subscribe-customer-dialog";
import { CustomerFilters } from "@/components/customers/customer-filters";
import { CustomersSkeleton } from "@/components/customers/customers-skeleton";
import Link from "next/link";
import { toast } from "sonner";
import { parseConvexError } from "@/lib/error-utils";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Plus,
  Mail,
  Settings,
  Eye,
  Trash2,
  Search,
  PackageOpen,
} from "lucide-react";

const statusColors: Record<string, { badge: string; bg: string }> = {
  active: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50" },
  inactive: { badge: "bg-slate-100 text-slate-800", bg: "bg-slate-50" },
  blocked: { badge: "bg-red-100 text-red-800", bg: "bg-red-50" },
};

export default function CustomersContent() {
  return (
    <>
      <Authenticated>
        <CustomersManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to manage your customers
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

function CustomersManager() {
  const { selectedApp } = useApp();
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState(""); // Only this triggers Convex query
  const [statusFilter, setStatusFilter] = useState<
    "active" | "inactive" | "blocked" | undefined
  >();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleSearchSubmit = () => {
    setSubmittedSearch(searchQuery);
  };

  const handleStatusFilterChange = (
    status: "active" | "inactive" | "blocked" | undefined
  ) => {
    setStatusFilter(status);
  };

  // Fetch customers from Convex - only uses submittedSearch (button click)
  const customers = useQuery(
    api.customers.listCustomers,
    selectedApp?._id
      ? {
          appId: selectedApp._id,
          search: submittedSearch || undefined,
          status: statusFilter,
        }
      : "skip"
  );

  // Show no apps state
  if (!selectedApp) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-600">
              Manage and view all your customers
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
                    Select an app to manage its customers
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
  if (customers === undefined) {
    return <CustomersSkeleton />;
  }

  const hasCustomers = customers && customers.length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-600">
              {customers.length} customer{customers.length !== 1 ? "s" : ""} in{" "}
              {selectedApp.name}
            </p>
          </div>
          <Button
            className="w-full md:w-auto h-10"
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Filters - Always Visible */}
      <CustomerFilters
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
      />

      {/* Content */}
      <div className="px-4 pb-6 sm:px-6 lg:px-8">
        {!hasCustomers ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Plus className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No customers found
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  {searchQuery || statusFilter
                    ? "Try adjusting your filters or create a new customer"
                    : "Create your first customer to get started with billing"}
                </p>
              </div>
              <Button
                className="w-full"
                onClick={() => setShowCreateDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Customer
              </Button>
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
                        <th className="px-4 py-3 hidden sm:table-cell">
                          Email
                        </th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 hidden md:table-cell">
                          Subscriptions
                        </th>
                        <th className="px-4 py-3 hidden lg:table-cell">
                          Joined
                        </th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customers.map((customer, idx) => {
                        const status = customer.status || "active";
                        const colors = statusColors[status];
                        const displayName = customer.first_name
                          ? `${customer.first_name}${customer.last_name ? ` ${customer.last_name}` : ""}`
                          : customer.email;
                        const joinDate = new Date(
                          customer._creationTime
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                        return (
                          <tr
                            key={customer._id}
                            className={`text-sm ${
                              idx !== customers.length - 1
                                ? "border-b border-slate-200"
                                : ""
                            }`}
                          >
                            <td className="px-4 py-4">
                              <div>
                                <p className="font-medium text-slate-900">
                                  {displayName}
                                </p>
                                <p className="text-xs text-slate-500 sm:hidden">
                                  {customer.email}
                                </p>
                                {customer.subscriptionCount > 0 && (
                                  <p className="text-xs text-slate-500 md:hidden">
                                    {customer.activeSubscriptionCount}/
                                    {customer.subscriptionCount} active
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-slate-600 hidden sm:table-cell text-xs">
                              {customer.email}
                            </td>
                            <td className="px-4 py-4">
                              <Badge className={`${colors.badge} text-xs`}>
                                {status.charAt(0).toUpperCase() +
                                  status.slice(1)}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-slate-600 hidden md:table-cell text-xs">
                              <span className="font-medium">
                                {customer.activeSubscriptionCount}
                              </span>
                              /{customer.subscriptionCount}
                            </td>
                            <td className="px-4 py-4 text-xs text-slate-600 hidden lg:table-cell">
                              {joinDate}
                            </td>
                            <td className="px-4 py-4 text-right">
                              <CustomerActionMenu
                                customerId={customer._id}
                                customerEmail={customer.email}
                                appId={selectedApp._id}
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
                Showing {customers.length} customer
                {customers.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create Customer Dialog */}
      {selectedApp && (
        <CreateCustomerDialog
          appId={selectedApp._id}
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => {
            // Dialog auto-closes, data auto-refreshes via Convex
          }}
        />
      )}
    </div>
  );
}

function CustomerActionMenu({
  customerId,
  customerEmail,
  appId,
}: {
  customerId: string;
  customerEmail: string;
  appId: string;
}) {
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteCustomerMutation = useMutation(api.customers.deleteCustomer);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCustomerMutation({
        customerId: customerId as any,
        force: false, // Don't force delete - require subscriptions to be cancelled first
      });
      toast.success("Customer deleted successfully", {
        description: `${customerEmail} has been removed`,
      });
      setShowDeleteDialog(false);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={() => setShowSubscribeDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Subscribe to plan
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
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
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SubscribeCustomerDialog
        appId={appId as any}
        customerId={customerId as any}
        customerEmail={customerEmail}
        open={showSubscribeDialog}
        onOpenChange={setShowSubscribeDialog}
        onSuccess={() => {
          // Dialog auto-closes, data auto-refreshes
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{customerEmail}</strong>?
              This action cannot be undone. The customer must have no active
              subscriptions.
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
