import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, MapPin, Package, Truck, User, Clock, Euro } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { BookingWorkflow } from '@/components/BookingWorkflow';

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
  traveler_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    is_verified?: boolean;
  } | null;
}

export default function SearchTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    departure_city: '',
    arrival_city: '',
    min_weight: '',
    max_price: '',
    transport_type: ''
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
      let query = supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .gte('departure_date', new Date().toISOString())
        .neq('traveler_id', user?.id || '');

      if (filters.departure_city) {
        query = query.ilike('departure_city', `%${filters.departure_city}%`);
      }
      if (filters.arrival_city) {
        query = query.ilike('arrival_city', `%${filters.arrival_city}%`);
      }
      if (filters.min_weight) {
        query = query.gte('available_weight_kg', parseFloat(filters.min_weight));
      }
      if (filters.max_price) {
        query = query.lte('price_per_kg', parseFloat(filters.max_price));
      }
      if (filters.transport_type && filters.transport_type !== 'all') {
        query = query.eq('transport_type', filters.transport_type);
      }

      const { data: tripsData, error } = await query
        .eq('is_active', true)
        .order('departure_date', { ascending: true });

      if (error) throw error;

      const travelerIds = [...new Set((tripsData || []).map(t => t.traveler_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rating, is_verified')
        .in('user_id', travelerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const tripsWithProfiles = (tripsData || []).map((trip: any) => ({
        ...trip,
        currency: trip.currency || 'EUR',
        profiles: profilesMap.get(trip.traveler_id) || { 
          first_name: '', 
          last_name: '', 
          rating: 0, 
          is_verified: false 
        }
      })).sort((a: any, b: any) => {
        if (a.profiles?.is_verified && !b.profiles?.is_verified) return -1;
        if (!a.profiles?.is_verified && b.profiles?.is_verified) return 1;
        return (b.profiles?.rating || 0) - (a.profiles?.rating || 0);
      });

      setTrips(tripsWithProfiles);
    } catch (error) {
      console.error('Error loading trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les trajets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    return `${price.toFixed(2)} ${getCurrencySymbol(currency)}/kg`;
  };

  const calculateTotalPrice = (weight: number, pricePerKg: number) => {
    return weight * pricePerKg;
  };

  const formatTotalPrice = (weight: number, pricePerKg: number, currency: string) => {
    const total = calculateTotalPrice(weight, pricePerKg);
    return `${total.toFixed(2)} ${getCurrencySymbol(currency)}`;
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'car': return '🚗';
      case 'train': return '🚆';
      case 'plane': return '✈️';
      case 'bus': return '🚌';
      default: return '🚛';
    }
  };

  const getTransportText = (type: string) => {
    switch (type) {
      case 'car': return 'Voiture';
      case 'train': return 'Train';
      case 'plane': return 'Avion';
      case 'bus': return 'Bus';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Rechercher des trajets
            </h1>
            <p className="text-muted-foreground mt-1">
              Trouvez le transporteur idéal pour votre colis
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Filtres de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="departure">Ville de départ</Label>
                <Input
                  id="departure"
                  placeholder="Paris, Londres..."
                  value={filters.departure_city}
                  onChange={(e) => setFilters(prev => ({ ...prev, departure_city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="arrival">Ville d'arrivée</Label>
                <Input
                  id="arrival"
                  placeholder="Madrid, Berlin..."
                  value={filters.arrival_city}
                  onChange={(e) => setFilters(prev => ({ ...prev, arrival_city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="weight">Poids min. (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="5"
                  value={filters.min_weight}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_weight: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="price">Prix max. (€/kg)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="10"
                  value={filters.max_price}
                  onChange={(e) => setFilters(prev => ({ ...prev, max_price: e.target.value }))}
                />
              </div>
              <div>
                <Label>Transport</Label>
                <Select value={filters.transport_type} onValueChange={(value) => setFilters(prev => ({ ...prev, transport_type: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous</SelectItem>
                    <SelectItem value="car">Voiture</SelectItem>
                    <SelectItem value="train">Train</SelectItem>
                    <SelectItem value="plane">Avion</SelectItem>
                    <SelectItem value="bus">Bus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={loadTrips} disabled={loading}>
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Recherche en cours...</p>
            </div>
          ) : trips.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun trajet trouvé</p>
                <p className="text-sm text-muted-foreground">Essayez de modifier vos critères de recherche</p>
              </CardContent>
            </Card>
          ) : (
            trips.map((trip) => (
              <Card key={trip.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Route */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="font-semibold text-lg">{trip.departure_city}</p>
                          <p className="text-sm text-muted-foreground">{trip.departure_country}</p>
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="h-px bg-border flex-1"></div>
                          <Badge variant="secondary" className="mx-2">
                            {getTransportText(trip.transport_type)}
                          </Badge>
                          <div className="h-px bg-border flex-1"></div>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-lg">{trip.arrival_city}</p>
                          <p className="text-sm text-muted-foreground">{trip.arrival_country}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(trip.departure_date).toLocaleDateString('fr-FR')}
                        </div>
                        {trip.arrival_date && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {new Date(trip.arrival_date).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {trip.available_weight_kg}kg / {trip.max_weight_kg}kg disponible
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-success" />
                        <span className="text-sm font-semibold">
                          {formatPrice(trip.price_per_kg, trip.currency)}
                        </span>
                      </div>
                      <div className="bg-muted p-2 rounded-md">
                        <p className="text-xs text-muted-foreground">Exemple pour 5kg:</p>
                        <p className="text-sm font-semibold">
                          {formatTotalPrice(5, trip.price_per_kg, trip.currency)}
                        </p>
                      </div>
                    </div>

                    {/* Traveler Info & Actions */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-accent" />
                        <div>
                          <p className="text-sm font-medium">
                            {trip.profiles?.first_name} {trip.profiles?.last_name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Badge variant="outline" className="text-xs">
                              ⭐ {trip.profiles?.rating?.toFixed(1) || '0.0'}
                            </Badge>
                            {trip.profiles?.is_verified && (
                              <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                                ✓ Vérifié
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button className="w-full">
                              Réserver ce trajet
                            </Button>
                          </DialogTrigger>
                          <BookingWorkflow 
                            trip={trip} 
                            onClose={() => {}} 
                          />
                        </Dialog>
                        <Button variant="outline" size="sm" className="w-full">
                          Voir les détails
                        </Button>
                      </div>
                    </div>
                  </div>

                  {trip.description && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">{trip.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}