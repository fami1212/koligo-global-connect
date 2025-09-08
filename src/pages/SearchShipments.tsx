import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Package, User, Euro, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Shipment {
  id: string;
  title: string;
  description: string;
  pickup_city: string;
  pickup_country: string;
  delivery_city: string;
  delivery_country: string;
  weight_kg: number;
  volume_m3: number;
  estimated_value: number;
  status: string;
  created_at: string;
  sender_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    is_verified?: boolean;
  } | null;
}

export default function SearchShipments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    pickup_city: '',
    delivery_city: '',
    max_weight: '',
    min_value: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadShipments();
  }, [user, navigate]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('shipments')
        .select('*')
        .eq('status', 'pending');

      if (filters.pickup_city) {
        query = query.ilike('pickup_city', `%${filters.pickup_city}%`);
      }
      if (filters.delivery_city) {
        query = query.ilike('delivery_city', `%${filters.delivery_city}%`);
      }
      if (filters.max_weight) {
        query = query.lte('weight_kg', parseFloat(filters.max_weight));
      }
      if (filters.min_value) {
        query = query.gte('estimated_value', parseFloat(filters.min_value));
      }

      const { data: shipmentsData, error } = await query
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get sender profiles with verification status
      const senderIds = [...new Set(shipmentsData?.map(s => s.sender_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rating, is_verified')
        .in('user_id', senderIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      // Sort shipments with verified users first
      const shipmentsWithProfiles = shipmentsData?.map(shipment => ({
        ...shipment,
        profiles: profilesMap.get(shipment.sender_id) || { 
          first_name: '', 
          last_name: '', 
          rating: 0, 
          is_verified: false 
        }
      }))?.sort((a, b) => {
        // Verified users first
        if (a.profiles?.is_verified && !b.profiles?.is_verified) return -1;
        if (!a.profiles?.is_verified && b.profiles?.is_verified) return 1;
        // Then by rating
        return (b.profiles?.rating || 0) - (a.profiles?.rating || 0);
      }) || [];

      setShipments(shipmentsWithProfiles);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les colis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createMatchRequest = async (shipmentId: string, estimatedPrice: number) => {
    try {
      // First get a trip from the traveler to create the match request
      const { data: trips } = await supabase
        .from('trips')
        .select('id')
        .eq('traveler_id', user?.id)
        .eq('is_active', true)
        .limit(1);

      if (!trips || trips.length === 0) {
        toast({
          title: "Aucun trajet",
          description: "Vous devez d'abord créer un trajet pour faire une offre",
          variant: "destructive",
        });
        return;
      }

      const shipment = shipments.find(s => s.id === shipmentId);
      if (!shipment) return;

      const { error } = await supabase
        .from('match_requests')
        .insert({
          trip_id: trips[0].id,
          shipment_id: shipmentId,
          sender_id: shipment.sender_id,
          traveler_id: user?.id,
          estimated_price: estimatedPrice
        });

      if (error) throw error;

      toast({
        title: "Offre envoyée",
        description: "Votre offre de transport a été envoyée à l'expéditeur",
      });
    } catch (error) {
      console.error('Error creating match request:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer l'offre",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Rechercher des colis
            </h1>
            <p className="text-muted-foreground mt-1">
              Trouvez des colis à transporter sur votre trajet
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
              <Package className="h-5 w-5 text-primary" />
              Filtres de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="pickup">Ville de collecte</Label>
                <Input
                  id="pickup"
                  placeholder="Paris, Londres..."
                  value={filters.pickup_city}
                  onChange={(e) => setFilters(prev => ({ ...prev, pickup_city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="delivery">Ville de livraison</Label>
                <Input
                  id="delivery"
                  placeholder="Madrid, Berlin..."
                  value={filters.delivery_city}
                  onChange={(e) => setFilters(prev => ({ ...prev, delivery_city: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="weight">Poids max. (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  placeholder="20"
                  value={filters.max_weight}
                  onChange={(e) => setFilters(prev => ({ ...prev, max_weight: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="value">Valeur min. (€)</Label>
                <Input
                  id="value"
                  type="number"
                  placeholder="100"
                  value={filters.min_value}
                  onChange={(e) => setFilters(prev => ({ ...prev, min_value: e.target.value }))}
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <Button onClick={loadShipments} disabled={loading}>
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
          ) : shipments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Aucun colis trouvé</p>
                <p className="text-sm text-muted-foreground">Essayez de modifier vos critères de recherche</p>
              </CardContent>
            </Card>
          ) : (
            shipments.map((shipment) => (
              <Card key={shipment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Route */}
                    <div className="lg:col-span-2">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-center">
                          <p className="font-semibold text-lg">{shipment.pickup_city}</p>
                          <p className="text-sm text-muted-foreground">{shipment.pickup_country}</p>
                        </div>
                        <div className="flex-1 flex items-center">
                          <div className="h-px bg-border flex-1"></div>
                          <Package className="h-5 w-5 text-primary mx-2" />
                          <div className="h-px bg-border flex-1"></div>
                        </div>
                        <div className="text-center">
                          <p className="font-semibold text-lg">{shipment.delivery_city}</p>
                          <p className="text-sm text-muted-foreground">{shipment.delivery_country}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <h3 className="font-semibold">{shipment.title}</h3>
                        {shipment.description && (
                          <p className="text-sm text-muted-foreground">{shipment.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" />
                        <span className="text-sm">
                          {shipment.weight_kg}kg
                        </span>
                      </div>
                      {shipment.volume_m3 && (
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-secondary" />
                          <span className="text-sm">
                            {shipment.volume_m3}m³
                          </span>
                        </div>
                      )}
                      {shipment.estimated_value && (
                        <div className="flex items-center gap-2">
                          <Euro className="h-4 w-4 text-success" />
                          <span className="text-sm">
                            Valeur: {shipment.estimated_value}€
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-accent" />
                        <span className="text-sm">
                          {shipment.profiles?.first_name} {shipment.profiles?.last_name}
                        </span>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            ⭐ {shipment.profiles?.rating?.toFixed(1) || '0.0'}
                          </Badge>
                          {shipment.profiles?.is_verified && (
                            <Badge className="text-xs bg-green-100 text-green-800 border-green-300">
                              ✓ Vérifié
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          Créé le {new Date(shipment.created_at).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        onClick={() => createMatchRequest(shipment.id, shipment.weight_kg * 8)} 
                        className="w-full"
                      >
                        Proposer mes services
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        Voir les détails
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}