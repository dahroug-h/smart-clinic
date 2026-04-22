import { auth, currentUser } from "@clerk/nextjs/server";
import { createServerSupabaseClient, createAdminSupabaseClient } from "@/lib/utils/supabase";
import { MessageCircle } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import clsx from "clsx";
import Link from "next/link";
import { redirect } from "next/navigation";
import DeleteButton from "./DeleteButton";
import CompleteButton from "./CompleteButton";

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

      <div className="grid grid-cols-3 gap-3 md:gap-6">
        <div className="bg-white p-3 md:p-6 rounded-lg border border-[var(--border)] shadow-sm text-center flex flex-col justify-center">
          <h3 className="text-[10px] md:text-sm font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">محادثات الشهر</h3>
          <p className="text-lg md:text-3xl font-bold mt-1 md:mt-2 leading-none">{convCount}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-lg border border-[var(--border)] shadow-sm text-center flex flex-col justify-center">
          <h3 className="text-[10px] md:text-sm font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">حجوزات الشهر</h3>
          <p className="text-lg md:text-3xl font-bold mt-1 md:mt-2 leading-none">{bookingsCount}</p>
        </div>
        <div className="bg-white p-3 md:p-6 rounded-lg border border-[var(--border)] shadow-sm text-center flex flex-col justify-center">
          <h3 className="text-[10px] md:text-sm font-medium text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">إلغاءات الشهر</h3>
          <p className="text-lg md:text-3xl font-bold mt-1 md:mt-2 leading-none">{cancellationsCount}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-[var(--border)] shadow-sm overflow-hidden">
        <div className="px-4 md:px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold">المواعيد الأخيرة</h2>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className="bg-gray-50 text-muted-foreground">
            <tr>
              <th className="px-6 py-3 font-medium">اسم المريض</th>
              <th className="px-6 py-3 font-medium">التاريخ</th>
              <th className="px-6 py-3 font-medium">الوقت</th>
              <th className="px-6 py-3 font-medium text-center">ملاحظات</th>
              <th className="px-6 py-3 font-medium">الحالة</th>
              <th className="px-6 py-3 font-medium text-left">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {appointments?.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
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
                    <td className="px-6 py-4 text-center text-gray-500 text-xs max-w-[150px] truncate" title={app.notes || "لا يوجد"}>
                      {app.notes || "-"}
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "px-2.5 py-1 text-xs rounded-full font-medium",
                        app.status === 'confirmed' ? "bg-amber-100 text-amber-800" : 
                        app.status === 'completed' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      )}>
                        {app.status === 'confirmed' ? 'مؤكد' : app.status === 'completed' ? 'تم' : 'ملغى'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          href={`/chat?phone=${encodeURIComponent(app.patient_phone)}`} 
                          className="p-1.5 rounded-md text-gray-400 hover:text-[var(--accent)] hover:bg-[#e6f4f1] transition-colors" 
                          title="فتح المحادثة"
                        >
                          <MessageCircle className="w-5 h-5" />
                        </Link>
                        {app.status !== 'completed' && <CompleteButton id={app.id} />}
                        <DeleteButton id={app.id} />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>

        {/* Mobile Cards Layout */}
        <div className="block md:hidden divide-y divide-[var(--border)]">
          {appointments?.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              لا توجد مواعيد حتى الآن
            </div>
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
                <div key={app.id} className="p-4 space-y-3 bg-white hover:bg-gray-50/50 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-[var(--foreground)] truncate">{app.patient_name || app.patient_phone}</h4>
                    <span className={clsx(
                      "px-2.5 py-1 text-[10px] rounded-full font-bold shrink-0",
                      app.status === 'confirmed' ? "bg-amber-100 text-amber-800" : 
                      app.status === 'completed' ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    )}>
                      {app.status === 'confirmed' ? 'مؤكد' : app.status === 'completed' ? 'تم' : 'ملغى'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-md border border-[var(--border)]">
                    <span className="font-medium align-middle">{app.appointment_date}</span>
                    <span className="font-bold text-[var(--accent)] align-middle" dir="ltr">{displayTime}</span>
                  </div>

                  {(app.notes || true) && (
                    <div className="text-xs text-gray-500 px-1 truncate flex items-center gap-2">
                       <span className="font-bold">ملاحظات:</span>
                       <span>{app.notes || "-"}</span>
                    </div>
                  )}
                  
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2">
                    <Link 
                      href={`/chat?phone=${encodeURIComponent(app.patient_phone)}`} 
                      className="p-1.5 rounded-md text-gray-400 hover:text-[var(--accent)] hover:bg-[#e6f4f1] transition-colors" 
                      title="فتح المحادثة"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </Link>
                    {app.status !== 'completed' && <CompleteButton id={app.id} />}
                    <DeleteButton id={app.id} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
