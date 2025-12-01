import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileCheck, 
  MapPin, 
  MessageSquare, 
  AlertCircle,
  ArrowLeft 
} from 'lucide-react';
import AdminKYC from './AdminKYC';
import AdminMessaging from '@/components/AdminMessaging';
import ModernAdmin from './ModernAdmin';

type AdminView = 'kyc' | 'users' | 'trips' | 'messaging' | 'reports';

export default function AdminDashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<AdminView>('kyc');

  if (!user || !hasRole('admin')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-center mb-2">Accès non autorisé</h2>
            <p className="text-muted-foreground text-center mb-4">
              Vous devez être administrateur pour accéder à cette page.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="w-full">
              Retour au tableau de bord
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const menuItems = [
    { id: 'kyc' as AdminView, label: 'KYC', icon: FileCheck },
    { id: 'users' as AdminView, label: 'Utilisateurs', icon: Users },
    { id: 'trips' as AdminView, label: 'Trajets', icon: MapPin },
    { id: 'messaging' as AdminView, label: 'Messagerie', icon: MessageSquare },
    { id: 'reports' as AdminView, label: 'Signalements', icon: AlertCircle },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion centralisée de la plateforme
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Content */}
        <div className="mb-20 md:mb-0">
          {currentView === 'kyc' && <AdminKYC />}
          {currentView === 'messaging' && <AdminMessaging />}
          {(currentView === 'users' || currentView === 'trips' || currentView === 'reports') && (
            <ModernAdmin />
          )}
        </div>

        {/* Bottom Menu - Fixed for mobile, regular for desktop */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t shadow-lg z-50 md:static md:mt-8 md:border md:rounded-lg">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-around md:justify-center md:gap-4 py-3">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentView === item.id ? 'default' : 'ghost'}
                  className="flex-col h-auto py-2 px-3 md:flex-row md:h-10"
                  onClick={() => setCurrentView(item.id)}
                >
                  <item.icon className="h-5 w-5 md:mr-2" />
                  <span className="text-xs mt-1 md:text-sm md:mt-0">{item.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
