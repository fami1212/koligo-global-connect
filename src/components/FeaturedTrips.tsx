import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Package, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FeaturedTrips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch real trips from database
  const { data: featuredTrips, isLoading } = useQuery({
    queryKey: ['featured-trips'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trips')
        .select(`
          id,
          departure_city,
          departure_country,
          arrival_city,
          arrival_country,
          departure_date,
          max_weight_kg,
          price_per_kg,
          currency,
          traveler_id,
          profiles!trips_traveler_id_fkey (
            first_name,
            last_name,
            rating,
            avatar_url
          )
        `)
        .eq('is_active', true)
        .gte('departure_date', new Date().toISOString())
        .order('departure_date', { ascending: true })
        .limit(6);

      if (error) throw error;

      return data?.map(trip => {
        const profile = trip.profiles as any;
        return {
          id: trip.id,
          departure_city: trip.departure_city,
          departure_country: trip.departure_country,
          arrival_city: trip.arrival_city,
          arrival_country: trip.arrival_country,
          departure_date: trip.departure_date,
          max_weight: trip.max_weight_kg,
          price_per_kg: trip.price_per_kg,
          currency: trip.currency,
          traveler: {
            name: profile?.first_name && profile?.last_name 
              ? `${profile.first_name} ${profile.last_name.charAt(0)}.`
              : 'Voyageur',
            rating: profile?.rating || 0,
            trips_count: 0,
            avatar: profile?.avatar_url
          }
        };
      }) || [];
    },
  });

  const handleSearchTrips = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/search-trips');
    }
  };

  const handleReserveTrip = (tripId: string) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/search-trips');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <section id="trips" className="py-16 px-4 bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Trajets disponibles
            </span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Découvrez les prochains trajets de nos transporteurs vérifiés et réservez votre livraison dès maintenant.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/40">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-3 mb-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))
          ) : featuredTrips && featuredTrips.length > 0 ? (
            featuredTrips.map((trip) => (
            <Card key={trip.id} className="group hover:shadow-xl transition-all duration-300 border-border/40 hover:border-primary/20 bg-card/50 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-10 w-10 ring-2 ring-primary/20">
                    <AvatarImage src={trip.traveler.avatar || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-semibold">
                      {trip.traveler.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{trip.traveler.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {trip.traveler.rating} • {trip.traveler.trips_count} trajets
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Vérifié
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {trip.departure_city}, {trip.departure_country}
                    </span>
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <span className="text-sm font-medium">
                      {trip.arrival_city}, {trip.arrival_country}
                    </span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Départ le {formatDate(trip.departure_date)}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-accent" />
                      <span className="text-sm">Max {trip.max_weight}kg</span>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">
                        {trip.price_per_kg} {trip.currency}
                      </div>
                      <div className="text-xs text-muted-foreground">par kg</div>
                    </div>
                  </div>

                  <Button 
                    className="w-full group-hover:shadow-md transition-all duration-300" 
                    onClick={() => handleReserveTrip(trip.id)}
                  >
                    Réserver ce trajet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
          ) : (
            <div className="col-span-full text-center py-12">
              <p className="text-muted-foreground mb-4">Aucun trajet disponible pour le moment</p>
              <Button onClick={handleSearchTrips}>Explorer tous les trajets</Button>
            </div>
          )}
        </div>

        <div className="text-center">
          <Button 
            variant="outline" 
            size="lg" 
            className="px-8 py-4 h-auto text-lg"
            onClick={handleSearchTrips}
          >
            Voir tous les trajets
            <ArrowRight className="h-5 w-5 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FeaturedTrips;