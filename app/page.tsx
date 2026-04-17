import Link from "next/link";
import { Monitor } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--background)]">
      
      <div className="block md:hidden w-full max-w-md mb-8 p-4 bg-[var(--accent)]/5 border border-[var(--accent)]/20 rounded-2xl text-[var(--accent)] shadow-sm">
        <div className="flex items-center justify-center gap-2 font-bold text-sm mb-1">
          <Monitor className="w-4 h-4" />
          <span>لأداء مثالي استخدم الكمبيوتر</span>
        </div>
        <p className="text-xs opacity-80 mt-1">
          للحصول على أفضل تجربة لإدارة وإعداد عيادتك، يُنصح باستخدام شاشة كمبيوتر (Desktop)
        </p>
      </div>

      <h1 className="text-4xl font-bold mb-4 tracking-tight">Smart Clinic</h1>
      <p className="text-lg text-muted-foreground mb-8 max-w-lg">
        مساعدك الذكي على واتساب لإدارة حجوزات عيادتك والرد على مرضاك بكل سهولة
      </p>
      <div className="flex flex-col gap-4">
        <Link
          href="/sign-in"
          className="bg-[var(--accent)] text-white text-lg font-medium px-10 py-3.5 rounded-full hover:opacity-90 transition-opacity shadow-sm"
        >
          تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
