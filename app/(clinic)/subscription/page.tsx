import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import clsx from "clsx";

export default async function SubscriptionPage() {
  const { userId } = auth();
  if (!userId) return null;

  const supabase = createServerSupabaseClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("*")
    .eq("clerk_user_id", userId)
    .single();

  if (!clinic) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">الاشتراك والدفع</h1>
        <p className="text-muted-foreground"></p>
      </div>

      <div className="bg-white p-12 rounded-xl border border-[var(--border)] shadow-sm text-center flex flex-col items-center justify-center">
        <div className="w-full max-w-md mb-12 pb-8 border-b border-[var(--border)] space-y-4">
          <div className="flex justify-between items-center">
            <span className="font-medium text-lg text-muted-foreground">حالة الاشتراك الحالية:</span>
            <span className={clsx(
              "px-4 py-1.5 rounded-full text-sm font-bold",
              clinic.subscription_status === 'active' ? "bg-green-100 text-green-800" :
                clinic.subscription_status === 'trial' ? "bg-amber-100 text-amber-800" :
                  "bg-red-100 text-red-800"
            )}>
              {clinic.subscription_status === 'active' ? "مفعل" :
                clinic.subscription_status === 'trial' ? "تجربة مجانية" : "منتهي"}
            </span>
          </div>

          {clinic.subscription_status === 'trial' && (
            <div className="flex justify-between items-center">
              <span className="font-medium text-lg text-muted-foreground">المحادثات المتبقية:</span>
              <span className="font-bold text-xl">{clinic.trial_conversations_limit - clinic.trial_conversations_used} / {clinic.trial_conversations_limit}</span>
            </div>
          )}
          {clinic.subscription_status === 'inactive' && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 text-lg rounded-md font-medium">
              اشتراكك انتهى، تواصل معنا عشان تجدد
            </div>
          )}
        </div>
        <h2 className="text-lg font-medium text-muted-foreground mb-4">كود الدفع الخاص بعيادتك</h2>
        <div className="text-7xl font-black text-[var(--foreground)] tracking-tighter mb-6 select-all">
          #{clinic.payment_code}
        </div>
        <p className="text-lg text-muted-foreground max-w-md">
          بعد الدفع ابعت اسكرين شوت للدفع + الكود ده على واتساب عشان نفعّل اشتراكك
        </p>

        <div className="mt-8 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl p-8 text-center shadow-sm w-full max-w-lg">
          <div className="flex items-center gap-3 justify-center mb-4">
            <div className="bg-white px-3 py-1.5 rounded-lg border border-[var(--accent)]/10 shadow-sm flex items-center justify-center">
              <img src="/InstaPay-logo.svg" alt="InstaPay" className="h-9 w-auto object-contain mix-blend-multiply" loading="lazy" />
            </div>
            <span className="font-bold text-2xl text-[var(--accent)]">  Instapay انستاباي</span>
          </div>
          <p className="text-[var(--accent)]/80 font-medium mb-4 text-sm mt-2">
            الدفع متاح مباشرة من خلال الرقم:
          </p>
          <div className="text-3xl font-black text-[var(--accent)] tracking-widest bg-white py-3 rounded-lg shadow-sm border border-[var(--accent)]/20 mb-6 select-all">
            01112407375
          </div>
          <div className="flex items-center justify-center gap-4 mb-4 opacity-70">
            <div className="h-px bg-[var(--accent)] flex-1 opacity-20"></div>
            <span className="text-xs font-bold text-[var(--accent)]">أو من خلال مسح الـ QR</span>
            <div className="h-px bg-[var(--accent)] flex-1 opacity-20"></div>
          </div>
          <div className="relative w-full max-w-[420px] aspect-square mx-auto bg-white rounded-2xl border-2 border-[var(--border)] shadow-sm p-1 flex items-center justify-center overflow-hidden group">
            <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground font-medium px-4 text-center z-0">
              <div>أضف الصورة هنا<br />(public/payment_insta_qr.jpeg)</div>
            </div>
            <img
              src="/payment_insta_qr.jpeg"
              alt=" "
              className="w-full h-full object-contain rounded-lg relative z-10 bg-white"
              style={{ textIndent: "-9999px", color: "transparent" }}
              loading="lazy"
            />
          </div>
        </div>


      </div>
    </div>
  );
}
