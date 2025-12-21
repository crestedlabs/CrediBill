import SettingsContent from "@/components/settings-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings — CrediBill",
  description:
    "Configuration and account settings for your CrediBill instance. Manage integrations, webhooks, and authentication settings.",
  keywords: ["CrediBill", "settings", "configuration", "integrations"],
};

export default function Page() {
  return <SettingsContent />;
}
