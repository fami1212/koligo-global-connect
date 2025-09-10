import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Link, useNavigate } from 'react-router-dom';
import WhatsAppMessaging from '@/components/WhatsAppMessaging';

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();

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
              Messages
            </h1>
            <p className="text-muted-foreground mt-1">
              Communiquez avec vos partenaires de transport
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        <WhatsAppMessaging />
      </div>
    </div>
  );
}