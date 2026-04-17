"use client";
import { useState } from "react";
import { saveWhatsAppSettings } from "./actions";
import { Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";

export default function WhatsAppSettingsForm({ 
  clinicId, 
  whatsappPhoneId, 
  whatsappNumber, 
  hasCredentials 
}: { 
  clinicId: string;
  whatsappPhoneId: string | null;
  whatsappNumber: string | null;
  hasCredentials: boolean;
}) {
  const [isPending, setIsPending] = useState(false);
  const [showToken, setShowToken] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      const res = await saveWhatsAppSettings(clinicId, formData);
      
      if (res?.error) {
        toast.error(res.error, { duration: 5000 });
      } else {
        toast.success("تم التحديث وحفظ تفاصيل الواتساب بنجاح", { duration: 3000 });
      }
    } catch (err) {
      toast.error("حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 mb-24 mt-8">
      <section className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-6 relative overflow-hidden">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-xl font-semibold">ربط واتساب</h2>
            {hasCredentials ? (
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded border border-green-200">
                متصل ✓
              </span>
            ) : (
              <span className="bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded border border-amber-200">
                لازم تربط الواتساب عشان البوت يشتغل
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            هتلاقي البيانات دي في Meta Developer Dashboard بتاعك — <a href="https://youtu.be/dGCPr_-WELg?si=fMSD2OMrsR-K9ssT" target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] font-semibold hover:underline bg-[var(--accent)]/10 px-2 py-0.5 rounded">شوف الفيديو التعليمي للمساعدة</a>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Phone Number ID</label>
            <input
              type="text"
              name="whatsapp_phone_id"
              defaultValue={whatsappPhoneId || ""}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="مثال: 1029384756"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">رقم الواتساب</label>
            <input
              type="text"
              name="whatsapp_number"
              defaultValue={whatsappNumber || ""}
              required
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] text-left"
              dir="ltr"
              placeholder="+201XXXXXXXXX"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Access Token</label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              name="whatsapp_access_token"
              placeholder={hasCredentials ? "•••••••• (Token saved)" : "EAA..."}
              required={!hasCredentials}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)] pr-12 text-left"
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showToken ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-left" dir="ltr">
            Permanent Access Token from Meta System User
          </p>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isPending}
            className="bg-[var(--accent)] text-white px-8 py-2.5 rounded-lg font-medium hover:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
          >
            {isPending ? "جاري الحفظ..." : "حفظ إعدادات الواتساب"}
          </button>
        </div>
      </section>
    </form>
  );
}
