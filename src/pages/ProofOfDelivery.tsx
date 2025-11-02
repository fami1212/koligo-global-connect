import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Upload, Check, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Assignment {
  id: string;
  shipment_id: string;
  sender_id: string;
  traveler_id: string;
  pickup_completed_at: string | null;
  delivery_completed_at: string | null;
  shipment?: {
    title: string;
    delivery_contact_name: string;
  };
}

export default function ProofOfDelivery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      loadAssignments();
    }
  }, [user]);

  const loadAssignments = async () => {
    if (!user) return;
    setLoading(true);

    // Load assignments where user is traveler, picked up but not yet delivered
    const { data } = await supabase
      .from("assignments")
      .select(`
        *,
        shipment:shipments(title, delivery_contact_name)
      `)
      .eq("traveler_id", user.id)
      .not("pickup_completed_at", "is", null)
      .is("delivery_completed_at", null);

    if (data) {
      setAssignments(data);
    }

    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadProof = async () => {
    if (!selectedAssignment || !photoFile || !recipientName.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Upload photo to storage
      const fileExt = photoFile.name.split(".").pop();
      const fileName = `${selectedAssignment.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("proof-photos")
        .upload(fileName, photoFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("proof-photos")
        .getPublicUrl(fileName);

      // Create proof of delivery record
      const { error: proofError } = await supabase.from("proof_of_delivery").insert({
        assignment_id: selectedAssignment.id,
        delivered_by: user?.id,
        recipient_name: recipientName.trim(),
        delivery_photo_url: urlData.publicUrl,
        delivery_notes: deliveryNotes.trim() || null,
      });

      if (proofError) throw proofError;

      // Update assignment delivery status
      const { error: updateError } = await supabase
        .from("assignments")
        .update({ delivery_completed_at: new Date().toISOString() })
        .eq("id", selectedAssignment.id);

      if (updateError) throw updateError;

      toast({
        title: "Succès",
        description: "Preuve de livraison enregistrée",
      });

      // Reset form
      setSelectedAssignment(null);
      setRecipientName("");
      setDeliveryNotes("");
      setPhotoFile(null);
      setPhotoPreview("");
      loadAssignments();
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-4xl space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Preuve de Livraison</h1>
        <p className="text-muted-foreground">Confirmez la livraison de vos colis</p>
      </div>

      {assignments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Aucune livraison en attente</p>
          </CardContent>
        </Card>
      ) : !selectedAssignment ? (
        <Card>
          <CardHeader>
            <CardTitle>Livraisons en cours ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {assignments.map((assignment) => (
              <Card key={assignment.id} className="bg-muted/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{assignment.shipment?.title}</p>
                      <p className="text-sm text-muted-foreground">
                        Destinataire: {assignment.shipment?.delivery_contact_name}
                      </p>
                      <Badge className="mt-2" variant="outline">
                        <Check className="h-3 w-3 mr-1" />
                        Récupéré
                      </Badge>
                    </div>
                    <Button onClick={() => {
                      setSelectedAssignment(assignment);
                      setRecipientName(assignment.shipment?.delivery_contact_name || "");
                    }}>
                      Confirmer livraison
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Confirmation de livraison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{selectedAssignment.shipment?.title}</p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Nom du destinataire <span className="text-destructive">*</span>
              </label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="Nom complet"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Photo de livraison <span className="text-destructive">*</span>
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              {photoPreview ? (
                <div className="space-y-2">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="w-full h-64 object-cover rounded-lg"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Changer la photo
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  className="w-full h-32"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-6 w-6 mr-2" />
                  Prendre une photo
                </Button>
              )}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notes (optionnel)</label>
              <Textarea
                value={deliveryNotes}
                onChange={(e) => setDeliveryNotes(e.target.value)}
                placeholder="Ajoutez des notes sur la livraison..."
                maxLength={500}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={uploadProof}
                disabled={uploading || !photoFile || !recipientName.trim()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Enregistrer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedAssignment(null);
                  setRecipientName("");
                  setDeliveryNotes("");
                  setPhotoFile(null);
                  setPhotoPreview("");
                }}
              >
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
