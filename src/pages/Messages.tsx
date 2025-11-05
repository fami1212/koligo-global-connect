import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import WhatsAppMessaging from '@/components/WhatsAppMessaging';

export default function Messages() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preSelectedConversationId = searchParams.get('c') || searchParams.get('conversationId') || undefined;

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {t('messages.title')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {t('messages.subtitle')}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              {t('common.back')}
            </Link>
          </Button>
        </div>

        <WhatsAppMessaging preSelectedConversationId={preSelectedConversationId} />
      </div>
    </div>
  );
}