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

  const clinicName = formData.get("clinic_name") as string;
  if (clinicName && clinicName.trim() !== "") {
    await supabase.from("clinics").update({ clinic_name: clinicName.trim() }).eq("id", clinicId);
  }

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

  const phoneId = (formData.get("whatsapp_phone_id") as string || "").trim();
  const phoneNumber = (formData.get("whatsapp_number") as string || "").trim();

  if (phoneId && !/^\d+$/.test(phoneId)) {
    return { error: "Phone Number ID يجب أن يحتوي على أرقام فقط بدون مسافات أو حروف" };
  }

  if (phoneNumber && !/^\+?\d{10,15}$/.test(phoneNumber)) {
    return { error: "رقم الواتساب غير صالح، يجب أن يحتوي على أرقام فقط (علامة + مسموحة في البداية)" };
  }

  // Duplicate Check for Phone Number ID
  if (phoneId) {
    const { data: existingId } = await supabase
      .from("clinics")
      .select("id")
      .eq("whatsapp_phone_id", phoneId)
      .neq("id", clinicId)
      .single();

    if (existingId) {
      return { error: "هذا الـ Phone Number ID مستخدم بالفعل لعيادة أخرى" };
    }
  }

  // Duplicate Check for WhatsApp Number
  if (phoneNumber) {
    const { data: existingNum } = await supabase
      .from("clinics")
      .select("id")
      .eq("whatsapp_number", phoneNumber)
      .neq("id", clinicId)
      .single();

    if (existingNum) {
      return { error: "رقم الواتساب هذا تم ربطه بعيادة أخرى مسبقاً" };
    }
  }

  const data: any = {
    whatsapp_phone_id: phoneId,
    whatsapp_number: phoneNumber,
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
    return { error: "فشل حفظ البيانات. قد يكون هناك مشكلة في الاتصال بقاعدة البيانات." };
  }
  
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}
