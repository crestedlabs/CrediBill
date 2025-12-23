"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";

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
import { Input } from "@/components/ui/input";
import {
  MoreVertical,
  Plus,
  Mail,
  Settings,
  Eye,
  Trash2,
  Search,
} from "lucide-react";

const mockCustomers = [
  {
    id: "cust_1",
    name: "Alice Chen",
    email: "alice.chen@company.com",
    plan: "Professional",
    revenue: "UGX 4.4M",
    status: "Active",
    subscriptionId: "sub_Ja8k9abc",
    nextBilling: "Jan 15, 2025",
    joinDate: "Dec 1, 2024",
  },
  {
    id: "cust_2",
    name: "Bob Martinez",
    email: "bob@startup.io",
    plan: "Starter",
    revenue: "UGX 1.6M",
    status: "Trialing",
    subscriptionId: "sub_Tx39def",
    nextBilling: "Trial ends Dec 28",
    joinDate: "Dec 15, 2024",
  },
  {
    id: "cust_3",
    name: "Carol Williams",
    email: "carol.w@business.com",
    plan: "Enterprise",
    revenue: "UGX 13.2M",
    status: "Active",
    subscriptionId: "sub_Bx22ghi",
    nextBilling: "Jan 10, 2025",
    joinDate: "Nov 1, 2024",
  },
  {
    id: "cust_4",
    name: "David Johnson",
    email: "david.j@enterprise.com",
    plan: "Professional",
    revenue: "UGX 0",
    status: "Past Due",
    subscriptionId: "sub_Dv88jkl",
    nextBilling: "Overdue since Dec 15",
    joinDate: "Oct 15, 2024",
  },
  {
    id: "cust_5",
    name: "Eve Thompson",
    email: "eve.thompson@oldclient.com",
    plan: "None",
    revenue: "UGX 8.8M",
    status: "Canceled",
    subscriptionId: "sub_Et55mno",
    nextBilling: "Canceled Nov 20",
    joinDate: "Sep 1, 2024",
  },
];

const statusColors: Record<string, { badge: string; bg: string }> = {
  Active: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50" },
  Trialing: { badge: "bg-blue-100 text-blue-800", bg: "bg-blue-50" },
  "Past Due": { badge: "bg-amber-100 text-amber-800", bg: "bg-amber-50" },
  Canceled: { badge: "bg-slate-100 text-slate-800", bg: "bg-slate-50" },
};

const filterOptions = ["All", "Active", "Trialing", "Past Due", "Canceled"];

export default function CustomersContent() {
  return (
    <>
      <Authenticated>
        <CustomersManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome to CrediBill</h1>
            <p className="text-slate-600">Please sign in to manage your customers</p>
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
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
              <p className="text-sm text-slate-600">
                Manage and view all your customers
              </p>
            </div>
            <Button className="w-full md:w-auto h-10">
              <Plus className="mr-2 h-4 w-4" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="px-4 py-6 sm:px-6 lg:px-8">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-20">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200">
                    <Plus className="h-8 w-8 text-slate-600" />
                  </div>
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  No customers yet
                </h2>
                <p className="text-sm text-slate-600">
                  Your customers will appear here once they sign up for a
                  subscription.
                </p>
                <Button className="w-full" disabled>
                  <Plus className="mr-2 h-4 w-4" />
                  No customers to display
                </Button>
              </div>
            </div>
        </div>
      </div>
    );
  }

  const filteredCustomers = mockCustomers.filter((c) => {
    const matchesFilter = activeFilter === "All" || c.status === activeFilter;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-600">
              Manage and view all your customers
            </p>
          </div>
          <Button className="w-full md:w-auto h-10">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search by name or email..."
                className="pl-10 bg-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-all ${
                    activeFilter === filter
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <Card className="border border-slate-200 bg-white">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-semibold text-slate-700">
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3 hidden sm:table-cell">Email</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 hidden md:table-cell">Plan</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Subscription</th>
                      <th className="px-4 py-3 hidden lg:table-cell">Next Billing</th>
                      <th className="px-4 py-3 hidden xl:table-cell">Revenue</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCustomers.map((customer, idx) => {
                      const colors =
                        statusColors[customer.status] || statusColors.Active;
                      return (
                        <tr
                          key={customer.id}
                          className={`text-sm ${
                            idx !== filteredCustomers.length - 1
                              ? "border-b border-slate-200"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium text-slate-900">
                                {customer.name}
                              </p>
                              <p className="text-xs text-slate-500 sm:hidden">
                                {customer.email}
                              </p>
                              <p className="text-xs text-slate-500 md:hidden">
                                {customer.plan} plan
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-slate-600 hidden sm:table-cell">
                            {customer.email}
                          </td>
                          <td className="px-4 py-4">
                            <Badge className={`${colors.badge}`}>
                              {customer.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-slate-600 hidden md:table-cell">
                            {customer.plan}
                          </td>
                          <td className="px-4 py-4 font-mono text-xs text-slate-600 hidden lg:table-cell">
                            {customer.subscriptionId}
                          </td>
                          <td className="px-4 py-4 text-xs text-slate-600 hidden lg:table-cell">
                            {customer.nextBilling}
                          </td>
                          <td className="px-4 py-4 font-semibold text-slate-900 hidden xl:table-cell">
                            {customer.revenue}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <CustomerActionMenu />
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
              Showing {filteredCustomers.length} of {mockCustomers.length} customer
              {filteredCustomers.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CustomerActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <Mail className="mr-2 h-4 w-4" />
          Send email
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
