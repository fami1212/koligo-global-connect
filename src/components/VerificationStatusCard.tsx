import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Shield, CheckCircle2, Clock, AlertCircle, Upload, FileCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface VerificationStatusCardProps {
  isVerified: boolean;
  verificationRequestedAt: string | null;
  hasKYCDocuments: boolean;
  onUpload?: () => void;
}

export function VerificationStatusCard({ 
  isVerified, 
  verificationRequestedAt, 
  hasKYCDocuments,
  onUpload
}: VerificationStatusCardProps) {
  
  // Verified status
  if (isVerified) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-green-900 dark:text-green-100">Compte Vérifié</h3>
                <Badge className="bg-green-600 text-white hover:bg-green-700">
                  <Shield className="h-3 w-3 mr-1" />
                  Vérifié
                </Badge>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                Votre identité a été vérifiée. Vous avez accès à toutes les fonctionnalités et bénéficiez d'une meilleure visibilité.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Verification pending
  if (verificationRequestedAt) {
    return (
      <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900">
              <Clock className="h-8 w-8 text-amber-600 dark:text-amber-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Vérification en cours</h3>
                <Badge variant="secondary" className="bg-amber-200 text-amber-800 dark:bg-amber-800 dark:text-amber-200">
                  <Clock className="h-3 w-3 mr-1" />
                  En attente
                </Badge>
              </div>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Vos documents sont en cours d'examen par notre équipe. Vous serez notifié une fois la vérification terminée (24-48h).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Documents uploaded but verification not requested
  if (hasKYCDocuments) {
    return (
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950 dark:to-cyan-950">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900">
              <FileCheck className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">Documents uploadés</h3>
                <Badge variant="outline" className="border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300">
                  Documents OK
                </Badge>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                Vos documents sont prêts. Demandez la vérification pour obtenir votre badge de confiance.
              </p>
              <Button asChild size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Link to="/profile">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Demander la vérification
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Not verified - needs documents
  return (
    <Card className="border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950 dark:to-gray-950">
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-900">
            <AlertCircle className="h-8 w-8 text-slate-600 dark:text-slate-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Compte non vérifié</h3>
              <Badge variant="outline" className="border-slate-300 text-slate-700 dark:border-slate-700 dark:text-slate-300">
                Non vérifié
              </Badge>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
              Complétez votre profil en ajoutant vos pièces d'identité pour obtenir le badge de confiance et augmenter votre visibilité.
            </p>
            <Button asChild size="sm" variant="default">
              <Link to="/profile">
                <Upload className="h-4 w-4 mr-2" />
                Ajouter mes documents
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
