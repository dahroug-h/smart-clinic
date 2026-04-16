import { NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/utils/supabase';

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

    if (body.object === "whatsapp_business_account") {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (messages && messages.length > 0) {
        const msg = messages[0];
        
        // Only process text messages, ignore others (audio, image, etc)
        if (msg.type !== 'text') {
           return NextResponse.json({ success: true });
        }

        const phone_number_id = value.metadata.phone_number_id;
        
        // Find clinic via supabase using admin key (bypasses RLS)
        const supabase = createAdminSupabaseClient();
        const { data: clinic } = await supabase
           .from("clinics")
           .select("id, subscription_status, trial_conversations_used, trial_conversations_limit")
           .eq("whatsapp_phone_id", phone_number_id)
           .single();

        // If no matching clinic found, just ignore
        if (!clinic) return NextResponse.json({ success: true });

        // Check subscription limits
        if (clinic.subscription_status === 'inactive') {
          return NextResponse.json({ success: true });
        }
        if (clinic.subscription_status === 'trial' && clinic.trial_conversations_used >= clinic.trial_conversations_limit) {
           return NextResponse.json({ success: true });
        }

        // Trigger Edge Function asynchronously (do not await, Meta requires 200 OK within 3 seconds)
        // We use process.env.EDGE_FUNCTION_SECRET if you added it, but here we just call the function directly
        fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-message`, {
           method: 'POST',
           headers: {
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
           },
           body: JSON.stringify({
             clinic_id: clinic.id,
             patient_phone: msg.from,
             message_text: msg.text.body
           })
        }).catch(err => console.error("Edge function trigger failed", err));

      }
    }
    
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
