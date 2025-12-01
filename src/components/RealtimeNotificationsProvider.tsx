import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  created_at: string;
  user_id: string;
}

export function RealtimeNotificationsProvider() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [soundEnabled] = useState(true);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notification = payload.new as Notification;
          
          // Play notification sound
          if (soundEnabled) {
            const audio = new Audio('/notification.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {
              // Silently fail if sound can't play
            });
          }

          // Get icon based on notification type
          const getIcon = () => {
            switch (notification.type) {
              case 'success':
                return CheckCircle;
              case 'error':
                return AlertCircle;
              case 'warning':
                return AlertTriangle;
              default:
                return Info;
            }
          };

          const Icon = getIcon();

          // Show rich toast notification
          toast({
            title: notification.title,
            description: notification.message,
            action: notification.link ? (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => navigate(notification.link!)}
              >
                Voir
              </Button>
            ) : undefined,
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast, navigate, soundEnabled]);

  return null;
}
