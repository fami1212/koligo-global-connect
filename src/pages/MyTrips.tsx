import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Truck, Plus, Eye, Edit, MapPin, Calendar, Package, Trash2, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';

interface Trip {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  arrival_date: string;
  available_weight_kg: number;
  max_weight_kg: number;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  description: string;
  is_active: boolean;
  created_at: string;
  pickup_time_limit: string;
}

export default function MyTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const { containerRef, isPulling, isRefreshing, pullDistance, threshold } = usePullToRefresh({
    onRefresh: async () => await loadTrips(),
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadTrips();
  }, [user, navigate]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('trips')
        .select('*')
        .eq('traveler_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const tripsWithCurrency = (data || []).map((trip: any) => ({
        ...trip,
        currency: trip.currency || 'EUR'
      }));
      
      setTrips(tripsWithCurrency);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos trajets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleTripStatus = async (tripId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('trips')
        .update({ is_active: isActive })
        .eq('id', tripId);

      if (error) throw error;

      setTrips(prev => prev.map(trip => 
        trip.id === tripId ? { ...trip, is_active: isActive } : trip
      ));

      toast({
        title: isActive ? "Trajet activé" : "Trajet désactivé",
        description: isActive 
          ? "Votre trajet est maintenant visible par les expéditeurs"
          : "Votre trajet n'est plus visible par les expéditeurs",
      });
    } catch (error) {
      console.error('Error updating trip status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le statut du trajet",
        variant: "destructive",
      });
    }
  };

  const deleteTrip = async (tripId: string) => {
    try {
      setDeletingTripId(tripId);
      
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', tripId)
        .eq('traveler_id', user?.id);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      setTrips(prev => prev.filter(trip => trip.id !== tripId));

      toast({
        title: "Trajet supprimé",
        description: "Votre trajet a été supprimé avec succès",
      });
    } catch (error: any) {
      console.error('Error deleting trip:', error);
      
      let errorMessage = "Impossible de supprimer le trajet";
      if (error.code === '42501') {
        errorMessage = "Vous n'avez pas l'autorisation de supprimer ce trajet";
      } else if (error.code === '23503') {
        errorMessage = "Impossible de supprimer le trajet car il contient des réservations";
      }

      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setDeletingTripId(null);
    }
  };

  const confirmDelete = (trip: Trip) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le trajet de ${trip.departure_city} à ${trip.arrival_city} ? Cette action est irréversible.`)) {
      deleteTrip(trip.id);
    }
  };

  const isPickupTimePassed = (departureDate: string, pickupTimeLimit: string) => {
    const now = new Date();
    const departure = new Date(departureDate);
    const [hours, minutes] = pickupTimeLimit.split(':').map(Number);
    
    const pickupDeadline = new Date(departure);
    pickupDeadline.setHours(hours, minutes, 0, 0);
    
    return now > pickupDeadline;
  };

  const getTripStatus = (trip: Trip) => {
    if (isPickupTimePassed(trip.departure_date, trip.pickup_time_limit)) {
      return 'expired';
    }
    return trip.is_active ? 'active' : 'inactive';
  };

  const getStatusBadge = (trip: Trip) => {
    const status = getTripStatus(trip);
    
    switch (status) {
      case 'expired':
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Heure dépassée
          </Badge>
        );
      case 'active':
        return <Badge variant="default">Actif</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactif</Badge>;
      default:
        return <Badge variant="secondary">Inactif</Badge>;
    }
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'car':
        return '🚗';
      case 'train':
        return '🚆';
      case 'plane':
        return '✈️';
      case 'bus':
        return '🚌';
      default:
        return '🚛';
    }
  };

  const getTransportText = (type: string) => {
    switch (type) {
      case 'car':
        return 'Voiture';
      case 'train':
        return 'Train';
      case 'plane':
        return 'Avion';
      case 'bus':
        return 'Bus';
      default:
        return type;
    }
  };

  const getCurrencySymbol = (currencyCode: string) => {
    const currencySymbols: { [key: string]: string } = {
      EUR: '€',
      USD: '$',
      GBP: '£',
      CHF: 'CHF',
      CAD: 'CAD',
      CFA: 'CFA',
      MAD: 'MAD',
      TND: 'TND'
    };
    return currencySymbols[currencyCode] || currencyCode;
  };

  const formatPrice = (price: number, currency: string) => {
    return `${price} ${getCurrencySymbol(currency)}/kg`;
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    return `${hours}h${minutes}`;
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8 overflow-auto">
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mes Trajets</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos offres de transport
            </p>
          </div>
          <div className="flex gap-2 self-end sm:self-auto">
            <Button asChild variant="outline" size="sm">
              <Link to="/dashboard">
                <span className="hidden sm:inline">Tableau de bord</span>
                <span className="sm:hidden">Retour</span>
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/traveler/create-trip">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Nouveau trajet</span>
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        ) : trips.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Truck className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun trajet</h3>
              <p className="text-muted-foreground mb-6">
                Vous n'avez pas encore créé d'offre de transport
              </p>
              <Button asChild>
                <Link to="/traveler/create-trip">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer mon premier trajet
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
            {trips.map((trip) => {
              const status = getTripStatus(trip);
              const isExpired = status === 'expired';
              
              return (
                <Card key={trip.id} className="hover:shadow-lg transition-shadow relative">
                  {isExpired && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge variant="destructive" className="text-xs">
                        Réservations fermées
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                          <span>{getTransportIcon(trip.transport_type)}</span>
                          <span className="truncate">{trip.departure_city} → {trip.arrival_city}</span>
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs sm:text-sm">
                          {getTransportText(trip.transport_type)}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                        <Switch
                          checked={trip.is_active && !isExpired}
                          onCheckedChange={(checked) => !isExpired && toggleTripStatus(trip.id, checked)}
                          disabled={isExpired}
                          className="scale-75 sm:scale-100"
                        />
                        {getStatusBadge(trip)}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 p-4 sm:p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span>
                          {trip.departure_city}, {trip.departure_country}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-accent" />
                        <span>
                          {trip.arrival_city}, {trip.arrival_country}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Départ</span>
                        <p className="font-medium">
                          {new Date(trip.departure_date).toLocaleDateString('fr-FR')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Récup. avant {formatTime(trip.pickup_time_limit)}
                        </p>
                      </div>
                      {trip.arrival_date && (
                        <div>
                          <span className="text-muted-foreground">Arrivée</span>
                          <p className="font-medium">
                            {new Date(trip.arrival_date).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {trip.available_weight_kg}kg / {trip.max_weight_kg}kg disponible
                        </span>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Prix: </span>
                        <span className="font-semibold text-success">
                          {formatPrice(trip.price_per_kg, trip.currency || 'EUR')}
                        </span>
                      </div>
                    </div>

                    {trip.description && (
                      <div className="text-sm">
                        <p className="text-muted-foreground line-clamp-2">{trip.description}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      Créé le {new Date(trip.created_at).toLocaleDateString('fr-FR')}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        Voir
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDelete(trip)}
                        disabled={deletingTripId === trip.id}
                      >
                        {deletingTripId === trip.id ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}