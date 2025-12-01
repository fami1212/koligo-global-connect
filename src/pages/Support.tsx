import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Plus, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

interface ProblemReport {
  id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  resolution_notes: string | null;
}

import UserAdminMessaging from "@/components/UserAdminMessaging";

export default function Support() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  
  // Create form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  
  // Admin resolution
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("problem_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (!hasRole("admin")) {
      query = query.eq("user_id", user.id);
    }

    const { data } = await query;
    if (data) setReports(data);

    setLoading(false);
  };

  const createReport = async () => {
    if (!title.trim() || !description.trim() || !category) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("problem_reports").insert({
      user_id: user?.id,
      title: title.trim(),
      description: description.trim(),
      category,
      priority: "medium",
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
        description: "Ticket créé",
      });
      setShowCreateDialog(false);
      setTitle("");
      setDescription("");
      setCategory("");
      loadReports();
    }
  };

  const resolveReport = async (reportId: string) => {
    if (!resolutionNotes.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter des notes de résolution",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    const { error } = await supabase
      .from("problem_reports")
      .update({
        status: "resolved",
        resolution_notes: resolutionNotes.trim(),
        resolved_at: new Date().toISOString(),
        resolved_by: user?.id,
      })
      .eq("id", reportId);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Succès",
        description: "Ticket résolu",
      });
      setSelectedReport(null);
      setResolutionNotes("");
      loadReports();
    }

    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return <Badge className="bg-green-500">Résolu</Badge>;
      case "in_progress":
        return <Badge variant="outline">En cours</Badge>;
      default:
        return <Badge variant="destructive">Ouvert</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Élevée</Badge>;
      case "low":
        return <Badge variant="secondary">Basse</Badge>;
      default:
        return <Badge variant="outline">Moyenne</Badge>;
    }
  };

  const filterByStatus = (status: string) => {
    return reports.filter(r => r.status === status);
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
          <h1 className="text-3xl font-bold mb-2">Support</h1>
          <p className="text-muted-foreground">Créez et suivez vos tickets de support ou contactez l'administration</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau ticket
        </Button>
      </div>

      {/* Messagerie Admin */}
      <UserAdminMessaging />

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">
            Ouverts ({filterByStatus("open").length + filterByStatus("in_progress").length})
          </TabsTrigger>
          <TabsTrigger value="resolved">
            Résolus ({filterByStatus("resolved").length})
          </TabsTrigger>
        </TabsList>

        {["open", "resolved"].map((tabValue) => (
          <TabsContent key={tabValue} value={tabValue}>
            <div className="space-y-3">
              {(tabValue === "open"
                ? [...filterByStatus("open"), ...filterByStatus("in_progress")]
                : filterByStatus("resolved")
              ).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun ticket</p>
                  </CardContent>
                </Card>
              ) : (
                (tabValue === "open"
                  ? [...filterByStatus("open"), ...filterByStatus("in_progress")]
                  : filterByStatus("resolved")
                ).map((report) => (
                  <Card key={report.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedReport(report)}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-semibold mb-1">{report.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 ml-4">
                          {getStatusBadge(report.status)}
                          {getPriorityBadge(report.priority)}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="capitalize">{report.category}</span>
                        <span>{new Date(report.created_at).toLocaleDateString()}</span>
                      </div>
                      {report.resolution_notes && (
                        <div className="mt-3 p-3 bg-muted rounded-lg">
                          <p className="text-sm font-medium mb-1">Résolution:</p>
                          <p className="text-sm">{report.resolution_notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Créer un ticket</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Titre</label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Résumé du problème"
                maxLength={100}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Catégorie</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="technical">Technique</SelectItem>
                  <SelectItem value="payment">Paiement</SelectItem>
                  <SelectItem value="delivery">Livraison</SelectItem>
                  <SelectItem value="account">Compte</SelectItem>
                  <SelectItem value="general">Général</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez le problème en détail..."
                maxLength={1000}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={createReport}>Créer</Button>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail/Resolution Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedReport?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              {selectedReport && getStatusBadge(selectedReport.status)}
              {selectedReport && getPriorityBadge(selectedReport.priority)}
              <Badge variant="outline" className="capitalize">
                {selectedReport?.category}
              </Badge>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm">{selectedReport?.description}</p>
            </div>
            {hasRole("admin") && selectedReport?.status !== "resolved" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">Notes de résolution</label>
                  <Textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Décrivez la solution..."
                    maxLength={1000}
                  />
                </div>
                <Button
                  onClick={() => resolveReport(selectedReport!.id)}
                  disabled={processing}
                >
                  Marquer comme résolu
                </Button>
              </>
            )}
            {selectedReport?.resolution_notes && (
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium mb-2">Résolution:</p>
                <p className="text-sm">{selectedReport.resolution_notes}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Résolu le {selectedReport.resolved_at && new Date(selectedReport.resolved_at).toLocaleDateString()}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
