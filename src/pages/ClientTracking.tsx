import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronDown,
  ChevronUp,
  X
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
    id: string;
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
  const [searchParams] = useSearchParams();
  const shipmentId = searchParams.get('shipment');
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLocation, setLastLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showAssignments, setShowAssignments] = useState(false);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAssignment) {
      loadTrackingEvents(selectedAssignment.id);
      loadConversation(selectedAssignment);
      
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
            setTrackingEvents(prev => [newEvent, ...prev]);
            if (newEvent.latitude && newEvent.longitude) {
              setLastLocation({ lat: newEvent.latitude, lng: newEvent.longitude });
            }
            toast({
              title: "Mise à jour",
              description: newEvent.description || "Position du transporteur mise à jour",
            });
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
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipment:shipments(id, title, pickup_city, pickup_country, delivery_city, delivery_country, pickup_contact_name, pickup_contact_phone, delivery_contact_name, delivery_contact_phone, weight_kg),
          trip:trips(departure_date, arrival_date, transport_type, currency)
        `)
        .eq('sender_id', user.id)
        .is('delivery_completed_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
      
      // Auto-select based on URL or first assignment
      if (shipmentId) {
        const found = assignmentsWithProfiles.find(a => a.shipment?.id === shipmentId);
        if (found) {
          setSelectedAssignment(found);
          return;
        }
      }
      
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

      const locationEvent = data?.find(e => e.latitude && e.longitude);
      if (locationEvent) {
        setLastLocation({ lat: locationEvent.latitude!, lng: locationEvent.longitude! });
      } else {
        setLastLocation(null);
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
      return { text: 'Livré', progress: 100, variant: 'default' as const, icon: CheckCircle };
    }
    if (assignment.pickup_completed_at) {
      return { text: 'En transit', progress: 66, variant: 'secondary' as const, icon: Truck };
    }
    return { text: 'En attente', progress: 33, variant: 'outline' as const, icon: Clock };
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'pickup': 
      case 'pickup_completed': 
        return <Package className="h-3 w-3 text-green-500" />;
      case 'in_transit': return <Truck className="h-3 w-3 text-blue-500" />;
      case 'location_update': return <Navigation className="h-3 w-3 text-primary" />;
      case 'delivery': 
      case 'delivery_completed': 
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      default: return <MapPin className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const formatEventTime = (date: string) => {
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="min-h-screen bg-background p-4 pb-24">
        <div className="max-w-lg mx-auto">
          <h1 className="text-xl font-bold mb-4">Suivi de mes colis</h1>
          <Card>
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground text-sm">Aucun colis en cours</p>
              <Button className="mt-4" size="sm" asChild>
                <a href="/search-trips">Rechercher un transporteur</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const status = selectedAssignment ? getStatusInfo(selectedAssignment) : null;
  const StatusIcon = status?.icon || Clock;

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto">
        {/* Mobile Header */}
        <div className="sticky top-0 z-20 bg-background border-b p-3 lg:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold truncate">
                {selectedAssignment?.shipment?.title || 'Suivi'}
              </h1>
              {status && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={status.variant} className="text-xs">
                    {status.text}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {status.progress}%
                  </span>
                </div>
              )}
            </div>
            <div className="flex gap-1">
              {assignments.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowAssignments(!showAssignments)}
                >
                  <Package className="h-4 w-4" />
                  <span className="ml-1 text-xs">{assignments.length}</span>
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={loadAssignments}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Assignment Selector Dropdown */}
          {showAssignments && (
            <div className="mt-2 border rounded-lg bg-card max-h-48 overflow-auto">
              {assignments.map((assignment) => {
                const info = getStatusInfo(assignment);
                return (
                  <button
                    key={assignment.id}
                    className={`w-full p-2 text-left flex items-center gap-2 hover:bg-muted/50 ${
                      selectedAssignment?.id === assignment.id ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => {
                      setSelectedAssignment(assignment);
                      setShowAssignments(false);
                    }}
                  >
                    <Package className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{assignment.shipment?.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {assignment.shipment?.pickup_city} → {assignment.shipment?.delivery_city}
                      </p>
                    </div>
                    <Badge variant={info.variant} className="text-xs flex-shrink-0">
                      {info.text}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:grid lg:grid-cols-12 lg:gap-4 lg:p-4">
          {/* Desktop Sidebar */}
          <div className="hidden lg:block lg:col-span-3">
            <div className="sticky top-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm">Mes colis ({assignments.length})</h2>
                <Button variant="ghost" size="sm" onClick={loadAssignments}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-120px)]">
                <div className="space-y-2 pr-2">
                  {assignments.map((assignment) => {
                    const info = getStatusInfo(assignment);
                    const Icon = info.icon;
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
                        <CardContent className="p-3">
                          <div className="flex items-start gap-2">
                            <Icon className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{assignment.shipment?.title}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <span className="truncate">{assignment.shipment?.pickup_city}</span>
                                <ArrowRight className="h-3 w-3 flex-shrink-0" />
                                <span className="truncate">{assignment.shipment?.delivery_city}</span>
                              </p>
                              <Badge variant={info.variant} className="mt-1.5 text-xs">
                                {info.text}
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>

          {/* Main Content */}
          {selectedAssignment && status && (
            <div className="lg:col-span-6 space-y-3 p-3 lg:p-0">
              {/* Progress Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Progression</span>
                      <span className="text-sm text-muted-foreground">{status.progress}%</span>
                    </div>
                    <Progress value={status.progress} className="h-2" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span className={status.progress >= 33 ? 'text-primary font-medium' : ''}>Collecte</span>
                      <span className={status.progress >= 66 ? 'text-primary font-medium' : ''}>Transit</span>
                      <span className={status.progress >= 100 ? 'text-primary font-medium' : ''}>Livraison</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Route Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <div className="w-0.5 h-8 bg-border" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Départ</p>
                        <p className="text-sm font-medium">
                          {selectedAssignment.shipment?.pickup_city}, {selectedAssignment.shipment?.pickup_country}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Destination</p>
                        <p className="text-sm font-medium">
                          {selectedAssignment.shipment?.delivery_city}, {selectedAssignment.shipment?.delivery_country}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Map */}
              <TrackingMap
                transporterLocation={lastLocation}
                pickupCity={selectedAssignment.shipment?.pickup_city}
                deliveryCity={selectedAssignment.shipment?.delivery_city}
                className="h-48 lg:h-64"
              />

              {/* Traveler Card */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {selectedAssignment.traveler_profile?.first_name} {selectedAssignment.traveler_profile?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">Transporteur</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {selectedAssignment.traveler_profile?.phone && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${selectedAssignment.traveler_profile.phone}`}>
                            <Phone className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setShowMessages(true)}
                        className="lg:hidden"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* History Toggle (Mobile) */}
              <Card className="lg:hidden">
                <button 
                  className="w-full p-4 flex items-center justify-between"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Historique ({trackingEvents.length})</span>
                  </div>
                  {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
                {showHistory && trackingEvents.length > 0 && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-3 max-h-64 overflow-auto">
                      {trackingEvents.map((event) => (
                        <div key={event.id} className="flex gap-2">
                          <div className="p-1 rounded-full bg-muted flex-shrink-0">
                            {getEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {event.description || event.event_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatEventTime(event.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>

              {/* Desktop History */}
              {trackingEvents.length > 0 && (
                <Card className="hidden lg:block">
                  <CardContent className="p-4">
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Historique
                    </h3>
                    <div className="space-y-3 max-h-48 overflow-auto">
                      {trackingEvents.map((event) => (
                        <div key={event.id} className="flex gap-2">
                          <div className="p-1 rounded-full bg-muted flex-shrink-0">
                            {getEventIcon(event.event_type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {event.description || event.event_type}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatEventTime(event.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Desktop Messages */}
          {selectedAssignment && conversationId && (
            <div className="hidden lg:block lg:col-span-3">
              <div className="sticky top-4">
                <Card className="h-[calc(100vh-120px)]">
                  <CardContent className="p-0 h-full">
                    <InstantMessaging
                      conversationId={conversationId}
                      otherUserId={selectedAssignment.traveler_id}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Messages Modal */}
        {showMessages && selectedAssignment && conversationId && (
          <div className="fixed inset-0 z-50 bg-background lg:hidden">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-3 border-b">
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {selectedAssignment.traveler_profile?.first_name} {selectedAssignment.traveler_profile?.last_name}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowMessages(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                <InstantMessaging
                  conversationId={conversationId}
                  otherUserId={selectedAssignment.traveler_id}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
