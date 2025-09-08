import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Package, 
  Clock, 
  CheckCircle2, 
  Truck, 
  AlertCircle,
  Phone,
  MessageCircle,
  Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location: string;
  created_at: string;
  photo_url?: string;
}

interface Assignment {
  id: string;
  shipment_id: string;
  traveler_id: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  shipment: {
    title: string;
    pickup_city: string;
    delivery_city: string;
  };
  traveler_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string;
    phone: string;
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pickup_completed': return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'in_transit': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'delivered': return 'bg-green-100 text-green-800 border-green-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pickup_completed': return <Package className="h-4 w-4" />;
    case 'in_transit': return <Truck className="h-4 w-4" />;
    case 'delivered': return <CheckCircle2 className="h-4 w-4" />;
    default: return <Clock className="h-4 w-4" />;
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'pickup_completed': return 'Colis récupéré';
    case 'in_transit': return 'En transit';
    case 'delivered': return 'Livré';
    default: return 'En attente';
  }
};

interface ModernTrackingProps {
  assignmentId: string;
}

export function ModernTracking({ assignmentId }: ModernTrackingProps) {
  const { toast } = useToast();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrackingData();
  }, [assignmentId]);

  const loadTrackingData = async () => {
    try {
      setLoading(true);
      
      // Load assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select('*')
        .eq('id', assignmentId)
        .single();

      if (assignmentError) throw assignmentError;

      // Get shipment details
      const { data: shipmentData } = await supabase
        .from('shipments')
        .select('title, pickup_city, delivery_city')
        .eq('id', assignmentData.shipment_id)
        .single();

      // Get traveler profile
      const { data: travelerData } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url, phone')
        .eq('user_id', assignmentData.traveler_id)
        .single();

      const enrichedAssignment = {
        ...assignmentData,
        shipment: shipmentData || { title: '', pickup_city: '', delivery_city: '' },
        traveler_profile: travelerData || { first_name: '', last_name: '', avatar_url: '', phone: '' }
      };

      setAssignment(enrichedAssignment);

      // Load tracking events
      const { data: eventsData, error: eventsError } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (eventsError) throw eventsError;

      setTrackingEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading tracking data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données de suivi",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    if (assignment?.delivery_completed_at) return 'delivered';
    if (assignment?.pickup_completed_at) return 'in_transit';
    return 'pending';
  };

  const startCall = async () => {
    try {
      const { error } = await supabase
        .from('call_logs')
        .insert({
          caller_id: assignment?.traveler_id, // Current user calling
          callee_id: assignment?.traveler_id, // Traveler being called
          conversation_id: assignmentId, // Use assignment as conversation
          call_type: 'audio',
          status: 'initiated'
        });

      if (error) throw error;

      toast({
        title: "Appel initié",
        description: "Connexion avec le transporteur...",
      });
    } catch (error) {
      console.error('Error starting call:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'initier l'appel",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Aucune information de suivi disponible</p>
        </CardContent>
      </Card>
    );
  }

  const currentStatus = getCurrentStatus();

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon(currentStatus)}
              {assignment.shipment.title}
            </CardTitle>
            <Badge className={getStatusColor(currentStatus)}>
              {getStatusText(currentStatus)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Route */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Trajet</h4>
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="font-semibold">{assignment.shipment.pickup_city}</p>
                </div>
                <div className="flex-1 flex items-center">
                  <div className="h-px bg-border flex-1"></div>
                  <Package className="h-4 w-4 text-primary mx-2" />
                  <div className="h-px bg-border flex-1"></div>
                </div>
                <div className="text-center">
                  <p className="font-semibold">{assignment.shipment.delivery_city}</p>
                </div>
              </div>
            </div>

            {/* Traveler Info */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Transporteur</h4>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={assignment.traveler_profile.avatar_url} />
                  <AvatarFallback>
                    {assignment.traveler_profile.first_name[0]}
                    {assignment.traveler_profile.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {assignment.traveler_profile.first_name} {assignment.traveler_profile.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {assignment.traveler_profile.phone}
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-muted-foreground">Contact</h4>
              <div className="flex gap-2">
                <Button onClick={startCall} size="sm" variant="outline" className="flex-1">
                  <Phone className="h-4 w-4 mr-2" />
                  Appeler
                </Button>
                <Button size="sm" variant="outline" className="flex-1">
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Suivi du colis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Step 1: Pickup */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                assignment.pickup_completed_at 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {assignment.pickup_completed_at ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <Package className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium">Colis récupéré</p>
                <p className="text-sm text-muted-foreground">
                  {assignment.pickup_completed_at 
                    ? `Le ${new Date(assignment.pickup_completed_at).toLocaleString('fr-FR')}`
                    : 'En attente de récupération'
                  }
                </p>
              </div>
            </div>

            {/* Connecting line */}
            <div className="ml-4 w-px h-6 bg-border"></div>

            {/* Step 2: In Transit */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                assignment.pickup_completed_at && !assignment.delivery_completed_at
                  ? 'bg-yellow-100 text-yellow-600' 
                  : assignment.delivery_completed_at
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">En transit</p>
                <p className="text-sm text-muted-foreground">
                  {assignment.pickup_completed_at && !assignment.delivery_completed_at
                    ? 'Colis en cours de transport'
                    : assignment.delivery_completed_at
                    ? 'Transport terminé'
                    : 'En attente'
                  }
                </p>
              </div>
            </div>

            {/* Connecting line */}
            <div className="ml-4 w-px h-6 bg-border"></div>

            {/* Step 3: Delivered */}
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                assignment.delivery_completed_at 
                  ? 'bg-green-100 text-green-600' 
                  : 'bg-gray-100 text-gray-400'
              }`}>
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Livré</p>
                <p className="text-sm text-muted-foreground">
                  {assignment.delivery_completed_at 
                    ? `Le ${new Date(assignment.delivery_completed_at).toLocaleString('fr-FR')}`
                    : 'En attente de livraison'
                  }
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events Timeline */}
      {trackingEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Historique des événements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trackingEvents.map((event, index) => (
                <div key={event.id} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium">{event.event_type}</p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleString('fr-FR')}
                      </span>
                    </div>
                    {event.description && (
                      <p className="text-sm text-muted-foreground mb-1">{event.description}</p>
                    )}
                    {event.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {event.location}
                      </p>
                    )}
                    {event.photo_url && (
                      <div className="mt-2">
                        <img 
                          src={event.photo_url} 
                          alt="Event photo" 
                          className="w-32 h-24 object-cover rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}