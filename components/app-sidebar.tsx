"use client";

import * as React from "react";
import {
  Grid,
  Users,
  File,
  Home,
  List,
  Settings,
  CreditCard,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

// Types for navigation data
type NavItem = {
  title: string;
  url: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isActive?: boolean;
};

import { AppSwitcher } from "@/components/app-switcher";
import { OrgSwitcher } from "@/components/org-switcher";
// collapsible no longer used — kept for potential future sections (unused currently)
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from "@/components/ui/sidebar";

// Navigation data — simplified to the app routes you requested.
const data: { apps: string[]; organizations: string[]; navItems: NavItem[] } = {
  apps: ["Reciit", "Votera", "Brodkast"],
  organizations: ["Crested Labs", "TechCorp", "StartupHub"],
  navItems: [
    { title: "Overview", url: "/overview", icon: Home },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Plans", url: "/plans", icon: List },
    { title: "Invoices", url: "/invoices", icon: File },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname =
    usePathname() ??
    (typeof window !== "undefined" ? window.location.pathname : "/");

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <AppSwitcher />
        </div>
        <div className="mt-3 px-2">
          <Link href="/create-app">
            <Button className="w-full h-9 text-sm bg-teal-600 hover:bg-teal-700 text-white" onClick={() => {
              // Close sidebar on mobile
              if (window.innerWidth < 768) {
                document.querySelector('[data-sidebar="sidebar"]')?.setAttribute('data-state', 'closed');
              }
            }}>
              <Plus className="mr-2 h-4 w-4" />
              Create App
            </Button>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="gap-0">
        {/* Primary navigation items — larger tap targets and extra spacing */}
        <SidebarMenu className="mt-3 pl-2">
          {data.navItems.map((sub) => {
            const Icon = sub.icon as React.ComponentType<
              React.SVGProps<SVGSVGElement>
            >;
            const isActive =
              pathname === sub.url || pathname?.startsWith(sub.url + "/");
            return (
              <SidebarMenuItem key={sub.title}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  size={"lg"}
                  tooltip={sub.title}
                >
                  <Link
                    href={sub.url}
                    className="flex items-center w-full pl-3 pr-2 py-3"
                  >
                    <Icon className="mr-3 size-5 shrink-0" />
                    <span className="text-base">{sub.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <OrgSwitcher />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
