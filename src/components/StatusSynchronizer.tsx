import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  Package, 
  Truck, 
  MapPin, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  CreditCard,
  Camera
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  sender_id: string;
  traveler_id: string;
  final_price: number;
  payment_status: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  shipment?: {
    title: string;
    pickup_city: string;
    delivery_city: string;
  };
}

interface StatusSynchronizerProps {
  assignment: Assignment;
  userRole: 'sender' | 'traveler';
  onStatusUpdate?: () => void;
}

export function StatusSynchronizer({ assignment, userRole, onStatusUpdate }: StatusSynchronizerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [updating, setUpdating] = useState(false);
  const [notes, setNotes] = useState('');

  const getCurrentStatus = () => {
    if (assignment.delivery_completed_at) return 'delivered';
    if (assignment.pickup_completed_at) return 'in_transit';
    if (assignment.payment_status === 'released') return 'ready_for_pickup';
    return 'pending_payment';
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'En attente de paiement';
      case 'ready_for_pickup':
        return 'Prêt pour collecte';
      case 'in_transit':
        return 'En transit';
      case 'delivered':
        return 'Livré';
      default:
        return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending_payment':
        return 'secondary';
      case 'ready_for_pickup':
        return 'default';
      case 'in_transit':
        return 'default';
      case 'delivered':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const updateStatus = async (newStatus: string) => {
    if (!user || userRole !== 'traveler') return;

    try {
      setUpdating(true);
      
      let updateData: any = {};
      
      switch (newStatus) {
        case 'pickup_completed':
          updateData.pickup_completed_at = new Date().toISOString();
          break;
        case 'delivery_completed':
          updateData.delivery_completed_at = new Date().toISOString();
          break;
      }

      const { error } = await supabase
        .from('assignments')
        .update(updateData)
        .eq('id', assignment.id);

      if (error) throw error;

      // Create tracking event
      await supabase
        .from('tracking_events')
        .insert({
          assignment_id: assignment.id,
          event_type: newStatus === 'pickup_completed' ? 'pickup' : 'delivery',
          description: notes || `${newStatus === 'pickup_completed' ? 'Colis collecté' : 'Colis livré'}`,
          location: newStatus === 'pickup_completed' 
            ? assignment.shipment?.pickup_city 
            : assignment.shipment?.delivery_city,
          created_by: user.id
        });

      toast({
        title: "Statut mis à jour",
        description: newStatus === 'pickup_completed' 
          ? "Collecte confirmée" 
          : "Livraison confirmée",
      });

      onStatusUpdate?.();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setNotes('');
    }
  };

  const currentStatus = getCurrentStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Statut de la livraison
        </CardTitle>
        <CardDescription>
          {assignment.shipment?.title}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <span className="text-sm font-medium">Statut actuel:</span>
          <Badge variant={getStatusColor(currentStatus) as any}>
            {getStatusText(currentStatus)}
          </Badge>
        </div>

        {/* Status Timeline */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              assignment.payment_status === 'released' 
                ? 'bg-green-500' 
                : 'bg-gray-300'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Paiement effectué</p>
              <p className="text-xs text-muted-foreground">
                {assignment.payment_status === 'released' ? 'Complété' : 'En attente'}
              </p>
            </div>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              assignment.pickup_completed_at 
                ? 'bg-green-500' 
                : assignment.payment_status === 'released' 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-300'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Collecte</p>
              <p className="text-xs text-muted-foreground">
                {assignment.pickup_completed_at 
                  ? `Complété le ${new Date(assignment.pickup_completed_at).toLocaleDateString('fr-FR')}`
                  : assignment.payment_status === 'released' 
                    ? 'Prêt pour collecte'
                    : 'En attente du paiement'
                }
              </p>
            </div>
            <Package className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${
              assignment.delivery_completed_at 
                ? 'bg-green-500' 
                : assignment.pickup_completed_at 
                  ? 'bg-yellow-500' 
                  : 'bg-gray-300'
            }`} />
            <div className="flex-1">
              <p className="text-sm font-medium">Livraison</p>
              <p className="text-xs text-muted-foreground">
                {assignment.delivery_completed_at 
                  ? `Complété le ${new Date(assignment.delivery_completed_at).toLocaleDateString('fr-FR')}`
                  : assignment.pickup_completed_at 
                    ? 'En cours de livraison'
                    : 'En attente de collecte'
                }
              </p>
            </div>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Actions for Traveler */}
        {userRole === 'traveler' && user?.id === assignment.traveler_id && (
          <div className="space-y-4 pt-4 border-t">
            <div>
              <Label htmlFor="notes">Notes (optionnel)</Label>
              <Textarea
                id="notes"
                placeholder="Ajoutez des informations sur cette étape..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 gap-2">
              {!assignment.pickup_completed_at && assignment.payment_status === 'released' && (
                <Button 
                  onClick={() => updateStatus('pickup_completed')}
                  disabled={updating}
                  className="w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {updating ? 'Mise à jour...' : 'Confirmer la collecte'}
                </Button>
              )}

              {assignment.pickup_completed_at && !assignment.delivery_completed_at && (
                <Button 
                  onClick={() => updateStatus('delivery_completed')}
                  disabled={updating}
                  className="w-full"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {updating ? 'Mise à jour...' : 'Confirmer la livraison'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Info for Sender */}
        {userRole === 'sender' && (
          <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
            <p className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              Le transporteur mettra à jour le statut à chaque étape de la livraison.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}