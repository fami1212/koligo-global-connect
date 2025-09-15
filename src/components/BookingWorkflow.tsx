import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Calendar, MapPin, Package, Euro, User, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Trip {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  available_weight_kg: number;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  traveler_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
  };
}

interface BookingWorkflowProps {
  trip: Trip;
  onClose: () => void;
}

interface ShipmentData {
  title: string;
  description: string;
  weight_kg: number;
  volume_m3: number;
  estimated_value: number;
  delivery_address: string;
  delivery_city: string;
  delivery_country: string;
  delivery_contact_name: string;
  delivery_contact_phone: string;
  special_instructions: string;
}

export function BookingWorkflow({ trip, onClose }: BookingWorkflowProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [shipmentData, setShipmentData] = useState<ShipmentData>({
    title: '',
    description: '',
    weight_kg: 0,
    volume_m3: 0,
    estimated_value: 0,
    delivery_address: '',
    delivery_city: trip.arrival_city,
    delivery_country: trip.arrival_country,
    delivery_contact_name: '',
    delivery_contact_phone: '',
    special_instructions: ''
  });

  const totalSteps = 3;
  const progressPercentage = (currentStep / totalSteps) * 100;

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
    return `${price.toFixed(2)} ${getCurrencySymbol(currency)}`;
  };

  const handleInputChange = (field: keyof ShipmentData, value: string | number) => {
    setShipmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(shipmentData.title && shipmentData.description && shipmentData.weight_kg > 0);
      case 2:
        return !!(shipmentData.delivery_address && shipmentData.delivery_city && 
                 shipmentData.delivery_contact_name && shipmentData.delivery_contact_phone);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateEstimatedPrice = () => {
    return shipmentData.weight_kg * trip.price_per_kg;
  };

  const submitBooking = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Create shipment with pickup info from the trip
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          ...shipmentData,
          sender_id: user.id,
          pickup_address: trip.departure_city + ', ' + trip.departure_country,
          pickup_city: trip.departure_city,
          pickup_country: trip.departure_country,
          pickup_contact_name: trip.profiles?.first_name + ' ' + trip.profiles?.last_name,
          pickup_contact_phone: 'À définir avec le transporteur'
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      // Create match request
      const { error: matchError } = await supabase
        .from('match_requests')
        .insert({
          trip_id: trip.id,
          shipment_id: shipment.id,
          sender_id: user.id,
          traveler_id: trip.traveler_id,
          estimated_price: calculateEstimatedPrice(),
          message: shipmentData.special_instructions
        });

      if (matchError) throw matchError;

      toast({
        title: "Réservation envoyée !",
        description: "Votre demande de transport a été envoyée au transporteur. Vous recevrez une notification dès qu'il aura répondu.",
      });

      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la réservation. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Détails du colis</h3>
              <p className="text-muted-foreground">Décrivez votre envoi</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre du colis *</Label>
                <Input
                  id="title"
                  placeholder="ex: Documents importantes"
                  value={shipmentData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez le contenu du colis..."
                  value={shipmentData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="weight">Poids (kg) *</Label>
                  <Input
                    id="weight"
                    type="number"
                    step="0.1"
                    value={shipmentData.weight_kg}
                    onChange={(e) => handleInputChange('weight_kg', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="volume">Volume (m³)</Label>
                  <Input
                    id="volume"
                    type="number"
                    step="0.01"
                    value={shipmentData.volume_m3}
                    onChange={(e) => handleInputChange('volume_m3', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Valeur estimée</Label>
                  <div className="flex items-center">
                    <Input
                      id="value"
                      type="number"
                      value={shipmentData.estimated_value}
                      onChange={(e) => handleInputChange('estimated_value', parseFloat(e.target.value) || 0)}
                      className="flex-1"
                    />
                    <span className="ml-2 text-sm text-muted-foreground">
                      {getCurrencySymbol(trip.currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-success" />
              <h3 className="text-xl font-semibold">Adresse de livraison</h3>
              <p className="text-muted-foreground">Où livrer le colis</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="delivery_address">Adresse *</Label>
                <Input
                  id="delivery_address"
                  placeholder="456 Main Street"
                  value={shipmentData.delivery_address}
                  onChange={(e) => handleInputChange('delivery_address', e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_city">Ville *</Label>
                  <Input
                    id="delivery_city"
                    value={shipmentData.delivery_city}
                    onChange={(e) => handleInputChange('delivery_city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_country">Pays *</Label>
                  <Input
                    id="delivery_country"
                    value={shipmentData.delivery_country}
                    onChange={(e) => handleInputChange('delivery_country', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="delivery_contact_name">Nom du contact *</Label>
                  <Input
                    id="delivery_contact_name"
                    placeholder="Jane Smith"
                    value={shipmentData.delivery_contact_name}
                    onChange={(e) => handleInputChange('delivery_contact_name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="delivery_contact_phone">Téléphone *</Label>
                  <Input
                    id="delivery_contact_phone"
                    placeholder="+1 555 123 4567"
                    value={shipmentData.delivery_contact_phone}
                    onChange={(e) => handleInputChange('delivery_contact_phone', e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="special_instructions">Instructions spéciales</Label>
                <Textarea
                  id="special_instructions"
                  placeholder="Instructions particulières pour la livraison..."
                  value={shipmentData.special_instructions}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                />
              </div>
            </div>
          </div>
        );

      case 3:
        const estimatedPrice = calculateEstimatedPrice();
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Check className="h-12 w-12 mx-auto mb-4 text-success" />
              <h3 className="text-xl font-semibold">Confirmez votre réservation</h3>
              <p className="text-muted-foreground">Vérifiez les détails avant d'envoyer</p>
            </div>
            
            <div className="space-y-4">
              {/* Trip Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Trajet sélectionné
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">De</p>
                      <p className="font-medium">{trip.departure_city}, {trip.departure_country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">À</p>
                      <p className="font-medium">{trip.arrival_city}, {trip.arrival_country}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Transporteur</p>
                      <p className="font-medium">{trip.profiles?.first_name} {trip.profiles?.last_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Prix par kg</p>
                      <p className="font-medium">{formatPrice(trip.price_per_kg, trip.currency)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shipment Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Votre colis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Titre</p>
                      <p className="font-medium">{shipmentData.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Poids</p>
                      <p className="font-medium">{shipmentData.weight_kg} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Valeur estimée</p>
                      <p className="font-medium">
                        {shipmentData.estimated_value > 0 
                          ? formatPrice(shipmentData.estimated_value, trip.currency)
                          : 'Non spécifiée'
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Livraison</p>
                      <p className="text-sm">{shipmentData.delivery_city}, {shipmentData.delivery_country}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Price Summary */}
              <Card className="bg-success/10 border-success/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2 text-success">
                    <Euro className="h-5 w-5" />
                    Estimation du prix
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Prix par kg:</span>
                      <span>{formatPrice(trip.price_per_kg, trip.currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poids du colis:</span>
                      <span>{shipmentData.weight_kg} kg</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between font-semibold text-lg">
                        <span>Total estimé:</span>
                        <span className="text-success">{formatPrice(estimatedPrice, trip.currency)}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      * Prix final à confirmer par le transporteur
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Réserver ce trajet</DialogTitle>
        <DialogDescription>
          Suivez les étapes pour créer votre expédition et envoyer votre demande
        </DialogDescription>
      </DialogHeader>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Étape {currentStep} sur {totalSteps}</span>
          <span>{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {renderStep()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button 
          variant="outline" 
          onClick={prevStep}
          disabled={currentStep === 1}
        >
          Précédent
        </Button>
        
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>
            Annuler
          </Button>
          
          {currentStep < totalSteps ? (
            <Button 
              onClick={nextStep}
              disabled={!validateStep(currentStep)}
            >
              Suivant
            </Button>
          ) : (
            <Button 
              onClick={submitBooking}
              disabled={loading || !validateStep(currentStep)}
            >
              {loading ? 'Envoi...' : 'Confirmer la réservation'}
            </Button>
          )}
        </div>
      </div>
    </DialogContent>
  );
}