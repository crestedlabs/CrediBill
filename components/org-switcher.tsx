"use client"

import * as React from "react";
import { Check, ChevronsUpDown, Building2, Settings, ArrowRightLeft, Plus } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from "next/link";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function OrgSwitcher() {
  const organizations = useQuery(api.organizations.getUserOrganizations);
  const [selected, setSelected] = React.useState<string>("");
  const [switchOpen, setSwitchOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);

  // Set default selection when data loads
  React.useEffect(() => {
    if (organizations && organizations.length > 0 && !selected) {
      setSelected(organizations[0].name || "");
    }
  }, [organizations, selected]);

  // Check if mobile
  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!organizations) return null;

  // On mobile, navigate directly to organization details
  if (isMobile) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <Link href="/organization-details">
            <SidebarMenuButton
              size="lg"
              className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Organization</span>
                <span className="font-semibold text-sm truncate" title={selected}>{selected}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  // Desktop popover behavior
  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <Building2 className="size-4" />
              </div>
              <div className="flex flex-col gap-0.5 leading-none min-w-0 flex-1">
                <span className="text-xs text-sidebar-foreground/60 uppercase tracking-wide">Organization</span>
                <span className="font-semibold text-sm truncate" title={selected}>{selected}</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </PopoverTrigger>

          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1">
              <Link href="/organization-details">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 cursor-pointer">
                  <Settings className="h-4 w-4 text-slate-600" />
                  <span className="text-sm font-medium">Organization Details</span>
                </div>
              </Link>
              
              <Popover open={switchOpen} onOpenChange={setSwitchOpen}>
                <PopoverTrigger asChild>
                  <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 cursor-pointer">
                    <ArrowRightLeft className="h-4 w-4 text-slate-600" />
                    <span className="text-sm font-medium">Switch Organization</span>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" side="right">
                  <div className="space-y-1">
                    {organizations.map((org) => (
                      <div
                        key={org._id}
                        className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-slate-100 cursor-pointer"
                        onClick={() => {
                          setSelected(org.name || "");
                          setSwitchOpen(false);
                        }}
                      >
                        <span className="text-sm truncate flex-1" title={org.name}>{org.name}</span>
                        {org.name === selected && <Check className="h-4 w-4 text-emerald-600" />}
                      </div>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Link href="/create-organization">
                <div className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-teal-50 cursor-pointer">
                  <Plus className="h-4 w-4 text-teal-600" />
                  <span className="text-sm font-medium text-teal-600">Create Organization</span>
                </div>
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

export default OrgSwitcher;