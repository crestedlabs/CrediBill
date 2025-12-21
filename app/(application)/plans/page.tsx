import PlansContent from "@/components/plans-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Plans — CrediBill",
  description:
    "Define and manage subscription plans and pricing tiers. Configure trial periods, billing intervals, and plan features.",
  keywords: ["CrediBill", "plans", "pricing", "subscriptions"],
};

export default function Page() {
  return <PlansContent />;
}
