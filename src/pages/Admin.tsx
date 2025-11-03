import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, ArrowLeft, Users, FileCheck, AlertTriangle, Scale } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AdminStats } from '@/components/admin/AdminStats';
import { KYCSection } from '@/components/admin/KYCSection';

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

interface Dispute {
  id: string;
  complainant_id: string;
  respondent_id: string;
  assignment_id: string;
  type: string;
  status: string;
  description: string;
  created_at: string;
}

export default function Admin() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [kycFilter, setKycFilter] = useState('pending');
  const [reportsFilter, setReportsFilter] = useState('open');

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
        .select('*')
        .order('created_at', { ascending: false });

      if (kycError) throw kycError;

      // Load profiles for KYC documents
      const userIds = [...new Set(kycData?.map(doc => doc.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email, avatar_url')
        .in('user_id', userIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const enrichedKyc = kycData?.map(doc => ({
        ...doc,
        user_profile: profilesMap.get(doc.user_id)
      })) || [];

      // Load problem reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('problem_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      const reportUserIds = [...new Set(reportsData?.map(r => r.user_id) || [])];
      const { data: reportProfiles } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, email')
        .in('user_id', reportUserIds);

      const reportProfilesMap = new Map(reportProfiles?.map(p => [p.user_id, p]) || []);
      const enrichedReports = reportsData?.map(report => ({
        ...report,
        user_profile: reportProfilesMap.get(report.user_id)
      })) || [];

      // Load disputes
      const { data: disputesData, error: disputesError } = await supabase
        .from('disputes')
        .select('*')
        .order('created_at', { ascending: false });

      if (disputesError) throw disputesError;

      // Load total users count
      const { count } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      setKycDocuments(enrichedKyc);
      setProblemReports(enrichedReports);
      setDisputes(disputesData || []);
      setTotalUsers(count || 0);
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
        title: status === 'approved' ? "Document approuvé ✓" : "Document rejeté",
        description: status === 'approved' 
          ? "L'utilisateur est maintenant vérifié avec un badge de confiance"
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const kycPending = kycDocuments.filter(d => d.status === 'pending').length;
  const kycApproved = kycDocuments.filter(d => d.status === 'approved').length;
  const reportsOpen = problemReports.filter(r => r.status === 'open').length;
  const disputesOpen = disputes.filter(d => d.status === 'open').length;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              Administration
            </h1>
            <p className="text-muted-foreground mt-1">
              Centre de contrôle et de gestion de la plateforme
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <AdminStats
          kycPending={kycPending}
          kycApproved={kycApproved}
          kycTotal={kycDocuments.length}
          reportsOpen={reportsOpen}
          reportsTotal={problemReports.length}
          disputesOpen={disputesOpen}
          disputesTotal={disputes.length}
          totalUsers={totalUsers}
        />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button asChild variant="outline" className="h-auto py-4">
            <Link to="/admin/kyc" className="flex flex-col items-center gap-2">
              <FileCheck className="h-6 w-6" />
              <span className="font-semibold">Vérifications KYC</span>
              <span className="text-xs text-muted-foreground">{kycPending} en attente</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto py-4">
            <Link to="/support" className="flex flex-col items-center gap-2">
              <AlertTriangle className="h-6 w-6" />
              <span className="font-semibold">Support</span>
              <span className="text-xs text-muted-foreground">{reportsOpen} tickets ouverts</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto py-4">
            <Link to="/disputes" className="flex flex-col items-center gap-2">
              <Scale className="h-6 w-6" />
              <span className="font-semibold">Litiges</span>
              <span className="text-xs text-muted-foreground">{disputesOpen} actifs</span>
            </Link>
          </Button>
          
          <Button asChild variant="outline" className="h-auto py-4">
            <Link to="/profile" className="flex flex-col items-center gap-2">
              <Users className="h-6 w-6" />
              <span className="font-semibold">Utilisateurs</span>
              <span className="text-xs text-muted-foreground">{totalUsers} inscrits</span>
            </Link>
          </Button>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="kyc" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="kyc">
              <FileCheck className="h-4 w-4 mr-2" />
              KYC ({kycPending})
            </TabsTrigger>
            <TabsTrigger value="reports">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Signalements ({reportsOpen})
            </TabsTrigger>
            <TabsTrigger value="disputes">
              <Scale className="h-4 w-4 mr-2" />
              Litiges ({disputesOpen})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kyc">
            <Card>
              <CardHeader>
                <CardTitle>Vérifications d'identité</CardTitle>
                <CardDescription>
                  Examinez et approuvez les documents d'identité des utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <KYCSection
                  documents={kycDocuments}
                  filter={kycFilter}
                  onFilterChange={setKycFilter}
                  onUpdateStatus={updateKYCStatus}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle>Signalements & Support</CardTitle>
                <CardDescription>
                  Gérez les demandes d'assistance et les problèmes signalés
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Consultez la page Support pour plus de détails</p>
                  <Button asChild>
                    <Link to="/support">Voir les signalements</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="disputes">
            <Card>
              <CardHeader>
                <CardTitle>Gestion des litiges</CardTitle>
                <CardDescription>
                  Résolvez les conflits entre utilisateurs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Scale className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Consultez la page Litiges pour plus de détails</p>
                  <Button asChild>
                    <Link to="/disputes">Voir les litiges</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
