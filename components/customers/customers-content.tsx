"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { CreateCustomerDialog } from "@/components/customers/create-customer-dialog";
import { CustomersSkeleton } from "@/components/customers/customers-skeleton";
import { CustomersTable } from "@/components/customers/customers-table";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, PackageOpen } from "lucide-react";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // Fetch customers scoped to the selected app
  const customers = useQuery(
    api.customers.listCustomers,
    selectedApp?._id
      ? {
          appId: selectedApp._id,
        }
      : "skip",
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

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        {customers.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
            <div className="mx-auto max-w-sm space-y-4">
              <div className="flex justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
                  <Plus className="h-8 w-8 text-slate-600" />
                </div>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No customers yet
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Create your first customer to get started with billing
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
          <CustomersTable data={customers} appId={selectedApp._id} />
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
