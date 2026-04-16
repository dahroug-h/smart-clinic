import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import SettingsForm from "./SettingsForm";
import WhatsAppSettingsForm from "./WhatsAppSettingsForm";

export default async function SettingsPage() {
  const { userId } = auth();
  if (!userId) return null;

  const supabase = createServerSupabaseClient();
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, clinic_name, whatsapp_phone_id, whatsapp_number, whatsapp_access_token")
    .eq("clerk_user_id", userId)
    .single();

  if (!clinic) return null;

  const { data: content } = await supabase
    .from("clinic_content")
    .select("*")
    .eq("clinic_id", clinic.id)
    .single();

  const hasCredentials = !!clinic.whatsapp_access_token;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">إعدادات العيادة والبوت</h1>
        <p className="text-[var(--accent)] font-medium text-sm">
          لا تنس الضغط على زر "حفظ إعدادات البوت" بعد انتهاء التعديل
        </p>
      </div>
      <SettingsForm clinicId={clinic.id} clinicName={clinic.clinic_name} initialContent={content || {}} />
      <WhatsAppSettingsForm
        clinicId={clinic.id}
        whatsappPhoneId={clinic.whatsapp_phone_id}
        whatsappNumber={clinic.whatsapp_number}
        hasCredentials={hasCredentials}
      />
    </div>
  );
}
