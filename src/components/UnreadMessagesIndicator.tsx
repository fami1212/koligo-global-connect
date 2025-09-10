import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function UnreadMessagesIndicator() {
  const { user } = useAuth();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  useEffect(() => {
    if (!user) return;

    checkUnreadMessages();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('unread_messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        () => checkUnreadMessages()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const checkUnreadMessages = async () => {
    if (!user) return;

    try {
      // Get user's conversations
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`);

      if (!conversations || conversations.length === 0) {
        setHasUnreadMessages(false);
        return;
      }

      const conversationIds = conversations.map(c => c.id);

      // Check for unread messages
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
        .limit(1);

      setHasUnreadMessages(unreadMessages && unreadMessages.length > 0);
    } catch (error) {
      console.error('Error checking unread messages:', error);
    }
  };

  if (!hasUnreadMessages) {
    return (
      <MessageCircle className="h-5 w-5" />
    );
  }

  return (
    <div className="relative">
      <MessageCircle className="h-5 w-5" />
      <Badge 
        variant="destructive" 
        className="absolute -top-2 -right-2 h-4 w-4 p-0 flex items-center justify-center text-xs"
      >
        •
      </Badge>
    </div>
  );
}