import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import Link from "next/link";
import { LayoutDashboard, Settings, CreditCard, MessageCircle } from "lucide-react";
import { UserButton as ClerkUserButton } from "@clerk/nextjs";

export default async function ClinicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  const supabase = createServerSupabaseClient();

  // 1. Check if clinic exists
  const { data: clinic, error: fetchError } = await supabase
    .from("clinics")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") {
    throw new Error(`Database Error reading clinics: ${fetchError.message}`);
  }

  if (!clinic && fetchError?.code === "PGRST116") {
    // 2. Doesn't exist, create it
    const { data: maxRows } = await supabase
      .from("clinics")
      .select("payment_code")
      .order("payment_code", { ascending: false })
      .limit(1);

    const nextCode = maxRows && maxRows.length > 0 ? maxRows[0].payment_code + 1 : 60;
    const name = user.firstName ? `${user.firstName}'s Clinic` : "عيادة جديدة";

    const { error: insertError } = await supabase.from("clinics").insert({
      clerk_user_id: userId,
      payment_code: nextCode,
      clinic_name: name,
    });

    if (insertError) {
      console.error("Failed to create clinic record:", insertError);
      throw new Error(`Database Error creating clinic: ${insertError.message}`);
    } else {
      // Re-fetch or simply refresh
      redirect("/dashboard");
    }
  }

  return (
    <div className="flex h-screen bg-[var(--background)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-[var(--border)] flex flex-col">
        <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
          <h2 className="font-bold text-lg text-[var(--accent)] tracking-tight">Smart Clinic</h2>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          <Link
            href="/dashboard"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--foreground)] hover:bg-gray-50"
          >
            <LayoutDashboard className="h-5 w-5 ml-3 text-muted-foreground" />
            لوحة التحكم
          </Link>
          <Link
            href="/chat"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--foreground)] hover:bg-gray-50"
          >
            <MessageCircle className="h-5 w-5 ml-3 text-muted-foreground" />
            المحادثات
          </Link>
          <Link
            href="/settings"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--foreground)] hover:bg-gray-50"
          >
            <Settings className="h-5 w-5 ml-3 text-muted-foreground" />
            الإعدادات
          </Link>
          <Link
            href="/subscription"
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-[var(--foreground)] hover:bg-gray-50"
          >
            <CreditCard className="h-5 w-5 ml-3 text-muted-foreground" />
            الاشتراك
          </Link>
        </nav>
        <div className="p-4 border-t border-[var(--border)] flex items-center gap-3">
          <ClerkUserButton afterSignOutUrl="/" />
          <span className="text-sm font-medium">{user.firstName || user.emailAddresses[0]?.emailAddress}</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 relative">
        {children}
      </main>
    </div>
  );
}
