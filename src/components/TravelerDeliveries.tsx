import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GPSTracker } from '@/components/GPSTracker';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  MessageCircle,
  Phone,
  Navigation,
  Euro,
  Calendar,
  User,
  Camera
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

interface Assignment {
  id: string;
  shipment_id: string;
  trip_id: string;
  sender_id: string;
  traveler_id: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  final_price: number;
  created_at: string;
  shipment: {
    id: string;
    title: string;
    pickup_city: string;
    pickup_country: string;
    delivery_city: string;
    delivery_country: string;
    pickup_address: string;
    delivery_address: string;
    pickup_contact_name: string;
    pickup_contact_phone: string;
    delivery_contact_name: string;
    delivery_contact_phone: string;
    weight_kg: number;
  };
  trip: {
    id: string;
    departure_date: string;
    arrival_date: string;
    currency: string;
  };
  sender_profile: {
    first_name: string;
    last_name: string;
    phone: string;
    rating: number;
  };
}

export function TravelerDeliveries() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get related data
      const shipmentIds = [...new Set(data?.map(a => a.shipment_id) || [])];
      const tripIds = [...new Set(data?.map(a => a.trip_id) || [])];
      const senderIds = [...new Set(data?.map(a => a.sender_id) || [])];

      const [shipmentsRes, tripsRes, sendersRes] = await Promise.all([
        supabase.from('shipments').select('*').in('id', shipmentIds),
        supabase.from('trips').select('id, departure_date, arrival_date, currency').in('id', tripIds),
        supabase.from('profiles').select('user_id, first_name, last_name, phone, rating').in('user_id', senderIds)
      ]);

      const shipmentsMap = new Map(shipmentsRes.data?.map(s => [s.id, s]) || []);
      const tripsMap = new Map(tripsRes.data?.map(t => [t.id, t]) || []);
      const sendersMap = new Map(sendersRes.data?.map(p => [p.user_id, p]) || []);

      const enriched = data?.map(a => ({
        ...a,
        shipment: shipmentsMap.get(a.shipment_id),
        trip: tripsMap.get(a.trip_id),
        sender_profile: sendersMap.get(a.sender_id)
      })).filter(a => a.shipment && a.trip) as Assignment[];

      setAssignments(enriched || []);
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

  const updateStatus = async (assignment: Assignment, status: 'pickup' | 'delivery') => {
    try {
      setProcessingId(assignment.id);
      const field = status === 'pickup' ? 'pickup_completed_at' : 'delivery_completed_at';
      
      const { error } = await supabase
        .from('assignments')
        .update({ [field]: new Date().toISOString() })
        .eq('id', assignment.id);

      if (error) throw error;

      // Create tracking event
      await supabase.from('tracking_events').insert({
        assignment_id: assignment.id,
        event_type: status === 'pickup' ? 'pickup_completed' : 'delivery_completed',
        description: status === 'pickup' 
          ? `Colis récupéré à ${assignment.shipment.pickup_city}`
          : `Colis livré à ${assignment.shipment.delivery_city}`,
        location: status === 'pickup' 
          ? assignment.shipment.pickup_address 
          : assignment.shipment.delivery_address,
        created_by: user?.id
      });

      toast({
        title: status === 'pickup' ? "Colis récupéré" : "Colis livré",
        description: status === 'pickup' 
          ? "Le colis a été marqué comme récupéré" 
          : "Le colis a été marqué comme livré",
      });

      await loadAssignments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openConversation = async (assignment: Assignment) => {
    try {
      const { data: existingConv } = await supabase
        .from('conversations')
        .select('id')
        .eq('assignment_id', assignment.id)
        .maybeSingle();

      let conversationId = existingConv?.id;

      if (!conversationId) {
        const { data: newConv, error } = await supabase
          .from('conversations')
          .insert({
            assignment_id: assignment.id,
            sender_id: assignment.sender_id,
            traveler_id: assignment.traveler_id
          })
          .select('id')
          .single();

        if (error) throw error;
        conversationId = newConv.id;
      }

      navigate(`/messages?conversationId=${conversationId}`);
    } catch (error) {
      console.error('Error opening conversation:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la conversation",
        variant: "destructive",
      });
    }
  };

  const getStatus = (a: Assignment) => {
    if (a.delivery_completed_at) return 'delivered';
    if (a.pickup_completed_at) return 'in_transit';
    return 'pending';
  };

  const pendingDeliveries = assignments.filter(a => getStatus(a) === 'pending');
  const inTransitDeliveries = assignments.filter(a => getStatus(a) === 'in_transit');
  const completedDeliveries = assignments.filter(a => getStatus(a) === 'delivered');

  const DeliveryCard = ({ assignment }: { assignment: Assignment }) => {
    const status = getStatus(assignment);
    const isPending = status === 'pending';
    const isInTransit = status === 'in_transit';
    const isCompleted = status === 'delivered';
    const [showGPS, setShowGPS] = useState(false);

    return (
      <Card className={`overflow-hidden ${isPending ? 'border-warning/50' : isInTransit ? 'border-primary/50' : 'border-success/50'}`}>
        {/* Status Header */}
        <div className={`px-4 py-2 ${isPending ? 'bg-warning/10' : isInTransit ? 'bg-primary/10' : 'bg-success/10'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPending && <Clock className="h-4 w-4 text-warning" />}
              {isInTransit && <Truck className="h-4 w-4 text-primary" />}
              {isCompleted && <CheckCircle2 className="h-4 w-4 text-success" />}
              <span className="font-medium text-sm">
                {isPending && 'À récupérer'}
                {isInTransit && 'En transit'}
                {isCompleted && 'Livré'}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {assignment.shipment.weight_kg} kg
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-4">
          {/* Package Info */}
          <div>
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {assignment.shipment.title}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {assignment.shipment.pickup_city} → {assignment.shipment.delivery_city}
            </p>
          </div>

          {/* Route Details */}
          <div className="grid grid-cols-1 gap-3">
            {/* Pickup */}
            <div className={`p-3 rounded-lg border ${isPending ? 'bg-warning/5 border-warning/30' : 'bg-muted/30 border-muted'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-full ${isPending ? 'bg-warning/20' : 'bg-success/20'}`}>
                  <MapPin className={`h-3 w-3 ${isPending ? 'text-warning' : 'text-success'}`} />
                </div>
                <span className="font-medium text-sm">Point de collecte</span>
                {assignment.pickup_completed_at && (
                  <Badge variant="outline" className="ml-auto text-xs text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Fait
                  </Badge>
                )}
              </div>
              <p className="text-sm">{assignment.shipment.pickup_address}</p>
              <p className="text-xs text-muted-foreground">{assignment.shipment.pickup_city}, {assignment.shipment.pickup_country}</p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assignment.shipment.pickup_contact_name}
                </span>
                <a href={`tel:${assignment.shipment.pickup_contact_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" />
                  {assignment.shipment.pickup_contact_phone}
                </a>
              </div>
            </div>

            {/* Delivery */}
            <div className={`p-3 rounded-lg border ${isInTransit ? 'bg-primary/5 border-primary/30' : isCompleted ? 'bg-success/5 border-success/30' : 'bg-muted/30 border-muted'}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-full ${isInTransit ? 'bg-primary/20' : isCompleted ? 'bg-success/20' : 'bg-muted'}`}>
                  <Navigation className={`h-3 w-3 ${isInTransit ? 'text-primary' : isCompleted ? 'text-success' : 'text-muted-foreground'}`} />
                </div>
                <span className="font-medium text-sm">Point de livraison</span>
                {assignment.delivery_completed_at && (
                  <Badge variant="outline" className="ml-auto text-xs text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Livré
                  </Badge>
                )}
              </div>
              <p className="text-sm">{assignment.shipment.delivery_address}</p>
              <p className="text-xs text-muted-foreground">{assignment.shipment.delivery_city}, {assignment.shipment.delivery_country}</p>
              <div className="mt-2 flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {assignment.shipment.delivery_contact_name}
                </span>
                <a href={`tel:${assignment.shipment.delivery_contact_phone}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Phone className="h-3 w-3" />
                  {assignment.shipment.delivery_contact_phone}
                </a>
              </div>
            </div>
          </div>

          {/* Client & Price */}
          <div className="flex items-center justify-between bg-muted/30 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {assignment.sender_profile?.first_name} {assignment.sender_profile?.last_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  ★ {assignment.sender_profile?.rating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-success flex items-center gap-1">
                <Euro className="h-4 w-4" />
                {assignment.final_price} {assignment.trip?.currency || 'EUR'}
              </p>
              <p className="text-xs text-muted-foreground">Votre gain</p>
            </div>
          </div>

          {/* Trip Date */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              Départ: {assignment.trip?.departure_date ? new Date(assignment.trip.departure_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}
            </span>
          </div>

          {/* GPS Tracker for in-transit */}
          {isInTransit && showGPS && (
            <GPSTracker 
              assignmentId={assignment.id} 
              onClose={() => setShowGPS(false)}
            />
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2 border-t">
            {/* Main status action */}
            {isPending && (
              <Button 
                onClick={() => updateStatus(assignment, 'pickup')}
                disabled={processingId === assignment.id}
                className="w-full"
              >
                <Package className="h-4 w-4 mr-2" />
                {processingId === assignment.id ? 'Mise à jour...' : 'Marquer comme récupéré'}
              </Button>
            )}

            {isInTransit && (
              <>
                <Button 
                  onClick={() => updateStatus(assignment, 'delivery')}
                  disabled={processingId === assignment.id}
                  className="w-full bg-success hover:bg-success/90"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {processingId === assignment.id ? 'Mise à jour...' : 'Marquer comme livré'}
                </Button>
                {!showGPS && (
                  <Button 
                    variant="outline"
                    onClick={() => setShowGPS(true)}
                    className="w-full"
                  >
                    <Navigation className="h-4 w-4 mr-2" />
                    Partager ma position GPS
                  </Button>
                )}
              </>
            )}

            {/* Secondary actions */}
            <div className="flex gap-2 flex-wrap">
              <Button 
                variant="outline" 
                className="flex-1 min-w-[100px]"
                onClick={() => openConversation(assignment)}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Message
              </Button>
              
              {isInTransit && (
                <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
                  <Link to={`/proof-of-delivery?assignment=${assignment.id}`}>
                    <Camera className="h-4 w-4 mr-2" />
                    Preuve
                  </Link>
                </Button>
              )}

              <Button variant="outline" className="flex-1 min-w-[100px]" asChild>
                <Link to={`/tracking?shipment=${assignment.shipment_id}`}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Suivi
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const EmptyState = ({ icon: Icon, message }: { icon: typeof Package; message: string }) => (
    <Card>
      <CardContent className="text-center py-8">
        <Icon className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 text-center border-warning/30 bg-warning/5">
          <p className="text-2xl font-bold text-warning">{pendingDeliveries.length}</p>
          <p className="text-xs text-muted-foreground">À récupérer</p>
        </Card>
        <Card className="p-3 text-center border-primary/30 bg-primary/5">
          <p className="text-2xl font-bold text-primary">{inTransitDeliveries.length}</p>
          <p className="text-xs text-muted-foreground">En transit</p>
        </Card>
        <Card className="p-3 text-center border-success/30 bg-success/5">
          <p className="text-2xl font-bold text-success">{completedDeliveries.length}</p>
          <p className="text-xs text-muted-foreground">Livrés</p>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="text-xs sm:text-sm">
            À récupérer ({pendingDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="transit" className="text-xs sm:text-sm">
            En transit ({inTransitDeliveries.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm">
            Livrés ({completedDeliveries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingDeliveries.length === 0 ? (
            <EmptyState icon={Clock} message="Aucun colis à récupérer" />
          ) : (
            pendingDeliveries.map(a => <DeliveryCard key={a.id} assignment={a} />)
          )}
        </TabsContent>

        <TabsContent value="transit" className="space-y-4">
          {inTransitDeliveries.length === 0 ? (
            <EmptyState icon={Truck} message="Aucun colis en transit" />
          ) : (
            inTransitDeliveries.map(a => <DeliveryCard key={a.id} assignment={a} />)
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedDeliveries.length === 0 ? (
            <EmptyState icon={CheckCircle2} message="Aucune livraison terminée" />
          ) : (
            completedDeliveries.map(a => <DeliveryCard key={a.id} assignment={a} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
