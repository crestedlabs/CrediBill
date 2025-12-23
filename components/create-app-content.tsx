"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Rocket, Settings, CreditCard, Globe, Building2, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";
import * as React from "react";

export default function CreateAppContent() {
  return (
    <>
      <Authenticated>
        <CreateAppForm />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome to CrediBill</h1>
            <p className="text-slate-600">Please sign in to create an app</p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function CreateAppForm() {
  const organizations = useQuery(api.organizations.getUserOrganizations);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    organizationId: "",
    defaultCurrency: "ugx",
    timezone: "eat",
    language: "en",
    defaultPaymentMethod: "momo",
    retryPolicy: "automatic",
    defaultTrialLength: 14,
    gracePeriod: 3,
    billingCycle: "monthly",
  });

  // Set default organization when data loads
  React.useEffect(() => {
    if (organizations && organizations.length > 0 && !formData.organizationId) {
      setFormData(prev => ({ ...prev, organizationId: organizations[0]._id || "" }));
    }
  }, [organizations, formData.organizationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement app creation
    console.log("Creating app:", formData);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Create New App</h1>
            <p className="mt-1 text-sm text-slate-600">
              Set up a new application for billing and subscription management
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Rocket className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Basic Information</CardTitle>
                  <CardDescription className="text-slate-500">
                    Enter the basic details for your new application
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Organization *
                  </label>
                  <Select
                    value={formData.organizationId}
                    onValueChange={(value) => {
                      if (value === "create-new") {
                        // Handle create new organization
                        window.location.href = "/create-organization";
                      } else {
                        setFormData({ ...formData, organizationId: value });
                      }
                    }}
                  >
                    <SelectTrigger className="h-10 w-full md:w-auto">
                      <SelectValue placeholder="Select organization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {organizations?.map((org) => (
                          <SelectItem key={org._id} value={org._id || ""}>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-slate-500" />
                              {org.name}
                            </div>
                          </SelectItem>
                        ))}
                        <SelectItem value="create-new">
                          <div className="flex items-center gap-2 text-teal-600">
                            <Plus className="h-4 w-4" />
                            Create Organization
                          </div>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    App Name *
                  </label>
                  <Input
                    placeholder="e.g., My SaaS App"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="h-10"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <Textarea
                  placeholder="Brief description of your application..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="min-h-20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Regional Settings */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 rounded-lg">
                  <Globe className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Regional Settings</CardTitle>
                  <CardDescription className="text-slate-500">
                    Configure timezone and language preferences
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Default Currency
                  </label>
                  <Select
                    value={formData.defaultCurrency}
                    onValueChange={(value) => setFormData({ ...formData, defaultCurrency: value })}
                  >
                    <SelectTrigger className="h-10 w-full md:w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="ugx">🇺🇬 UGX - Ugandan Shilling</SelectItem>
                        <SelectItem value="kes">🇰🇪 KES - Kenyan Shilling</SelectItem>
                        <SelectItem value="tzs">🇹🇿 TZS - Tanzanian Shilling</SelectItem>
                        <SelectItem value="rwf">🇷🇼 RWF - Rwandan Franc</SelectItem>
                        <SelectItem value="usd">🇺🇸 USD - US Dollar</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Timezone
                  </label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger className="h-10 w-full md:w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="eat">East Africa Time (GMT+3)</SelectItem>
                        <SelectItem value="cat">Central Africa Time (GMT+2)</SelectItem>
                        <SelectItem value="wat">West Africa Time (GMT+1)</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Configuration */}
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold">Billing Configuration</CardTitle>
                  <CardDescription className="text-slate-500">
                    Set up default billing and payment settings
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Default Payment Method
                  </label>
                  <Select
                    value={formData.defaultPaymentMethod}
                    onValueChange={(value) => setFormData({ ...formData, defaultPaymentMethod: value })}
                  >
                    <SelectTrigger className="h-10 w-full md:w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="momo">📱 Mobile Money</SelectItem>
                        <SelectItem value="credit-card">💳 Credit Card</SelectItem>
                        <SelectItem value="bank">🏦 Bank Transfer</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Retry Policy
                  </label>
                  <Select
                    value={formData.retryPolicy}
                    onValueChange={(value) => setFormData({ ...formData, retryPolicy: value })}
                  >
                    <SelectTrigger className="h-10 w-full md:w-auto">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="automatic">Automatic Retries</SelectItem>
                        <SelectItem value="manual">Manual Review</SelectItem>
                        <SelectItem value="none">No Retries</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Trial Length (days)
                  </label>
                  <Input
                    type="number"
                    value={formData.defaultTrialLength}
                    onChange={(e) => setFormData({ ...formData, defaultTrialLength: parseInt(e.target.value) || 14 })}
                    className="h-10"
                    min="0"
                    max="365"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">
                    Grace Period (days)
                  </label>
                  <Input
                    type="number"
                    value={formData.gracePeriod}
                    onChange={(e) => setFormData({ ...formData, gracePeriod: parseInt(e.target.value) || 3 })}
                    className="h-10"
                    min="0"
                    max="30"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium text-slate-700">
                    Billing Cycle
                  </label>
                  <Select
                    value={formData.billingCycle}
                    onValueChange={(value) => setFormData({ ...formData, billingCycle: value })}
                  >
                    <SelectTrigger className="h-10 w-full md:w-1/2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Link href="/overview">
              <Button variant="outline" className="h-10">
                Cancel
              </Button>
            </Link>
            <Button type="submit" className="h-10 px-6">
              <Rocket className="mr-2 h-4 w-4" />
              Create App
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}