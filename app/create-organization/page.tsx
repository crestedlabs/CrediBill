import type { Metadata } from "next";
import CreateOrganizationContent from "@/components/organizations/create-organization-content";

export const metadata: Metadata = {
  title: "Create Organization - CrediBill",
  description: "Create a new organization for your team and applications",
};

export default function CreateOrganizationPage() {
  return <CreateOrganizationContent />;
}