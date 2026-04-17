import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/utils/supabase";
import { format, differenceInDays } from "date-fns";
import clsx from "clsx";
import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteButton from "./DeleteButton";

export default async function DashboardPage() {
  const { userId } = auth();
  const user = await currentUser();
  if (!userId || !user) return null;

  const isAdmin = user.primaryEmailAddress?.emailAddress === process.env.ADMIN_EMAIL;

  if (isAdmin) {
    redirect("/admin");
  }

  const supabase = createServerSupabaseClient();

  const { data: clinic, error: clinicError } = await supabase
    .from("clinics")
    .select("id, clinic_name, subscription_status, subscription_expires_at, trial_conversations_used, trial_conversations_limit, whatsapp_access_token")
    .eq("clerk_user_id", userId)
    .single();

  if (!clinic) {
    throw new Error(`Dashboard Error: No clinic found for this user. DB Error info: ${JSON.stringify(clinicError)}`);
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*")
    .eq("clinic_id", clinic.id)
    .order("appointment_date", { ascending: false })
    .order("appointment_time", { ascending: false })
    .limit(50);

  // Stats calculation
  const currentMonthDate = new Date();
  const currentMonthStart = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth(), 1).toISOString();

  const adminSupabase = createAdminSupabaseClient();
  const { data: statsData } = await adminSupabase
    .from("analytics_events")
    .select("*")
    .eq("clinic_id", clinic.id)
    .gte("created_at", currentMonthStart);

  const statsExists = statsData && statsData.length > 0;

  const convCount = statsData?.filter(e => e.event_type === "conversation_started").length || 0;

  // Use appointments table as fallback if analytics is empty
  const fallbackBookings = appointments?.filter(a => a.status === 'confirmed').length || 0;
  const fallbackCancellations = appointments?.filter(a => a.status === 'cancelled').length || 0;

  const bookingsCount = statsExists
    ? statsData.filter(e => e.event_type === "appointment_booked").length
    : fallbackBookings;

  const cancellationsCount = statsExists
    ? statsData.filter(e => e.event_type === "appointment_cancelled").length
    : fallbackCancellations;

  // Subscription Badge Logic
  let badgeClasses = "bg-gray-100 text-gray-800";
  let badgeText = "";

  if (clinic.subscription_status === 'trial') {
    const remaining = clinic.trial_conversations_limit - clinic.trial_conversations_used;
    if (remaining <= 3) {
      badgeClasses = "bg-orange-100 text-orange-800 animate-pulse border border-orange-300";
    } else {
      badgeClasses = "bg-amber-100 text-amber-800 border border-amber-200";
    }
    badgeText = `تجربة مجانية · ${remaining} محادثة متبقية`;
  } else if (clinic.subscription_status === 'active') {
    const expires = clinic.subscription_expires_at ? new Date(clinic.subscription_expires_at) : null;
    const daysLeft = expires ? differenceInDays(expires, new Date()) : 0;

    if (daysLeft <= 3 && daysLeft >= 0) {
      badgeClasses = "bg-orange-100 text-orange-800 animate-pulse border border-orange-300";
    } else {
      badgeClasses = "bg-emerald-100 text-emerald-800 border border-emerald-200";
    }
    badgeText = `مشترك · ينتهي ${expires ? format(expires, 'dd/MM/yyyy') : 'غير محدد'}`;
  } else {
    badgeClasses = "bg-red-100 text-red-800 border border-red-200";
    badgeText = "الاشتراك منتهي";
  }

  const hasWhatsAppCredentials = !!clinic.whatsapp_access_token;

  return (
    <div className="space-y-8">
      {!hasWhatsAppCredentials && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between mb-8 shadow-sm">
          <div className="text-amber-800">
            <span className="font-bold">خطوة مهمة:</span> لازم تربط حساب الواتساب بتاعك بالمنصة عشان البوت يشتغل ويقدر يرد على العملاء
          </div>
          <Link href="/settings" className="text-sm font-medium bg-amber-100 text-amber-900 border border-amber-300 rounded-lg px-4 py-2 hover:bg-amber-200 transition-colors">
            اضغط هنا لربط الواتساب
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">{clinic.clinic_name}</h1>
          {isAdmin && (
            <Link href="/admin" className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-sm font-bold shadow-sm hover:bg-slate-800 transition-colors">
              لوحة تحكم المنصة (Admin)
            </Link>
          )}
        </div>
        <span className={clsx("px-4 py-1.5 rounded-full text-sm font-medium", badgeClasses)}>
          {badgeText}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-[var(--border)] shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">محادثات هذا الشهر</h3>
          <p className="text-3xl font-bold mt-2">{convCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[var(--border)] shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">حجوزات هذا الشهر</h3>
          <p className="text-3xl font-bold mt-2">{bookingsCount}</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-[var(--border)] shadow-sm">
          <h3 className="text-sm font-medium text-muted-foreground">إلغاءات هذا الشهر</h3>
          <p className="text-3xl font-bold mt-2">{cancellationsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">المواعيد الأخيرة</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm min-w-[600px]">
            <thead className="bg-gray-50 text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">اسم المريض</th>
              <th className="px-6 py-3 font-medium">التاريخ</th>
              <th className="px-6 py-3 font-medium">الوقت</th>
              <th className="px-6 py-3 font-medium">الحالة</th>
              <th className="px-6 py-3 font-medium text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {appointments?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                  لا توجد مواعيد حتى الآن
                </td>
              </tr>
            ) : (
              appointments?.map(app => {
                let displayTime = app.appointment_time;
                if (displayTime) {
                  const parts = displayTime.split(":");
                  if (parts.length >= 2) {
                    let h = parseInt(parts[0], 10);
                    const m = parts[1];
                    const ampm = h >= 12 ? "م" : "ص";
                    h = h % 12 || 12;
                    displayTime = `${h}:${m} ${ampm}`;
                  }
                }
                return (
                  <tr key={app.id} className="hover:bg-gray-50/50 group">
                    <td className="px-6 py-4 font-medium">{app.patient_name || app.patient_phone}</td>
                    <td className="px-6 py-4">{app.appointment_date}</td>
                    <td className="px-6 py-4" dir="ltr">{displayTime}</td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 text-xs rounded-full font-medium",
                        app.status === 'confirmed' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {app.status === 'confirmed' ? 'مؤكد' : 'ملغي'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-left">
                      <DeleteButton id={app.id} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
