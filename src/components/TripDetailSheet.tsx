import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  MapPin, Calendar, Package, Euro, User, Star, 
  MessageCircle, Clock, Plane, Car, Train, Ship,
  CheckCircle, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Trip {
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
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    avatar_url?: string;
  } | null;
}

interface TripDetailSheetProps {
  trip: Trip | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TripDetailSheet({ trip, open, onOpenChange }: TripDetailSheetProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  if (!trip) return null;

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'avion': return <Plane className="h-5 w-5" />;
      case 'voiture': return <Car className="h-5 w-5" />;
      case 'train': return <Train className="h-5 w-5" />;
      case 'bateau': return <Ship className="h-5 w-5" />;
      default: return <Package className="h-5 w-5" />;
    }
  };

  const handleContact = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    toast({
      title: "Fonctionnalité à venir",
      description: "La messagerie directe sera bientôt disponible",
    });
  };

  const handleReserve = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    // Navigate to create shipment with trip pre-selected
    navigate(`/sender/create-shipment?trip_id=${trip.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-xl">Détails du trajet</SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* Route Header */}
          <div className="flex items-center justify-between bg-muted/50 rounded-xl p-4">
            <div className="text-center flex-1">
              <p className="font-bold text-lg">{trip.departure_city}</p>
              <p className="text-sm text-muted-foreground">{trip.departure_country}</p>
            </div>
            <div className="flex flex-col items-center px-4">
              {getTransportIcon(trip.transport_type)}
              <div className="h-px w-16 bg-border my-2" />
              <span className="text-xs text-muted-foreground capitalize">{trip.transport_type}</span>
            </div>
            <div className="text-center flex-1">
              <p className="font-bold text-lg">{trip.arrival_city}</p>
              <p className="text-sm text-muted-foreground">{trip.arrival_country}</p>
            </div>
          </div>

          {/* Traveler Card */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={trip.profiles?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                    {trip.profiles?.first_name?.[0]}{trip.profiles?.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">
                      {trip.profiles?.first_name} {trip.profiles?.last_name}
                    </p>
                    {trip.profiles?.is_verified && (
                      <Badge variant="secondary" className="gap-1">
                        <Shield className="h-3 w-3" />
                        Vérifié
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{trip.profiles?.rating?.toFixed(1) || '0.0'}</span>
                    <span>({trip.profiles?.total_reviews || 0} avis)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Trip Details */}
          <div className="space-y-4">
            <h3 className="font-semibold">Informations du trajet</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Départ</p>
                  <p className="font-medium text-sm">
                    {new Date(trip.departure_date).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {trip.arrival_date && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Calendar className="h-5 w-5 text-accent" />
                  <div>
                    <p className="text-xs text-muted-foreground">Arrivée</p>
                    <p className="font-medium text-sm">
                      {new Date(trip.arrival_date).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Package className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-xs text-muted-foreground">Capacité dispo.</p>
                  <p className="font-medium text-sm">{trip.available_weight_kg} kg</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Euro className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-xs text-muted-foreground">Prix/kg</p>
                  <p className="font-medium text-sm">{trip.price_per_kg} {trip.currency}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Clock className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-muted-foreground">Heure limite de dépôt</p>
                <p className="font-medium text-sm">{trip.pickup_time_limit}</p>
              </div>
            </div>

            {trip.pickup_address && (
              <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                <MapPin className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Adresse de collecte</p>
                  <p className="font-medium text-sm">{trip.pickup_address}</p>
                </div>
              </div>
            )}

            {trip.description && (
              <div className="p-3 bg-muted/30 rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm">{trip.description}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-3 pb-6">
            <Button 
              onClick={handleReserve} 
              className="w-full h-12 text-base"
              disabled={loading}
            >
              <CheckCircle className="h-5 w-5 mr-2" />
              Réserver ce trajet
            </Button>
            <Button 
              variant="outline" 
              onClick={handleContact}
              className="w-full h-12 text-base"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Contacter le transporteur
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
