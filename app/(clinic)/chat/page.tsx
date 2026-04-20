import { auth } from "@clerk/nextjs/server";
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import ChatInterface from "./ChatInterface";
import { redirect } from "next/navigation";

export default async function ChatPage() {
  const { userId } = auth();
  if (!userId) redirect("/sign-in");

  const supabase = createServerSupabaseClient();

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, bot_active")
    .eq("clerk_user_id", userId)
    .single();

  if (!clinic) redirect("/dashboard");

  // Auto-cleanup: delete test conversations older than 24 hours
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: expiredTests } = await supabase
    .from("conversations")
    .select("id, patient_phone")
    .eq("clinic_id", clinic.id)
    .like("patient_phone", "test_%")
    .lt("last_message_at", twentyFourHoursAgo);

  if (expiredTests && expiredTests.length > 0) {
    const expiredIds = expiredTests.map(c => c.id);
    const expiredPhones = expiredTests.map(c => c.patient_phone);
    await supabase.from("conversations").delete().in("id", expiredIds);
    await supabase.from("patients").delete().eq("clinic_id", clinic.id).in("phone", expiredPhones);
    await supabase.from("appointments").delete().eq("clinic_id", clinic.id).in("patient_phone", expiredPhones);
  }

  // Fetch all conversations for this clinic
  const { data: conversations } = await supabase
    .from("conversations")
    .select("*")
    .eq("clinic_id", clinic.id)
    .order("last_message_at", { ascending: false });

  // Fetch all patients for name mapping
  const { data: patients } = await supabase
    .from("patients")
    .select("id, phone, name")
    .eq("clinic_id", clinic.id);

  return (
    <div className="absolute inset-0">
      <ChatInterface 
        clinicId={clinic.id} 
        initialBotActive={clinic.bot_active !== false} 
        initialConversations={conversations || []} 
        patients={patients || []} 
      />
    </div>
  );
}
