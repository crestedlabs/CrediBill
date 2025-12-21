"use client";

import { SignUp } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
      <SignUp path="/sign-up" routing="path" />
    </div>
  );
}
