import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Star, MapPin, TrendingUp, Clock, CheckCircle, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VerificationBanner } from '@/components/VerificationBanner';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardStats {
  activeShipments: number;
  activeTrips: number;
  completedDeliveries: number;
  totalEarnings: number;
  pendingRequests: number;
}

export default function ModernDashboard() {
  const { user, profile, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeShipments: 0,
    activeTrips: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    pendingRequests: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);

      const { data: shipments } = await supabase
        .from('shipments')
        .select('*')
        .eq('sender_id', user.id);

      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('traveler_id', user.id);

      const { data: assignments } = await supabase
        .from('assignments')
        .select('*')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`);

      const { data: matchRequests } = await supabase
        .from('match_requests')
        .select('*')
        .eq('traveler_id', user.id)
        .eq('status', 'pending');

      const activeShipments = shipments?.filter(s => ['pending', 'accepted', 'in_transit'].includes(s.status)).length || 0;
      const activeTrips = trips?.filter(t => t.is_active).length || 0;
      const completedDeliveries = assignments?.filter(a => a.payment_status === 'released').length || 0;
      const totalEarnings = assignments
        ?.filter(a => a.traveler_id === user.id && a.payment_status === 'released')
        ?.reduce((sum, a) => sum + (a.traveler_amount || 0), 0) || 0;
      const pendingRequests = matchRequests?.length || 0;

      setStats({ activeShipments, activeTrips, completedDeliveries, totalEarnings, pendingRequests });
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const isTraveler = hasRole('traveler');
  const isSender = hasRole('sender');

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 pb-20 md:pb-8">
      <VerificationBanner />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bonjour {profile?.first_name || 'utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground text-sm">Votre activité GP Connect</p>
        </div>
        <Badge variant="secondary" className="gap-1">
          <Star className="h-3 w-3 fill-warning text-warning" />
          {profile?.rating?.toFixed(1) || '0.0'}
        </Badge>
      </div>

      {/* Stats - Simplified */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardHeader className="pb-3"><Skeleton className="h-8 w-16" /></CardHeader></Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {isSender && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader className="pb-2">
                <Package className="h-5 w-5 text-primary" />
                <p className="text-xs text-muted-foreground">Colis actifs</p>
                <p className="text-2xl font-bold text-primary">{stats.activeShipments}</p>
              </CardHeader>
            </Card>
          )}

          {isTraveler && (
            <>
              <Card className="border-l-4 border-l-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Truck className="h-5 w-5 text-accent" />
                    {stats.pendingRequests > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                        {stats.pendingRequests}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Trajets actifs</p>
                  <p className="text-2xl font-bold text-accent">{stats.activeTrips}</p>
                </CardHeader>
              </Card>

              <Card className="border-l-4 border-l-warning">
                <CardHeader className="pb-2">
                  <TrendingUp className="h-5 w-5 text-warning" />
                  <p className="text-xs text-muted-foreground">Gains totaux</p>
                  <p className="text-2xl font-bold text-warning">€{stats.totalEarnings.toFixed(0)}</p>
                </CardHeader>
              </Card>
            </>
          )}

          <Card className="border-l-4 border-l-success">
            <CardHeader className="pb-2">
              <CheckCircle className="h-5 w-5 text-success" />
              <p className="text-xs text-muted-foreground">Livraisons</p>
              <p className="text-2xl font-bold text-success">{stats.completedDeliveries}</p>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Quick Actions - Simplified */}
      <div className="space-y-4">
        <h2 className="font-semibold">Actions rapides</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Sender Action */}
          {isSender && (
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Package className="h-5 w-5 text-primary" />
                  Envoyer un colis
                </CardTitle>
                <CardDescription className="text-xs">
                  Trouvez un GP pour votre envoi
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild size="sm" className="flex-1">
                  <Link to="/search-trips">
                    <MapPin className="h-4 w-4 mr-2" />
                    Chercher un trajet
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Traveler Action */}
          {isTraveler && (
            <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-5 w-5 text-accent" />
                  Proposer un trajet
                </CardTitle>
                <CardDescription className="text-xs">
                  Publiez votre prochain trajet
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-2">
                <Button asChild variant="secondary" size="sm" className="flex-1">
                  <Link to="/traveler/create-trip">
                    <Plus className="h-4 w-4 mr-2" />
                    Nouveau trajet
                  </Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link to="/my-trips"><Eye className="h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Common - Reservations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Réservations
              </CardTitle>
              <CardDescription className="text-xs">
                {isTraveler ? 'Demandes reçues' : 'Vos demandes en cours'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/reservations">
                  Voir les réservations
                  {stats.pendingRequests > 0 && (
                    <Badge variant="destructive" className="ml-2">{stats.pendingRequests}</Badge>
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Tracking */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-5 w-5 text-success" />
                Suivi en temps réel
              </CardTitle>
              <CardDescription className="text-xs">
                Suivez vos livraisons actives
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link to="/tracking">Ouvrir le suivi</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
