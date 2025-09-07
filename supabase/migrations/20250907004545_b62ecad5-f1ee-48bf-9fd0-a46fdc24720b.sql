-- Add image upload support for messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS image_url text,
ADD COLUMN IF NOT EXISTS image_type text;

-- Update storage policy for message images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-images', 'message-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload message images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'message-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view message images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'message-images');

-- Add call support for tracking feature
CREATE TABLE IF NOT EXISTS call_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id uuid NOT NULL REFERENCES conversations(id),
  caller_id uuid NOT NULL,
  callee_id uuid NOT NULL,
  call_type text NOT NULL DEFAULT 'audio', -- 'audio' or 'video'
  status text NOT NULL DEFAULT 'initiated', -- 'initiated', 'accepted', 'declined', 'ended'
  duration_seconds integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone
);

-- Enable RLS on call_logs
ALTER TABLE call_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for call_logs
CREATE POLICY "Users can view their calls" 
ON call_logs 
FOR SELECT 
USING (caller_id = auth.uid() OR callee_id = auth.uid());

CREATE POLICY "Users can create calls" 
ON call_logs 
FOR INSERT 
WITH CHECK (caller_id = auth.uid());

CREATE POLICY "Users can update their calls" 
ON call_logs 
FOR UPDATE 
USING (caller_id = auth.uid() OR callee_id = auth.uid());