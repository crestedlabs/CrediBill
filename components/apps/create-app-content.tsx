"use client";

import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { CreateAppFormSimple } from "@/components/form/create-app-form-simple";

export default function CreateAppContent() {
  return (
    <>
      <Authenticated>
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-slate-900">
                Create New App
              </h1>
              <p className="text-slate-600">
                Set up a new application to start managing subscriptions and
                billing
              </p>
            </div>

            {/* Form */}
            <CreateAppFormSimple />
          </div>
        </div>
      </Authenticated>
      <Unauthenticated>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="text-center space-y-4">
            <h1 className="text-2xl font-semibold text-slate-900">
              Welcome to CrediBill
            </h1>
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
