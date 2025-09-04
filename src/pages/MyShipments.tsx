import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, Eye, Edit, MapPin, Calendar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface Shipment {
  id: string;
  title: string;
  description: string;
  pickup_city: string;
  pickup_country: string;
  delivery_city: string;
  delivery_country: string;
  weight_kg: number;
  volume_m3: number;
  estimated_value: number;
  status: string;
  created_at: string;
}

export default function MyShipments() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadShipments();
  }, [user, navigate]);

  const loadShipments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('shipments')
        .select('*')
        .eq('sender_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setShipments(data || []);
    } catch (error) {
      console.error('Error loading shipments:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger vos colis",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'accepted':
        return 'default';
      case 'in_transit':
        return 'default';
      case 'delivered':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'En attente';
      case 'accepted':
        return 'Accepté';
      case 'in_transit':
        return 'En transit';
      case 'delivered':
        return 'Livré';
      default:
        return status;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Mes Colis</h1>
            <p className="text-muted-foreground mt-1">
              Gérez vos demandes de livraison
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link to="/dashboard">Tableau de bord</Link>
            </Button>
            <Button asChild>
              <Link to="/sender/create-shipment">
                <Plus className="h-4 w-4 mr-2" />
                Nouveau colis
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-2">Chargement...</p>
          </div>
        ) : shipments.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Aucun colis</h3>
              <p className="text-muted-foreground mb-6">
                Vous n'avez pas encore créé de demande de livraison
              </p>
              <Button asChild>
                <Link to="/sender/create-shipment">
                  <Plus className="h-4 w-4 mr-2" />
                  Créer mon premier colis
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {shipments.map((shipment) => (
              <Card key={shipment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{shipment.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {shipment.description}
                      </CardDescription>
                    </div>
                    <Badge variant={getStatusColor(shipment.status)}>
                      {getStatusText(shipment.status)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-primary" />
                      <span>
                        {shipment.pickup_city}, {shipment.pickup_country}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-accent" />
                      <span>
                        {shipment.delivery_city}, {shipment.delivery_country}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Poids</span>
                      <p className="font-medium">{shipment.weight_kg}kg</p>
                    </div>
                    {shipment.volume_m3 && (
                      <div>
                        <span className="text-muted-foreground">Volume</span>
                        <p className="font-medium">{shipment.volume_m3}m³</p>
                      </div>
                    )}
                  </div>

                  {shipment.estimated_value && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Valeur estimée</span>
                      <p className="font-medium">{shipment.estimated_value}€</p>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    Créé le {new Date(shipment.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      Voir
                    </Button>
                    {shipment.status === 'pending' && (
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="h-3 w-3 mr-1" />
                        Modifier
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}