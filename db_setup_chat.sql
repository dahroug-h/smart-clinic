-- Add bot_active boolean switch with default true
ALTER TABLE public.clinics 
ADD COLUMN IF NOT EXISTS bot_active BOOLEAN DEFAULT true;

-- Setup storage bucket for chat media (if not exists)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat_media', 'chat_media', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for public reading
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'chat_media' );

-- Policies for authenticated inserts
CREATE POLICY "Auth Insert" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'chat_media' AND auth.role() = 'authenticated' );

-- Enable Realtime for conversations table so the dashboard updates instantly
begin;
  -- remove the supabase_realtime publication
  drop publication if exists supabase_realtime;
  -- re-create the supabase_realtime publication with no tables
  create publication supabase_realtime;
commit;
-- add table to the publication
alter publication supabase_realtime add table public.conversations;
