import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const { conversationId, clinicId, patientPhone, messageText, mediaUrl } = await req.json();

    if (!clinicId || !patientPhone || (!messageText && !mediaUrl)) {
      return new NextResponse("Bad Request: Missing fields", { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    // Verify ownership
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, whatsapp_phone_id, whatsapp_access_token")
      .eq("clerk_user_id", userId)
      .eq("id", clinicId)
      .single();

    if (!clinic) return new NextResponse("Forbidden: Clinic not found", { status: 403 });

    // Send via Meta Graph API
    let metaPayload: any = {
      messaging_product: "whatsapp",
      to: patientPhone,
    };

    if (mediaUrl) {
      metaPayload.type = "image";
      metaPayload.image = {
        link: mediaUrl,
        caption: messageText || "",
      };
    } else {
      metaPayload.type = "text";
      metaPayload.text = { body: messageText };
    }

    if (clinic.whatsapp_phone_id && clinic.whatsapp_access_token) {
      const waRes = await fetch(`https://graph.facebook.com/v18.0/${clinic.whatsapp_phone_id}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clinic.whatsapp_access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(metaPayload)
      });

      if (!waRes.ok) {
        const errorData = await waRes.json();
        console.error("WhatsApp API Error:", errorData);
        return new NextResponse(JSON.stringify({ error: "Failed to send WhatsApp message" }), { status: 500 });
      }
    }

    // Append to conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .select("id, messages")
      .eq("id", conversationId)
      .single();

    if (!conversation) return new NextResponse("Conversation not found", { status: 404 });

    const history = conversation.messages || [];
    
    // Add unique ID for deletion tracking later
    const newMessage = {
      id: crypto.randomUUID(),
      role: 'agent',
      type: mediaUrl ? 'image' : 'text',
      content: messageText || "",
      media_url: mediaUrl || null,
      created_at: new Date().toISOString()
    };

    history.push(newMessage);

    await supabase
      .from("conversations")
      .update({ messages: history, last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    return NextResponse.json({ success: true, message: newMessage });
  } catch (err) {
    console.error("Chat Send Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
