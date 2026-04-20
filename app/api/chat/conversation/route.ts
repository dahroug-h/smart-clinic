import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/utils/supabase';

export async function DELETE(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { clinicId, conversationId } = await req.json();
    if (!clinicId || !conversationId) {
      return new NextResponse("Bad Request: Missing fields", { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id")
      .eq("clerk_user_id", userId)
      .eq("id", clinicId)
      .single();

    if (!clinic) return new NextResponse("Forbidden: Clinic not found", { status: 403 });

    // Get conversation to find patient_phone for cleanup
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, patient_phone")
      .eq("id", conversationId)
      .eq("clinic_id", clinicId)
      .single();

    if (!conversation) return new NextResponse("Conversation not found", { status: 404 });

    // Delete the conversation
    await supabase.from("conversations").delete().eq("id", conversationId);

    // If it's a test conversation, also clean up the test patient and any test appointments
    if (conversation.patient_phone.startsWith("test_")) {
      await supabase.from("patients").delete().eq("clinic_id", clinicId).eq("phone", conversation.patient_phone);
      await supabase.from("appointments").delete().eq("clinic_id", clinicId).eq("patient_phone", conversation.patient_phone);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete Conversation Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
