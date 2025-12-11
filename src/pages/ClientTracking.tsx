import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { InstantMessaging } from '@/components/InstantMessaging';
import { TrackingMap } from '@/components/TrackingMap';
import { 
  MapPin, 
  Package, 
  Truck, 
  MessageCircle,
  CheckCircle,
  Clock,
  Navigation,
  Phone,
  User,
  ArrowRight,
  RefreshCw,
  Map
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  sender_id: string;
  traveler_id: string;
  final_price: number;
  payment_status: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  created_at: string;
  shipment?: {
    title: string;
    pickup_city: string;
    pickup_country: string;
    delivery_city: string;
    delivery_country: string;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
    weight_kg: number;
  };
  trip?: {
    departure_date: string;
    arrival_date: string;
    transport_type: string;
    currency: string;
  };
  traveler_profile?: {
    first_name: string;
    last_name: string;
    phone: string;
    rating: number;
  };
}

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  photo_url: string | null;
}

export default function ClientTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAssignment) {
      loadTrackingEvents(selectedAssignment.id);
      loadConversation(selectedAssignment);
      
      // Subscribe to real-time tracking updates
      const channel = supabase
        .channel(`tracking-${selectedAssignment.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'tracking_events',
            filter: `assignment_id=eq.${selectedAssignment.id}`
          },
          (payload) => {
            const newEvent = payload.new as TrackingEvent;
            setTrackingEvents(prev => [...prev, newEvent]);
            if (newEvent.latitude && newEvent.longitude) {
              setLastLocation({ lat: newEvent.latitude, lng: newEvent.longitude });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedAssignment]);

  const loadAssignments = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Only load assignments where user is the SENDER (client)
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipment:shipments(title, pickup_city, pickup_country, delivery_city, delivery_country, pickup_contact_name, pickup_contact_phone, delivery_contact_name, delivery_contact_phone, weight_kg),
          trip:trips(departure_date, arrival_date, transport_type, currency)
        `)
        .eq('sender_id', user.id)
        .is('delivery_completed_at', null) // Only show non-delivered
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get traveler profiles
      const travelerIds = [...new Set(data?.map(a => a.traveler_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, rating')
        .in('user_id', travelerIds);

      const assignmentsWithProfiles = data?.map(assignment => ({
        ...assignment,
        traveler_profile: profiles?.find(p => p.user_id === assignment.traveler_id)
      })) || [];

      setAssignments(assignmentsWithProfiles);
      
      if (assignmentsWithProfiles.length > 0 && !selectedAssignment) {
        setSelectedAssignment(assignmentsWithProfiles[0]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos colis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadTrackingEvents = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTrackingEvents(data || []);

      // Get last known location
      const locationEvent = data?.find(e => e.latitude && e.longitude);
      if (locationEvent) {
        setLastLocation({ lat: locationEvent.latitude!, lng: locationEvent.longitude! });
      }
    } catch (error) {
      console.error('Error loading tracking events:', error);
    }
  };

  const loadConversation = async (assignment: Assignment) => {
    try {
      const { data } = await supabase
        .from('conversations')
        .select('id')
        .eq('assignment_id', assignment.id)
        .single();

      if (data) {
        setConversationId(data.id);
      } else {
        // Create conversation if doesn't exist
        const { data: newConv } = await supabase
          .from('conversations')
          .insert({
            assignment_id: assignment.id,
            sender_id: assignment.sender_id,
            traveler_id: assignment.traveler_id,
          })
          .select()
          .single();
        
        if (newConv) {
          setConversationId(newConv.id);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const getStatusInfo = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) {
      return { text: 'Livré', progress: 100, color: 'bg-green-500', icon: CheckCircle };
    }
    if (assignment.pickup_completed_at) {
      return { text: 'En transit', progress: 66, color: 'bg-blue-500', icon: Truck };
    }
    return { text: 'En attente de récupération', progress: 33, color: 'bg-orange-500', icon: Clock };
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'pickup': return <Package className="h-4 w-4 text-green-500" />;
      case 'in_transit': return <Truck className="h-4 w-4 text-blue-500" />;
      case 'location_update': return <Navigation className="h-4 w-4 text-primary" />;
      case 'delivery': return <CheckCircle className="h-4 w-4 text-green-500" />;
      default: return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24 md:pb-8">
        <div className="container mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold mb-6">Suivi de mes colis</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <p className="text-muted-foreground">Aucun colis en cours de livraison</p>
              <Button className="mt-4" variant="outline" asChild>
                <a href="/search-trips">Rechercher un transporteur</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const status = selectedAssignment ? getStatusInfo(selectedAssignment) : null;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-8">
      <div className="container mx-auto px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Suivi de mes colis</h1>
            <p className="text-sm text-muted-foreground">
              {assignments.length} colis en cours
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={loadAssignments}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Left: Assignment list */}
          <div className="lg:col-span-1 space-y-3">
            {assignments.map((assignment) => {
              const info = getStatusInfo(assignment);
              const StatusIcon = info.icon;
              return (
                <Card
                  key={assignment.id}
                  className={`cursor-pointer transition-all ${
                    selectedAssignment?.id === assignment.id
                      ? 'border-primary ring-1 ring-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${info.color}/10`}>
                        <StatusIcon className={`h-5 w-5 ${info.color.replace('bg-', 'text-')}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {assignment.shipment?.title}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <span className="truncate">{assignment.shipment?.pickup_city}</span>
                          <ArrowRight className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{assignment.shipment?.delivery_city}</span>
                        </div>
                        <Badge variant="outline" className="mt-2 text-xs">
                          {info.text}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Right: Details */}
          {selectedAssignment && status && (
            <div className="lg:col-span-2 space-y-4">
              {/* Status Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">
                      {selectedAssignment.shipment?.title}
                    </CardTitle>
                    <Badge className={`${status.color} text-white`}>
                      {status.text}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{status.progress}%</span>
                    </div>
                    <Progress value={status.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Récupération</span>
                      <span>En transit</span>
                      <span>Livraison</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Route */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-orange-500/10">
                        <MapPin className="h-4 w-4 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Départ</p>
                        <p className="font-medium text-sm">
                          {selectedAssignment.shipment?.pickup_city}, {selectedAssignment.shipment?.pickup_country}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-green-500/10">
                        <MapPin className="h-4 w-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Destination</p>
                        <p className="font-medium text-sm">
                          {selectedAssignment.shipment?.delivery_city}, {selectedAssignment.shipment?.delivery_country}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Map */}
                  <Separator />
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Map className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Carte en temps réel</span>
                    </div>
                    <TrackingMap
                      transporterLocation={lastLocation}
                      pickupLocation={selectedAssignment.shipment ? {
                        lat: 0, // Would need geocoding
                        lng: 0,
                        city: selectedAssignment.shipment.pickup_city
                      } : undefined}
                      deliveryLocation={selectedAssignment.shipment ? {
                        lat: 0,
                        lng: 0,
                        city: selectedAssignment.shipment.delivery_city
                      } : undefined}
                      className="h-[200px] md:h-[250px]"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Traveler Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {selectedAssignment.traveler_profile?.first_name} {selectedAssignment.traveler_profile?.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">Transporteur</p>
                      </div>
                    </div>
                    {selectedAssignment.traveler_profile?.phone && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={`tel:${selectedAssignment.traveler_profile.phone}`}>
                          <Phone className="h-4 w-4 mr-2" />
                          Appeler
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Tracking Timeline */}
              {trackingEvents.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Historique
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {trackingEvents.slice(0, 5).map((event, index) => (
                        <div key={event.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="p-1.5 rounded-full bg-muted">
                              {getEventIcon(event.event_type)}
                            </div>
                            {index < trackingEvents.length - 1 && (
                              <div className="w-px h-full bg-border flex-1 mt-2" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="text-sm font-medium">
                              {event.description || event.event_type}
                            </p>
                            {event.location && (
                              <p className="text-xs text-muted-foreground">{event.location}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.created_at).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Messaging */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Messages
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <InstantMessaging
                    conversationId={conversationId || undefined}
                    className="border-0 shadow-none h-[350px]"
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}