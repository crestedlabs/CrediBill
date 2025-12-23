"use client"

import * as React from "react";
import { Check, ChevronsUpDown, Grid } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

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
  const apps = useQuery(api.apps.getUserApps, {});
  const [selected, setSelected] = React.useState<string>("");

  // Set default selection when data loads
  React.useEffect(() => {
    if (apps && apps.length > 0 && !selected) {
      setSelected(apps[0].name || "");
    } else if (apps && apps.length === 0 && !selected) {
      setSelected("Demo App");
    }
  }, [apps, selected]);

  if (!apps) return null;

  const displayApps = apps.length > 0 ? apps : [{ _id: "demo", name: "Demo App" }];
  const currentSelection = apps.length > 0 ? selected : "Demo App";

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
                <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">App</span>
                <span className="font-semibold text-sm truncate" title={currentSelection}>{currentSelection}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width)"
            align="start"
          >
            {displayApps.map((app) => (
              <DropdownMenuItem key={app._id} onSelect={() => setSelected(app.name || "")}>
                <span className="truncate flex-1" title={app.name}>{app.name}</span>
                {app.name === currentSelection && <Check className="ml-2 h-4 w-4 shrink-0" />}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default AppSwitcher;
