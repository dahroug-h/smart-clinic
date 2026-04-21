import React from 'react';

export const metadata = {
  title: "شروط الخدمة | Smart Clinic",
  description: "شروط وأحكام استخدام منصة Smart Clinic وخدمة المساعد الذكي",
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans" dir="rtl">
      <div className="max-w-3xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-gray-100">
        <div className="bg-[#1e293b] p-8 text-white text-center">
          <h1 className="text-3xl font-extrabold mb-2">شروط الخدمة</h1>
          <p className="opacity-90">Terms of Service</p>
        </div>
        
        <div className="p-8 space-y-8 text-gray-700 leading-relaxed text-right">
          
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">1. قبول الشروط</h2>
            <p>
              باستخدامك لمنصة <strong>Smart Clinic</strong> أو المساعد الذكي التابع لها عبر واتساب، فإنك توافق على الالتزام بهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام الخدمة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">2. وصف الخدمة</h2>
            <p>
              Smart Clinic هي منصة رقمية توفر مصف مراجعة ذكي عبر واتساب لمساعدة العيادات في تنظيم المواعيد والرد على استفسارات المرضى. المنصة تعمل كوسيط تقني ولا تقدم استشارات طبية مباشرة.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">3. مسؤولية العيادة</h2>
            <ul className="list-disc list-inside mt-3 space-y-2 mr-4">
              <li>العيادة مسؤولة عن دقة المعلومات المقدمة للمرضى عبر البوت.</li>
              <li>العيادة مسؤولة عن متابعة المواعيد المحجوزة والتحقق منها.</li>
              <li>يجب على العيادة الالتزام بسياسات WhatsApp Business التجارية.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">4. استخدام الذكاء الاصطناعي</h2>
            <p>
              تعتمد خدمتنا على نماذج الذكاء الاصطناعي لمعالجة النصوص. رغم دقة البوت، قد تحدث أخطاء برمجية أو لغوية أحياناً. لذا، يجب اعتبار ردود البوت كأداة مساعدة وليست بديلاً عن التفاعل البشري الرسمي عند الضرورة القصوى.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">5. الملكية الفكرية</h2>
            <p>
              جميع حقوق الملكية الفكرية الخاصة بالمنصة، بما في ذلك التصاميم، الأكواد، والنصوص هي ملك حصري لـ Smart Clinic. لا يجوز إعادة إنتاجها أو استغلالها دون إذن مسبق.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">6. إخلاء المسؤولية</h2>
            <p>
              لا تتحمل Smart Clinic مسؤولية أي ضرر مباشر أو غير مباشر ينتج عن سوء استخدام الخدمة أو انقطاعها لأسباب تقنية خارجة عن إرادتنا (مثل انقطاع خدمات شركة Meta أو مزودي الطاقة).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b pb-2">7. تعديل الشروط</h2>
            <p>
              نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سيتم اعتبار استمرارك في استخدام الخدمة بعد نشر التعديلات بمثابة موافقة منك عليها.
            </p>
          </section>

          <div className="pt-8 border-t text-left" dir="ltr">
            <h2 className="text-xl font-bold text-gray-900 mb-4">English Version Summary</h2>
            <p className="text-sm text-gray-600 mb-2">
              By using Smart Clinic, you agree to these terms. Our service is a technical tool for appointment scheduling and automated patient responses. We are not a medical service provider. Users must comply with WhatsApp Business policies. Smart Clinic is not liable for errors caused by AI misinterpretation or external API downtimes.
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
