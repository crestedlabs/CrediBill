import NavigationLayout from "@/components/navigation-bar";
import Header from "@/components/header";

export default function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Use the shared navigation layout and inject our custom header */}
      <NavigationLayout header={<Header />}>{children}</NavigationLayout>
    </>
  );
}
