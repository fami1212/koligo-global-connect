import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Shield, 
  Users, 
  FileText, 
  AlertTriangle, 
  Check, 
  X, 
  Eye,
  Search,
  Filter,
  UserCheck,
  Clock
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface KYCDocument {
  id: string;
  user_id: string;
  document_type: string;
  document_url: string;
  status: string;
  notes?: string;
  created_at: string;
  user_profile: any;
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
  user_profile: any;
}

export default function Admin() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

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
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select(`
          *,
          user_profile:profiles!user_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (kycError) throw kycError;

      // Load problem reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('problem_reports')
        .select(`
          *,
          user_profile:profiles!user_id (
            first_name,
            last_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      setKycDocuments(kycData || []);
      setProblemReports(reportsData || []);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateKYCStatus = async (documentId: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status,
          notes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', documentId);

      if (error) throw error;

      // If approved, update user verification status
      if (status === 'approved') {
        const document = kycDocuments.find(doc => doc.id === documentId);
        if (document) {
          await supabase
            .from('profiles')
            .update({
              is_verified: true,
              verification_approved_at: new Date().toISOString(),
              verification_approved_by: user?.id
            })
            .eq('user_id', document.user_id);
        }
      }

      toast({
        title: status === 'approved' ? "Document approuvé" : "Document rejeté",
        description: status === 'approved' 
          ? "L'utilisateur est maintenant vérifié"
          : "Le document a été rejeté",
      });

      loadData();
    } catch (error) {
      console.error('Error updating KYC status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le statut",
        variant: "destructive",
      });
    }
  };

  const updateReportStatus = async (reportId: string, status: string, resolutionNotes?: string) => {
    try {
      const { error } = await supabase
        .from('problem_reports')
        .update({
          status,
          resolution_notes: resolutionNotes,
          resolved_at: status === 'resolved' ? new Date().toISOString() : null,
          resolved_by: status === 'resolved' ? user?.id : null
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Signalement mis à jour",
        description: "Le statut du signalement a été mis à jour",
      });

      loadData();
    } catch (error) {
      console.error('Error updating report status:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le signalement",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Approuvé</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejeté</Badge>;
      case 'resolved':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Résolu</Badge>;
      case 'open':
        return <Badge variant="outline"><AlertTriangle className="h-3 w-3 mr-1" />Ouvert</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50';
      default:
        return 'border-l-gray-500 bg-gray-50';
    }
  };

  const filteredKYC = kycDocuments.filter(doc => 
    filter === 'all' || doc.status === filter
  );

  const filteredReports = problemReports.filter(report => 
    filter === 'all' || report.status === filter
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary" />
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Gestion des vérifications et signalements
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">Retour au tableau de bord</Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{kycDocuments.length}</p>
                  <p className="text-sm text-muted-foreground">Documents KYC</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {kycDocuments.filter(doc => doc.status === 'pending').length}
                  </p>
                  <p className="text-sm text-muted-foreground">En attente</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{problemReports.length}</p>
                  <p className="text-sm text-muted-foreground">Signalements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {kycDocuments.filter(doc => doc.status === 'approved').length}
                  </p>
                  <p className="text-sm text-muted-foreground">Vérifiés</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="kyc" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kyc">Vérifications KYC</TabsTrigger>
            <TabsTrigger value="reports">Signalements</TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-6">
            {/* Filter */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'pending' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('pending')}
              >
                En attente
              </Button>
              <Button
                variant={filter === 'approved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('approved')}
              >
                Approuvés
              </Button>
              <Button
                variant={filter === 'rejected' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('rejected')}
              >
                Rejetés
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tous
              </Button>
            </div>

            {/* KYC Documents */}
            <div className="space-y-4">
              {filteredKYC.map((document) => (
                <Card key={document.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <Avatar className="w-12 h-12">
                          <AvatarImage src={document.user_profile.avatar_url} />
                          <AvatarFallback>
                            {document.user_profile.first_name[0]}{document.user_profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold">
                            {document.user_profile.first_name} {document.user_profile.last_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">{document.user_profile.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline">
                              {document.document_type === 'national_id' ? 'Carte d\'identité' : 'Passeport'}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(document.created_at).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(document.status)}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(document.document_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                      </div>
                    </div>

                    {document.status === 'pending' && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <Textarea
                          placeholder="Notes de révision (optionnel)..."
                          className="min-h-[60px]"
                          id={`notes-${document.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const notes = (window.document.getElementById(`notes-${document.id}`) as HTMLTextAreaElement)?.value;
                              updateKYCStatus(document.id, 'approved', notes);
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approuver
                          </Button>
                          <Button
                            onClick={() => {
                              const notes = (window.document.getElementById(`notes-${document.id}`) as HTMLTextAreaElement)?.value;
                              updateKYCStatus(document.id, 'rejected', notes);
                            }}
                            variant="destructive"
                            size="sm"
                          >
                            <X className="h-4 w-4 mr-1" />
                            Rejeter
                          </Button>
                        </div>
                      </div>
                    )}

                    {document.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Notes:</p>
                        <p className="text-sm">{document.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Filter */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'open' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('open')}
              >
                Ouverts
              </Button>
              <Button
                variant={filter === 'resolved' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('resolved')}
              >
                Résolus
              </Button>
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                Tous
              </Button>
            </div>

            {/* Problem Reports */}
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className={`border-l-4 ${getPriorityColor(report.priority)}`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{report.title}</h3>
                          <Badge variant="outline" className="text-xs">
                            {report.category}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {report.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Par {report.user_profile.first_name} {report.user_profile.last_name}
                        </p>
                        <p className="text-sm mb-3">{report.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(report.status)}
                      </div>
                    </div>

                    {report.status === 'open' && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <Textarea
                          placeholder="Notes de résolution..."
                          className="min-h-[60px]"
                          id={`resolution-${report.id}`}
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={() => {
                              const notes = (window.document.getElementById(`resolution-${report.id}`) as HTMLTextAreaElement)?.value;
                              updateReportStatus(report.id, 'resolved', notes);
                            }}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Marquer comme résolu
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}