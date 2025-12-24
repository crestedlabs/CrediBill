import NavigationLayout from "@/components/navigation-bar";
import Header from "@/components/header";
import { OrganizationProvider } from "@/contexts/organization-context";
import { AppProvider } from "@/contexts/app-context";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <OrganizationProvider>
      <AppProvider>
        {/* Use the shared navigation layout and inject our custom header */}
        <NavigationLayout header={<Header />}>{children}</NavigationLayout>
      </AppProvider>
    </OrganizationProvider>
  );
}
