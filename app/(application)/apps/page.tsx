import AppsContent from "@/components/apps-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Apps — CrediBill",
  description:
    "Manage SaaS applications (tenants) connected to CrediBill. Create, configure, and inspect individual apps and their billing settings.",
  keywords: ["CrediBill", "apps", "tenants", "billing"],
};

export default function Page() {
  return <AppsContent />;
}
