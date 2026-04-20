import React from 'react';

export const metadata = {
  title: "سياسة الخصوصية | Smart Clinic",
  description: "سياسة الخصوصية واستخدام البيانات لتطبيق Smart Clinic وخدمة واتساب",
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-[var(--accent)] p-8 text-white text-center">
          <h1 className="text-3xl font-extrabold mb-2">سياسة الخصوصية</h1>
          <p className="opacity-90">Privacy Policy</p>
        </div>
        
        <div className="p-8 space-y-8 text-gray-700 leading-relaxed text-right">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">1. مقدمة</h2>
            <p>
              نحن في <strong>Smart Clinic</strong> نلتزم بحماية خصوصية بياناتك. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية المعلومات الشخصية التي يتم تقديمها عبر منصتنا وخدمة المساعد الذكي عبر واتساب.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">2. البيانات التي نجمعها</h2>
            <p>نقوم بجمع المعلومات اللازمة فقط لتقديم خدمة حجز المواعيد وتحسين تجربة المريض، بما في ذلك:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 mr-4">
              <li>رقم الهاتف (للتواصل عبر واتساب).</li>
              <li>الاسم (لتسجيل الحجز).</li>
              <li>تفاصيل الموعد (التاريخ، الوقت، والخدمة المطلوبة).</li>
              <li>محتوى المحادثات مع المساعد الذكي لضمان جودة الردود.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">3. كيف نستخدم بياناتك</h2>
            <p>تستخدم البيانات للأغراض التالية:</p>
            <ul className="list-disc list-inside mt-3 space-y-2 mr-4">
              <li>تأكيد وتنظيم المواعيد الطبية داخل العيادة.</li>
              <li>إرسال تنبيهات ورسائل تذكير بالمواعيد عبر واتساب.</li>
              <li>تحسين أداء الذكاء الاصطناعي في الرد على استفسارات المرضى.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">4. مشاركة البيانات</h2>
            <p>
              نحن لا نبيع بياناتك الشخصية لأي طرف ثالث. تتم مشاركة البيانات فقط مع:
            </p>
            <ul className="list-disc list-inside mt-3 space-y-2 mr-4">
              <li><strong>Meta (WhatsApp Cloud API):</strong> لمعالجة وإرسال الرسائل.</li>
              <li><strong>مزودي الخدمة التقنية:</strong> مثل خدمات التخزين السحابي المؤمنة (Supabase) والذكاء الاصطناعي (Anthropic/OpenRouter/Gemini) لمعالجة النصوص فقط.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">5. حماية البيانات</h2>
            <p>
              نطبق إجراءات أمنية تقنية وإدارية صارمة لحماية بياناتك من الوصول غير المصرح به أو التغيير أو الإفصاح. يتم تشفير البيانات أثناء النقل والتخزين.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">6. حقوق المستخدم</h2>
            <p>
              يحق للمريض أو مستخدم الخدمة في أي وقت طلب حذف بياناته الشخصية أو سجل المحادثات الخاص به من أنظمتنا عبر التواصل مع إدارة العيادة مباشرة.
            </p>
          </section>

          <section className="bg-gray-50 p-6 rounded-xl border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-2">اتصل بنا</h2>
            <p className="text-sm">
              إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يمكنك التواصل مع إدارة العيادة عبر القنوات الرسمية المتاحة في ملف التعريف الخاص بنا على واتساب.
            </p>
          </section>

          <div className="pt-8 border-t text-left" dir="ltr">
            <h2 className="text-xl font-bold text-gray-900 mb-4">English Summary</h2>
            <p className="text-sm text-gray-600 mb-2">
              Smart Clinic respects your privacy. We collect phone numbers and names solely for scheduling medical appointments via WhatsApp. Data is processed through Meta's Cloud API and secured Cloud storage. We do not sell your data. You may request data deletion at any time by contacting the clinic.
            </p>
          </div>

        </div>

        <div className="bg-gray-100 p-4 text-center text-xs text-gray-500">
          آخر تحديث: {new Date().toLocaleDateString('ar-EG')}
        </div>
      </div>
    </div>
  );
}
