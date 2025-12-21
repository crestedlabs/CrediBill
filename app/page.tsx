import { Button } from "@/components/ui/button";
import Link from "next/link";
export default function Page() {
  return (
    <>
      <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
        <Button asChild className="h-13 p-2">
          <Link href="/overview">GO TO DASHBOARD</Link>
        </Button>
      </div>
    </>
  );
}
