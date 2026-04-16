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
