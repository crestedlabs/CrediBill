import type { Metadata } from "next";
import CreateAppContent from "@/components/create-app-content";

export const metadata: Metadata = {
  title: "Create App - CrediBill",
  description: "Create a new application for billing and subscription management",
};

export default function CreateAppPage() {
  return <CreateAppContent />;
}