import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Truck, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CreateTrip() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [transportType, setTransportType] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const tripData = {
      traveler_id: user.id,
      departure_city: formData.get('departureCity') as string,
      departure_country: formData.get('departureCountry') as string,
      arrival_city: formData.get('arrivalCity') as string,
      arrival_country: formData.get('arrivalCountry') as string,
      departure_date: new Date(formData.get('departureDate') as string).toISOString(),
      arrival_date: formData.get('arrivalDate') ? new Date(formData.get('arrivalDate') as string).toISOString() : null,
      transport_type: transportType,
      max_weight_kg: parseFloat(formData.get('maxWeight') as string),
      available_weight_kg: parseFloat(formData.get('maxWeight') as string),
      max_volume_m3: parseFloat(formData.get('maxVolume') as string) || null,
      price_per_kg: parseFloat(formData.get('pricePerKg') as string),
      description: formData.get('description') as string || null,
    };

    try {
      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      toast({
        title: "Trajet créé avec succès",
        description: "Votre offre de transport a été publiée.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du trajet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="mb-8">
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Retour au tableau de bord
        </Link>
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
          <Truck className="h-8 w-8 text-accent" />
          Créer un trajet
        </h1>
        <p className="text-muted-foreground mt-2">
          Publiez votre trajet pour transporter des colis et gagner de l'argent
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Route Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Itinéraire
            </CardTitle>
            <CardDescription>Définissez votre parcours de transport</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departureCity">Ville de départ</Label>
                <Input
                  id="departureCity"
                  name="departureCity"
                  required
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="departureCountry">Pays de départ</Label>
                <Input
                  id="departureCountry"
                  name="departureCountry"
                  required
                  placeholder="France"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="arrivalCity">Ville d'arrivée</Label>
                <Input
                  id="arrivalCity"
                  name="arrivalCity"
                  required
                  placeholder="Lyon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrivalCountry">Pays d'arrivée</Label>
                <Input
                  id="arrivalCountry"
                  name="arrivalCountry"
                  required
                  placeholder="France"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Date and Transport */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-accent" />
              Dates et transport
            </CardTitle>
            <CardDescription>Quand voyagez-vous et comment ?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="departureDate">Date de départ</Label>
                <Input
                  id="departureDate"
                  name="departureDate"
                  type="datetime-local"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="arrivalDate">Date d'arrivée (optionnel)</Label>
                <Input
                  id="arrivalDate"
                  name="arrivalDate"
                  type="datetime-local"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transportType">Mode de transport</Label>
              <Select value={transportType} onValueChange={setTransportType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Choisissez votre mode de transport" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="car">Voiture</SelectItem>
                  <SelectItem value="train">Train</SelectItem>
                  <SelectItem value="bus">Bus</SelectItem>
                  <SelectItem value="plane">Avion</SelectItem>
                  <SelectItem value="truck">Camion</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Capacity and Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Capacité et tarification
            </CardTitle>
            <CardDescription>Définissez ce que vous pouvez transporter et vos tarifs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxWeight">Poids maximum (kg)</Label>
                <Input
                  id="maxWeight"
                  name="maxWeight"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="20"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxVolume">Volume maximum (m³) - optionnel</Label>
                <Input
                  id="maxVolume"
                  name="maxVolume"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.5"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pricePerKg">Prix par kg (€)</Label>
              <Input
                id="pricePerKg"
                name="pricePerKg"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="5.00"
              />
            </div>
          </CardContent>
        </Card>

        {/* Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>Ajoutez des informations supplémentaires sur votre trajet</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="description"
              placeholder="Ex: Trajet régulier, véhicule spacieux, possibilité de récupération en gare..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1">
            Annuler
          </Button>
          <Button type="submit" disabled={isLoading || !transportType} className="flex-1">
            {isLoading ? "Publication..." : "Publier le trajet"}
          </Button>
        </div>
      </form>
    </div>
  );
}