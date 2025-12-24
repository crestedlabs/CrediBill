"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@clerk/nextjs";

type Organization = {
  _id: Id<"organizations"> | undefined;
  name: string | undefined;
  role: "owner" | "admin" | "member" | "viewer";
};

type OrganizationContextType = {
  selectedOrg: Organization | null;
  setSelectedOrgId: (orgId: Id<"organizations">) => void;
  organizations: Organization[] | undefined;
  isLoading: boolean;
};

const OrganizationContext = createContext<OrganizationContextType | undefined>(
  undefined
);

export function OrganizationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoaded, isSignedIn } = useAuth();
  
  // Only query organizations when Clerk auth is ready and user is signed in
  const organizations = useQuery(
    api.organizations.getUserOrganizations,
    isLoaded && isSignedIn ? {} : "skip"
  );
  
  const [selectedOrgId, setSelectedOrgId] =
    useState<Id<"organizations"> | null>(null);

  // Auto-select first organization when data loads
  useEffect(() => {
    if (organizations && organizations.length > 0 && !selectedOrgId) {
      if (organizations[0]._id) {
        setSelectedOrgId(organizations[0]._id);
      }
    }
  }, [organizations, selectedOrgId]);

  const selectedOrg =
    organizations?.find((org) => org._id === selectedOrgId) || null;

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrg,
        setSelectedOrgId,
        organizations,
        isLoading: !isLoaded || organizations === undefined,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error(
      "useOrganization must be used within an OrganizationProvider"
    );
  }
  return context;
}
