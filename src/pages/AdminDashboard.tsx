import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Shield, 
  FileCheck, 
  AlertTriangle,
  ArrowLeft,
  Check,
  X,
  Eye,
  Search,
  User,
  Clock,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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

interface ProblemReport {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  resolution_notes?: string;
  profile?: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function AdminDashboard() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [kycFilter, setKycFilter] = useState('pending');
  const [reportFilter, setReportFilter] = useState('open');
  
  const [selectedKyc, setSelectedKyc] = useState<KYCDocument | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!hasRole('admin')) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [user, hasRole, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load KYC documents
      const { data: kycData } = await supabase
        .from('kyc_documents')
        .select('*')
        .order('created_at', { ascending: false });

      // Get profiles for KYC
      const kycUserIds = [...new Set(kycData?.map(d => d.user_id) || [])];
      const { data: kycProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url')
        .in('user_id', kycUserIds);
      
      const profileMap = new Map(kycProfiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedKyc = kycData?.map(doc => ({
        ...doc,
        profile: profileMap.get(doc.user_id)
      })) || [];

      // Load problem reports
      const { data: reportsData } = await supabase
        .from('problem_reports')
        .select('*')
        .order('created_at', { ascending: false });

      const reportUserIds = [...new Set(reportsData?.map(r => r.user_id) || [])];
      const { data: reportProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', reportUserIds);
      
      const reportProfileMap = new Map(reportProfiles?.map(p => [p.user_id, p]) || []);
      
      const enrichedReports = reportsData?.map(report => ({
        ...report,
        profile: reportProfileMap.get(report.user_id)
      })) || [];

      setKycDocuments(enrichedKyc);
      setProblemReports(enrichedReports);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKycReview = async (status: 'approved' | 'rejected') => {
    if (!selectedKyc) return;
    if (status === 'rejected' && !reviewNotes.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez ajouter une note pour le rejet",
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status,
          notes: reviewNotes || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedKyc.id);

      if (error) throw error;

      if (status === 'approved') {
        await supabase
          .from('profiles')
          .update({
            is_verified: true,
            verification_approved_at: new Date().toISOString(),
            verification_approved_by: user?.id
          })
          .eq('user_id', selectedKyc.user_id);

        await supabase.from('notifications').insert({
          user_id: selectedKyc.user_id,
          title: "KYC Approuvé",
          message: "Votre profil a été vérifié avec succès.",
          type: "success",
        });
      }

      toast({
        title: status === 'approved' ? "Approuvé" : "Rejeté",
        description: `Document ${status === 'approved' ? 'approuvé' : 'rejeté'} avec succès`,
      });

      setSelectedKyc(null);
      setReviewNotes('');
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReportUpdate = async (status: string) => {
    if (!selectedReport) return;

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('problem_reports')
        .update({
          status,
          resolution_notes: resolutionNotes || null,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          resolved_by: status === 'resolved' ? user?.id : null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: "Mis à jour",
        description: "Le signalement a été mis à jour",
      });

      setSelectedReport(null);
      setResolutionNotes('');
      loadData();
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const openDocument = async (doc: KYCDocument) => {
    try {
      const marker = '/kyc-documents/';
      let path = doc.document_url;
      const idx = doc.document_url.indexOf(marker);
      if (idx !== -1) {
        path = doc.document_url.substring(idx + marker.length);
      }

      const { data, error } = await supabase.storage
        .from('kyc-documents')
        .createSignedUrl(path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (e) {
      toast({
        title: 'Erreur',
        description: "Impossible d'ouvrir le document",
        variant: 'destructive',
      });
    }
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case 'national_id': return "Carte d'identité";
      case 'passport': return 'Passeport';
      case 'driver_license': return 'Permis de conduire';
      default: return type;
    }
  };

  const filteredKyc = kycDocuments.filter(doc => {
    const matchesFilter = kycFilter === 'all' || doc.status === kycFilter;
    const matchesSearch = !searchTerm || 
      doc.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.profile?.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredReports = problemReports.filter(report => {
    const matchesFilter = reportFilter === 'all' || report.status === reportFilter;
    const matchesSearch = !searchTerm || 
      report.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.profile?.first_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Stats
  const kycPending = kycDocuments.filter(d => d.status === 'pending').length;
  const reportsOpen = problemReports.filter(r => r.status === 'open').length;

  if (!user || !hasRole('admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Accès non autorisé</h2>
            <Button onClick={() => navigate('/dashboard')} className="mt-4">
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">Administration</h1>
              <p className="text-sm text-muted-foreground">Gestion KYC & Signalements</p>
            </div>
          </div>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kycPending}</p>
                <p className="text-xs text-muted-foreground">KYC en attente</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kycDocuments.filter(d => d.status === 'approved').length}</p>
                <p className="text-xs text-muted-foreground">KYC approuvés</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reportsOpen}</p>
                <p className="text-xs text-muted-foreground">Signalements ouverts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{kycDocuments.length}</p>
                <p className="text-xs text-muted-foreground">Total documents</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="kyc" className="space-y-4">
          <TabsList className="w-full">
            <TabsTrigger value="kyc" className="flex-1">
              <FileCheck className="h-4 w-4 mr-2" />
              KYC ({kycPending})
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex-1">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Signalements ({reportsOpen})
            </TabsTrigger>
          </TabsList>

          {/* KYC Tab */}
          <TabsContent value="kyc" className="space-y-4">
            <div className="flex gap-2">
              {['pending', 'approved', 'rejected', 'all'].map((status) => (
                <Button
                  key={status}
                  variant={kycFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setKycFilter(status)}
                >
                  {status === 'pending' && 'En attente'}
                  {status === 'approved' && 'Approuvés'}
                  {status === 'rejected' && 'Rejetés'}
                  {status === 'all' && 'Tous'}
                </Button>
              ))}
            </div>

            {filteredKyc.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <FileCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun document</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredKyc.map((doc) => (
                  <Card key={doc.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <Avatar>
                          <AvatarImage src={doc.profile?.avatar_url || ''} />
                          <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium truncate">
                                {doc.profile?.first_name} {doc.profile?.last_name}
                              </p>
                              <p className="text-sm text-muted-foreground truncate">{doc.profile?.email}</p>
                              <p className="text-sm text-muted-foreground">{getDocTypeLabel(doc.document_type)}</p>
                            </div>
                            <Badge variant={
                              doc.status === 'approved' ? 'default' : 
                              doc.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {doc.status === 'pending' && 'En attente'}
                              {doc.status === 'approved' && 'Approuvé'}
                              {doc.status === 'rejected' && 'Rejeté'}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <Button size="sm" variant="outline" onClick={() => openDocument(doc)}>
                              <Eye className="h-4 w-4 mr-1" />
                              Voir
                            </Button>
                            {doc.status === 'pending' && (
                              <>
                                <Button size="sm" onClick={() => { setSelectedKyc(doc); setReviewNotes(''); }}>
                                  <Check className="h-4 w-4 mr-1" />
                                  Approuver
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => { setSelectedKyc(doc); setReviewNotes(''); }}>
                                  <X className="h-4 w-4 mr-1" />
                                  Rejeter
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <div className="flex gap-2">
              {['open', 'in_progress', 'resolved', 'all'].map((status) => (
                <Button
                  key={status}
                  variant={reportFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setReportFilter(status)}
                >
                  {status === 'open' && 'Ouverts'}
                  {status === 'in_progress' && 'En cours'}
                  {status === 'resolved' && 'Résolus'}
                  {status === 'all' && 'Tous'}
                </Button>
              ))}
            </div>

            {filteredReports.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground">Aucun signalement</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {filteredReports.map((report) => (
                  <Card key={report.id} className={`border-l-4 ${
                    report.priority === 'urgent' ? 'border-l-red-500' :
                    report.priority === 'high' ? 'border-l-orange-500' :
                    'border-l-yellow-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{report.title}</p>
                          <p className="text-sm text-muted-foreground">
                            Par {report.profile?.first_name} {report.profile?.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {report.description}
                          </p>
                        </div>
                        <Badge variant={
                          report.status === 'resolved' ? 'default' : 
                          report.status === 'open' ? 'destructive' : 'secondary'
                        }>
                          {report.status === 'open' && 'Ouvert'}
                          {report.status === 'in_progress' && 'En cours'}
                          {report.status === 'resolved' && 'Résolu'}
                        </Badge>
                      </div>
                      {report.status !== 'resolved' && (
                        <Button 
                          size="sm" 
                          className="mt-3"
                          onClick={() => { setSelectedReport(report); setResolutionNotes(''); }}
                        >
                          Traiter
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* KYC Review Dialog */}
      <Dialog open={!!selectedKyc} onOpenChange={() => setSelectedKyc(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réviser le document KYC</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Utilisateur</p>
              <p className="font-medium">{selectedKyc?.profile?.first_name} {selectedKyc?.profile?.last_name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type de document</p>
              <p className="font-medium">{selectedKyc && getDocTypeLabel(selectedKyc.document_type)}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes (obligatoire pour rejet)</label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Ajoutez vos notes..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleKycReview('approved')} disabled={processing}>
                <Check className="h-4 w-4 mr-2" />
                Approuver
              </Button>
              <Button variant="destructive" onClick={() => handleKycReview('rejected')} disabled={processing}>
                <X className="h-4 w-4 mr-2" />
                Rejeter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Traiter le signalement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Titre</p>
              <p className="font-medium">{selectedReport?.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-sm">{selectedReport?.description}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Notes de résolution</label>
              <Textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Notes..."
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => handleReportUpdate('in_progress')} disabled={processing}>
                En cours
              </Button>
              <Button onClick={() => handleReportUpdate('resolved')} disabled={processing}>
                <Check className="h-4 w-4 mr-2" />
                Résoudre
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
