import { createAdminSupabaseClient } from "@/lib/utils/supabase";
import Link from "next/link";
import clsx from "clsx";

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

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">كود الدفع</th>
              <th className="px-6 py-3 font-medium">اسم العيادة</th>
              <th className="px-6 py-3 font-medium">الحالة</th>
              <th className="px-6 py-3 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {clinics?.map(clinic => (
              <tr key={clinic.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 font-bold">#{clinic.payment_code}</td>
                <td className="px-6 py-4">{clinic.clinic_name}</td>
                <td className="px-6 py-4">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-xs font-bold",
                    clinic.subscription_status === 'active' ? "bg-green-100 text-green-800" :
                    clinic.subscription_status === 'trial' ? "bg-amber-100 text-amber-800" :
                    "bg-red-100 text-red-800"
                  )}>
                    {clinic.subscription_status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {/* Detailed admin page is mocked for now */}
                  <Link href={`/admin/${clinic.id}`} className="text-blue-600 hover:text-blue-800 underline">
                    التفاصيل والإعدادات
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
