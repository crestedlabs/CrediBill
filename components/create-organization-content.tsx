"use client";

import { useState } from "react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2 } from "lucide-react";
import Link from "next/link";

export default function CreateOrganizationContent() {
  return (
    <>
      <Authenticated>
        <CreateOrganizationForm />
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">Welcome to CrediBill</h1>
            <p className="text-slate-600">Please sign in to create an organization</p>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </div>
        </div>
      </Unauthenticated>
    </>
  );
}

function CreateOrganizationForm() {
  const [orgName, setOrgName] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement organization creation
    console.log("Creating organization:", orgName);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Create Organization</h1>
              <p className="mt-1 text-sm text-slate-600">
                Set up a new organization for your team and applications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <Card className="border-0 shadow-sm bg-white">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Organization Information</CardTitle>
            <CardDescription className="text-slate-500">
              Enter the basic details for your new organization
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Organization Name *
                </label>
                <Input
                  placeholder="e.g., Acme Corporation"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="h-10"
                  required
                />
                <p className="text-xs text-slate-500">
                  This will be the name displayed across your dashboard and to team members.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Link href="/organization-details">
                  <Button variant="outline" className="h-10">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" className="h-10 px-6">
                  <Building2 className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}