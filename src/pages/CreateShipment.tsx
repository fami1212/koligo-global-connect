import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Package, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { MediaUpload } from '@/components/MediaUpload';

export default function CreateShipment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    const shipmentData = {
      sender_id: user.id,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      pickup_address: formData.get('pickupAddress') as string,
      pickup_city: formData.get('pickupCity') as string,
      pickup_country: formData.get('pickupCountry') as string,
      pickup_contact_name: formData.get('pickupContactName') as string,
      pickup_contact_phone: formData.get('pickupContactPhone') as string,
      delivery_address: formData.get('deliveryAddress') as string,
      delivery_city: formData.get('deliveryCity') as string,
      delivery_country: formData.get('deliveryCountry') as string,
      delivery_contact_name: formData.get('deliveryContactName') as string,
      delivery_contact_phone: formData.get('deliveryContactPhone') as string,
      weight_kg: parseFloat(formData.get('weight') as string),
      volume_m3: parseFloat(formData.get('volume') as string) || null,
      estimated_value: parseFloat(formData.get('estimatedValue') as string) || null,
      special_instructions: formData.get('specialInstructions') as string || null,
      photos: uploadedPhotos,
    };

    try {
      const { error } = await supabase
        .from('shipments')
        .insert([shipmentData]);

      if (error) throw error;

      toast({
        title: "Colis créé avec succès",
        description: "Votre demande de livraison a été créée.",
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating shipment:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du colis.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <div className="mb-6 sm:mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-3 sm:mb-4 text-sm sm:text-base">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Package className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
            Créer un colis
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Remplissez les informations de votre colis pour trouver un transporteur
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-8">
          {/* Package Information */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-lg sm:text-xl">Informations du colis</CardTitle>
              <CardDescription className="text-sm">Décrivez votre colis et ses caractéristiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="title">Titre du colis</Label>
              <Input
                id="title"
                name="title"
                required
                placeholder="Ex: Documents importants"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Décrivez le contenu du colis..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weight" className="text-sm">Poids (kg)</Label>
                <Input
                  id="weight"
                  name="weight"
                  type="number"
                  step="0.1"
                  min="0"
                  required
                  placeholder="2.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="volume" className="text-sm">Volume (m³) - optionnel</Label>
                <Input
                  id="volume"
                  name="volume"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.05"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Valeur estimée (€) - optionnel</Label>
              <Input
                id="estimatedValue"
                name="estimatedValue"
                type="number"
                min="0"
                placeholder="100"
              />
            </div>
          </CardContent>
        </Card>

          {/* Pickup Information */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                Lieu de récupération
              </CardTitle>
              <CardDescription className="text-sm">Où le transporteur doit-il récupérer le colis ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="pickupAddress">Adresse complète</Label>
              <Input
                id="pickupAddress"
                name="pickupAddress"
                required
                placeholder="123 Rue de la Paix"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickupCity" className="text-sm">Ville</Label>
                <Input
                  id="pickupCity"
                  name="pickupCity"
                  required
                  placeholder="Paris"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupCountry" className="text-sm">Pays</Label>
                <Input
                  id="pickupCountry"
                  name="pickupCountry"
                  required
                  placeholder="France"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="pickupContactName" className="text-sm">Nom du contact</Label>
                <Input
                  id="pickupContactName"
                  name="pickupContactName"
                  required
                  placeholder="Jean Dupont"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickupContactPhone" className="text-sm">Téléphone du contact</Label>
                <Input
                  id="pickupContactPhone"
                  name="pickupContactPhone"
                  required
                  placeholder="+33 1 23 45 67 89"
                />
              </div>
            </div>
          </CardContent>
        </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MapPin className="h-5 w-5 text-success" />
                Lieu de livraison
              </CardTitle>
              <CardDescription className="text-sm">Où le colis doit-il être livré ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
            <div className="space-y-2">
              <Label htmlFor="deliveryAddress">Adresse complète</Label>
              <Input
                id="deliveryAddress"
                name="deliveryAddress"
                required
                placeholder="456 Avenue de la Liberté"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryCity">Ville</Label>
                <Input
                  id="deliveryCity"
                  name="deliveryCity"
                  required
                  placeholder="Lyon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryCountry">Pays</Label>
                <Input
                  id="deliveryCountry"
                  name="deliveryCountry"
                  required
                  placeholder="France"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deliveryContactName">Nom du destinataire</Label>
                <Input
                  id="deliveryContactName"
                  name="deliveryContactName"
                  required
                  placeholder="Marie Martin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryContactPhone">Téléphone du destinataire</Label>
                <Input
                  id="deliveryContactPhone"
                  name="deliveryContactPhone"
                  required
                  placeholder="+33 4 56 78 90 12"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Photos */}
        <Card>
          <CardHeader>
            <CardTitle>Photos du colis</CardTitle>
            <CardDescription>Ajoutez des photos de votre colis (optionnel)</CardDescription>
          </CardHeader>
          <CardContent>
            <MediaUpload
              bucket="shipment-photos"
              multiple={true}
              maxFiles={5}
              onUploadComplete={(urls) => setUploadedPhotos(urls)}
            />
          </CardContent>
        </Card>

        {/* Special Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instructions spéciales</CardTitle>
            <CardDescription>Ajoutez des informations importantes pour le transporteur</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              name="specialInstructions"
              placeholder="Ex: Colis fragile, livraison en main propre uniquement..."
              rows={3}
            />
          </CardContent>
        </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-16 sm:bottom-0 bg-background/95 backdrop-blur-sm p-4 sm:p-0 -mx-3 sm:mx-0 border-t sm:border-t-0 border-border/50">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 h-11 sm:h-10">
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1 h-11 sm:h-10">
              {isLoading ? "Création..." : "Créer le colis"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}