import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Upload, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface VerificationStatus {
  is_verified: boolean;
  verification_requested_at: string | null;
  verification_approved_at: string | null;
  has_kyc_documents: boolean;
}

export function VerificationBanner() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [showBanner, setShowBanner] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user && profile) {
      loadVerificationStatus();
    }
  }, [user, profile]);

  const loadVerificationStatus = async () => {
    try {
      // Check verification status from profile
      const profileData = profile as any;
      
      // Check if user has KYC documents
      const { data: kycDocs } = await supabase
        .from('kyc_documents')
        .select('id')
        .eq('user_id', user!.id)
        .limit(1);

      setVerificationStatus({
        is_verified: profileData.is_verified || false,
        verification_requested_at: profileData.verification_requested_at,
        verification_approved_at: profileData.verification_approved_at,
        has_kyc_documents: (kycDocs?.length || 0) > 0
      });
    } catch (error) {
      console.error('Error loading verification status:', error);
    }
  };

  const uploadDocument = async (event: React.ChangeEvent<HTMLInputElement>, documentType: string) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${documentType}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(`${user.id}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(`${user.id}/${fileName}`);

      const { error: insertError } = await supabase
        .from('kyc_documents')
        .insert({
          user_id: user.id,
          document_type: documentType,
          document_url: publicUrl,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Document uploadé",
        description: `Votre ${documentType === 'national_id' ? 'carte nationale' : 'passeport'} a été uploadé avec succès`,
      });
      
      loadVerificationStatus();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'uploader le document",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const requestVerification = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_requested_at: new Date().toISOString()
        })
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "Demande envoyée",
        description: "Votre demande de vérification a été envoyée à notre équipe",
      });
      
      loadVerificationStatus();
    } catch (error) {
      console.error('Error requesting verification:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer la demande",
        variant: "destructive",
      });
    }
  };

  if (!verificationStatus || !showBanner) return null;

  // Don't show banner if already verified
  if (verificationStatus.is_verified) return null;

  // Don't show banner if verification is already requested
  if (verificationStatus.verification_requested_at) return null;

  return (
    <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Complétez votre profil</h3>
              <Badge variant="outline" className="text-amber-700 border-amber-300">
                Non vérifié
              </Badge>
            </div>
            
            <p className="text-sm text-amber-800 mb-4">
              Ajoutez vos pièces d'identité et demandez la vérification pour obtenir un badge de confiance 
              et être prioritaire dans les recherches.
            </p>
            
            <div className="flex flex-wrap gap-3">
              <div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} className="bg-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Carte Nationale
                  </Button>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => uploadDocument(e, 'national_id')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              
              <div>
                <label className="cursor-pointer">
                  <Button variant="outline" size="sm" disabled={uploading} className="bg-white">
                    <Upload className="h-4 w-4 mr-2" />
                    Passeport
                  </Button>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => uploadDocument(e, 'passport')}
                    className="hidden"
                    disabled={uploading}
                  />
                </label>
              </div>
              
              {verificationStatus.has_kyc_documents && (
                <Button 
                  onClick={requestVerification}
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Demander la vérification
                </Button>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBanner(false)}
            className="shrink-0 text-amber-600 hover:text-amber-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function VerificationBadge({ isVerified }: { isVerified: boolean }) {
  if (!isVerified) return null;
  
  return (
    <Badge className="bg-green-100 text-green-800 border-green-300 gap-1">
      <Shield className="h-3 w-3" />
      Vérifié
    </Badge>
  );
}