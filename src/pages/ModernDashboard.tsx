import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Truck, Plus, Star, MapPin, Calendar, TrendingUp, Clock, CheckCircle, AlertCircle, Eye, Send } from 'lucide-react';
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
  pendingOffers: number;
  pendingRequests: number;
}

interface Activity {
  id: string;
  type: 'shipment' | 'trip' | 'assignment' | 'offer';
  title: string;
  subtitle: string;
  status: string;
  date: string;
  action?: {
    label: string;
    link: string;
  };
}

export default function ModernDashboard() {
  const { user, profile, hasRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    activeShipments: 0,
    activeTrips: 0,
    completedDeliveries: 0,
    totalEarnings: 0,
    pendingOffers: 0,
    pendingRequests: 0
  });
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user]);

  const loadDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load shipments for senders
      const { data: shipments } = await supabase
        .from('shipments')
        .select('*')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false });

      // Load trips for travelers
      const { data: trips } = await supabase
        .from('trips')
        .select('*')
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false });

      // Load assignments
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          shipment:shipments(*),
          trip:trips(*)
        `)
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Load offers (for travelers)
      const { data: offers } = await supabase
        .from('offers')
        .select('*')
        .or(`traveler_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      // Load match requests (for senders)
      const { data: matchRequests } = await supabase
        .from('match_requests')
        .select('*')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      const activeShipments = shipments?.filter(s => ['pending', 'accepted', 'in_transit'].includes(s.status)).length || 0;
      const activeTrips = trips?.filter(t => t.is_active).length || 0;
      const completedAssignments = assignments?.filter(a => a.payment_status === 'released').length || 0;
      
      const totalEarnings = assignments
        ?.filter(a => a.traveler_id === user.id && a.payment_status === 'released')
        ?.reduce((sum, a) => sum + (a.traveler_amount || 0), 0) || 0;

      const pendingOffers = offers?.filter(o => o.status === 'pending' && o.sender_id === user.id).length || 0;
      const pendingRequests = matchRequests?.filter(r => r.status === 'pending' && r.traveler_id === user.id).length || 0;

      setStats({
        activeShipments,
        activeTrips,
        completedDeliveries: completedAssignments,
        totalEarnings,
        pendingOffers,
        pendingRequests
      });

      // Build recent activity
      const activities: Activity[] = [];

      // Add active assignments
      assignments?.slice(0, 2).forEach(a => {
        if (a.shipment && a.trip) {
          activities.push({
            id: a.id,
            type: 'assignment',
            title: a.shipment.title,
            subtitle: `${a.trip.departure_city} → ${a.trip.arrival_city}`,
            status: a.payment_status,
            date: a.created_at,
            action: {
              label: 'Suivre',
              link: '/tracking'
            }
          });
        }
      });

      // Add recent shipments
      shipments?.slice(0, 2).forEach(s => {
        activities.push({
          id: s.id,
          type: 'shipment',
          title: s.title,
          subtitle: `${s.pickup_city} → ${s.delivery_city}`,
          status: s.status,
          date: s.created_at,
          action: {
            label: 'Voir',
            link: '/my-shipments'
          }
        });
      });

      // Add recent trips
      trips?.slice(0, 2).forEach(t => {
        activities.push({
          id: t.id,
          type: 'trip',
          title: `${t.departure_city} → ${t.arrival_city}`,
          subtitle: new Date(t.departure_date).toLocaleDateString('fr-FR'),
          status: t.status,
          date: t.created_at,
          action: {
            label: 'Voir',
            link: '/my-trips'
          }
        });
      });

      // Add pending offers
      offers?.filter(o => o.status === 'pending').slice(0, 2).forEach(o => {
        activities.push({
          id: o.id,
          type: 'offer',
          title: 'Offre de prix',
          subtitle: `${o.proposed_price}€`,
          status: o.status,
          date: o.created_at,
          action: {
            label: 'Voir',
            link: o.sender_id === user.id ? '/my-shipments' : '/my-trips'
          }
        });
      });

      // Sort by date and limit
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentActivity(activities.slice(0, 6));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'released':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-warning" />;
      case 'in_transit':
      case 'accepted':
        return <TrendingUp className="h-4 w-4 text-primary" />;
      default:
        return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'En attente',
      accepted: 'Accepté',
      in_transit: 'En transit',
      completed: 'Terminé',
      released: 'Payé',
      scheduled: 'Programmé',
      expired: 'Expiré'
    };
    return labels[status] || status;
  };

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 space-y-6 md:space-y-8">
      <VerificationBanner />
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Bonjour {profile?.first_name || 'utilisateur'} 👋
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Voici un aperçu de votre activité KoliGo
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 self-start md:self-auto">
          <Star className="h-3 w-3 fill-warning text-warning" />
          {profile?.rating?.toFixed(1) || '0.0'} ({profile?.total_reviews || 0} avis)
        </Badge>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-16 mt-2" />
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="border-l-4 border-l-primary hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 space-y-0">
              <div className="flex items-center justify-between">
                <Package className="h-5 w-5 text-primary" />
                {stats.pendingOffers > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {stats.pendingOffers}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground mt-2">
                Colis actifs
              </CardTitle>
              <div className="text-xl md:text-2xl font-bold text-primary">
                {stats.activeShipments}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-accent hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 space-y-0">
              <div className="flex items-center justify-between">
                <Truck className="h-5 w-5 text-accent" />
                {stats.pendingRequests > 0 && (
                  <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {stats.pendingRequests}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground mt-2">
                Trajets actifs
              </CardTitle>
              <div className="text-xl md:text-2xl font-bold text-accent">
                {stats.activeTrips}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-success hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 space-y-0">
              <div className="flex items-center justify-between">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground mt-2">
                Livraisons
              </CardTitle>
              <div className="text-xl md:text-2xl font-bold text-success">
                {stats.completedDeliveries}
              </div>
            </CardHeader>
          </Card>

          <Card className="border-l-4 border-l-warning hover:shadow-md transition-shadow">
            <CardHeader className="pb-3 space-y-0">
              <div className="flex items-center justify-between">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
              <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground mt-2">
                Gains totaux
              </CardTitle>
              <div className="text-xl md:text-2xl font-bold text-warning">
                €{stats.totalEarnings.toFixed(2)}
              </div>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {(hasRole('sender') || (!hasRole('sender') && !hasRole('traveler'))) && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Package className="h-5 w-5 text-primary" />
                Envoyer un colis
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Créez une demande de livraison
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild variant="default" size="sm" className="flex-1">
                <Link to="/sender/create-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/my-shipments">
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {(hasRole('traveler') || (!hasRole('sender') && !hasRole('traveler'))) && (
          <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20 hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Truck className="h-5 w-5 text-accent" />
                Proposer un trajet
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Publiez votre trajet
              </CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button asChild variant="secondary" size="sm" className="flex-1">
                <Link to="/traveler/create-trip">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/my-trips">
                  <Eye className="h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20 hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <MapPin className="h-5 w-5 text-success" />
              Rechercher
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Trouvez ce qu'il vous faut
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to="/search-trips">
                Trajets
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="flex-1">
              <Link to="/search-shipments">
                Colis
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg md:text-xl">Activité récente</CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Vos dernières actions sur la plateforme
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/tracking">Tout voir</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="shrink-0">
                      {activity.type === 'shipment' ? (
                        <Package className="h-5 w-5 text-primary" />
                      ) : activity.type === 'trip' ? (
                        <Truck className="h-5 w-5 text-accent" />
                      ) : activity.type === 'offer' ? (
                        <Send className="h-5 w-5 text-warning" />
                      ) : (
                        <MapPin className="h-5 w-5 text-success" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm md:text-base truncate">{activity.title}</p>
                      <p className="text-xs md:text-sm text-muted-foreground truncate">
                        {activity.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <Badge variant="outline" className="gap-1 text-xs">
                      {getStatusIcon(activity.status)}
                      <span className="hidden sm:inline">{getStatusLabel(activity.status)}</span>
                    </Badge>
                    {activity.action && (
                      <Button asChild variant="ghost" size="sm">
                        <Link to={activity.action.link}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm md:text-base">Aucune activité récente</p>
              <p className="text-xs md:text-sm">Commencez par créer un colis ou un trajet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
