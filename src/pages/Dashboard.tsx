import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Star, MapPin, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VerificationStatusCard } from '@/components/VerificationStatusCard';

interface DashboardStats {
  activeShipments: number;
  activeTrips: number;
  completedDeliveries: number;
  totalEarnings: number;
}

interface VerificationStatus {
  is_verified: boolean;
  verification_requested_at: string | null;
  has_kyc_documents: boolean;
}

export default function Dashboard() {
  const { user, profile, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeShipments: 0,
    activeTrips: 0,
    completedDeliveries: 0,
    totalEarnings: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);

  useEffect(() => {
    if (user) {
      loadDashboardData();
      loadVerificationStatus();
    }
  }, [user]);

  const loadVerificationStatus = async () => {
    if (!user) return;
    
    try {
      const profileData = profile as any;
      
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('id')
        .eq('user_id', user.id)
        .limit(1);

      setVerificationStatus({
        is_verified: profileData?.is_verified || false,
        verification_requested_at: profileData?.verification_requested_at,
        has_kyc_documents: (kycDocs?.length || 0) > 0
      });
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      // Load shipments for senders
      const { data: shipments } = await supabase
        .from('shipments')
        .select('*')
        .eq('sender_id', user.id)
        .in('status', ['pending', 'accepted', 'in_transit']);

      // Load trips for travelers
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('traveler_id', user.id)
        .eq('is_active', true);

      // Load completed assignments for earnings
      const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .eq('payment_status', 'released');

      const totalEarnings = assignments
        ?.filter(a => a.traveler_id === user.id)
        ?.reduce((sum, a) => sum + (a.traveler_amount || 0), 0) || 0;

      setStats({
        activeShipments: shipments?.length || 0,
        activeTrips: trips?.length || 0,
        completedDeliveries: assignments?.length || 0,
        totalEarnings
      });

      // Recent activity (simplified)
      setRecentActivity([
        ...(shipments?.slice(0, 3).map(s => ({
          type: 'shipment',
          title: s.title,
          status: s.status,
          date: s.created_at
        })) || []),
        ...(trips?.slice(0, 3).map(t => ({
          type: 'trip',
          title: `${t.departure_city} → ${t.arrival_city}`,
          status: t.is_active ? 'active' : 'inactive',
          date: t.created_at
        })) || [])
      ]);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            Bonjour {profile?.first_name || 'utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Voici un aperçu de votre activité sur la plateforme
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <Star className="h-4 w-4 fill-warning text-warning" />
            <span className="font-semibold">{profile?.rating?.toFixed(1) || '0.0'}</span>
          </Badge>
          {(profile as any)?.is_verified && (
            <Badge className="gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700">
              <Shield className="h-4 w-4" />
              Vérifié
            </Badge>
          )}
        </div>
      </div>

      {/* Verification Status Card */}
      {verificationStatus && (
        <VerificationStatusCard
          isVerified={verificationStatus.is_verified}
          verificationRequestedAt={verificationStatus.verification_requested_at}
          hasKYCDocuments={verificationStatus.has_kyc_documents}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Colis actifs
            </CardTitle>
            <div className="text-2xl font-bold text-primary">
              {stats.activeShipments}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-accent">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trajets actifs
            </CardTitle>
            <div className="text-2xl font-bold text-accent">
              {stats.activeTrips}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-success">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Livraisons terminées
            </CardTitle>
            <div className="text-2xl font-bold text-success">
              {stats.completedDeliveries}
            </div>
          </CardHeader>
        </Card>

        <Card className="border-l-4 border-l-warning">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gains totaux
            </CardTitle>
            <div className="text-2xl font-bold text-warning">
              €{stats.totalEarnings.toFixed(2)}
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasRole('sender') && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Envoyer un colis
              </CardTitle>
              <CardDescription>
                Créez une demande de livraison pour votre colis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="default" className="w-full">
                <Link to="/sender/create-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau colis
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {hasRole('traveler') && (
          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-accent" />
                Proposer un trajet
              </CardTitle>
              <CardDescription>
                Publiez votre trajet pour transporter des colis
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="secondary" className="w-full">
                <Link to="/traveler/create-trip">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau trajet
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* If user has no roles yet, show both options */}
        {!hasRole('sender') && !hasRole('traveler') && (
          <>
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Envoyer un colis
                </CardTitle>
                <CardDescription>
                  Créez une demande de livraison pour votre colis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="default" className="w-full">
                  <Link to="/sender/create-shipment">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau colis
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-accent" />
                  Proposer un trajet
                </CardTitle>
                <CardDescription>
                  Publiez votre trajet pour transporter des colis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="secondary" className="w-full">
                  <Link to="/traveler/create-trip">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau trajet
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activité récente</CardTitle>
          <CardDescription>
            Vos dernières actions sur la plateforme
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {activity.type === 'shipment' ? (
                      <Package className="h-4 w-4 text-primary" />
                    ) : (
                      <Truck className="h-4 w-4 text-accent" />
                    )}
                    <div>
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(activity.date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                  <Badge variant={activity.status === 'pending' ? 'secondary' : 'default'}>
                    {activity.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune activité récente</p>
              <p className="text-sm">Commencez par créer un colis ou un trajet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}