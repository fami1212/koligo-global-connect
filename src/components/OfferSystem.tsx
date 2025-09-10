import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Send, 
  Package, 
  MapPin, 
  Calendar, 
  Euro, 
  User, 
  Check, 
  X, 
  Clock,
  Truck,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Offer {
  id: string;
  shipment_id: string;
  traveler_id: string;
  sender_id: string;
  trip_id?: string;
  proposed_price: number;
  pickup_date: string;
  delivery_date: string;
  message?: string;
  status: string;
  created_at: string;
  expires_at: string;
  shipment?: any;
  traveler_profile?: any;
  sender_profile?: any;
}

interface OfferSystemProps {
  shipmentId?: string;
  mode: 'create' | 'manage';
}

export function OfferSystem({ shipmentId, mode }: OfferSystemProps) {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  const [offerData, setOfferData] = useState({
    proposed_price: '',
    pickup_date: '',
    delivery_date: '',
    message: ''
  });

  useEffect(() => {
    if (mode === 'manage' && user) {
      loadOffers();
    }
  }, [mode, user]);

  const loadOffers = async () => {
    if (!user) {
      console.log('No user found');
      return;
    }

    try {
      console.log('Loading offers for user:', user.id);
      setLoading(true);
      
      const { data: offersData, error } = await supabase
        .from('offers')
        .select(`
          *,
          shipment:shipments (
            title,
            pickup_city,
            delivery_city,
            weight_kg
          )
        `)
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      console.log('Offers query result:', { offersData, error });

      if (error) throw error;

      // Get profiles for offers
      const userIds = [...new Set([
        ...offersData?.map(o => o.sender_id) || [],
        ...offersData?.map(o => o.traveler_id) || []
      ])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rating, is_verified')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const offersWithProfiles = offersData?.map(offer => ({
        ...offer,
        traveler_profile: profilesMap.get(offer.traveler_id),
        sender_profile: profilesMap.get(offer.sender_id)
      })) || [];

      console.log('Final offers with profiles:', offersWithProfiles);
      setOffers(offersWithProfiles);
    } catch (error) {
      console.error('Error loading offers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les offres",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createOffer = async () => {
    if (!user || !shipmentId) return;

    try {
      setSubmitting(true);
      
      // First get the shipment to get sender_id
      const { data: shipmentData, error: shipmentError } = await supabase
        .from('shipments')
        .select('sender_id')
        .eq('id', shipmentId)
        .single();

      if (shipmentError) {
        console.error('Shipment error:', shipmentError);
        throw new Error('Colis introuvable');
      }

      if (!shipmentData?.sender_id) {
        throw new Error('Expéditeur introuvable');
      }

      // Validate dates
      if (!offerData.proposed_price || !offerData.pickup_date || !offerData.delivery_date) {
        throw new Error('Veuillez remplir tous les champs obligatoires');
      }

      const price = parseFloat(offerData.proposed_price);
      if (isNaN(price) || price <= 0) {
        throw new Error('Le prix doit être un nombre positif');
      }
      
      const { error } = await supabase
        .from('offers')
        .insert({
          shipment_id: shipmentId,
          traveler_id: user.id,
          sender_id: shipmentData.sender_id,
          proposed_price: price,
          pickup_date: offerData.pickup_date,
          delivery_date: offerData.delivery_date,
          message: offerData.message || null,
        });

      if (error) {
        console.error('Insert error:', error);
        throw error;
      }

      toast({
        title: "Offre envoyée",
        description: "Votre offre a été envoyée au client",
      });

      setShowCreateDialog(false);
      setOfferData({
        proposed_price: '',
        pickup_date: '',
        delivery_date: '',
        message: ''
      });
    } catch (error) {
      console.error('Error creating offer:', error);
      const errorMessage = error instanceof Error ? error.message : "Impossible d'envoyer l'offre";
      toast({
        title: "Erreur",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const respondToOffer = async (offerId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ status })
        .eq('id', offerId);

      if (error) throw error;

      toast({
        title: status === 'accepted' ? "Offre acceptée" : "Offre refusée",
        description: status === 'accepted' 
          ? "L'offre a été acceptée et une réservation va être créée"
          : "L'offre a été refusée",
      });

      loadOffers();
    } catch (error) {
      console.error('Error responding to offer:', error);
      toast({
        title: "Erreur",
        description: "Impossible de répondre à l'offre",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Acceptée</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Refusée</Badge>;
      case 'expired':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Expirée</Badge>;
      default:
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  if (mode === 'create' && hasRole('traveler')) {
    return (
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogTrigger asChild>
          <Button className="w-full">
            <Send className="h-4 w-4 mr-2" />
            Proposer mes services
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Proposer mes services</DialogTitle>
            <DialogDescription>
              Envoyez une offre personnalisée pour ce colis
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="price">Prix proposé (€)</Label>
              <Input
                id="price"
                type="number"
                placeholder="50"
                value={offerData.proposed_price}
                onChange={(e) => setOfferData(prev => ({...prev, proposed_price: e.target.value}))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_date">Date de collecte</Label>
                <Input
                  id="pickup_date"
                  type="date"
                  value={offerData.pickup_date}
                  onChange={(e) => setOfferData(prev => ({...prev, pickup_date: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="delivery_date">Date de livraison</Label>
                <Input
                  id="delivery_date"
                  type="date"
                  value={offerData.delivery_date}
                  onChange={(e) => setOfferData(prev => ({...prev, delivery_date: e.target.value}))}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="message">Message (optionnel)</Label>
              <Textarea
                id="message"
                placeholder="Présentez-vous et ajoutez des détails sur votre service..."
                value={offerData.message}
                onChange={(e) => setOfferData(prev => ({...prev, message: e.target.value}))}
              />
            </div>
            
            <div className="flex gap-2">
              <Button onClick={createOffer} disabled={submitting} className="flex-1">
                {submitting ? 'Envoi...' : 'Envoyer l\'offre'}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (mode === 'manage') {
    const receivedOffers = offers.filter(offer => offer.sender_id === user?.id);
    const sentOffers = offers.filter(offer => offer.traveler_id === user?.id);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Gestion des offres</h2>
        </div>

        <Tabs defaultValue="received" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="received">
              Offres reçues ({receivedOffers.length})
            </TabsTrigger>
            <TabsTrigger value="sent">
              Offres envoyées ({sentOffers.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="space-y-4">
            {receivedOffers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune offre reçue</p>
                </CardContent>
              </Card>
            ) : (
              receivedOffers.map((offer) => (
                <Card key={offer.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {offer.shipment?.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          {offer.traveler_profile?.first_name} {offer.traveler_profile?.last_name}
                          {offer.traveler_profile?.is_verified && (
                            <Badge variant="secondary" className="text-xs">Vérifié</Badge>
                          )}
                        </CardDescription>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-primary" />
                        <span className="font-medium">{offer.proposed_price}€</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{offer.shipment?.pickup_city} → {offer.shipment?.delivery_city}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Collecte:</span>
                        <p>{new Date(offer.pickup_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Livraison:</span>
                        <p>{new Date(offer.delivery_date).toLocaleDateString('fr-FR')}</p>
                      </div>
                    </div>

                    {offer.message && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Message:</span>
                        <p className="mt-1 p-2 bg-muted rounded text-sm">{offer.message}</p>
                      </div>
                    )}

                    {offer.status === 'pending' && (
                      <div className="flex gap-2 pt-2">
                        <Button 
                          onClick={() => respondToOffer(offer.id, 'accepted')}
                          size="sm" 
                          className="flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Accepter
                        </Button>
                        <Button 
                          onClick={() => respondToOffer(offer.id, 'rejected')}
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Refuser
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="sent" className="space-y-4">
            {sentOffers.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune offre envoyée</p>
                </CardContent>
              </Card>
            ) : (
              sentOffers.map((offer) => (
                <Card key={offer.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">
                          {offer.shipment?.title}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          <User className="h-4 w-4" />
                          {offer.sender_profile?.first_name} {offer.sender_profile?.last_name}
                        </CardDescription>
                      </div>
                      {getStatusBadge(offer.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Euro className="h-4 w-4 text-primary" />
                        <span className="font-medium">{offer.proposed_price}€</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>Expire le {new Date(offer.expires_at).toLocaleDateString('fr-FR')}</span>
                      </div>
                    </div>

                    {offer.message && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Votre message:</span>
                        <p className="mt-1 p-2 bg-muted rounded text-sm">{offer.message}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  return null;
}