import type { Metadata } from "next";
import OrganizationDetailsContent from "@/components/organizations/organization-details-content";

export const metadata: Metadata = {
  title: "Organization Details - CrediBill",
  description: "Manage your organization settings, team members, and applications",
};

export default function OrganizationDetailsPage() {
  return <OrganizationDetailsContent />;
}