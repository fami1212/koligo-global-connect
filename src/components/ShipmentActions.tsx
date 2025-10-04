import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Package, MapPin, Weight, Euro, Calendar, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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

interface ShipmentActionsProps {
  shipment: Shipment;
  onUpdate: () => void;
}

export function ShipmentActions({ shipment, onUpdate }: ShipmentActionsProps) {
  const { toast } = useToast();
  const [editData, setEditData] = useState(shipment);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleEdit = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('shipments')
        .update({
          title: editData.title,
          description: editData.description,
          pickup_city: editData.pickup_city,
          pickup_country: editData.pickup_country,
          delivery_city: editData.delivery_city,
          delivery_country: editData.delivery_country,
          weight_kg: editData.weight_kg,
          volume_m3: editData.volume_m3,
          estimated_value: editData.estimated_value,
        })
        .eq('id', shipment.id);

      if (error) throw error;

      toast({
        title: "Colis modifié",
        description: "Les informations du colis ont été mises à jour",
      });

      setShowEditDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating shipment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le colis",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      
      // Delete related offers first
      const { error: offersError } = await supabase
        .from('offers')
        .delete()
        .eq('shipment_id', shipment.id);

      if (offersError) throw offersError;

      // Delete the shipment (RLS policy ensures only delivered shipments can be deleted)
      const { error } = await supabase
        .from('shipments')
        .delete()
        .eq('id', shipment.id);

      if (error) {
        if (error.message.includes('policy')) {
          toast({
            title: "Impossible de supprimer",
            description: "Vous ne pouvez supprimer que les colis livrés dont le trajet est terminé.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        setDeleting(false);
        return;
      }

      toast({
        title: "Colis supprimé",
        description: "Le colis a été supprimé avec succès",
      });

      setShowDeleteDialog(false);
      onUpdate();
    } catch (error) {
      console.error('Error deleting shipment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le colis",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="h-3 w-3 mr-1" />
            Modifier
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Modifier le colis</DialogTitle>
            <DialogDescription>
              Modifiez les informations de votre colis
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={editData.title}
                onChange={(e) => setEditData(prev => ({...prev, title: e.target.value}))}
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editData.description}
                onChange={(e) => setEditData(prev => ({...prev, description: e.target.value}))}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pickup_city">Ville de collecte</Label>
                <Input
                  id="pickup_city"
                  value={editData.pickup_city}
                  onChange={(e) => setEditData(prev => ({...prev, pickup_city: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="pickup_country">Pays de collecte</Label>
                <Input
                  id="pickup_country"
                  value={editData.pickup_country}
                  onChange={(e) => setEditData(prev => ({...prev, pickup_country: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delivery_city">Ville de livraison</Label>
                <Input
                  id="delivery_city"
                  value={editData.delivery_city}
                  onChange={(e) => setEditData(prev => ({...prev, delivery_city: e.target.value}))}
                />
              </div>
              <div>
                <Label htmlFor="delivery_country">Pays de livraison</Label>
                <Input
                  id="delivery_country"
                  value={editData.delivery_country}
                  onChange={(e) => setEditData(prev => ({...prev, delivery_country: e.target.value}))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight_kg">Poids (kg)</Label>
                <Input
                  id="weight_kg"
                  type="number"
                  value={editData.weight_kg}
                  onChange={(e) => setEditData(prev => ({...prev, weight_kg: parseFloat(e.target.value) || 0}))}
                />
              </div>
              <div>
                <Label htmlFor="volume_m3">Volume (m³)</Label>
                <Input
                  id="volume_m3"
                  type="number"
                  step="0.1"
                  value={editData.volume_m3}
                  onChange={(e) => setEditData(prev => ({...prev, volume_m3: parseFloat(e.target.value) || 0}))}
                />
              </div>
              <div>
                <Label htmlFor="estimated_value">Valeur (€)</Label>
                <Input
                  id="estimated_value"
                  type="number"
                  value={editData.estimated_value}
                  onChange={(e) => setEditData(prev => ({...prev, estimated_value: parseFloat(e.target.value) || 0}))}
                />
              </div>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button onClick={handleEdit} disabled={saving} className="flex-1">
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
              <Button variant="outline" onClick={() => setShowEditDialog(false)} className="flex-1">
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Supprimer le colis
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer ce colis ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          
          <Card className="border-destructive/20">
            <CardContent className="pt-4">
              <div className="space-y-2">
                <h4 className="font-medium">{shipment.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {shipment.pickup_city} → {shipment.delivery_city}
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <Weight className="h-3 w-3" />
                    {shipment.weight_kg}kg
                  </div>
                  {shipment.estimated_value && (
                    <div className="flex items-center gap-1">
                      <Euro className="h-3 w-3" />
                      {shipment.estimated_value}€
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="flex gap-2">
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="flex-1">
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </Button>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="flex-1">
              Annuler
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}