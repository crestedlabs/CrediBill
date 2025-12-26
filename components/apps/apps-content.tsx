"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@/contexts/organization-context";

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
import { MoreVertical, Plus, Edit, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AppsContent() {
  return (
    <>
      <Authenticated>
        <AppsManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">Please sign in to manage your apps</p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function AppsManager() {
  const { selectedOrg } = useOrganization();
  const apps = useQuery(
    api.apps.getUserApps,
    selectedOrg?._id ? { organizationId: selectedOrg._id } : "skip"
  );
  const isEmpty = !apps || apps.length === 0;

  if (isEmpty) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Apps</h1>
              <p className="text-sm text-slate-600">
                Manage and monitor all your connected applications
              </p>
            </div>
            <Link href="/create-app">
              <Button className="w-full md:w-auto h-9 text-sm bg-teal-600 hover:bg-teal-700 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Create App
              </Button>
            </Link>
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
                No apps yet
              </h2>
              <p className="text-sm text-slate-600">
                Create your first app to start managing subscriptions and
                billing.
              </p>
              <Link href="/create-app">
                <Button className="w-full h-9 text-sm bg-teal-600 hover:bg-teal-700 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first app
                </Button>
              </Link>
            </div>
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
            <h1 className="text-2xl font-semibold text-slate-900">Apps</h1>
            <p className="text-sm text-slate-600">
              Manage and monitor all your connected applications
            </p>
          </div>
          <Link href="/create-app">
            <Button className="w-full md:w-auto h-10">
              <Plus className="mr-2 h-4 w-4" />
              Create App
            </Button>
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="hidden md:block">
            <Card className="border border-slate-200 bg-white">
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
                      {apps?.map((app, idx) => (
                        <tr
                          key={app._id}
                          className={`text-sm ${
                            idx !== (apps?.length || 0) - 1
                              ? "border-b border-slate-200"
                              : ""
                          }`}
                        >
                          <td className="px-4 py-4">
                            <p className="font-medium text-slate-900">
                              {app.name}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <code className="text-xs text-slate-600">
                              {app._id}
                            </code>
                          </td>
                          <td className="px-4 py-4">
                            <Badge
                              variant="default"
                              className="bg-emerald-100 text-emerald-800"
                            >
                              Active
                            </Badge>
                          </td>
                          <td className="px-4 py-4 text-slate-600">0</td>
                          <td className="px-4 py-4 text-slate-600">
                            {new Date(app._creationTime).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
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
            {apps?.map((app) => (
              <Card key={app._id} className="border border-slate-200 bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">
                          {app.name}
                        </p>
                        <Badge
                          variant="default"
                          className="bg-emerald-100 text-emerald-800"
                        >
                          Active
                        </Badge>
                      </div>

                      <p className="text-xs text-slate-500">
                        <code>{app._id}</code>
                      </p>

                      <div className="pt-1">
                        <p className="text-sm text-slate-600">
                          0 subscriptions
                        </p>
                        <p className="text-xs text-slate-500">
                          Created{" "}
                          {new Date(app._creationTime).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            }
                          )}
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
