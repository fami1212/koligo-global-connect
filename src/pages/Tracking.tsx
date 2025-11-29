import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { InstantMessaging } from '@/components/InstantMessaging';
import { 
  MapPin, 
  Package, 
  Truck, 
  MessageCircle,
  CheckCircle,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';
import { StatusSynchronizer } from '@/components/StatusSynchronizer';
import { ProblemReporter } from '@/components/ProblemReporter';
import { CallButtons } from '@/components/CallButtons';
import { StatusUpdater } from '@/components/StatusUpdater';
import { GeolocationTracker } from '@/components/GeolocationTracker';
import { useRealtimeTracking } from '@/hooks/useRealtimeMessages';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';

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
    pickup_city: string;
    pickup_country: string;
    delivery_city: string;
    delivery_country: string;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
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
  };
  traveler_profile: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface TrackingEvent {
  id: string;
  event_type: string;
  description: string;
  location: string;
  created_at: string;
  photo_url: string;
}

export default function Tracking() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMessaging, setShowMessaging] = useState(false);

  const { containerRef, isPulling, isRefreshing, pullDistance, threshold } = usePullToRefresh({
    onRefresh: async () => await loadAssignments(),
  });

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  useRealtimeTracking(
    selectedAssignment?.id || null,
    (newEvent) => {
      setTrackingEvents(prev => [...prev, newEvent]);
    }
  );

  useEffect(() => {
    if (selectedAssignment?.id) {
      loadTrackingEvents(selectedAssignment.id);
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
            pickup_city,
            pickup_country,
            delivery_city,
            delivery_country,
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
        .or(`sender_id.eq.${user?.id},traveler_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const senderIds = [...new Set(assignmentsData?.map((a: any) => a.sender_id) || [])];
      const travelerIds = [...new Set(assignmentsData?.map((a: any) => a.traveler_id) || [])];
      const allUserIds = [...new Set([...senderIds, ...travelerIds])];

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', allUserIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const assignmentsWithProfiles = assignmentsData?.map((assignment: any) => ({
        ...assignment,
        sender_profile: profilesMap.get(assignment.sender_id) || { first_name: '', last_name: '', phone: '' },
        traveler_profile: profilesMap.get(assignment.traveler_id) || { first_name: '', last_name: '', phone: '' }
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

  const getStatusProgress = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 100;
    if (assignment.pickup_completed_at) return 66;
    if (assignment.payment_status === 'released') return 33;
    return 0;
  };

  const getStatusText = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 'Livré';
    if (assignment.pickup_completed_at) return 'En transit';
    if (assignment.payment_status === 'released') return 'En attente';
    return 'Paiement';
  };

  const openConversation = async (assignment: Assignment) => {
    try {
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('assignment_id', assignment.id)
        .single();

      if (existingConversation) {
        setActiveConversationId(existingConversation.id);
      } else {
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
      setShowMessaging(true);
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8 overflow-x-hidden overflow-y-auto">
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-foreground">Suivi des livraisons</h1>
          <p className="text-xs sm:text-base text-muted-foreground mt-1">
            Suivez l'état de vos colis en temps réel
          </p>
        </div>

        {/* Main Content */}
        <div className="space-y-4">
          {/* Assignments List */}
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : assignments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8 text-muted-foreground">
                <Package className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                <p className="text-sm sm:text-base">Aucune livraison trouvée</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <Card 
                  key={assignment.id} 
                  className={`cursor-pointer transition-all ${
                    selectedAssignment?.id === assignment.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedAssignment(assignment)}
                >
                  <CardContent className="p-3 sm:p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-sm sm:text-base truncate">
                            {assignment.shipment?.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            {assignment.shipment?.pickup_city} → {assignment.shipment?.delivery_city}
                          </p>
                        </div>
                        <Badge variant="outline" className="self-start text-xs whitespace-nowrap">
                          {getStatusText(assignment)}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Progression</span>
                          <span className="font-medium">{getStatusProgress(assignment)}%</span>
                        </div>
                        <Progress value={getStatusProgress(assignment)} className="h-1.5" />
                      </div>

                      <Separator />

                      {/* User Info & Actions */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-xs sm:text-sm">
                          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {user?.id === assignment.sender_id ? 'Transporteur:' : 'Expéditeur:'}
                          </span>
                          <span className="truncate">
                            {user?.id === assignment.sender_id 
                              ? assignment.traveler_profile.first_name
                              : assignment.sender_profile.first_name}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-2">
                          <div className="flex-shrink-0">
                            <CallButtons assignment={assignment} currentUserId={user?.id} />
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              openConversation(assignment);
                            }}
                            className="flex-shrink-0 text-xs h-8"
                          >
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                            <span className="hidden xs:inline">Message</span>
                          </Button>
                          <div className="flex-shrink-0">
                            <ProblemReporter assignmentId={assignment.id} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Selected Assignment Details */}
          {selectedAssignment && (
            <div className="space-y-4">
              {user?.id === selectedAssignment.traveler_id && (
                <GeolocationTracker 
                  assignmentId={selectedAssignment.id}
                  enabled={true}
                />
              )}
              
              <StatusUpdater 
                assignment={selectedAssignment}
                userRole={user?.id === selectedAssignment.sender_id ? 'sender' : 'traveler'}
                onStatusUpdate={loadAssignments}
              />
              
              <StatusSynchronizer 
                assignment={selectedAssignment}
                userRole={user?.id === selectedAssignment.sender_id ? 'sender' : 'traveler'}
                onStatusUpdate={loadAssignments}
              />
            </div>
          )}

          {/* Messaging - Collapsible on mobile */}
          {showMessaging && (
            <Card className="lg:hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">Messages</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowMessaging(false)}
                  >
                    Fermer
                  </Button>
                </div>
                <InstantMessaging 
                  conversationId={activeConversationId || undefined}
                  className="h-[300px]"
                />
              </CardContent>
            </Card>
          )}

          {/* Desktop Messaging Panel */}
          <div className="hidden lg:block">
            <InstantMessaging 
              conversationId={activeConversationId || undefined}
              className="h-[400px]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
