import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/utils/supabase';

export async function POST(req: Request) {
  try {
    const { userId } = auth();
    if (!userId) return new NextResponse("Unauthorized", { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const clinicId = formData.get('clinicId') as string;

    if (!file || !clinicId) {
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

    if (!clinic) return new NextResponse("Forbidden", { status: 403 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileExt = file.name.split('.').pop();
    const fileName = `${clinicId}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat_media')
      .upload(fileName, buffer, {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('chat_media').getPublicUrl(fileName);

    return NextResponse.json({ success: true, url: data.publicUrl });
  } catch (err) {
    console.error("Chat Upload Error:", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
