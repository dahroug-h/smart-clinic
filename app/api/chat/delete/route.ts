import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { conversationId, clinicId, messageId } = await req.json();

    if (!clinicId || !conversationId || !messageId) {
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

    // Fetch conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, messages")
      .eq("id", conversationId)
      .single();

    if (!conversation) return new NextResponse("Conversation not found", { status: 404 });

    const history: any[] = conversation.messages || [];
    
    // Filter out the deleted message
    const updatedHistory = history.filter(msg => msg.id !== messageId);

    if (history.length === updatedHistory.length) {
      return new NextResponse("Message not found or already deleted", { status: 404 });
    }

    await supabase
      .from("conversations")
      .update({ messages: updatedHistory })
      .eq("id", conversationId);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Chat Delete Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
