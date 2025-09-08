import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Upload, CheckCircle, Clock, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface KYCDocument {
  id: string;
  document_type: string;
  document_url: string;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  created_at: string;
}

export function KYCUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<KYCDocument[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const uploadDocument = async (file: File, documentType: string) => {
    if (!user || !file) return;

    try {
      setUploading(documentType);
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Le fichier ne peut pas dépasser 5MB');
      }

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      // Save document record to database
      const { error: dbError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          document_url: publicUrl,
          status: 'pending'
        });

      if (dbError) throw dbError;

      toast({
        title: "Document uploadé",
        description: `Votre ${documentType === 'national_id' ? 'carte d\'identité' : 'passeport'} a été uploadé avec succès`,
      });

      loadDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur d'upload",
        description: error instanceof Error ? error.message : "Impossible d'uploader le document",
        variant: "destructive",
      });
    } finally {
      setUploading(null);
    }
  };

  const loadDocuments = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const requestVerification = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          verification_requested_at: new Date().toISOString() 
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande de vérification a été envoyée. Vous recevrez une réponse sous 24-48h.",
      });
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande de vérification",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejeté</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const hasDocument = (type: string) => documents.some(doc => doc.document_type === type);
  const canRequestVerification = documents.length > 0 && documents.some(doc => doc.status === 'approved');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Vérification d'identité
        </CardTitle>
        <CardDescription>
          Uploadez vos documents d'identité pour être vérifié et obtenir des avantages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Upload Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* National ID */}
          <div className="space-y-3">
            <h4 className="font-medium">Carte d'identité nationale</h4>
            {hasDocument('national_id') ? (
              <div className="space-y-2">
                {documents
                  .filter(doc => doc.document_type === 'national_id')
                  .map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Document uploadé</span>
                      {getStatusBadge(doc.status)}
                    </div>
                  ))}
              </div>
            ) : (
              <label className="cursor-pointer">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  disabled={uploading === 'national_id'}
                >
                  {uploading === 'national_id' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Choisir un fichier
                    </>
                  )}
                </Button>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDocument(file, 'national_id');
                  }}
                  disabled={uploading === 'national_id'}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Formats acceptés: JPG, PNG, PDF (max 5MB)
            </p>
          </div>
          
          {/* Passport */}
          <div className="space-y-3">
            <h4 className="font-medium">Passeport</h4>
            {hasDocument('passport') ? (
              <div className="space-y-2">
                {documents
                  .filter(doc => doc.document_type === 'passport')
                  .map(doc => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">Document uploadé</span>
                      {getStatusBadge(doc.status)}
                    </div>
                  ))}
              </div>
            ) : (
              <label className="cursor-pointer">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={uploading === 'passport'}
                >
                  {uploading === 'passport' ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      Upload en cours...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Choisir un fichier
                    </>
                  )}
                </Button>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadDocument(file, 'passport');
                  }}
                  disabled={uploading === 'passport'}
                />
              </label>
            )}
            <p className="text-xs text-muted-foreground">
              Formats acceptés: JPG, PNG, PDF (max 5MB)
            </p>
          </div>
        </div>
        
        {/* Verification Request */}
        <div className="pt-4 border-t">
          <Button 
            className="w-full" 
            size="lg"
            onClick={requestVerification}
            disabled={documents.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            Demander la vérification
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            {documents.length === 0 
              ? "Uploadez au moins un document pour demander la vérification"
              : "La vérification peut prendre 24-48h"
            }
          </p>
        </div>

        {/* Uploaded Documents List */}
        {documents.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Documents uploadés</h4>
            {documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <span className="text-sm font-medium">
                    {doc.document_type === 'national_id' ? 'Carte d\'identité' : 'Passeport'}
                  </span>
                  <p className="text-xs text-muted-foreground">
                    Uploadé le {new Date(doc.created_at).toLocaleDateString('fr-FR')}
                  </p>
                  {doc.notes && (
                    <p className="text-xs text-muted-foreground mt-1">{doc.notes}</p>
                  )}
                </div>
                {getStatusBadge(doc.status)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}