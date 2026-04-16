"use client";
import { useState } from "react";
import { saveSettings } from "./actions";
import toast from "react-hot-toast";

export default function SettingsForm({ clinicId, clinicName, initialContent }: { clinicId: string, clinicName: string | null, initialContent: any }) {
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsPending(true);
    try {
      const formData = new FormData(e.currentTarget);
      await saveSettings(clinicId, formData);
      toast.success("تم حفظ البوت بنجاح", { duration: 3000 });
    } catch (err) {
      toast.error("حدث خطأ أثناء الحفظ");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-12 pb-24">
      {/* 1. Clinic Information */}
      <section className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-6">
        <h2 className="text-xl font-semibold">1. هويّة ومعلومات العيادة</h2>
        
        <div>
          <label className="block text-sm font-medium mb-2">اسم العيادة الخاص بك</label>
          <input
            type="text"
            name="clinic_name"
            defaultValue={clinicName || ""}
            required
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="مثال: عيادة النور التخصصية"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">معلومات مفصلة للبوت — العنوان، التخصص، الخدمات، الأسعار، رقم التليفون، اسم الدكتور، الخ</label>
          <textarea
            name="clinic_info"
            defaultValue={initialContent.clinic_info || ""}
            className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="معلومات العيادة..."
          />
        </div>
      </section>

      {/* 2. Working Hours */}
      <section className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-4">
        <h2 className="text-xl font-semibold">2. أوقات العمل</h2>
        <div>
          <label className="block text-sm font-medium mb-2">أوقات العمل المتاحة بشكل عام للعيادة</label>
          <textarea
            name="availability_text"
            defaultValue={initialContent.availability_text || ""}
            className="w-full h-24 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="مثال: السبت والأحد من 10 الصبح لـ 2 بعد الضهر، الثلاثاء من 5 العصر لـ 9 بالليل. أو اكتب أي ترتيب تاني يناسبك"
          />
        </div>
      </section>

      {/* 3. Bot Settings */}
      <section className="bg-white p-6 rounded-xl border border-[var(--border)] shadow-sm space-y-6">
        <h2 className="text-xl font-semibold">3. إعدادات البوت</h2>

        <div>
          <label className="block text-sm font-medium mb-2">شخصية البوت</label>
          <textarea
            name="bot_persona"
            defaultValue={initialContent.bot_persona || "بوت بيتكلم باسلوب ودى و محترف"}
            className="w-full h-20 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="مثال: بوت اسمه رنا، بتتكلم بأسلوب ودي وخفيف، زي موظفة استقبال شاطرة"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">تعليمات إضافية</label>
          <textarea
            name="custom_instructions"
            defaultValue={initialContent.custom_instructions || ""}
            className="w-full h-20 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="أي حاجة تانية عايز البوت يعملها أو ميعملهاش. مثال: دايما اسأل عن سبب الزيارة، متقولش أي أسعار، رحب بالمرضى الجدد بكلمة خاصة"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">البيانات المطلوبة عند الحجز</label>
          <textarea
            name="booking_fields"
            defaultValue={initialContent.booking_fields || ""}
            className="w-full h-16 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            placeholder="مثال: الاسم والسن وسبب الزيارة"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">مدة الكشف (بالدقائق)</label>
            <input
              type="number"
              name="appointment_duration_minutes"
              defaultValue={initialContent.appointment_duration_minutes || 30}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
          </div>

          <div className="flex flex-col gap-4 justify-center">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                name="cancellation_allowed"
                value="true"
                defaultChecked={initialContent.cancellation_allowed ?? true}
                className="w-5 h-5 text-[var(--accent)]"
              />
              <span className="text-sm font-medium">السماح بإلغاء الحجز عبر واتساب</span>
            </label>
          </div>
        </div>
      </section>


      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t flex justify-center z-10 w-full ml-0 md:ml-64">
        <button
          type="submit"
          disabled={isPending}
          className="bg-[var(--accent)] text-white px-12 py-3 rounded-lg font-medium hover:bg-teal-800 transition-colors shadow-sm disabled:opacity-50"
        >
          {isPending ? "جاري الحفظ..." : "حفظ إعدادات البوت"}
        </button>
      </div>
    </form>
  );
}
