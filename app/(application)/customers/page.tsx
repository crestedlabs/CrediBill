import CustomersContent from "@/components/customers/customers-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Customers — CrediBill",
  description:
    "View and manage customers across your SaaS applications. Search, inspect billing history, and manage customer-level details.",
  keywords: ["CrediBill", "customers", "billing", "customers management"],
};

export default function Page() {
  return <CustomersContent />;
}
