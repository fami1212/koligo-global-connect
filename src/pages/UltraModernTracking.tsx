import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Package, 
  MapPin, 
  Clock, 
  Phone, 
  MessageCircle, 
  AlertTriangle,
  Truck,
  CheckCircle,
  Circle,
  User,
  Calendar,
  Navigation,
  Star,
  ChevronRight,
  Eye,
  Package2
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  shipment_id: string;
  trip_id: string;
  sender_id: string;
  traveler_id: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  payment_status: string;
  final_price: number;
  created_at: string;
  shipment: {
    title: string;
    pickup_city: string;
    pickup_country: string;
    delivery_city: string;
    delivery_country: string;
    weight_kg: number;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
  };
  trip: {
    departure_date: string;
    arrival_date: string | null;
    transport_type: string;
  };
  sender_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    rating: number;
    is_verified: boolean;
  };
  traveler_profile: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
    rating: number;
    is_verified: boolean;
  };
}

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location: string | null;
  created_at: string;
  photo_url: string | null;
}

export default function UltraModernTracking() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAssignments();
  }, [user, navigate]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipment:shipments (
            title,
            pickup_city,
            pickup_country,
            delivery_city,
            delivery_country,
            weight_kg,
            pickup_contact_name,
            pickup_contact_phone,
            delivery_contact_name,
            delivery_contact_phone
          ),
          trip:trips (
            departure_date,
            arrival_date,
            transport_type
          )
        `)
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles separately
      const assignmentsWithProfiles = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, rating, is_verified')
            .eq('user_id', assignment.sender_id)
            .single();

          const { data: travelerProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name, avatar_url, rating, is_verified')
            .eq('user_id', assignment.traveler_id)
            .single();

          return {
            ...assignment,
            sender_profile: senderProfile || {
              first_name: '',
              last_name: '',
              avatar_url: null,
              rating: 0,
              is_verified: false
            },
            traveler_profile: travelerProfile || {
              first_name: '',
              last_name: '',
              avatar_url: null,
              rating: 0,
              is_verified: false
            }
          };
        })
      );

      setAssignments(assignmentsWithProfiles);
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les assignments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadTrackingEvents = async (assignmentId: string) => {
    try {
      setLoadingEvents(true);
      
      const { data: eventsData, error } = await supabase
        .from('tracking_events')
        .select('*')
        .eq('assignment_id', assignmentId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTrackingEvents(eventsData || []);
    } catch (error) {
      console.error('Error loading tracking events:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les événements",
        variant: "destructive",
      });
    } finally {
      setLoadingEvents(false);
    }
  };

  const getStatusProgress = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 100;
    if (assignment.pickup_completed_at) return 75;
    if (new Date(assignment.trip.departure_date) <= new Date()) return 50;
    return 25;
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return "Livré";
    if (assignment.pickup_completed_at) return "En transit";
    if (new Date(assignment.trip.departure_date) <= new Date()) return "Récupéré";
    return "Confirmé";
  };

  const getStatusColor = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return "bg-green-500";
    if (assignment.pickup_completed_at) return "bg-blue-500";
    if (new Date(assignment.trip.departure_date) <= new Date()) return "bg-yellow-500";
    return "bg-gray-500";
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'pickup': return CheckCircle;
      case 'in_transit': return Truck;
      case 'delivered': return Package;
      case 'issue': return AlertTriangle;
      default: return Circle;
    }
  };

  const openTrackingDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    loadTrackingEvents(assignment.id);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
              <MapPin className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Suivi des livraisons
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Suivez vos colis en temps réel
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard" className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Tableau de bord
            </Link>
          </Button>
        </div>

        {/* Assignments Grid */}
        {assignments.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Package2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">Aucune livraison</h3>
              <p className="text-muted-foreground mb-4">
                Vous n'avez aucune livraison en cours de suivi
              </p>
              <div className="flex gap-2 justify-center">
                {hasRole('sender') && (
                  <Button asChild>
                    <Link to="/sender/create-shipment">Créer un colis</Link>
                  </Button>
                )}
                {hasRole('traveler') && (
                  <Button asChild variant="outline">
                    <Link to="/traveler/create-trip">Créer un trajet</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="hover:shadow-lg transition-all duration-300 group cursor-pointer border-l-4 border-l-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold truncate">
                      {assignment.shipment.title}
                    </CardTitle>
                    <Badge 
                      variant="secondary" 
                      className={cn(
                        "text-white font-medium",
                        getStatusColor(assignment)
                      )}
                    >
                      {getStatusText(assignment)}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {assignment.shipment.pickup_city} → {assignment.shipment.delivery_city}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progression</span>
                      <span className="font-medium">{getStatusProgress(assignment)}%</span>
                    </div>
                    <Progress value={getStatusProgress(assignment)} className="h-2" />
                  </div>

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span>{assignment.shipment.weight_kg}kg</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{assignment.trip.transport_type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{new Date(assignment.trip.departure_date).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">{assignment.final_price}€</span>
                    </div>
                  </div>

                  {/* Participants */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.id === assignment.sender_id ? assignment.traveler_profile.avatar_url || '' : assignment.sender_profile.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {user?.id === assignment.sender_id 
                            ? assignment.traveler_profile.first_name.charAt(0)
                            : assignment.sender_profile.first_name.charAt(0)
                          }
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">
                          {user?.id === assignment.sender_id 
                            ? `${assignment.traveler_profile.first_name} ${assignment.traveler_profile.last_name}`
                            : `${assignment.sender_profile.first_name} ${assignment.sender_profile.last_name}`
                          }
                        </p>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-xs text-muted-foreground">
                            {user?.id === assignment.sender_id 
                              ? assignment.traveler_profile.rating.toFixed(1)
                              : assignment.sender_profile.rating.toFixed(1)
                            }
                          </span>
                          {((user?.id === assignment.sender_id && assignment.traveler_profile.is_verified) ||
                            (user?.id === assignment.traveler_id && assignment.sender_profile.is_verified)) && (
                            <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center ml-1">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openTrackingDialog(assignment)}
                      className="flex items-center gap-2 hover:shadow-md transition-all"
                    >
                      <Eye className="h-4 w-4" />
                      Détails
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Tracking Dialog */}
        <Dialog open={!!selectedAssignment} onOpenChange={() => setSelectedAssignment(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Suivi détaillé - {selectedAssignment?.shipment.title}
              </DialogTitle>
              <DialogDescription>
                {selectedAssignment?.shipment.pickup_city} → {selectedAssignment?.shipment.delivery_city}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Status Overview */}
                {selectedAssignment && (
                  <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">État actuel</h4>
                      <Badge 
                        variant="secondary" 
                        className={cn("text-white", getStatusColor(selectedAssignment))}
                      >
                        {getStatusText(selectedAssignment)}
                      </Badge>
                    </div>
                    <Progress value={getStatusProgress(selectedAssignment)} className="h-3" />
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Poids</p>
                        <p className="font-medium">{selectedAssignment.shipment.weight_kg}kg</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Transport</p>
                        <p className="font-medium capitalize">{selectedAssignment.trip.transport_type}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Date de départ</p>
                        <p className="font-medium">
                          {new Date(selectedAssignment.trip.departure_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Prix total</p>
                        <p className="font-bold text-primary text-lg">{selectedAssignment.final_price}€</p>
                      </div>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Tracking Events Timeline */}
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Navigation className="h-4 w-4" />
                    Historique des événements
                  </h4>
                  
                  {loadingEvents ? (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                      <p className="text-sm text-muted-foreground mt-2">Chargement...</p>
                    </div>
                  ) : trackingEvents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="h-8 w-8 mx-auto mb-2" />
                      <p>Aucun événement enregistré</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {trackingEvents.map((event, index) => {
                        const EventIcon = getEventIcon(event.event_type);
                        const isLast = index === trackingEvents.length - 1;
                        
                        return (
                          <div key={event.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="p-2 rounded-full bg-primary/10 border-2 border-primary/20">
                                <EventIcon className="h-4 w-4 text-primary" />
                              </div>
                              {!isLast && <div className="w-px h-8 bg-border mt-2"></div>}
                            </div>
                            
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <p className="font-medium text-sm">{event.description}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString('fr-FR')}
                                </p>
                              </div>
                              {event.location && (
                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {event.location}
                                </p>
                              )}
                              {event.photo_url && (
                                <img 
                                  src={event.photo_url} 
                                  alt="Proof" 
                                  className="mt-2 rounded-lg max-w-xs"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Contact Information */}
                {selectedAssignment && (
                  <div className="space-y-4">
                    <h4 className="font-semibold">Informations de contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Récupération</p>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="font-medium">{selectedAssignment.shipment.pickup_contact_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedAssignment.shipment.pickup_contact_phone}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Livraison</p>
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="font-medium">{selectedAssignment.shipment.delivery_contact_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {selectedAssignment.shipment.delivery_contact_phone}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}