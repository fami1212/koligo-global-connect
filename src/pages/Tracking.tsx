import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MapPin, Package, Truck, CheckCircle, Clock, User, Phone } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Assignment {
  id: string;
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
  const navigate = useNavigate();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);
  const [trackingEvents, setTrackingEvents] = useState<TrackingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadAssignments();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedAssignment) {
      loadTrackingEvents(selectedAssignment);
    }
  }, [selectedAssignment]);

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

      // Get profiles for assignments
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
        setSelectedAssignment(assignmentsWithProfiles[0].id);
      }
    } catch (error) {
      console.error('Error loading assignments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les livraisons",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
    if (assignment.payment_status === 'released') return 'Payé - En attente de collecte';
    return 'En attente de paiement';
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'pickup':
        return <Package className="h-4 w-4 text-primary" />;
      case 'transit':
        return <Truck className="h-4 w-4 text-secondary" />;
      case 'delivery':
        return <CheckCircle className="h-4 w-4 text-success" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const selectedAssignmentData = assignments.find(a => a.id === selectedAssignment);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Suivi des livraisons
            </h1>
            <p className="text-muted-foreground mt-1">
              Suivez vos colis en temps réel
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              Retour au tableau de bord
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Assignments List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Mes livraisons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Aucune livraison</p>
                </div>
              ) : (
                assignments.map((assignment) => (
                  <div
                    key={assignment.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedAssignment === assignment.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedAssignment(assignment.id)}
                  >
                     <h4 className="font-medium text-sm mb-1">
                       {assignment.shipment?.title}
                     </h4>
                     <p className="text-xs text-muted-foreground mb-2">
                       {assignment.shipment?.pickup_city} → {assignment.shipment?.delivery_city}
                     </p>
                    <Badge variant="outline" className="text-xs">
                      {getStatusText(assignment)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Tracking Details */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAssignmentData ? (
              <>
                {/* Status Overview */}
                <Card>
                   <CardHeader>
                     <CardTitle>{selectedAssignmentData.shipment?.title}</CardTitle>
                     <CardDescription>
                       {selectedAssignmentData.shipment?.pickup_city}, {selectedAssignmentData.shipment?.pickup_country} → {selectedAssignmentData.shipment?.delivery_city}, {selectedAssignmentData.shipment?.delivery_country}
                     </CardDescription>
                   </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progression</span>
                        <span>{getStatusProgress(selectedAssignmentData)}%</span>
                      </div>
                      <Progress value={getStatusProgress(selectedAssignmentData)} className="h-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          selectedAssignmentData.payment_status === 'released' ? 'bg-success text-success-foreground' : 'bg-muted'
                        }`}>
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium">Payé</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          selectedAssignmentData.pickup_completed_at ? 'bg-success text-success-foreground' : 'bg-muted'
                        }`}>
                          <Package className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium">Collecté</p>
                      </div>
                      <div className="text-center">
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 flex items-center justify-center ${
                          selectedAssignmentData.delivery_completed_at ? 'bg-success text-success-foreground' : 'bg-muted'
                        }`}>
                          <CheckCircle className="h-4 w-4" />
                        </div>
                        <p className="text-xs font-medium">Livré</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Expéditeur</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedAssignmentData.sender_profile.first_name} {selectedAssignmentData.sender_profile.last_name}
                        </span>
                      </div>
                      {selectedAssignmentData.sender_profile.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedAssignmentData.sender_profile.phone}</span>
                        </div>
                      )}
                       <div className="pt-2">
                         <p className="text-xs text-muted-foreground mb-1">Contact de collecte:</p>
                         <p className="text-sm">{selectedAssignmentData.shipment?.pickup_contact_name}</p>
                         <p className="text-sm">{selectedAssignmentData.shipment?.pickup_contact_phone}</p>
                       </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Transporteur</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {selectedAssignmentData.traveler_profile.first_name} {selectedAssignmentData.traveler_profile.last_name}
                        </span>
                      </div>
                      {selectedAssignmentData.traveler_profile.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{selectedAssignmentData.traveler_profile.phone}</span>
                        </div>
                      )}
                       <div className="pt-2">
                         <p className="text-xs text-muted-foreground mb-1">Contact de livraison:</p>
                         <p className="text-sm">{selectedAssignmentData.shipment?.delivery_contact_name}</p>
                         <p className="text-sm">{selectedAssignmentData.shipment?.delivery_contact_phone}</p>
                       </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tracking Events */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      Historique de suivi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {trackingEvents.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Aucun événement de suivi pour le moment</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {trackingEvents.map((event, index) => (
                          <div key={event.id} className="flex gap-4">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {getEventIcon(event.event_type)}
                              </div>
                              {index < trackingEvents.length - 1 && (
                                <div className="w-px h-8 bg-border mt-2"></div>
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <div className="flex items-center justify-between mb-1">
                                <h4 className="font-medium text-sm">{event.description}</h4>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(event.created_at).toLocaleString('fr-FR')}
                                </span>
                              </div>
                              {event.location && (
                                <p className="text-sm text-muted-foreground">{event.location}</p>
                              )}
                              {event.photo_url && (
                                <img 
                                  src={event.photo_url} 
                                  alt="Preuve de livraison"
                                  className="mt-2 rounded-lg max-w-xs"
                                />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardContent className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Sélectionnez une livraison pour voir les détails
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}