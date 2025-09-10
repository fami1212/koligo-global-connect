import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Camera,
  AlertTriangle,
  User
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface Assignment {
  id: string;
  shipment_id: string;
  sender_id: string;
  traveler_id: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  final_price: number;
  shipment: {
    id: string;
    title: string;
    pickup_city: string;
    delivery_city: string;
    pickup_address: string;
    delivery_address: string;
  };
  sender_profile: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface DeliveryStatusTrackerProps {
  assignmentId?: string;
  mode: 'view' | 'update';
}

export function DeliveryStatusTracker({ assignmentId, mode }: DeliveryStatusTrackerProps) {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({
    event_type: '',
    description: '',
    location: ''
  });

  useEffect(() => {
    if (assignmentId) {
      loadSingleAssignment();
    } else if (mode === 'update' && hasRole('traveler')) {
      loadMyAssignments();
    }
  }, [assignmentId, mode, user]);

  const loadSingleAssignment = async () => {
    if (!assignmentId) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipments (
            id,
            title,
            pickup_city,
            delivery_city,
            pickup_address,
            delivery_address
          )
        `)
        .eq('id', assignmentId)
        .single();

      if (error) throw error;

      // Get sender profile separately
      const { data: senderProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone')
        .eq('user_id', data.sender_id)
        .single();

      setSelectedAssignment({
        ...data,
        shipment: data.shipments,
        sender_profile: senderProfile || { first_name: '', last_name: '', phone: '' }
      });
    } catch (error) {
      console.error('Error loading assignment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'assignment",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMyAssignments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          shipments (
            id,
            title,
            pickup_city,
            delivery_city,
            pickup_address,
            delivery_address
          )
        `)
        .eq('traveler_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get sender profiles for all assignments
      const senderIds = [...new Set(data?.map(a => a.sender_id) || [])];
      const { data: senderProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, phone')
        .in('user_id', senderIds);

      const senderProfilesMap = new Map(senderProfiles?.map(p => [p.user_id, p]) || []);

      const enrichedAssignments = data?.map(assignment => ({
        ...assignment,
        shipment: assignment.shipments,
        sender_profile: senderProfilesMap.get(assignment.sender_id) || { first_name: '', last_name: '', phone: '' }
      })) || [];

      setAssignments(enrichedAssignments);
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

  const updateDeliveryStatus = async (assignment: Assignment, status: 'pickup' | 'delivery') => {
    try {
      const field = status === 'pickup' ? 'pickup_completed_at' : 'delivery_completed_at';
      const { error } = await supabase
        .from('assignments')
        .update({ [field]: new Date().toISOString() })
        .eq('id', assignment.id);

      if (error) throw error;

      // Create tracking event
      await supabase
        .from('tracking_events')
        .insert({
          assignment_id: assignment.id,
          event_type: status === 'pickup' ? 'Colis récupéré' : 'Colis livré',
          description: status === 'pickup' 
            ? `Colis récupéré à ${assignment.shipment.pickup_city}`
            : `Colis livré à ${assignment.shipment.delivery_city}`,
          location: status === 'pickup' 
            ? assignment.shipment.pickup_address 
            : assignment.shipment.delivery_address,
          created_by: user?.id
        });

      toast({
        title: "Statut mis à jour",
        description: status === 'pickup' 
          ? "Colis marqué comme récupéré" 
          : "Colis marqué comme livré",
      });

      if (assignmentId) {
        loadSingleAssignment();
      } else {
        loadMyAssignments();
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const addCustomEvent = async () => {
    if (!selectedAssignment || !statusUpdate.event_type) return;

    try {
      const { error } = await supabase
        .from('tracking_events')
        .insert({
          assignment_id: selectedAssignment.id,
          event_type: statusUpdate.event_type,
          description: statusUpdate.description,
          location: statusUpdate.location,
          created_by: user?.id
        });

      if (error) throw error;

      toast({
        title: "Événement ajouté",
        description: "L'événement a été ajouté au suivi",
      });

      setStatusUpdate({ event_type: '', description: '', location: '' });
      setShowUpdateDialog(false);
    } catch (error) {
      console.error('Error adding event:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'événement",
        variant: "destructive",
      });
    }
  };

  const getDeliveryStatus = (assignment: Assignment) => {
    if (assignment.delivery_completed_at) return 'delivered';
    if (assignment.pickup_completed_at) return 'in_transit';
    return 'pending';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'delivered':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle2 className="h-3 w-3 mr-1" />Livré</Badge>;
      case 'in_transit':
        return <Badge className="bg-yellow-100 text-yellow-800"><Truck className="h-3 w-3 mr-1" />En transit</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const AssignmentCard = ({ assignment }: { assignment: Assignment }) => {
    const status = getDeliveryStatus(assignment);
    
    return (
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5 text-primary" />
              {assignment.shipment.title}
            </CardTitle>
            {getStatusBadge(status)}
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-4 w-4" />
            {assignment.sender_profile.first_name} {assignment.sender_profile.last_name}
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{assignment.shipment.pickup_city} → {assignment.shipment.delivery_city}</span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Récupéré:</span>
              <p className={assignment.pickup_completed_at ? 'text-green-600' : 'text-gray-400'}>
                {assignment.pickup_completed_at 
                  ? new Date(assignment.pickup_completed_at).toLocaleDateString('fr-FR')
                  : 'Non récupéré'
                }
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Livré:</span>
              <p className={assignment.delivery_completed_at ? 'text-green-600' : 'text-gray-400'}>
                {assignment.delivery_completed_at 
                  ? new Date(assignment.delivery_completed_at).toLocaleDateString('fr-FR')
                  : 'Non livré'
                }
              </p>
            </div>
          </div>

          {mode === 'update' && hasRole('traveler') && (
            <div className="flex gap-2 pt-2">
              {!assignment.pickup_completed_at && (
                <Button 
                  onClick={() => updateDeliveryStatus(assignment, 'pickup')}
                  size="sm" 
                  variant="outline"
                  className="flex-1"
                >
                  <Package className="h-4 w-4 mr-1" />
                  Marquer récupéré
                </Button>
              )}
              
              {assignment.pickup_completed_at && !assignment.delivery_completed_at && (
                <Button 
                  onClick={() => updateDeliveryStatus(assignment, 'delivery')}
                  size="sm"
                  className="flex-1"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Marquer livré
                </Button>
              )}

              <Dialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
                <DialogTrigger asChild>
                  <Button 
                    onClick={() => setSelectedAssignment(assignment)}
                    size="sm" 
                    variant="secondary"
                  >
                    <MapPin className="h-4 w-4 mr-1" />
                    Ajouter événement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un événement de suivi</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="event_type">Type d'événement</Label>
                      <Input
                        id="event_type"
                        placeholder="Ex: Arrivé en gare, Retard prévu..."
                        value={statusUpdate.event_type}
                        onChange={(e) => setStatusUpdate(prev => ({...prev, event_type: e.target.value}))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="location">Localisation</Label>
                      <Input
                        id="location"
                        placeholder="Ville, adresse..."
                        value={statusUpdate.location}
                        onChange={(e) => setStatusUpdate(prev => ({...prev, location: e.target.value}))}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Description (optionnel)</Label>
                      <Textarea
                        id="description"
                        placeholder="Détails supplémentaires..."
                        value={statusUpdate.description}
                        onChange={(e) => setStatusUpdate(prev => ({...prev, description: e.target.value}))}
                      />
                    </div>
                    
                    <div className="flex gap-2">
                      <Button onClick={addCustomEvent} className="flex-1">
                        Ajouter
                      </Button>
                      <Button variant="outline" onClick={() => setShowUpdateDialog(false)}>
                        Annuler
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (assignmentId && selectedAssignment) {
    return <AssignmentCard assignment={selectedAssignment} />;
  }

  if (mode === 'update') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Mes livraisons</h2>
        </div>

        {assignments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Truck className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucune livraison en cours</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {assignments.map((assignment) => (
              <AssignmentCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}