import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) redirect("/sign-in");

  if (user.primaryEmailAddress?.emailAddress !== process.env.ADMIN_EMAIL) {
    redirect("/dashboard"); // Redirect non-admins to clinic dashboard
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Smart Clinic | Super Admin</h1>
      </header>
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
