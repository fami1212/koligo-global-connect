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
  Camera,
  Phone,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Assignment {
  id: string;
  shipment_id: string;
  trip_id: string;
  sender_id: string;
  traveler_id: string;
  payment_status: string;
  pickup_completed_at?: string;
  delivery_completed_at?: string;
  shipments?: {
    title: string;
    pickup_city: string;
    delivery_city: string;
    weight_kg: number;
  };
  trips?: {
    departure_date: string;
    transport_type: string;
  };
}

interface StatusTrackerProps {
  assignment: Assignment;
  onStatusUpdate?: () => void;
}

const statusOptions = [
  { value: 'pending', label: 'En attente', icon: Clock, color: 'text-yellow-600' },
  { value: 'pickup_ready', label: 'Prêt pour collecte', icon: Package, color: 'text-blue-600' },
  { value: 'in_transit', label: 'En transit', icon: Truck, color: 'text-purple-600' },
  { value: 'out_for_delivery', label: 'En cours de livraison', icon: MapPin, color: 'text-orange-600' },
  { value: 'delivered', label: 'Livré', icon: CheckCircle, color: 'text-green-600' },
  { value: 'payment_pending', label: 'En attente de paiement', icon: AlertCircle, color: 'text-red-600' },
];

export function StatusTracker({ assignment, onStatusUpdate }: StatusTrackerProps) {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [currentStatus, setCurrentStatus] = useState('pending');
  const [trackingEvents, setTrackingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newEventType, setNewEventType] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [updateLocation, setUpdateLocation] = useState(false);

  const isTraveler = hasRole('traveler') && user?.id === assignment.traveler_id;
  const isSender = hasRole('sender') && user?.id === assignment.sender_id;

  useEffect(() => {
    loadTrackingEvents();
    determineCurrentStatus();
  }, [assignment]);

  const loadTrackingEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('assignment_id', assignment.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrackingEvents(data || []);
    } catch (error) {
      console.error('Error loading tracking events:', error);
    }
  };

  const determineCurrentStatus = () => {
    if (assignment.delivery_completed_at) {
      if (assignment.payment_status === 'completed') {
        setCurrentStatus('delivered');
      } else {
        setCurrentStatus('payment_pending');
      }
    } else if (assignment.pickup_completed_at) {
      // Check latest tracking event
      const latestEvent = trackingEvents[0];
      if (latestEvent) {
        setCurrentStatus(latestEvent.event_type);
      } else {
        setCurrentStatus('in_transit');
      }
    } else {
      setCurrentStatus('pending');
    }
  };

  const updateStatus = async () => {
    if (!isTraveler || !newEventType) return;

    try {
      setLoading(true);
      
      let location = null;
      let latitude = null;
      let longitude = null;

      // Get location if requested
      if (updateLocation && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000
            });
          });
          
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
          
          // Reverse geocoding (simplified)
          location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        } catch (error) {
          console.warn('Could not get location:', error);
        }
      }

      // Create tracking event
      const { error } = await supabase
        .from('tracking_events')
        .insert({
          assignment_id: assignment.id,
          event_type: newEventType,
          description: newEventDescription || statusOptions.find(s => s.value === newEventType)?.label,
          location,
          latitude,
          longitude,
          created_by: user?.id
        });

      if (error) throw error;

      // Update assignment status if necessary
      if (newEventType === 'pickup_ready' && !assignment.pickup_completed_at) {
        await supabase
          .from('assignments')
          .update({ pickup_completed_at: new Date().toISOString() })
          .eq('id', assignment.id);
      } else if (newEventType === 'delivered' && !assignment.delivery_completed_at) {
        await supabase
          .from('assignments')
          .update({ delivery_completed_at: new Date().toISOString() })
          .eq('id', assignment.id);
      }

      toast({
        title: "Statut mis à jour",
        description: "L'état du colis a été mis à jour avec succès",
      });

      // Reset form
      setNewEventType('');
      setNewEventDescription('');
      setUpdateLocation(false);
      
      // Reload data
      loadTrackingEvents();
      onStatusUpdate?.();
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

  const getCurrentStatusInfo = () => {
    return statusOptions.find(s => s.value === currentStatus) || statusOptions[0];
  };

  const statusInfo = getCurrentStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
            Statut actuel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Badge 
                variant={currentStatus === 'delivered' ? 'default' : 'secondary'}
                className="text-sm"
              >
                {statusInfo.label}
              </Badge>
              <p className="text-sm text-muted-foreground mt-1">
                {assignment.shipments?.title}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4 mr-1" />
                Appeler
              </Button>
              <Button size="sm" variant="outline">
                <MessageCircle className="h-4 w-4 mr-1" />
                Message
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Update (Traveler only) */}
      {isTraveler && (
        <Card>
          <CardHeader>
            <CardTitle>Mettre à jour le statut</CardTitle>
            <CardDescription>
              Informez l'expéditeur de l'état actuel du colis
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="status">Nouveau statut</Label>
              <Select value={newEventType} onValueChange={setNewEventType}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      <div className="flex items-center gap-2">
                        <status.icon className={`h-4 w-4 ${status.color}`} />
                        {status.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (optionnel)</Label>
              <Textarea
                id="description"
                value={newEventDescription}
                onChange={(e) => setNewEventDescription(e.target.value)}
                placeholder="Détails supplémentaires..."
                rows={3}
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="location"
                checked={updateLocation}
                onChange={(e) => setUpdateLocation(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="location" className="text-sm">
                Inclure ma position actuelle
              </Label>
            </div>

            <Button 
              onClick={updateStatus} 
              disabled={!newEventType || loading}
              className="w-full"
            >
              {loading ? 'Mise à jour...' : 'Mettre à jour le statut'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Historique du suivi</CardTitle>
        </CardHeader>
        <CardContent>
          {trackingEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun événement de suivi pour le moment
            </p>
          ) : (
            <div className="space-y-4">
              {trackingEvents.map((event, index) => {
                const eventStatus = statusOptions.find(s => s.value === event.event_type);
                const EventIcon = eventStatus?.icon || Clock;
                
                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`p-2 rounded-full bg-muted ${eventStatus?.color || 'text-muted-foreground'}`}>
                        <EventIcon className="h-4 w-4" />
                      </div>
                      {index < trackingEvents.length - 1 && (
                        <div className="w-px h-8 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          {eventStatus?.label || event.event_type}
                        </h4>
                        <span className="text-sm text-muted-foreground">
                          {new Date(event.created_at).toLocaleString('fr-FR')}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {event.description}
                        </p>
                      )}
                      {event.location && (
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {event.location}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progression</span>
            <span className="text-sm text-muted-foreground">
              {Math.round((statusOptions.findIndex(s => s.value === currentStatus) + 1) / statusOptions.length * 100)}%
            </span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${(statusOptions.findIndex(s => s.value === currentStatus) + 1) / statusOptions.length * 100}%` 
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}