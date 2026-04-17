import { createAdminSupabaseClient } from "@/lib/utils/supabase";
import Link from "next/link";
import clsx from "clsx";
import AdminClinicsTable from "./AdminClinicsTable";

export default async function AdminDashboard() {
  const supabase = createAdminSupabaseClient();
  const { data: clinics } = await supabase.from("clinics").select("*").order("created_at", { ascending: false });

  // Admin stats
  const activeCount = clinics?.filter(c => c.subscription_status === 'active').length || 0;
  const trialCount = clinics?.filter(c => c.subscription_status === 'trial').length || 0;
  const inactiveCount = clinics?.filter(c => c.subscription_status === 'inactive').length || 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-muted-foreground font-medium">العيادات المفعلة</h2>
          <p className="text-3xl font-bold mt-2">{activeCount}</p>
        </div>
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-muted-foreground font-medium">العيادات التجريبية</h2>
          <p className="text-3xl font-bold mt-2">{trialCount}</p>
        </div>
        <div className="bg-white p-6 border rounded-lg shadow-sm">
          <h2 className="text-muted-foreground font-medium">العيادات المنتهية</h2>
          <p className="text-3xl font-bold mt-2">{inactiveCount}</p>
        </div>
      </div>

      <AdminClinicsTable clinics={clinics || []} />
    </div>
  );
}
