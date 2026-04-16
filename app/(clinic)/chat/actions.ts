"use server"
import { createServerSupabaseClient } from "@/lib/utils/supabase";

export async function toggleBotActive(clinicId: string, botActive: boolean) {
  const supabase = createServerSupabaseClient();
  const { error } = await supabase.from("clinics").update({ bot_active: botActive }).eq("id", clinicId);
  if (error) throw new Error(error.message);
  return { success: true };
}
