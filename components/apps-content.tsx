"use client";

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
import { MoreVertical, Plus, Edit, Trash2, Settings } from "lucide-react";

const mockApps = [
  {
    id: "app_1",
    name: "Main App",
    appId: "pk_live_abc123def456",
    status: "Active",
    subscriptions: 284,
    createdDate: "Dec 1, 2024",
  },
  {
    id: "app_2",
    name: "Marketing Hub",
    appId: "pk_live_xyz789uvw012",
    status: "Active",
    subscriptions: 156,
    createdDate: "Nov 15, 2024",
  },
  {
    id: "app_3",
    name: "Internal Platform",
    appId: "pk_live_fgh345ijk678",
    status: "Paused",
    subscriptions: 0,
    createdDate: "Oct 22, 2024",
  },
  {
    id: "app_4",
    name: "Partner Portal",
    appId: "pk_live_mno901pqr234",
    status: "Active",
    subscriptions: 89,
    createdDate: "Sep 10, 2024",
  },
];

export default function AppsContent() {
  const isEmpty = false;

  if (isEmpty) {
    return (
      <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Apps</h1>
            <p className="text-sm text-slate-600">
              Manage and monitor all your connected applications
            </p>
          </div>
          <Button className="w-full md:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Create App
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
              No apps yet
            </h2>
            <p className="text-sm text-slate-600">
              Create your first app to start managing subscriptions and billing.
            </p>
            <Button className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Create your first app
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen space-y-6 bg-white px-2 py-6 md:px-8 md:py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Apps</h1>
          <p className="text-sm text-slate-600">
            Manage and monitor all your connected applications
          </p>
        </div>
        <Button className="w-full md:w-auto h-13">
          <Plus className="mr-2 h-4 w-4" />
          Create App
        </Button>
      </div>

      <Separator className="my-2" />

      <div className="hidden md:block">
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3">App Name</th>
                    <th className="px-4 py-3">App ID</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Subscriptions</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockApps.map((app, idx) => (
                    <tr
                      key={app.id}
                      className={`text-sm ${
                        idx !== mockApps.length - 1
                          ? "border-b border-slate-200"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-4">
                        <p className="font-medium text-slate-900">{app.name}</p>
                      </td>
                      <td className="px-4 py-4">
                        <code className="text-xs text-slate-600">
                          {app.appId}
                        </code>
                      </td>
                      <td className="px-4 py-4">
                        <Badge
                          variant={
                            app.status === "Active" ? "default" : "outline"
                          }
                          className={
                            app.status === "Active"
                              ? "bg-emerald-100 text-emerald-800"
                              : ""
                          }
                        >
                          {app.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {app.subscriptions}
                      </td>
                      <td className="px-4 py-4 text-slate-600">
                        {app.createdDate}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <AppActionMenu />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3 md:hidden">
        {mockApps.map((app) => (
          <Card key={app.id} className="border border-slate-200">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{app.name}</p>
                    <Badge
                      variant={app.status === "Active" ? "default" : "outline"}
                      className={
                        app.status === "Active"
                          ? "bg-emerald-100 text-emerald-800"
                          : ""
                      }
                    >
                      {app.status}
                    </Badge>
                  </div>

                  <p className="text-xs text-slate-500">
                    <code>{app.appId}</code>
                  </p>

                  <div className="pt-1">
                    <p className="text-sm text-slate-600">
                      {app.subscriptions} subscription
                      {app.subscriptions !== 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-slate-500">
                      Created {app.createdDate}
                    </p>
                  </div>
                </div>

                <AppActionMenu />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AppActionMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Edit className="mr-2 h-4 w-4" />
          Edit
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
