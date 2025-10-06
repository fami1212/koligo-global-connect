import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  MapPin, 
  Camera,
  Upload
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  sender_id: string;
  traveler_id: string;
  pickup_completed_at: string;
  delivery_completed_at: string;
  payment_status: string;
  shipment?: {
    title: string;
    pickup_city: string;
    delivery_city: string;
  };
}

interface StatusUpdaterProps {
  assignment: Assignment;
  userRole: 'sender' | 'traveler';
  onStatusUpdate: () => void;
}

export function StatusUpdater({ assignment, userRole, onStatusUpdate }: StatusUpdaterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPickupDialog, setShowPickupDialog] = useState(false);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [eventData, setEventData] = useState({
    location: '',
    description: '',
    photo: null as File | null
  });

  if (userRole !== 'traveler') {
    return null;
  }

  const canUpdatePickup = !assignment.pickup_completed_at && assignment.payment_status === 'released';
  const canUpdateDelivery = assignment.pickup_completed_at && !assignment.delivery_completed_at;

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('proof-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('proof-photos')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const updateStatus = async (eventType: 'pickup' | 'delivery') => {
    if (!user) return;

    // Create a stable key to prevent re-renders during submission
    const submissionKey = `${assignment.id}-${eventType}-${Date.now()}`;

    try {
      setLoading(true);
      
      let photoUrl = null;
      if (eventData.photo) {
        photoUrl = await uploadPhoto(eventData.photo);
      }

      // Create tracking event
      const { error: eventError } = await supabase
        .from('tracking_events')
        .insert({
          assignment_id: assignment.id,
          event_type: eventType,
          description: eventData.description,
          location: eventData.location,
          photo_url: photoUrl,
          created_by: user.id,
        });

      if (eventError) throw eventError;

      // Update assignment status
      const updateData = eventType === 'pickup' 
        ? { pickup_completed_at: new Date().toISOString() }
        : { delivery_completed_at: new Date().toISOString() };

      const { error: assignmentError } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', assignment.id);

      if (assignmentError) throw assignmentError;

      toast({
        title: eventType === 'pickup' ? "Collecte confirmée" : "Livraison confirmée",
        description: "Le statut a été mis à jour avec succès",
      });

      setEventData({ location: '', description: '', photo: null });
      if (eventType === 'pickup') {
        setShowPickupDialog(false);
      } else {
        setShowDeliveryDialog(false);
      }
      onStatusUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, eventType: 'pickup' | 'delivery') => {
    const file = e.target.files?.[0];
    if (file) {
      // Immediately stop propagation to prevent re-render loops
      e.stopPropagation();
      setEventData(prev => ({ ...prev, photo: file }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Truck className="h-5 w-5" />
          Mettre à jour le statut
        </CardTitle>
        <CardDescription>
          Informez le client de l'avancement de la livraison
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              <span className="text-sm">Collecte</span>
            </div>
            {assignment.pickup_completed_at ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Terminé
              </Badge>
            ) : (
              <Badge variant="outline">En attente</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4" />
              <span className="text-sm">En transit</span>
            </div>
            {assignment.pickup_completed_at && !assignment.delivery_completed_at ? (
              <Badge className="bg-blue-100 text-blue-800">En cours</Badge>
            ) : assignment.delivery_completed_at ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Terminé
              </Badge>
            ) : (
              <Badge variant="outline">En attente</Badge>
            )}
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Livraison</span>
            </div>
            {assignment.delivery_completed_at ? (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Terminé
              </Badge>
            ) : (
              <Badge variant="outline">En attente</Badge>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {canUpdatePickup && (
            <Dialog open={showPickupDialog} onOpenChange={setShowPickupDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Confirmer la collecte
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la collecte</DialogTitle>
                  <DialogDescription>
                    Signalez que vous avez récupéré le colis
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickup-location">Lieu de collecte</Label>
                    <Input
                      id="pickup-location"
                      placeholder="Adresse ou description du lieu"
                      value={eventData.location}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEventData(prev => ({ ...prev, location: e.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickup-description">Description (optionnel)</Label>
                    <Textarea
                      id="pickup-description"
                      placeholder="Commentaires sur la collecte..."
                      value={eventData.description}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEventData(prev => ({ ...prev, description: e.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickup-photo">Photo de preuve (optionnel)</Label>
                    <Input
                      id="pickup-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'pickup')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateStatus('pickup')} 
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Confirmation...' : 'Confirmer la collecte'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowPickupDialog(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {canUpdateDelivery && (
            <Dialog open={showDeliveryDialog} onOpenChange={setShowDeliveryDialog}>
              <DialogTrigger asChild>
                <Button className="w-full" size="sm">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmer la livraison
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la livraison</DialogTitle>
                  <DialogDescription>
                    Signalez que vous avez livré le colis
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="delivery-location">Lieu de livraison</Label>
                    <Input
                      id="delivery-location"
                      placeholder="Adresse ou description du lieu"
                      value={eventData.location}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEventData(prev => ({ ...prev, location: e.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery-description">Description (optionnel)</Label>
                    <Textarea
                      id="delivery-description"
                      placeholder="Commentaires sur la livraison..."
                      value={eventData.description}
                      onChange={(e) => {
                        e.stopPropagation();
                        setEventData(prev => ({ ...prev, description: e.target.value }));
                      }}
                    />
                  </div>
                  <div>
                    <Label htmlFor="delivery-photo">Photo de preuve (optionnel)</Label>
                    <Input
                      id="delivery-photo"
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileChange(e, 'delivery')}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => updateStatus('delivery')} 
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? 'Confirmation...' : 'Confirmer la livraison'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowDeliveryDialog(false)}>
                      Annuler
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardContent>
    </Card>
  );
}