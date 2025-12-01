import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Package, Check, Upload, User, Star, Shield, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  pickup_address?: string;
  delivery_address?: string;
  traveler_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    phone?: string;
    email: string;
  };
}

interface BookingWorkflowProps {
  trip: Trip;
  open: boolean;
  onClose: () => void;
}

interface ShipmentData {
  title: string;
  package_type: string;
  description: string;
  weight_kg: number;
  photo_url?: string;
}

const PACKAGE_TYPES = [
  "Documents",
  "Vêtements",
  "Électronique",
  "Alimentaire",
  "Médicaments",
  "Livres",
  "Jouets",
  "Cosmétiques",
  "Autre"
];

export function ImprovedBookingWorkflow({ trip, open, onClose }: BookingWorkflowProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(user ? 2 : 1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shipmentData, setShipmentData] = useState<ShipmentData>({
    title: '',
    package_type: '',
    description: '',
    weight_kg: 0
  });

  const totalSteps = user ? 3 : 4;
  const progressPercentage = (currentStep / totalSteps) * 100;

  const handleInputChange = (field: keyof ShipmentData, value: string | number) => {
    setShipmentData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const uploadPhoto = async (file: File) => {
    if (!file) return null;

    try {
      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('shipment-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('shipment-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader la photo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 2:
        return !!(shipmentData.title && shipmentData.package_type && shipmentData.description && shipmentData.weight_kg > 0);
      case 3:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !user) {
      navigate('/auth');
      return;
    }
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > (user ? 2 : 1)) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const calculateEstimatedPrice = () => {
    return shipmentData.weight_kg * trip.price_per_kg;
  };

  const submitBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { data: shipment, error: shipmentError } = await supabase
        .from('shipments')
        .insert({
          title: shipmentData.title,
          description: shipmentData.description,
          weight_kg: shipmentData.weight_kg,
          sender_id: user.id,
          pickup_address: trip.departure_city + ', ' + trip.departure_country,
          pickup_city: trip.departure_city,
          pickup_country: trip.departure_country,
          pickup_contact_name: trip.profiles?.first_name + ' ' + trip.profiles?.last_name,
          pickup_contact_phone: trip.profiles?.phone || 'À définir',
          delivery_address: trip.arrival_city + ', ' + trip.arrival_country,
          delivery_city: trip.arrival_city,
          delivery_country: trip.arrival_country,
          delivery_contact_name: 'À définir',
          delivery_contact_phone: 'À définir',
          photos: shipmentData.photo_url ? [shipmentData.photo_url] : null
        })
        .select()
        .single();

      if (shipmentError) throw shipmentError;

      const { error: matchError } = await supabase
        .from('match_requests')
        .insert({
          trip_id: trip.id,
          shipment_id: shipment.id,
          sender_id: user.id,
          traveler_id: trip.traveler_id,
          estimated_price: calculateEstimatedPrice()
        });

      if (matchError) throw matchError;

      toast({
        title: "Demande envoyée !",
        description: "Le GP va examiner votre demande et vous répondre rapidement.",
      });

      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande.",
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
          <div className="space-y-6 py-8">
            <div className="text-center">
              <User className="h-16 w-16 mx-auto mb-4 text-primary" />
              <h3 className="text-2xl font-semibold mb-2">Connexion requise</h3>
              <p className="text-muted-foreground">
                Créez un compte ou connectez-vous pour réserver ce trajet
              </p>
            </div>
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Vos informations sont sécurisées et ne seront partagées qu'avec le GP sélectionné.
              </AlertDescription>
            </Alert>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Package className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Détails du colis</h3>
              <p className="text-muted-foreground">Informations sur votre envoi</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  placeholder="Ex: Colis pour famille"
                  value={shipmentData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="package_type">Type de colis *</Label>
                <Select 
                  value={shipmentData.package_type} 
                  onValueChange={(val) => handleInputChange('package_type', val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner le type" />
                  </SelectTrigger>
                  <SelectContent>
                    {PACKAGE_TYPES.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Décrivez le contenu..."
                  value={shipmentData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                />
              </div>
              
              <div>
                <Label htmlFor="weight">Poids estimatif (kg) *</Label>
                <Input
                  id="weight"
                  type="number"
                  step="0.1"
                  value={shipmentData.weight_kg || ''}
                  onChange={(e) => handleInputChange('weight_kg', parseFloat(e.target.value) || 0)}
                />
              </div>

              <div>
                <Label htmlFor="photo">Photo du colis</Label>
                <Input
                  id="photo"
                  type="file"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadPhoto(file);
                      if (url) handleInputChange('photo_url', url);
                    }
                  }}
                  disabled={uploading}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {uploading ? 'Upload en cours...' : 'Optionnel - JPG, PNG (max 5MB)'}
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        const estimatedPrice = calculateEstimatedPrice();
        
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <User className="h-12 w-12 mx-auto mb-4 text-primary" />
              <h3 className="text-xl font-semibold">Informations du GP</h3>
              <p className="text-muted-foreground">Votre transporteur</p>
            </div>

            <Card className="border-2 border-primary/20">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">
                          {trip.profiles?.first_name} {trip.profiles?.last_name}
                        </h4>
                        {trip.profiles?.is_verified && (
                          <Badge variant="outline" className="bg-success/10 text-success border-success">
                            <Shield className="h-3 w-3 mr-1" />
                            Vérifié
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-warning text-warning" />
                        <span>{trip.profiles?.rating?.toFixed(1) || '5.0'}</span>
                        <span>({trip.profiles?.total_reviews || 0} avis)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Adresse de dépôt
                    </p>
                    <p className="font-medium">{trip.pickup_address || `${trip.departure_city}, ${trip.departure_country}`}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Adresse de récupération
                    </p>
                    <p className="font-medium">{trip.delivery_address || `${trip.arrival_city}, ${trip.arrival_country}`}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Résumé de la réservation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Type de colis:</span>
                  <span className="font-medium">{shipmentData.package_type}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Poids:</span>
                  <span className="font-medium">{shipmentData.weight_kg} kg</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Prix par kg:</span>
                  <span className="font-medium">{trip.price_per_kg.toFixed(2)} {trip.currency}</span>
                </div>
                <div className="border-t pt-3 mt-3">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total estimé:</span>
                    <span className="text-primary">{estimatedPrice.toFixed(2)} {trip.currency}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  * Prix final à confirmer par le GP
                </p>
              </CardContent>
            </Card>

            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                Une fois votre demande envoyée, le GP l'examinera et vous répondra rapidement. Vous serez notifié de sa décision.
              </AlertDescription>
            </Alert>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Choisir ce trajet</DialogTitle>
          <DialogDescription>
            {currentStep === 1 ? 'Connectez-vous pour continuer' : 'Complétez les étapes pour réserver'}
          </DialogDescription>
        </DialogHeader>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Étape {currentStep} sur {totalSteps}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <div className="flex justify-between pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={prevStep}
            disabled={currentStep === (user ? 2 : 1)}
          >
            Précédent
          </Button>
          
          {currentStep < totalSteps ? (
            <Button 
              onClick={nextStep}
              disabled={!validateStep(currentStep) || uploading}
            >
              {currentStep === 1 ? "Se connecter" : "Suivant"}
            </Button>
          ) : (
            <Button 
              onClick={submitBooking}
              disabled={loading || uploading}
            >
              {loading ? 'Envoi...' : 'Envoyer la demande'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}