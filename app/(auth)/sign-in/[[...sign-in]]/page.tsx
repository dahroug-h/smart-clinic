import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <SignIn path="/sign-in" />
    </div>
  );
}
