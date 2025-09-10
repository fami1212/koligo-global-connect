import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Package, Truck, Clock, CheckCircle, XCircle, MessageCircle, Euro } from 'lucide-react';
import { DeliveryStatusTracker } from '@/components/DeliveryStatusTracker';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MatchRequest {
  id: string;
  status: string;
  estimated_price: number;
  final_price?: number;
  message?: string;
  notes?: string;
  confirmed_at?: string;
  created_at: string;
  sender_id: string;
  traveler_id: string;
  shipment_id: string;
  trip_id: string;
  shipment?: {
    id: string;
    title: string;
    pickup_city: string;
    delivery_city: string;
    weight_kg: number;
  };
  trip?: {
    id: string;
    departure_city: string;
    arrival_city: string;
    departure_date: string;
    transport_type: string;
  };
  sender_profile?: {
    first_name: string;
    last_name: string;
    rating: number;
  };
  traveler_profile?: {
    first_name: string;
    last_name: string;
    rating: number;
  };
}

export default function Reservations() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [requests, setRequests] = useState<MatchRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('match_requests')
        .select('*');

      // Filter based on user role
      if (hasRole('traveler')) {
        query = query.eq('traveler_id', user?.id);
      } else {
        query = query.eq('sender_id', user?.id);
      }

      const { data: requestsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      // Get related data
      const shipmentIds = [...new Set(requestsData?.map(r => r.shipment_id) || [])];
      const tripIds = [...new Set(requestsData?.map(r => r.trip_id) || [])];
      const senderIds = [...new Set(requestsData?.map(r => r.sender_id) || [])];
      const travelerIds = [...new Set(requestsData?.map(r => r.traveler_id) || [])];

      const [shipmentsData, tripsData, sendersData, travelersData] = await Promise.all([
        supabase.from('shipments').select('id, title, pickup_city, delivery_city, weight_kg').in('id', shipmentIds),
        supabase.from('trips').select('id, departure_city, arrival_city, departure_date, transport_type').in('id', tripIds),
        supabase.from('profiles').select('user_id, first_name, last_name, rating').in('user_id', senderIds),
        supabase.from('profiles').select('user_id, first_name, last_name, rating').in('user_id', travelerIds)
      ]);

      const shipmentsMap = new Map(shipmentsData.data?.map(s => [s.id, s]) || []);
      const tripsMap = new Map(tripsData.data?.map(t => [t.id, t]) || []);
      const sendersMap = new Map(sendersData.data?.map(p => [p.user_id, p]) || []);
      const travelersMap = new Map(travelersData.data?.map(p => [p.user_id, p]) || []);

      const enrichedRequests = requestsData?.map(request => ({
        ...request,
        shipment: shipmentsMap.get(request.shipment_id),
        trip: tripsMap.get(request.trip_id),
        sender_profile: sendersMap.get(request.sender_id),
        traveler_profile: travelersMap.get(request.traveler_id)
      })) || [];

      setRequests(enrichedRequests);
    } catch (error) {
      console.error('Error loading requests:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les demandes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateRequestStatus = async (requestId: string, status: string, finalPrice?: number) => {
    try {
      setProcessingId(requestId);
      
      const updateData: any = { status };
      if (status === 'accepted' && finalPrice) {
        updateData.final_price = finalPrice;
        updateData.confirmed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('match_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // If accepted, create assignment
      if (status === 'accepted') {
        const request = requests.find(r => r.id === requestId);
        if (request) {
          const { error: assignmentError } = await supabase
            .from('assignments')
            .insert({
              match_request_id: requestId,
              shipment_id: request.shipment_id,
              trip_id: request.trip_id,
              sender_id: request.sender_id,
              traveler_id: request.traveler_id,
              final_price: finalPrice || request.estimated_price,
            });

          if (assignmentError) throw assignmentError;
        }
      }

      await loadRequests();
      toast({
        title: status === 'accepted' ? "Demande acceptée" : "Demande refusée",
        description: status === 'accepted' 
          ? "L'assignment a été créé avec succès" 
          : "La demande a été refusée",
      });
    } catch (error) {
      console.error('Error updating request:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour la demande",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
      case 'accepted':
        return <Badge variant="default" className="bg-success"><CheckCircle className="h-3 w-3 mr-1" />Acceptée</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Refusée</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const RequestCard = ({ request }: { request: MatchRequest }) => {
    const [finalPrice, setFinalPrice] = useState(request.final_price || request.estimated_price);
    const isTraveler = hasRole('traveler');
    const otherUser = isTraveler ? request.sender_profile : request.traveler_profile;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isTraveler ? (
                <Package className="h-5 w-5 text-primary" />
              ) : (
                <Truck className="h-5 w-5 text-accent" />
              )}
              {isTraveler ? request.shipment?.title : `${request.trip?.departure_city} → ${request.trip?.arrival_city}`}
            </CardTitle>
            {getStatusBadge(request.status)}
          </div>
          <CardDescription>
            Par {otherUser?.first_name} {otherUser?.last_name} (★ {otherUser?.rating?.toFixed(1) || '0.0'})
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Détails du colis</h4>
              <p className="text-sm text-muted-foreground">
                {request.shipment?.pickup_city} → {request.shipment?.delivery_city}
              </p>
              <p className="text-sm text-muted-foreground">
                Poids: {request.shipment?.weight_kg}kg
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">Détails du trajet</h4>
              <p className="text-sm text-muted-foreground">
                {request.trip?.departure_date ? new Date(request.trip.departure_date).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
              <p className="text-sm text-muted-foreground">
                Transport: {request.trip?.transport_type || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-success" />
            <span className="font-medium">
              Prix: {request.final_price || request.estimated_price}€
            </span>
          </div>

          {request.message && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">{request.message}</p>
            </div>
          )}

          {request.status === 'pending' && isTraveler && (
            <div className="flex gap-2 pt-2">
              <div className="flex-1 flex gap-2">
                <Input
                  type="number"
                  placeholder="Prix final"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(parseFloat(e.target.value))}
                  className="w-32"
                />
                <Button
                  onClick={() => updateRequestStatus(request.id, 'accepted', finalPrice)}
                  disabled={processingId === request.id}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accepter
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => updateRequestStatus(request.id, 'rejected')}
                disabled={processingId === request.id}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </div>
          )}

          <div className="flex justify-between items-center pt-2 text-xs text-muted-foreground">
            <span>Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/messages">
                <MessageCircle className="h-3 w-3 mr-1" />
                Message
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const acceptedRequests = requests.filter(r => r.status === 'accepted');
  const rejectedRequests = requests.filter(r => r.status === 'rejected');

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {hasRole('traveler') ? 'Demandes reçues' : 'Mes demandes'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {hasRole('traveler') 
                ? 'Gérez les demandes de transport pour vos trajets' 
                : 'Suivez l\'état de vos demandes de transport'
              }
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="pending">
              En attente ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="accepted">
              Acceptées ({acceptedRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              Refusées ({rejectedRequests.length})
            </TabsTrigger>
            {hasRole('traveler') && (
              <TabsTrigger value="deliveries">
                Mes livraisons
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune demande en attente</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {acceptedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-success" />
                  <p className="text-muted-foreground">Aucune demande acceptée</p>
                </CardContent>
              </Card>
            ) : (
              acceptedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <XCircle className="h-12 w-12 mx-auto mb-4 text-destructive" />
                  <p className="text-muted-foreground">Aucune demande refusée</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          {hasRole('traveler') && (
            <TabsContent value="deliveries" className="space-y-4">
              <DeliveryStatusTracker mode="update" />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}