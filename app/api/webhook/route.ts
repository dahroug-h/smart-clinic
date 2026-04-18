import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/utils/supabase';

// In-memory idempotency lock prevents Meta from retrying while AI thinks
const processedMessages = new Set<string>();

// GET: Verify Webhook from Meta WhatsApp
export async function GET(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse('Forbidden', { status: 403 });
}

// POST: Receive Incoming Message
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[WEBHOOK] Received Meta POST Request:", JSON.stringify(body, null, 2));

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];
        const msgId = msg.id;

        // Idempotency: Block duplicate processing exactly here
        if (msgId && processedMessages.has(msgId)) {
           console.log(`[WEBHOOK-IDEMPOTENCY] Caught Meta retry for ${msgId}. Dropping duplicate...`);
           return NextResponse.json({ success: true });
        }
        if (msgId) processedMessages.add(msgId);
        if (processedMessages.size > 1000) processedMessages.clear();
        
        // Only process text messages, ignore others (audio, image, etc)
        if (msg.type !== 'text') {
           return NextResponse.json({ success: true });
        }

        const phone_number_id = value.metadata.phone_number_id;
        console.log(`[WEBHOOK] Searching for clinic with Phone Number ID: ${phone_number_id}`);
        
        // Find clinic via supabase using admin key (bypasses RLS)
        const supabase = createAdminSupabaseClient();
        const { data: clinic } = await supabase
           .from("clinics")
           .select("id, subscription_status, trial_conversations_used, trial_conversations_limit")
           .eq("whatsapp_phone_id", phone_number_id)
           .single();

        // If no matching clinic found, just ignore
        if (!clinic) {
           console.log(`[WEBHOOK] ERROR: No clinic found matching phone_number_id ${phone_number_id} in Supabase! ignoring message.`);
           return NextResponse.json({ success: true });
        }

        console.log(`[WEBHOOK] Found clinic:`, clinic.id);

        // Check subscription limits
        if (clinic.subscription_status === 'inactive') {
          return NextResponse.json({ success: true });
        }
        if (clinic.subscription_status === 'trial' && clinic.trial_conversations_used >= clinic.trial_conversations_limit) {
           return NextResponse.json({ success: true });
        }

        const traceId = Math.random().toString(36).substring(7);
        console.log(`[WEBHOOK] [TRACE:${traceId}] Triggering Edge Function /process-message for message: ${msg.text.body}`);
        
        // Await the fetch to completely prevent Node's internal disjointed socket retry bug 
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-message`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
             'X-Webhook-Trace-Id': traceId
           },
           body: JSON.stringify({
             clinic_id: clinic.id,
             patient_phone: msg.from,
             message_text: msg.text.body,
             meta_message_id: msg.id
           })
        });

      } else {
        console.log("[WEBHOOK] No messages array found in changes.");
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[WEBHOOK] Fatal Error processing POST:", err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
