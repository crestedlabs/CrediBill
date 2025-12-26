import InvoicesContent from "@/components/invoices/invoices-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invoices — CrediBill",
  description:
    "Invoice generation and history for customers and subscriptions. Review unpaid, paid, and past-due invoices with export options.",
  keywords: ["CrediBill", "invoices", "billing", "payments"],
};

export default function Page() {
  return <InvoicesContent />;
}
