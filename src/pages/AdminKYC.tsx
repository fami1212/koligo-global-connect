import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, X, User, FileText, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: string;
  notes: string | null;
  created_at: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
}

export default function AdminKYC() {
  const { user, hasRole } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<KYCDocument | null>(null);
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [viewDoc, setViewDoc] = useState<string | null>(null);

  useEffect(() => {
    if (user && hasRole("admin")) {
      loadDocuments();
    }
  }, [user]);

  const loadDocuments = async () => {
    setLoading(true);

    const { data } = await supabase
      .from("kyc_documents")
      .select(`
        *,
        profile:profiles!kyc_documents_user_id_fkey(first_name, last_name, email, avatar_url)
      `)
      .order("created_at", { ascending: false });

    if (data) {
      setDocuments(data);
    }

    setLoading(false);
  };

  const handleReview = async (docId: string, status: "approved" | "rejected") => {
    if (!notes.trim() && status === "rejected") {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une note pour le rejet",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    const { error } = await supabase
      .from("kyc_documents")
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        notes: notes.trim() || null,
      })
      .eq("id", docId);

    if (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // If approved, update profile verification status
      if (status === "approved") {
        const doc = documents.find(d => d.id === docId);
        if (doc) {
          await supabase
            .from("profiles")
            .update({
              is_verified: true,
              verification_approved_at: new Date().toISOString(),
              verification_approved_by: user?.id,
            })
            .eq("user_id", doc.user_id);
        }
      }

      toast({
        title: "Succès",
        description: `Document ${status === "approved" ? "approuvé" : "rejeté"}`,
      });
      
      setSelectedDoc(null);
      setNotes("");
      loadDocuments();
    }

    setProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500">Approuvé</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejeté</Badge>;
      default:
        return <Badge variant="outline">En attente</Badge>;
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "national_id":
        return "Carte d'identité";
      case "passport":
        return "Passeport";
      case "driver_license":
        return "Permis de conduire";
      default:
        return type;
    }
  };

  const filterByStatus = (status: string) => {
    return documents.filter(doc => doc.status === status);
  };

  if (!hasRole("admin")) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-destructive">Accès non autorisé</p>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <div>
        <h1 className="text-3xl font-bold mb-2">{t('admin.kyc.title')}</h1>
        <p className="text-muted-foreground">{t('admin.kyc.subtitle')}</p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            {t('admin.kyc.pending')} ({filterByStatus("pending").length})
          </TabsTrigger>
          <TabsTrigger value="approved">
            {t('admin.kyc.approved')} ({filterByStatus("approved").length})
          </TabsTrigger>
          <TabsTrigger value="rejected">
            {t('admin.kyc.rejected')} ({filterByStatus("rejected").length})
          </TabsTrigger>
        </TabsList>

        {["pending", "approved", "rejected"].map((status) => (
          <TabsContent key={status} value={status}>
            <div className="space-y-3">
              {filterByStatus(status).length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Aucun document</p>
                  </CardContent>
                </Card>
              ) : (
                filterByStatus(status).map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={doc.profile?.avatar_url || ""} />
                          <AvatarFallback>
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-semibold">
                                {doc.profile?.first_name} {doc.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {doc.profile?.email}
                              </p>
                              <p className="text-sm text-muted-foreground mt-1">
                                {getDocTypeLabel(doc.document_type)}
                              </p>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(doc.status)}
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          {doc.notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <p className="font-medium">Notes:</p>
                              <p>{doc.notes}</p>
                            </div>
                          )}

                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewDoc(doc.document_url)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Voir
                            </Button>
                            {doc.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => {
                                    setSelectedDoc(doc);
                                    setNotes("");
                                  }}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Approuver
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setSelectedDoc(doc);
                                    setNotes("");
                                  }}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Review Dialog */}
      <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réviser le document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="font-medium mb-1">Utilisateur:</p>
              <p className="text-sm text-muted-foreground">
                {selectedDoc?.profile?.first_name} {selectedDoc?.profile?.last_name}
              </p>
            </div>
            <div>
              <p className="font-medium mb-1">Type:</p>
              <p className="text-sm text-muted-foreground">
                {selectedDoc && getDocTypeLabel(selectedDoc.document_type)}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ajoutez des notes..."
                maxLength={500}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => handleReview(selectedDoc!.id, "approved")}
                disabled={processing}
              >
                <Check className="h-4 w-4 mr-2" />
                Approuver
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleReview(selectedDoc!.id, "rejected")}
                disabled={processing}
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
              <Button variant="outline" onClick={() => setSelectedDoc(null)}>
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer */}
      <Dialog open={!!viewDoc} onOpenChange={() => setViewDoc(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Document</DialogTitle>
          </DialogHeader>
          {viewDoc && (
            <img
              src={viewDoc}
              alt="Document"
              className="w-full h-auto max-h-[70vh] object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
