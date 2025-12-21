"use client";

import { SignedIn, UserButton } from "@clerk/nextjs";
import { SidebarTrigger } from "@/components/ui/sidebar";

export default function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger className="mr-2" />
        <h1 className="text-lg font-semibold">CrediBill</h1>
      </div>

      <div className="ml-auto flex items-center gap-3">
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
}
