"use client";

import { Authenticated, Unauthenticated, useQuery } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { useApp } from "@/contexts/app-context";
import Link from "next/link";
import { api } from "@/convex/_generated/api";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle,
  AlertTriangle,
  Calendar,
  DollarSign,
  PackageOpen,
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  CreditCard,
} from "lucide-react";

export default function OverviewContent() {
  return (
    <>
      <Authenticated>
        <OverviewManager />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
            <p className="text-slate-600">
              Please sign in to access your dashboard
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

function OverviewManager() {
  const { apps } = useApp();

  // Show no apps state
  if (!apps || apps.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Overview</h1>
            <p className="text-sm text-slate-600">
              Billing and subscription health at a glance
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
                    No apps yet
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    Create your first app to start tracking subscriptions and
                    billing
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

  return <OverviewDashboard />;
}

function OverviewDashboard() {
  const { selectedApp } = useApp();
  const metrics = useQuery(
    api.overview.getOverviewMetrics,
    selectedApp ? { appId: selectedApp._id } : {}
  );

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-6 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 bg-clip-text text-transparent">
                {selectedApp?.name || "App"}
              </h1>
              <span className="text-2xl font-light text-slate-400">/</span>
              <h2 className="text-2xl font-semibold text-slate-600">
                Overview
              </h2>
            </div>
            <p className="text-sm text-slate-600 mt-1">
              Loading your business metrics...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur-sm px-4 py-6 sm:px-6 lg:px-8 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600 bg-clip-text text-transparent">
              {selectedApp?.name || "App"}
            </h1>
            <span className="text-2xl font-light text-slate-400">/</span>
            <h2 className="text-2xl font-semibold text-slate-700">Overview</h2>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time business metrics and performance
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* MRR Card - Emerald/Teal gradient: represents money, growth, prosperity, and financial success */}
            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-teal-600 text-white overflow-hidden relative">
              <div className="absolute top-0 right-0 -mr-4 -mt-4 h-24 w-24 rounded-full bg-white/10"></div>
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-emerald-50">
                    Monthly Recurring Revenue
                  </p>
                  <DollarSign className="h-5 w-5 text-emerald-50" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-emerald-50">
                    {metrics.mrrCurrency || "USD"}
                  </span>
                  <p className="text-3xl font-bold">
                    {metrics.mrr.toLocaleString()}
                  </p>
                </div>
                <p className="text-xs text-emerald-50 mt-2">
                  Converted to default currency
                </p>
              </CardContent>
            </Card>

            {/* Active Subscriptions */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">
                    Active Subscriptions
                  </p>
                  <div className="p-2 bg-emerald-50 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.activeSubscriptions.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="h-3 w-3 text-emerald-600" />
                  <p className="text-xs text-emerald-600 font-medium">
                    Healthy
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Total Customers */}
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">
                    Total Customers
                  </p>
                  <div className="p-2 bg-purple-50 rounded-lg">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.totalCustomers.toLocaleString()}
                </p>
                <p className="text-xs text-slate-500 mt-2">
                  {metrics.totalSubscriptions} total subscriptions
                </p>
              </CardContent>
            </Card>

            {/* Churn Rate - TODO: Bring back when we reach production stage */}
            {/* 
            <Card className="border-0 shadow-md bg-white hover:shadow-lg transition-all">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-600">
                    Churn Rate
                  </p>
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <Activity className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-slate-900">
                  {metrics.churnRate}%
                </p>
                <p className="text-xs text-slate-500 mt-2">Last 30 days</p>
              </CardContent>
            </Card>
            */}
          </div>

          {/* Secondary Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Trials */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Trial Subscriptions
                    </p>
                    <p className="text-2xl font-bold text-blue-600 mt-1">
                      {metrics.trialingSubscriptions}
                    </p>
                  </div>
                  <Calendar className="h-8 w-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            {/* Expiring Soon */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Expiring Soon
                    </p>
                    <p className="text-2xl font-bold text-amber-600 mt-1">
                      {metrics.trialsExpiringSoon}
                    </p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-amber-400" />
                </div>
              </CardContent>
            </Card>

            {/* Past Due */}
            <Card className="border-0 shadow-sm bg-white hover:shadow-md transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                      Past Due
                    </p>
                    <p className="text-2xl font-bold text-red-600 mt-1">
                      {metrics.pastDueSubscriptions}
                    </p>
                  </div>
                  <CreditCard className="h-8 w-8 text-red-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Plan Performance & Revenue Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Plans */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Top Performing Plans
                </CardTitle>
                <CardDescription>By Monthly Recurring Revenue</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {metrics.planPerformance.length > 0 ? (
                    metrics.planPerformance.map((plan, idx) => (
                      <div
                        key={plan.planId}
                        className="p-4 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm font-bold">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">
                                {plan.planName}
                              </p>
                              <p className="text-xs text-slate-500">
                                {plan.subscribers} subscribers
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-slate-900">
                              {plan.currency} {plan.mrr.toLocaleString()}
                            </p>
                            <p className="text-xs text-slate-500">MRR</p>
                          </div>
                        </div>
                        {/* Progress bar */}
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                            style={{
                              width: `${Math.min(
                                (plan.mrr / metrics.planPerformance[0].mrr) *
                                  100,
                                100
                              )}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-500">
                      <p className="text-sm">
                        No plans with active subscribers yet
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Currency */}
            <Card className="border-0 shadow-md bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg font-semibold text-slate-900">
                  Revenue by Currency
                </CardTitle>
                <CardDescription>
                  MRR breakdown across currencies
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {Object.keys(metrics.currencyBreakdown).length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(metrics.currencyBreakdown)
                      .sort(([, a], [, b]) => b - a)
                      .map(([currency, amount]) => {
                        const total = Object.values(
                          metrics.currencyBreakdown
                        ).reduce((sum, val) => sum + val, 0);
                        const percentage =
                          total > 0 ? (amount / total) * 100 : 0;

                        return (
                          <div key={currency}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {currency}
                                </Badge>
                                <span className="text-sm text-slate-600">
                                  {percentage.toFixed(0)}%
                                </span>
                              </div>
                              <p className="text-sm font-semibold text-slate-900">
                                {Math.round(amount).toLocaleString()}
                              </p>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div className="py-8 text-center text-slate-500">
                    <p className="text-sm">No revenue data yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Overview */}
          <Card className="border-0 shadow-md bg-white">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-semibold text-slate-900">
                Subscription Status Overview
              </CardTitle>
              <CardDescription>
                Complete breakdown of all subscriptions
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="text-center p-4 bg-emerald-50 rounded-lg">
                  <p className="text-2xl font-bold text-emerald-700">
                    {metrics.activeSubscriptions}
                  </p>
                  <p className="text-xs font-medium text-emerald-600 mt-1">
                    Active
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-700">
                    {metrics.trialingSubscriptions}
                  </p>
                  <p className="text-xs font-medium text-blue-600 mt-1">
                    Trialing
                  </p>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <p className="text-2xl font-bold text-red-700">
                    {metrics.pastDueSubscriptions}
                  </p>
                  <p className="text-xs font-medium text-red-600 mt-1">
                    Past Due
                  </p>
                </div>
                <div className="text-center p-4 bg-slate-100 rounded-lg">
                  <p className="text-2xl font-bold text-slate-700">
                    {metrics.canceledSubscriptions}
                  </p>
                  <p className="text-xs font-medium text-slate-600 mt-1">
                    Canceled
                  </p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-2xl font-bold text-purple-700">
                    {metrics.totalRevenue.toLocaleString()}
                  </p>
                  <p className="text-xs font-medium text-purple-600 mt-1">
                    Total Revenue
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
