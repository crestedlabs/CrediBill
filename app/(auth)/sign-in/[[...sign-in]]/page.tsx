import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6 bg-gray-50">
      <SignIn path="/sign-in" routing="path" />
    </div>
  );
}
