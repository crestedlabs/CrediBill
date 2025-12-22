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
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Types for navigation data
type NavItem = {
  title: string;
  url: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isActive?: boolean;
};

import { AppSwitcher } from "@/components/app-switcher";
// collapsible no longer used — kept for potential future sections (unused currently)
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navigation data — simplified to the app routes you requested.
const data: { apps: string[]; navItems: NavItem[] } = {
  apps: ["Reciit", "Votera", "Brodkast"],
  navItems: [
    { title: "Overview", url: "/overview", icon: Home },
    { title: "Customers", url: "/customers", icon: Users },
    { title: "Plans", url: "/plans", icon: List },
    { title: "Invoices", url: "/invoices", icon: File },
    { title: "Settings", url: "/settings", icon: Settings },
    { title: "Apps", url: "/apps", icon: Grid },
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
          <AppSwitcher apps={data.apps} defaultApp={data.apps[0]} />
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
      <SidebarRail />
    </Sidebar>
  );
}
