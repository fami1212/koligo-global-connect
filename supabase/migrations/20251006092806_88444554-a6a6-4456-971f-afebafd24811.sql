-- Fix shipment deletion failing due to FK constraints by adjusting cascades and permissions

-- 1) Make call_logs depend on conversations with ON DELETE CASCADE
ALTER TABLE public.call_logs
DROP CONSTRAINT IF EXISTS call_logs_conversation_id_fkey;
ALTER TABLE public.call_logs
ADD CONSTRAINT call_logs_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 2) Ensure messages are removed when a conversation is deleted (safety)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'messages_conversation_id_fkey'
      AND table_schema = 'public'
      AND table_name = 'messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.messages DROP CONSTRAINT messages_conversation_id_fkey';
  END IF;
END $$;

ALTER TABLE public.messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;

-- 3) Prevent cascade-deleting conversations when an assignment is deleted; nullify the link instead
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'conversations_assignment_id_fkey' 
      AND table_schema = 'public'
      AND table_name = 'conversations'
  ) THEN
    EXECUTE 'ALTER TABLE public.conversations DROP CONSTRAINT conversations_assignment_id_fkey';
  END IF;
END $$;

ALTER TABLE public.conversations
ADD CONSTRAINT conversations_assignment_id_fkey
FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE SET NULL;

-- 4) Allow authenticated users to create conversations when they are a participant
-- (Some projects already have a permissive INSERT policy named "Service can create conversations"; this one ensures proper restriction)
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_id OR auth.uid() = traveler_id);
