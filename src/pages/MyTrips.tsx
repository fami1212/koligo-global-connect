import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Truck, Plus, Eye, Edit, MapPin, Calendar, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

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
  transport_type: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export default function MyTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

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
      setTrips(data || []);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mes Trajets</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos offres de transport
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
            <Button asChild>
              <Link to="/traveler/create-trip">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau trajet
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <span>{getTransportIcon(trip.transport_type)}</span>
                        {trip.departure_city} → {trip.arrival_city}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {getTransportText(trip.transport_type)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={trip.is_active}
                        onCheckedChange={(checked) => toggleTripStatus(trip.id, checked)}
                      />
                      <Badge variant={trip.is_active ? 'default' : 'secondary'}>
                        {trip.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      <span className="font-semibold text-success">{trip.price_per_kg}€/kg</span>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}