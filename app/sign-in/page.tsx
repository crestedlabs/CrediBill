"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { isSignedIn } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (isSignedIn) {
      const redirect = searchParams.get("redirect") ?? "/";
      const safe = redirect.startsWith("/") ? redirect : "/";
      router.replace(safe);
    }
  }, [isSignedIn, searchParams, router]);

  return (
    <div className="w-full max-w-md p-6">
      <SignIn path="/sign-in" routing="path" />
    </div>
  );
}
