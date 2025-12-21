"use client";

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
    revenue: "$1,200",
    status: "Active",
    joinDate: "Dec 1, 2024",
  },
  {
    id: "cust_2",
    name: "Bob Martinez",
    email: "bob@startup.io",
    plan: "Starter",
    revenue: "$450",
    status: "Trialing",
    joinDate: "Dec 15, 2024",
  },
  {
    id: "cust_3",
    name: "Carol Williams",
    email: "carol.w@business.com",
    plan: "Enterprise",
    revenue: "$3,600",
    status: "Active",
    joinDate: "Nov 1, 2024",
  },
  {
    id: "cust_4",
    name: "David Johnson",
    email: "david.j@enterprise.com",
    plan: "Professional",
    revenue: "$0",
    status: "Past Due",
    joinDate: "Oct 15, 2024",
  },
  {
    id: "cust_5",
    name: "Eve Thompson",
    email: "eve.thompson@oldclient.com",
    plan: "None",
    revenue: "$2,400",
    status: "Churned",
    joinDate: "Sep 1, 2024",
  },
];

const statusColors: Record<string, { badge: string; bg: string }> = {
  Active: { badge: "bg-emerald-100 text-emerald-800", bg: "bg-emerald-50" },
  Trialing: { badge: "bg-blue-100 text-blue-800", bg: "bg-blue-50" },
  "Past Due": { badge: "bg-amber-100 text-amber-800", bg: "bg-amber-50" },
  Churned: { badge: "bg-slate-100 text-slate-800", bg: "bg-slate-50" },
};

const filterOptions = ["All", "Active", "Trialing", "Past Due", "Churned"];

export default function CustomersContent() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Customers</h1>
            <p className="text-sm text-slate-600">
              Manage and view all your customers
            </p>
          </div>
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <Separator className="my-2" />

        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-16 text-center md:py-20">
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
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customers</h1>
          <p className="text-sm text-slate-600">
            Manage and view all your customers
          </p>
        </div>
        <Button className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Add Customer
        </Button>
      </div>

      <Separator className="my-2" />

      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name or email..."
            className="pl-10"
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
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="hidden md:block">
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Revenue</th>
                    <th className="px-4 py-3">Joined</th>
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
                          <p className="font-medium text-slate-900">
                            {customer.name}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {customer.email}
                        </td>
                        <td className="px-4 py-4">
                          <Badge className={`${colors.badge}`}>
                            {customer.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {customer.plan}
                        </td>
                        <td className="px-4 py-4 font-semibold text-slate-900">
                          {customer.revenue}
                        </td>
                        <td className="px-4 py-4 text-xs text-slate-500">
                          {customer.joinDate}
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
      </div>

      <div className="space-y-3 md:hidden">
        {filteredCustomers.map((customer) => {
          const colors = statusColors[customer.status] || statusColors.Active;
          return (
            <Card
              key={customer.id}
              className={`border border-slate-200 ${colors.bg}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">
                        {customer.name}
                      </p>
                      <Badge className={`${colors.badge}`}>
                        {customer.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-slate-600">
                      <Mail className="h-3 w-3" />
                      {customer.email}
                    </div>

                    <div className="space-y-1 pt-1">
                      <p className="text-sm text-slate-600">
                        {customer.plan} plan
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {customer.revenue}
                      </p>
                      <p className="text-xs text-slate-500">
                        Joined {customer.joinDate}
                      </p>
                    </div>
                  </div>

                  <CustomerActionMenu />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="flex items-center justify-center pt-4">
        <p className="text-sm text-slate-600">
          Showing {filteredCustomers.length} of {mockCustomers.length} customer
          {filteredCustomers.length !== 1 ? "s" : ""}
        </p>
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
          <Eye className="mr-2 h-4 w-4" />
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Mail className="mr-2 h-4 w-4" />
          Send email
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Edit customer
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
