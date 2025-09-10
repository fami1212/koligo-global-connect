import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Calendar, Package, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const FeaturedTrips = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Sample trips data
  const featuredTrips = [
    {
      id: 1,
      departure_city: "Paris",
      departure_country: "France",
      arrival_city: "Tokyo",
      arrival_country: "Japon",
      departure_date: "2024-12-15",
      max_weight: 5,
      price_per_kg: 25,
      currency: "EUR",
      traveler: {
        name: "Marie L.",
        rating: 4.9,
        trips_count: 23,
        avatar: null
      }
    },
    {
      id: 2,
      departure_city: "London",
      departure_country: "Royaume-Uni",
      arrival_city: "New York",
      arrival_country: "États-Unis",
      departure_date: "2024-12-18",
      max_weight: 8,
      price_per_kg: 20,
      currency: "USD",
      traveler: {
        name: "John S.",
        rating: 4.8,
        trips_count: 31,
        avatar: null
      }
    },
    {
      id: 3,
      departure_city: "Madrid",
      departure_country: "Espagne",
      arrival_city: "Buenos Aires",
      arrival_country: "Argentine",
      departure_date: "2024-12-20",
      max_weight: 3,
      price_per_kg: 30,
      currency: "EUR",
      traveler: {
        name: "Carlos M.",
        rating: 5.0,
        trips_count: 15,
        avatar: null
      }
    }
  ];

  const handleSearchTrips = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/search-trips');
    }
  };

  const handleReserveTrip = (tripId: number) => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/reservations');
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
          {featuredTrips.map((trip) => (
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
          ))}
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