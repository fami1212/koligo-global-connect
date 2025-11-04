import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url?: string;
  created_at: string;
  read_at?: string;
}

export function useRealtimeMessages(
  conversationId: string | null,
  onNewMessage: (message: Message) => void
) {
  const { toast } = useToast();

  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          onNewMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, onNewMessage]);
}

export function useRealtimeNotifications(
  userId: string | null,
  onNewNotification: (notification: any) => void
) {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new;
          onNewNotification(notification);
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification, toast]);
}

export function useRealtimeTracking(
  assignmentId: string | null,
  onNewTrackingEvent: (event: any) => void
) {
  useEffect(() => {
    if (!assignmentId) return;

    const channel = supabase
      .channel(`tracking:${assignmentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tracking_events',
          filter: `assignment_id=eq.${assignmentId}`,
        },
        (payload) => {
          onNewTrackingEvent(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [assignmentId, onNewTrackingEvent]);
}