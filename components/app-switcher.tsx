"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Grid } from "lucide-react";
import { useApp } from "@/contexts/app-context";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSwitcher() {
  const { selectedApp, setSelectedAppId, apps } = useApp();

  if (!apps || apps.length === 0) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
              <Grid className="size-4" />
            </div>
            <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
              <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">
                App
              </span>
              <span className="font-semibold text-sm truncate">
                No app selected
              </span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Grid className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">
                  App
                </span>
                <span
                  className="font-semibold text-sm truncate"
                  title={selectedApp?.name}
                >
                  {selectedApp?.name || "Select an app"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          >
            {apps.map((app) => (
              <DropdownMenuItem
                key={app._id}
                onSelect={() => setSelectedAppId(app._id)}
              >
                <span className="truncate flex-1" title={app.name}>
                  {app.name}
                </span>
                {app._id === selectedApp?._id && (
                  <Check className="ml-2 h-4 w-4 shrink-0" />
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default AppSwitcher;
