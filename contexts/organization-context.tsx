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

  // Load selected org from localStorage on mount
  const [selectedOrgId, setSelectedOrgId] =
    useState<Id<"organizations"> | null>(() => {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("selectedOrgId");
        return saved as Id<"organizations"> | null;
      }
      return null;
    });

  // Save to localStorage when selectedOrgId changes
  useEffect(() => {
    if (selectedOrgId) {
      localStorage.setItem("selectedOrgId", selectedOrgId);
    }
  }, [selectedOrgId]);

  // Validate saved org ID and auto-select if needed
  useEffect(() => {
    if (organizations && organizations.length > 0) {
      // Check if saved org ID is still valid (user still has access)
      const isValidOrg = organizations.some((org) => org._id === selectedOrgId);

      if (!isValidOrg) {
        // Saved org is invalid (permission revoked or doesn't exist)
        // Clear localStorage and select first available org
        if (typeof window !== "undefined") {
          localStorage.removeItem("selectedOrgId");
        }
        if (organizations[0]._id) {
          setSelectedOrgId(organizations[0]._id);
        }
      }
      // If valid, keep the saved selection
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
