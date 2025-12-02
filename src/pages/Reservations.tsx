import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Package, Truck, Clock, CheckCircle, XCircle, MessageCircle, Euro, Search, Filter, X } from 'lucide-react';
import { DeliveryStatusTracker } from '@/components/DeliveryStatusTracker';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';

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
    currency: string;
    price_per_kg: number;
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
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [routeFilter, setRouteFilter] = useState('');

  const { containerRef, isPulling, isRefreshing, pullDistance, threshold } = usePullToRefresh({
    onRefresh: async () => await loadRequests(),
  });

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

      if (hasRole('traveler')) {
        query = query.eq('traveler_id', user?.id);
      } else {
        query = query.eq('sender_id', user?.id);
      }

      const { data: requestsData, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;

      const shipmentIds = [...new Set(requestsData?.map(r => r.shipment_id) || [])];
      const tripIds = [...new Set(requestsData?.map(r => r.trip_id) || [])];
      const senderIds = [...new Set(requestsData?.map(r => r.sender_id) || [])];
      const travelerIds = [...new Set(requestsData?.map(r => r.traveler_id) || [])];

      const [shipmentsData, tripsData, sendersData, travelersData] = await Promise.all([
        supabase.from('shipments').select('id, title, pickup_city, delivery_city, weight_kg').in('id', shipmentIds),
        supabase.from('trips').select('id, departure_city, arrival_city, departure_date, transport_type, currency, price_per_kg').in('id', tripIds),
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

  const openConversation = async (request: MatchRequest) => {
    try {
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select('id')
        .eq('match_request_id', request.id)
        .maybeSingle();

      const assignmentId = assignmentData?.id || null;

      const { data, error } = await supabase
        .from('conversations')
        .select('id')
        .or(
          `and(sender_id.eq.${request.sender_id},traveler_id.eq.${request.traveler_id}),and(sender_id.eq.${request.traveler_id},traveler_id.eq.${request.sender_id})`
        )
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      let conversationId = data?.id;

      if (!conversationId) {
        const { data: created, error: createError } = await supabase
          .from('conversations')
          .insert({
            sender_id: request.sender_id,
            traveler_id: request.traveler_id,
            assignment_id: assignmentId
          })
          .select('id')
          .single();
        
        if (createError) throw createError;
        conversationId = created.id;
      }

      navigate(`/messages?conversationId=${conversationId}`);
    } catch (e) {
      console.error('Error opening conversation:', e);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la conversation",
        variant: "destructive",
      });
    }
  };

  const RequestCard = ({ request }: { request: MatchRequest }) => {
    const [finalPrice, setFinalPrice] = useState(request.final_price || request.estimated_price);
    const isTraveler = hasRole('traveler');
    const otherUser = isTraveler ? request.sender_profile : request.traveler_profile;

    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              {isTraveler ? (
                <Package className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
              ) : (
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-accent flex-shrink-0" />
              )}
              <span className="truncate">
                {isTraveler ? request.shipment?.title : `${request.trip?.departure_city} → ${request.trip?.arrival_city}`}
              </span>
            </CardTitle>
            {getStatusBadge(request.status)}
          </div>
          <CardDescription className="text-xs sm:text-sm">
            Par {otherUser?.first_name} {otherUser?.last_name} (★ {otherUser?.rating?.toFixed(1) || '0.0'})
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            <div>
              <h4 className="font-medium mb-1 text-sm sm:text-base">Détails du colis</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {request.shipment?.pickup_city} → {request.shipment?.delivery_city}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Poids: {request.shipment?.weight_kg}kg
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1 text-sm sm:text-base">Détails du trajet</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {request.trip?.departure_date ? new Date(request.trip.departure_date).toLocaleDateString('fr-FR') : 'N/A'}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Transport: {request.trip?.transport_type || 'N/A'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Euro className="h-4 w-4 text-success flex-shrink-0" />
            <span className="font-medium text-sm sm:text-base">
              Prix: {request.final_price || request.estimated_price} {request.trip?.currency || 'EUR'}
            </span>
          </div>

          {request.message && (
            <div className="p-2 sm:p-3 bg-muted rounded-lg">
              <p className="text-xs sm:text-sm">{request.message}</p>
            </div>
          )}

          {request.status === 'pending' && isTraveler && (
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  type="number"
                  placeholder="Prix final"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(parseFloat(e.target.value))}
                  className="w-full sm:w-32"
                />
                <Button
                  onClick={() => updateRequestStatus(request.id, 'accepted', finalPrice)}
                  disabled={processingId === request.id}
                  className="w-full sm:flex-1"
                  size="sm"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Accepter
                </Button>
              </div>
              <Button
                variant="outline"
                onClick={() => updateRequestStatus(request.id, 'rejected')}
                disabled={processingId === request.id}
                className="w-full"
                size="sm"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Refuser
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pt-2 text-xs text-muted-foreground">
            <span>Créé le {new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
            <Button variant="ghost" size="sm" onClick={() => openConversation(request)} className="w-full sm:w-auto">
              <MessageCircle className="h-3 w-3 mr-1" />
              Message
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Apply filters - MUST be before any conditional return
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      // Search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch = 
          r.shipment?.title?.toLowerCase().includes(search) ||
          r.trip?.departure_city?.toLowerCase().includes(search) ||
          r.trip?.arrival_city?.toLowerCase().includes(search) ||
          r.sender_profile?.first_name?.toLowerCase().includes(search) ||
          r.traveler_profile?.first_name?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }
      
      // Route filter
      if (routeFilter) {
        const route = routeFilter.toLowerCase();
        const matchesRoute = 
          r.trip?.departure_city?.toLowerCase().includes(route) ||
          r.trip?.arrival_city?.toLowerCase().includes(route);
        if (!matchesRoute) return false;
      }
      
      // Price filter
      if (priceFilter !== 'all') {
        const price = r.final_price || r.estimated_price;
        if (priceFilter === 'low' && price > 50) return false;
        if (priceFilter === 'medium' && (price <= 50 || price > 100)) return false;
        if (priceFilter === 'high' && price <= 100) return false;
      }
      
      // Date filter
      if (dateFilter !== 'all' && r.trip?.departure_date) {
        const tripDate = new Date(r.trip.departure_date);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        
        if (dateFilter === 'week' && tripDate > weekFromNow) return false;
        if (dateFilter === 'month' && tripDate > monthFromNow) return false;
      }
      
      return true;
    });
  }, [requests, searchTerm, priceFilter, dateFilter, routeFilter]);

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const acceptedRequests = filteredRequests.filter(r => r.status === 'accepted');
  const rejectedRequests = filteredRequests.filter(r => r.status === 'rejected');
  
  const clearFilters = () => {
    setSearchTerm('');
    setPriceFilter('all');
    setDateFilter('all');
    setRouteFilter('');
  };
  
  const hasActiveFilters = searchTerm || priceFilter !== 'all' || dateFilter !== 'all' || routeFilter;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8 overflow-x-hidden overflow-y-auto">
      <PullToRefreshIndicator
        isPulling={isPulling}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold text-foreground">
              {hasRole('traveler') ? 'Demandes reçues' : 'Mes demandes'}
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-1">
              {hasRole('traveler') 
                ? 'Gérez les demandes de transport pour vos trajets' 
                : 'Suivez l\'état de vos demandes de transport'
              }
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Filtres</span>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="ml-auto h-8">
                  <X className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                placeholder="Trajet (ville)"
                value={routeFilter}
                onChange={(e) => setRouteFilter(e.target.value)}
              />
              <Select value={priceFilter} onValueChange={setPriceFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Prix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les prix</SelectItem>
                  <SelectItem value="low">{"< 50€"}</SelectItem>
                  <SelectItem value="medium">50€ - 100€</SelectItem>
                  <SelectItem value="high">{"> 100€"}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les dates</SelectItem>
                  <SelectItem value="week">Cette semaine</SelectItem>
                  <SelectItem value="month">Ce mois</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        <Tabs defaultValue="pending" className="space-y-4 sm:space-y-6">
          <TabsList className="w-full h-auto flex flex-wrap gap-1 p-1">
            <TabsTrigger value="pending" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">En attente</span>
              <span className="sm:hidden">Attente</span>
              <span className="ml-1">({pendingRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="accepted" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Acceptées</span>
              <span className="sm:hidden">Accept.</span>
              <span className="ml-1">({acceptedRequests.length})</span>
            </TabsTrigger>
            <TabsTrigger value="rejected" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Refusées</span>
              <span className="sm:hidden">Refus.</span>
              <span className="ml-1">({rejectedRequests.length})</span>
            </TabsTrigger>
            {hasRole('traveler') && (
              <TabsTrigger value="deliveries" className="flex-1 min-w-[80px] text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Mes livraisons</span>
                <span className="sm:hidden">Livr.</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="pending" className="space-y-3 sm:space-y-4">
            {pendingRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6 sm:py-8">
                  <Clock className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-muted-foreground" />
                  <p className="text-sm sm:text-base text-muted-foreground">Aucune demande en attente</p>
                </CardContent>
              </Card>
            ) : (
              pendingRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-3 sm:space-y-4">
            {acceptedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6 sm:py-8">
                  <CheckCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-success" />
                  <p className="text-sm sm:text-base text-muted-foreground">Aucune demande acceptée</p>
                </CardContent>
              </Card>
            ) : (
              acceptedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-3 sm:space-y-4">
            {rejectedRequests.length === 0 ? (
              <Card>
                <CardContent className="text-center py-6 sm:py-8">
                  <XCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-destructive" />
                  <p className="text-sm sm:text-base text-muted-foreground">Aucune demande refusée</p>
                </CardContent>
              </Card>
            ) : (
              rejectedRequests.map(request => (
                <RequestCard key={request.id} request={request} />
              ))
            )}
          </TabsContent>

          {hasRole('traveler') && (
            <TabsContent value="deliveries" className="space-y-3 sm:space-y-4">
              <DeliveryStatusTracker mode="update" />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}
