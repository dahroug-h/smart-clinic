import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { clinicId, patientPhone, messageText } = await req.json();
    if (!clinicId) return new NextResponse("Bad Request", { status: 400 });

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("clerk_user_id", userId)
      .eq("id", clinicId)
      .single();

    if (!clinic) return new NextResponse("Forbidden", { status: 403 });

    // ─── MODE 1: Create new test conversation ───
    if (!messageText) {
      const testPhone = `test_${Math.random().toString(36).substring(2, 10)}`;

      // Create test patient
      await supabase.from("patients").insert({
        clinic_id: clinicId,
        phone: testPhone,
        name: "عميل تجريبي 🧪"
      });

      // Create test conversation
      const { data: conv, error } = await supabase
        .from("conversations")
        .insert({
          clinic_id: clinicId,
          patient_phone: testPhone,
          messages: []
        })
        .select()
        .single();

      if (error || !conv) {
        console.error("Failed to create test conversation:", error);
        return new NextResponse("Failed to create test conversation", { status: 500 });
      }

      return NextResponse.json({ conversationId: conv.id, patientPhone: testPhone });
    }

    // ─── MODE 2: Send test message through the real Edge Function ───
    if (!patientPhone) return new NextResponse("Bad Request: Missing patientPhone", { status: 400 });

    const testMetaId = `test_${crypto.randomUUID()}`;

    // Call the exact same Edge Function that real WhatsApp webhook calls
    const edgeRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        clinic_id: clinicId,
        patient_phone: patientPhone,
        message_text: messageText,
        meta_message_id: testMetaId
      })
    });

    if (!edgeRes.ok) {
      const errText = await edgeRes.text();
      console.error("Test chat edge function error:", errText);
      return NextResponse.json(
        { error: "فشل معالجة الرسالة. تأكد من إعدادات البوت في صفحة الإعدادات." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Test Chat Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
