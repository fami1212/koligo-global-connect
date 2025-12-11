import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InstantMessaging } from '@/components/InstantMessaging';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MapPin, 
  Clock, 
  Package, 
  Truck, 
  Phone, 
  MessageCircle,
  CheckCircle,
  AlertCircle,
  Navigation,
  User,
  Star,
  Calendar,
  Weight,
  DollarSign,
  Camera,
  MapPinIcon
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { ProblemReporter } from '@/components/ProblemReporter';

interface Assignment {
  id: string;
  sender_id: string;
  traveler_id: string;
  final_price: number;
  payment_status: string;
  pickup_completed_at: string;
  delivery_completed_at: string;
  created_at: string;
  shipment?: {
    title: string;
    description: string;
    weight_kg: number;
    pickup_city: string;
    pickup_country: string;
    delivery_city: string;
    delivery_country: string;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
    photos: string[];
  };
  trip?: {
    departure_date: string;
    arrival_date: string;
    transport_type: string;
  };
  sender_profile: {
    first_name: string;
    last_name: string;
    phone: string;
    avatar_url: string;
    rating: number;
    is_verified: boolean;
  };
  traveler_profile: {
    first_name: string;
    last_name: string;
    phone: string;
    avatar_url: string;
    rating: number;
    is_verified: boolean;
  };
}

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location: string;
  created_at: string;
  photo_url: string;
  created_by: string;
}

export default function ModernTracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useEffect(() => {
    if (selectedAssignment?.id) {
      loadTrackingEvents(selectedAssignment.id);
      loadConversation(selectedAssignment);
    }
  }, [selectedAssignment]);

  const loadAssignments = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipment:shipments (
            title,
            description,
            weight_kg,
            pickup_city,
            pickup_country,
            delivery_city,
            delivery_country,
            pickup_contact_name,
            pickup_contact_phone,
            delivery_contact_name,
            delivery_contact_phone,
            photos
          ),
          trip:trips (
            departure_date,
            arrival_date,
            transport_type
          )
        `)
        .or(`sender_id.eq.${user?.id},traveler_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get profiles for assignments
      const senderIds = [...new Set(assignmentsData?.map((a: any) => a.sender_id) || [])];
      const travelerIds = [...new Set(assignmentsData?.map((a: any) => a.traveler_id) || [])];
      const allUserIds = [...new Set([...senderIds, ...travelerIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone, avatar_url, rating, is_verified')
        .in('user_id', allUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const assignmentsWithProfiles = assignmentsData?.map((assignment: any) => ({
        ...assignment,
        sender_profile: profilesMap.get(assignment.sender_id) || { first_name: '', last_name: '', phone: '', avatar_url: '', rating: 0, is_verified: false },
        traveler_profile: profilesMap.get(assignment.traveler_id) || { first_name: '', last_name: '', phone: '', avatar_url: '', rating: 0, is_verified: false }
      })) || [];

      setAssignments(assignmentsWithProfiles);
      
      if (assignmentsWithProfiles && assignmentsWithProfiles.length > 0 && !selectedAssignment) {
        setSelectedAssignment(assignmentsWithProfiles[0]);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les livraisons",
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
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTrackingEvents(data || []);
    } catch (error) {
      console.error('Error loading tracking events:', error);
    }
  };

  const loadConversation = async (assignment: Assignment) => {
    try {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('assignment_id', assignment.id)
        .single();

      if (existingConversation) {
        setActiveConversationId(existingConversation.id);
      } else {
        // Create new conversation
        const { data: newConversation } = await supabase
          .from('conversations')
          .insert({
            assignment_id: assignment.id,
            sender_id: assignment.sender_id,
            traveler_id: assignment.traveler_id,
          })
          .select()
          .single();

        if (newConversation) {
          setActiveConversationId(newConversation.id);
        }
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const getStatusProgress = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 100;
    if (assignment.pickup_completed_at) return 66;
    if (assignment.payment_status === 'released') return 33;
    return 10;
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 'Livré';
    if (assignment.pickup_completed_at) return 'En transit';
    if (assignment.payment_status === 'released') return 'Prêt pour collecte';
    return 'En attente de paiement';
  };

  const getStatusColor = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 'bg-green-500';
    if (assignment.pickup_completed_at) return 'bg-blue-500';
    if (assignment.payment_status === 'released') return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'pickup':
        return <Package className="h-4 w-4 text-primary" />;
      case 'transit':
        return <Truck className="h-4 w-4 text-blue-500" />;
      case 'delivery':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  if (isLoading) {
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
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
            <MapPin className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Suivi des livraisons
            </h1>
            <p className="text-muted-foreground text-lg mt-2">
              Suivez vos colis en temps réel avec précision
            </p>
          </div>
        </div>

        {assignments.length === 0 ? (
          <Card className="max-w-md mx-auto text-center py-12">
            <CardContent>
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold mb-2">Aucune livraison</h3>
              <p className="text-muted-foreground">Vous n'avez aucune livraison en cours pour le moment.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Assignments List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-2xl font-semibold mb-4">Mes livraisons</h2>
              {assignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                    selectedAssignment?.id === assignment.id
                      ? 'ring-2 ring-primary shadow-lg'
                      : 'hover:shadow-md'
                  }`}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">
                            {assignment.shipment?.title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPinIcon className="h-4 w-4" />
                            <span>{assignment.shipment?.pickup_city} → {assignment.shipment?.delivery_city}</span>
                          </div>
                        </div>
                        <Badge 
                          className={`${getStatusColor(assignment)} text-white`}
                        >
                          {getStatusText(assignment)}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{getStatusProgress(assignment)}%</span>
                        </div>
                        <Progress value={getStatusProgress(assignment)} className="h-2" />
                      </div>

                      {/* Contact */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={
                              user?.id === assignment.sender_id 
                                ? assignment.traveler_profile.avatar_url
                                : assignment.sender_profile.avatar_url
                            } />
                            <AvatarFallback className="text-xs">
                              {user?.id === assignment.sender_id 
                                ? assignment.traveler_profile.first_name[0]
                                : assignment.sender_profile.first_name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">
                              {user?.id === assignment.sender_id 
                                ? assignment.traveler_profile.first_name
                                : assignment.sender_profile.first_name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-muted-foreground">
                                {user?.id === assignment.sender_id 
                                  ? assignment.traveler_profile.rating?.toFixed(1) || '0.0'
                                  : assignment.sender_profile.rating?.toFixed(1) || '0.0'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <ProblemReporter assignmentId={assignment.id} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Assignment Details */}
            <div className="lg:col-span-2 space-y-6">
              {selectedAssignment ? (
                <>
                  {/* Assignment Header */}
                  <Card className="overflow-hidden">
                    <CardHeader className="bg-gradient-to-r from-primary/10 to-secondary/10">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-2xl flex items-center gap-2">
                            <Package className="h-6 w-6" />
                            {selectedAssignment.shipment?.title}
                          </CardTitle>
                          <CardDescription className="text-base mt-2">
                            {selectedAssignment.shipment?.description}
                          </CardDescription>
                        </div>
                        <Badge variant="outline" className="px-3 py-1">
                          <Weight className="h-4 w-4 mr-1" />
                          {selectedAssignment.shipment?.weight_kg} kg
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Route */}
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Navigation className="h-4 w-4" />
                            Itinéraire
                          </h4>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                              <div className="w-3 h-3 bg-green-500 rounded-full mt-1"></div>
                              <div>
                                <p className="font-medium">Départ</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedAssignment.shipment?.pickup_city}, {selectedAssignment.shipment?.pickup_country}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                              <div className="w-3 h-3 bg-red-500 rounded-full mt-1"></div>
                              <div>
                                <p className="font-medium">Arrivée</p>
                                <p className="text-sm text-muted-foreground">
                                  {selectedAssignment.shipment?.delivery_city}, {selectedAssignment.shipment?.delivery_country}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-4">
                          <h4 className="font-semibold flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Informations
                          </h4>
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Prix</span>
                              <span className="font-medium">{selectedAssignment.final_price?.toFixed(2) || '0.00'}€</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Transport</span>
                              <span className="font-medium capitalize">{selectedAssignment.trip?.transport_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Créé le</span>
                              <span className="font-medium">
                                {new Date(selectedAssignment.created_at).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Timeline */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Historique des événements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {trackingEvents.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                          <p>Aucun événement de suivi pour le moment</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {trackingEvents.map((event, index) => (
                            <div key={event.id} className="relative flex gap-4">
                              {/* Timeline line */}
                              {index < trackingEvents.length - 1 && (
                                <div className="absolute left-4 top-8 w-0.5 h-full bg-border"></div>
                              )}
                              
                              {/* Event icon */}
                              <div className="flex-shrink-0 w-8 h-8 bg-background border-2 border-primary rounded-full flex items-center justify-center">
                                {getEventIcon(event.event_type)}
                              </div>
                              
                              {/* Event content */}
                              <div className="flex-1 pb-6">
                                <div className="flex items-start justify-between mb-2">
                                  <h4 className="font-medium capitalize">{event.event_type}</h4>
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(event.created_at).toLocaleString('fr-FR')}
                                  </span>
                                </div>
                                {event.description && (
                                  <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                                )}
                                {event.location && (
                                  <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                                    <MapPin className="h-3 w-3" />
                                    <span>{event.location}</span>
                                  </div>
                                )}
                                {event.photo_url && (
                                  <div className="mt-2">
                                    <img 
                                      src={event.photo_url} 
                                      alt={`Photo ${event.event_type}`}
                                      className="max-w-64 h-32 object-cover rounded-lg border"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Messaging */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Messages
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <InstantMessaging 
                        conversationId={activeConversationId || undefined}
                        className="h-[400px] border-0"
                      />
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card className="h-96 flex items-center justify-center">
                  <CardContent className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Sélectionnez une livraison pour voir les détails</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}