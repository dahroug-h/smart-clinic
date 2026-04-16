"use server"
import { createServerSupabaseClient } from "@/lib/utils/supabase";
import { revalidatePath } from "next/cache";

export async function saveSettings(clinicId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();

  const data = {
    clinic_id: clinicId,
    clinic_info: formData.get("clinic_info"),
    availability_text: formData.get("availability_text"),
    bot_persona: formData.get("bot_persona"),
    custom_instructions: formData.get("custom_instructions"),
    booking_fields: formData.get("booking_fields"),
    appointment_duration_minutes: parseInt(formData.get("appointment_duration_minutes") as string || "30"),
    cancellation_allowed: formData.get("cancellation_allowed") === "true",
  };

  // Check if content exists
  const { data: existing } = await supabase
    .from("clinic_content")
    .select("id")
    .eq("clinic_id", clinicId)
    .single();

  let error;
  if (existing) {
    const { error: updateError } = await supabase
      .from("clinic_content")
      .update(data)
      .eq("clinic_id", clinicId);
    error = updateError;
  } else {
    const { error: insertError } = await supabase
      .from("clinic_content")
      .insert(data);
    error = insertError;
  }

  if (error) {
    console.error("Save settings error", error);
    throw new Error(error.message);
  }
  
  revalidatePath("/settings");
  return { success: true };
}

export async function saveWhatsAppSettings(clinicId: string, formData: FormData) {
  const supabase = createServerSupabaseClient();

  const data: any = {
    whatsapp_phone_id: formData.get("whatsapp_phone_id"),
    whatsapp_number: formData.get("whatsapp_number"),
  };

  const token = formData.get("whatsapp_access_token") as string;
  if (token && token.trim() !== "") {
    data.whatsapp_access_token = token.trim();
  }

  const { error } = await supabase
    .from("clinics")
    .update(data)
    .eq("id", clinicId);

  if (error) {
    console.error("Save WhatsApp settings error", error);
    throw new Error(error.message);
  }
  
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
