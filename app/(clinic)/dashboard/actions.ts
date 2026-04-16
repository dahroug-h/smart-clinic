"use server"
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import { revalidatePath } from "next/cache";

export async function deleteAppointment(appointmentId: string) {
  const supabase = createServerSupabaseClient();
  
  const { error } = await supabase
    .from("appointments")
    .delete()
    .eq("id", appointmentId);
    
  if (error) {
    console.error("Delete appointment error:", error);
    throw new Error(error.message);
  }

  revalidatePath("/dashboard");
}
