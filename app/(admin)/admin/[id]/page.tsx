import { createAdminSupabaseClient } from "@/lib/utils/supabase";
import clsx from "clsx";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { revalidatePath } from "next/cache";
import { subDays, differenceInDays } from "date-fns";
import ConfirmForm from "./ConfirmForm";

export default async function AdminClinicDetails({ params }: { params: { id: string } }) {
  const supabase = createAdminSupabaseClient();

  async function renewSubscription() {
    "use server";
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (user?.primaryEmailAddress?.emailAddress !== process.env.ADMIN_EMAIL) {
      throw new Error("Unauthorized action. Admin access strictly required.");
    }

    const adminSupabase = createAdminSupabaseClient();
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 30);

    await adminSupabase.from("clinics").update({
      subscription_status: 'active',
      subscription_expires_at: newExpiry.toISOString()
    }).eq("id", params.id);

    revalidatePath(`/admin/${params.id}`);
  }

  async function cancelSubscription() {
    "use server";
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (user?.primaryEmailAddress?.emailAddress !== process.env.ADMIN_EMAIL) {
      throw new Error("Unauthorized action. Admin access strictly required.");
    }

    const adminSupabase = createAdminSupabaseClient();
    await adminSupabase.from("clinics").update({
      subscription_status: 'inactive'
    }).eq("id", params.id);

    revalidatePath(`/admin/${params.id}`);
  }

  const { data: clinic, error } = await supabase
    .from("clinics")
    .select("id, clinic_name, payment_code, subscription_status, subscription_expires_at, trial_conversations_used, trial_conversations_limit, whatsapp_phone_id, whatsapp_number, whatsapp_access_token, created_at")
    .eq("id", params.id)
    .single();

  if (error || !clinic) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Link href="/admin" className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
          <ArrowRight className="h-4 w-4" />
          العودة للوحة التحكم
        </Link>
        <div className="p-6 bg-red-50 text-red-800 rounded-lg border border-red-200">
          لم يتم العثور على العيادة أو حدث خطأ في التحميل.
        </div>
      </div>
    );
  }

  const hasWhatsApp = !!clinic.whatsapp_access_token;

  let daysLeft: number | null = null;
  let startedAt: Date | null = null;
  let expiresAt: Date | null = null;
  let cycleConversations = 0;

  if (clinic.subscription_status === 'active' && clinic.subscription_expires_at) {
    expiresAt = new Date(clinic.subscription_expires_at);
    startedAt = subDays(expiresAt, 30);

    // Use Math.ceil to prevent 29.99 days truncating down to 29
    daysLeft = Math.ceil((expiresAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24));

    // Fetch conversations only for the current active 30-day period
    const { count } = await supabase
      .from("analytics_events")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", params.id)
      .eq("event_type", "conversation_started")
      .gte("created_at", startedAt.toISOString());

    cycleConversations = count || 0;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Link href="/admin" className="inline-flex text-blue-600 hover:text-blue-800 items-center gap-2 mb-4 font-medium transition-colors">
        <ArrowRight className="h-4 w-4" />
        العودة للعيادات
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">{clinic.clinic_name}</h1>
          <p className="text-2xl font-bold mt-2 text-[var(--foreground)]">
            كود الدفع: <span className="select-all text-[var(--accent)]">#{clinic.payment_code}</span>
          </p>
        </div>
        <span className={clsx(
          "px-4 py-2 rounded-full text-sm font-bold shadow-sm",
          clinic.subscription_status === 'active' ? "bg-green-100 text-green-800" :
            clinic.subscription_status === 'trial' ? "bg-amber-100 text-amber-800" :
              "bg-red-100 text-red-800"
        )}>
          الحالة: {clinic.subscription_status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subscription Info */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-4 gap-4 flex-wrap">
            <ConfirmForm action={cancelSubscription} message="هل أنت متأكد من إيقاف اشتراك هذه العيادة؟">
              <button type="submit" className="bg-red-600 hover:bg-red-700 text-white text-sm font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all active:scale-95">
                إيقاف الاشتراك
              </button>
            </ConfirmForm>
            <ConfirmForm action={renewSubscription} message="هل أنت متأكد من تفعيل الاشتراك لمدة 30 يوم؟">
              <button type="submit" className="bg-[var(--accent)] hover:opacity-90 text-white text-base font-semibold py-2.5 px-6 rounded-xl shadow-sm transition-all active:scale-95">
                تفعيل الاشتراك (30 يوم)
              </button>
            </ConfirmForm>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">نوع الاشتراك</span>
              <span className="font-medium">{clinic.subscription_status}</span>
            </div>

            {clinic.subscription_status === 'trial' && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الرصيد المستخدم</span>
                  <span className="font-medium">{clinic.trial_conversations_used} / {clinic.trial_conversations_limit} محادثة</span>
                </div>
              </>
            )}

            {clinic.subscription_status === 'active' && expiresAt && startedAt && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ بدء الاشتراك الحالي</span>
                  <span className="font-medium text-left" dir="ltr">
                    {startedAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">تاريخ الانتهاء</span>
                  <span className="font-medium text-left" dir="ltr">
                    {expiresAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between items-center bg-gray-50 border rounded-lg p-3 my-2">
                  <span className="text-muted-foreground font-medium text-sm">الأيام المتبقية في الاشتراك</span>
                  <span className={clsx("font-bold", typeof daysLeft === 'number' && daysLeft < 5 ? "text-red-600" : "text-emerald-600")}>
                    {daysLeft} يوم
                  </span>
                </div>
                <div className="flex justify-between items-center bg-blue-50 border border-blue-100 rounded-lg p-3 mt-3">
                  <span className="text-blue-800 font-medium text-sm">استهلاك محادثات الشهر الحالي</span>
                  <span className="font-bold text-blue-900">
                    {cycleConversations} محادثة
                  </span>
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              <span className="text-muted-foreground">تاريخ التسجيل بالمنصة</span>
              <span className="font-medium text-left" dir="ltr">
                {new Date(clinic.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </section>

        {/* WhatsApp Connection Read-only */}
        <section className="bg-white p-6 rounded-xl border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold border-b pb-2">تفاصيل ربط واتساب</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded border">
              <span className="text-muted-foreground text-sm font-medium">حالة الاتصال</span>
              {hasWhatsApp ? (
                <span className="flex items-center gap-2 text-green-700 font-bold bg-green-100 px-3 py-1 rounded">
                  <span className="h-2 w-2 rounded-full bg-green-600 block"></span>
                  متصل
                </span>
              ) : (
                <span className="flex items-center gap-2 text-red-700 font-bold bg-red-100 px-3 py-1 rounded">
                  <span className="h-2 w-2 rounded-full bg-red-600 block"></span>
                  غير متصل
                </span>
              )}
            </div>

            {hasWhatsApp && (
              <div className="space-y-2 pt-2">
                <div className="flex flex-col text-sm">
                  <span className="text-muted-foreground mb-1">Phone Number ID</span>
                  <span className="font-medium bg-gray-100 px-3 py-2 rounded text-left" dir="ltr">{clinic.whatsapp_phone_id}</span>
                </div>
                <div className="flex flex-col text-sm">
                  <span className="text-muted-foreground mb-1">رقم الواتساب</span>
                  <span className="font-medium bg-gray-100 px-3 py-2 rounded text-left" dir="ltr">{clinic.whatsapp_number}</span>
                </div>

              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
