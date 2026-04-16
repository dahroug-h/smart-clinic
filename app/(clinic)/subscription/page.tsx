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

        <div className="flex flex-col items-center mt-10 space-y-5">
          <p className="text-lg text-muted-foreground max-w-md">
            بعد الدفع ابعت اسكرين شوت للدفع + كود الدفع على واتساب عشان نفعّل اشتراكك
          </p>
          <a
            href="https://wa.me/201112407375"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2.5 bg-[var(--accent)] text-white px-8 py-3.5 rounded-full font-bold text-lg hover:bg-teal-800 transition-all shadow-md active:scale-95"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            إرسال إيصال الدفع
          </a>
        </div>


      </div>
    </div>
  );
}
