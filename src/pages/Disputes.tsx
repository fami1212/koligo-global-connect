import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Dispute {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution: string | null;
  complainant_id: string;
  respondent_id: string;
  assignment_id: string;
  complainant?: { first_name: string; last_name: string };
  respondent?: { first_name: string; last_name: string };
  assignment?: {
    shipment?: { title: string };
  };
}

export default function Disputes() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  
  // Create form
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const [disputeType, setDisputeType] = useState("");
  const [description, setDescription] = useState("");
  
  // Admin resolution
  const [resolution, setResolution] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load disputes
    let query = supabase
      .from("disputes")
      .select("*")
      .order("created_at", { ascending: false });

    if (!hasRole("admin")) {
      query = query.or(`complainant_id.eq.${user.id},respondent_id.eq.${user.id}`);
    }

    const { data: disputesData } = await query;
    
    if (disputesData && disputesData.length > 0) {
      // Fetch related profiles and assignments
      const complainantIds = [...new Set(disputesData.map(d => d.complainant_id))];
      const respondentIds = [...new Set(disputesData.map(d => d.respondent_id))];
      const assignmentIds = [...new Set(disputesData.map(d => d.assignment_id))];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, first_name, last_name")
        .in("user_id", [...complainantIds, ...respondentIds]);

      const { data: assignments } = await supabase
        .from("assignments")
        .select("id, shipment_id")
        .in("id", assignmentIds);

      if (assignments && assignments.length > 0) {
        const shipmentIds = assignments.map(a => a.shipment_id);
        const { data: shipments } = await supabase
          .from("shipments")
          .select("id, title")
          .in("id", shipmentIds);

        const shipmentMap = new Map(shipments?.map(s => [s.id, s]));
        const assignmentMap = new Map(assignments.map(a => ({
          id: a.id,
          shipment: shipmentMap.get(a.shipment_id)
        })).map(a => [a.id, a]));

        const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

        const enriched = disputesData.map(d => ({
          ...d,
          complainant: profileMap.get(d.complainant_id),
          respondent: profileMap.get(d.respondent_id),
          assignment: assignmentMap.get(d.assignment_id)
        }));

        setDisputes(enriched as any);
      } else {
        setDisputes(disputesData as any);
      }
    }

    // Load user assignments for creating disputes
    const { data: assignmentsData } = await supabase
      .from("assignments")
      .select(`
        *,
        shipment:shipments(title),
        traveler:profiles!assignments_traveler_id_fkey(first_name, last_name),
        sender:profiles!assignments_sender_id_fkey(first_name, last_name)
      `)
      .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`);

    if (assignmentsData) setAssignments(assignmentsData);

    setLoading(false);
  };

  const createDispute = async () => {
    if (!selectedAssignment || !disputeType || !description.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const assignment = assignments.find(a => a.id === selectedAssignment);
    const respondentId = assignment.sender_id === user?.id 
      ? assignment.traveler_id 
      : assignment.sender_id;

    const { error } = await supabase.from("disputes").insert({
      assignment_id: selectedAssignment,
      complainant_id: user?.id,
      respondent_id: respondentId,
      type: disputeType,
      description: description.trim(),
    });

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Litige créé",
      });
      setShowCreateDialog(false);
      setSelectedAssignment("");
      setDisputeType("");
      setDescription("");
      loadData();
    }
  };

  const resolveDispute = async (disputeId: string, newStatus: string) => {
    if (newStatus === "resolved" && !resolution.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une résolution",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    const updateData: any = { status: newStatus };
    if (newStatus === "resolved") {
      updateData.resolution = resolution.trim();
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user?.id;
    }

    const { error } = await supabase
      .from("disputes")
      .update(updateData)
      .eq("id", disputeId);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: `Litige ${newStatus === "resolved" ? "résolu" : "fermé"}`,
      });
      setSelectedDispute(null);
      setResolution("");
      loadData();
    }

    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500">Résolu</Badge>;
      case "closed":
        return <Badge variant="secondary">Fermé</Badge>;
      case "in_progress":
        return <Badge variant="outline">En cours</Badge>;
      default:
        return <Badge variant="destructive">Ouvert</Badge>;
    }
  };

  const filterByStatus = (status: string) => {
    return disputes.filter(d => d.status === status);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Litiges</h1>
          <p className="text-muted-foreground">Gérez vos litiges et réclamations</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau litige
        </Button>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Ouverts ({filterByStatus("open").length + filterByStatus("in_progress").length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Résolus ({filterByStatus("resolved").length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Fermés ({filterByStatus("closed").length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <DisputesList
            disputes={[...filterByStatus("open"), ...filterByStatus("in_progress")]}
            getStatusBadge={getStatusBadge}
            onSelect={setSelectedDispute}
            isAdmin={hasRole("admin")}
          />
        </TabsContent>
        <TabsContent value="resolved">
          <DisputesList
            disputes={filterByStatus("resolved")}
            getStatusBadge={getStatusBadge}
            onSelect={setSelectedDispute}
            isAdmin={hasRole("admin")}
          />
        </TabsContent>
        <TabsContent value="closed">
          <DisputesList
            disputes={filterByStatus("closed")}
            getStatusBadge={getStatusBadge}
            onSelect={setSelectedDispute}
            isAdmin={hasRole("admin")}
          />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un litige</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Livraison concernée</label>
              <Select value={selectedAssignment} onValueChange={setSelectedAssignment}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {assignments.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.shipment?.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Type de litige</label>
              <Select value={disputeType} onValueChange={setDisputeType}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="delivery_issue">Problème de livraison</SelectItem>
                  <SelectItem value="payment_issue">Problème de paiement</SelectItem>
                  <SelectItem value="damaged_goods">Marchandise endommagée</SelectItem>
                  <SelectItem value="lost_package">Colis perdu</SelectItem>
                  <SelectItem value="other">Autre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le problème..."
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createDispute}>Créer</Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Admin Resolution Dialog */}
      {hasRole("admin") && (
        <Dialog open={!!selectedDispute} onOpenChange={() => setSelectedDispute(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Gérer le litige</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium mb-2">{selectedDispute?.type}</p>
                <p className="text-sm text-muted-foreground">{selectedDispute?.description}</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Résolution</label>
                <Textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Décrivez la résolution..."
                  maxLength={1000}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => resolveDispute(selectedDispute!.id, "resolved")}
                  disabled={processing}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Résoudre
                </Button>
                <Button
                  variant="outline"
                  onClick={() => resolveDispute(selectedDispute!.id, "closed")}
                  disabled={processing}
                >
                  <X className="h-4 w-4 mr-2" />
                  Fermer
                </Button>
                <Button variant="outline" onClick={() => setSelectedDispute(null)}>
                  Annuler
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function DisputesList({ disputes, getStatusBadge, onSelect, isAdmin }: any) {
  if (disputes.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">Aucun litige</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {disputes.map((dispute: Dispute) => (
        <Card key={dispute.id}>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold">{dispute.type}</p>
                <p className="text-sm text-muted-foreground">
                  {dispute.assignment?.shipment?.title}
                </p>
              </div>
              {getStatusBadge(dispute.status)}
            </div>
            <p className="text-sm mb-3">{dispute.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Créé le {new Date(dispute.created_at).toLocaleDateString()}</span>
              {isAdmin && dispute.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => onSelect(dispute)}>
                  Gérer
                </Button>
              )}
            </div>
            {dispute.resolution && (
              <div className="mt-3 p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">Résolution:</p>
                <p className="text-sm">{dispute.resolution}</p>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
