import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MapPin, Calendar, Package, Star, Trash2, Shield, Plane, Car, Train, Ship } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TripDetailSheet } from '@/components/TripDetailSheet';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';

interface Favorite {
  id: string;
  trip_id: string;
  created_at: string;
  trips: {
    id: string;
    departure_city: string;
    departure_country: string;
    arrival_city: string;
    arrival_country: string;
    departure_date: string;
    arrival_date?: string;
    available_weight_kg: number;
    max_weight_kg: number;
    price_per_kg: number;
    currency: string;
    transport_type: string;
    description?: string;
    pickup_address?: string;
    pickup_time_limit: string;
    traveler_id: string;
    is_active: boolean;
  };
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    avatar_url?: string;
  } | null;
}

export default function Favorites() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadFavorites = async () => {
    try {
      setLoading(true);
      const { data: favoritesData, error } = await supabase
        .from('favorites')
        .select(`
          id,
          trip_id,
          created_at,
          trips (
            id,
            departure_city,
            departure_country,
            arrival_city,
            arrival_country,
            departure_date,
            arrival_date,
            available_weight_kg,
            max_weight_kg,
            price_per_kg,
            currency,
            transport_type,
            description,
            pickup_address,
            pickup_time_limit,
            traveler_id,
            is_active
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get traveler profiles
      const travelerIds = [...new Set(favoritesData?.map(f => f.trips?.traveler_id).filter(Boolean) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rating, total_reviews, is_verified, avatar_url')
        .in('user_id', travelerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const favoritesWithProfiles = favoritesData?.map(fav => ({
        ...fav,
        profiles: fav.trips ? profilesMap.get(fav.trips.traveler_id) : null
      })) || [];

      setFavorites(favoritesWithProfiles as any);
    } catch (error) {
      console.error('Error loading favorites:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les favoris",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadFavorites();
  }, [user, navigate]);

  const { containerRef, isPulling, isRefreshing, pullDistance, threshold } = usePullToRefresh({
    onRefresh: loadFavorites,
    threshold: 80
  });

  const removeFavorite = async (favoriteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      setFavorites(prev => prev.filter(f => f.id !== favoriteId));
      toast({
        title: "Supprimé",
        description: "Trajet retiré des favoris",
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le favori",
        variant: "destructive",
      });
    }
  };

  const openTripDetails = (favorite: Favorite) => {
    if (!favorite.trips) return;
    setSelectedTrip({
      ...favorite.trips,
      profiles: favorite.profiles
    });
    setSheetOpen(true);
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'avion': return <Plane className="h-4 w-4" />;
      case 'voiture': return <Car className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      case 'bateau': return <Ship className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8 overflow-x-hidden overflow-y-auto"
    >
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing} 
        isPulling={isPulling}
        threshold={threshold}
      />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
              <Heart className="h-6 w-6 sm:h-8 sm:w-8 text-red-500 fill-red-500" />
              Mes favoris
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              {favorites.length} trajet{favorites.length > 1 ? 's' : ''} sauvegardé{favorites.length > 1 ? 's' : ''}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/search-trips">Rechercher des trajets</Link>
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        ) : favorites.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Heart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun favori</h3>
              <p className="text-muted-foreground mb-6">
                Ajoutez des trajets en favoris pour les retrouver facilement
              </p>
              <Button asChild>
                <Link to="/search-trips">Rechercher des trajets</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {favorites.map((favorite) => (
              <Card 
                key={favorite.id} 
                className={`cursor-pointer transition-all hover:shadow-md ${
                  !favorite.trips?.is_active ? 'opacity-60' : ''
                }`}
                onClick={() => openTripDetails(favorite)}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Traveler Info */}
                    <div className="flex items-center gap-3 sm:min-w-[200px]">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={favorite.profiles?.avatar_url || ''} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {favorite.profiles?.first_name?.[0]}{favorite.profiles?.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold truncate">
                            {favorite.profiles?.first_name} {favorite.profiles?.last_name}
                          </p>
                          {favorite.profiles?.is_verified && (
                            <Shield className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                          <span>{favorite.profiles?.rating?.toFixed(1) || '0.0'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium">{favorite.trips?.departure_city}</span>
                        </div>
                        <span className="text-muted-foreground">→</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4 text-accent" />
                          <span className="font-medium">{favorite.trips?.arrival_city}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(favorite.trips?.departure_date || '').toLocaleDateString('fr-FR')}
                        </div>
                        <Badge variant="outline" className="gap-1">
                          {getTransportIcon(favorite.trips?.transport_type || '')}
                          {favorite.trips?.transport_type}
                        </Badge>
                        <Badge variant="secondary">
                          {favorite.trips?.available_weight_kg} kg dispo
                        </Badge>
                        <span className="text-green-600 font-medium">
                          {favorite.trips?.price_per_kg} {favorite.trips?.currency}/kg
                        </span>
                      </div>

                      {!favorite.trips?.is_active && (
                        <Badge variant="destructive" className="mt-2">
                          Trajet expiré
                        </Badge>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex sm:flex-col gap-2 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={(e) => removeFavorite(favorite.id, e)}
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <TripDetailSheet 
        trip={selectedTrip} 
        open={sheetOpen} 
        onOpenChange={setSheetOpen} 
      />
    </div>
  );
}
