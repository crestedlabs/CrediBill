"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useOrganization } from "@/contexts/organization-context";

type App = {
  _id: Id<"apps">;
  name: string;
  description?: string;
  status: "active" | "paused" | "archived";
  mode?: "live" | "test";
  _creationTime: number;
  defaultCurrency: "ugx" | "kes" | "tzs" | "rwf" | "usd";
  timezone: "eat" | "cat" | "wat";
  language: "en" | "sw" | "fr";
  defaultPaymentMethod: "momo" | "credit-card" | "bank";
  retryPolicy: "automatic" | "manual" | "none";
  defaultTrialLength: number;
  gracePeriod: number;
  allowPlanDowngrades?: boolean;
  requireBillingAddress?: boolean;
  enableProration?: boolean;
  autoSuspendOnFailedPayment?: boolean;
};

type AppContextType = {
  selectedApp: App | null;
  setSelectedAppId: (appId: Id<"apps">) => void;
  apps: App[] | undefined;
  isLoading: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { selectedOrg } = useOrganization();
  const apps = useQuery(
    api.apps.getUserApps,
    selectedOrg?._id ? { organizationId: selectedOrg._id } : "skip"
  );
  const [selectedAppId, setSelectedAppId] = useState<Id<"apps"> | null>(null);

  // Auto-select first app when data loads or org changes
  useEffect(() => {
    if (apps && apps.length > 0) {
      // If current selection is not in the list, select first app
      const isCurrentAppValid = apps.some((app) => app._id === selectedAppId);
      if (!isCurrentAppValid) {
        setSelectedAppId(apps[0]._id);
      }
    } else {
      // No apps available, clear selection
      setSelectedAppId(null);
    }
  }, [apps]);

  const selectedApp = apps?.find((app) => app._id === selectedAppId) || null;

  return (
    <AppContext.Provider
      value={{
        selectedApp,
        setSelectedAppId,
        apps,
        isLoading: apps === undefined,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
