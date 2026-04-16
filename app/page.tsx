import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-[var(--background)]">
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
