"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useApp } from "@/contexts/app-context";
import Link from "next/link";
import SettingsAdvanced from "@/components/settings-advanced";
import SettingsBilling from "@/components/settings-billing";
import SettingsGeneral from "@/components/settings-general";
import SettingsTeam from "@/components/settings-team";
import SettingsWebhooks from "@/components/settings-webhooks";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PackageOpen, Plus } from "lucide-react";

export default function SettingsContent() {
  return (
    <>
      <Authenticated>
        <SettingsManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to access your settings
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

function SettingsManager() {
  const { apps, selectedApp } = useApp();

  // Show no apps state
  if (!apps || apps.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-semibold text-slate-900">
              App Settings
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Configure settings for your application
            </p>
          </div>
        </div>
        <div className="px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-4 py-16 text-center md:py-24">
              <div className="mx-auto max-w-sm space-y-4">
                <div className="flex justify-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-50">
                    <PackageOpen className="h-8 w-8 text-blue-600" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    No apps yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create your first app to configure settings
                  </p>
                </div>
                <Link href="/create-app">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first app
                  </Button>
                </Link>
              </div>
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
        <div className="max-w-3xl">
          <h1 className="text-2xl font-semibold text-slate-900">
            App Settings
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure settings for{" "}
            <span className="font-medium text-slate-900">
              {selectedApp?.name || "your app"}
            </span>
          </p>
          <div className="mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Note:</span> All settings below are
              specific to{" "}
              <span className="font-semibold">{selectedApp?.name}</span>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs Container */}
      <div>
        <Tabs defaultValue="general" className="mt-6">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-8">
            {/* Desktop Sidebar Navigation */}
            <aside className="hidden lg:block lg:col-span-3 px-4 lg:px-8">
              <nav className="space-y-1 sticky top-6 mt-16">
                <TabsList className="flex w-full flex-col items-stretch gap-1 bg-transparent p-0 h-auto">
                  <TabsTrigger
                    value="general"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    General
                  </TabsTrigger>
                  <TabsTrigger
                    value="billing"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Billing
                  </TabsTrigger>
                  <TabsTrigger
                    value="webhooks"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Webhooks
                  </TabsTrigger>
                  <TabsTrigger
                    value="advanced"
                    className="w-full justify-start rounded-lg px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
                  >
                    Advanced
                  </TabsTrigger>
                </TabsList>
              </nav>
            </aside>

            {/* Mobile Tabs - Horizontal Scroll */}
            <div className="lg:hidden px-4 mb-6">
              <TabsList className="inline-flex w-full items-center justify-start gap-2 overflow-x-auto bg-slate-100 p-2 rounded-lg h-16">
                <TabsTrigger
                  value="general"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  General
                </TabsTrigger>
                <TabsTrigger
                  value="billing"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Billing
                </TabsTrigger>
                <TabsTrigger
                  value="webhooks"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Webhooks
                </TabsTrigger>
                <TabsTrigger
                  value="advanced"
                  className="whitespace-nowrap rounded-md px-6 py-3 text-base font-medium transition-colors data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  Advanced
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Content Area */}
            <div className="lg:col-span-9 px-4 sm:px-6 lg:px-8 pb-12">
              <TabsContent value="general" className="mt-0">
                <SettingsGeneral />
              </TabsContent>
              <TabsContent value="billing" className="mt-0">
                <SettingsBilling />
              </TabsContent>
              <TabsContent value="webhooks" className="mt-0">
                <SettingsWebhooks />
              </TabsContent>
              <TabsContent value="advanced" className="mt-0">
                <SettingsAdvanced />
              </TabsContent>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
