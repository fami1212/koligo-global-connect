import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Clock,
  Star,
  ChevronRight,
  Calendar,
  MessageSquare,
  TrendingUp,
  Activity
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
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
    phone: string;
    rating: number;
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
  assignment_id?: string;
  user_profile: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url: string;
  };
}

interface Stats {
  totalKYC: number;
  pendingKYC: number;
  approvedKYC: number;
  totalReports: number;
  openReports: number;
  resolvedReports: number;
  verifiedUsers: number;
  totalUsers: number;
}

export default function ModernAdmin() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [kycDocuments, setKycDocuments] = useState<KYCDocument[]>([]);
  const [problemReports, setProblemReports] = useState<ProblemReport[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalKYC: 0,
    pendingKYC: 0,
    approvedKYC: 0,
    totalReports: 0,
    openReports: 0,
    resolvedReports: 0,
    verifiedUsers: 0,
    totalUsers: 0
  });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);
  const [selectedReport, setSelectedReport] = useState<ProblemReport | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [reportStatus, setReportStatus] = useState('');

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
          profiles!kyc_documents_user_id_fkey (
            first_name,
            last_name,
            email,
            avatar_url,
            phone,
            rating
          )
        `)
        .order('created_at', { ascending: false });

      if (kycError) throw kycError;

      // Load problem reports
      const { data: reportsData, error: reportsError } = await supabase
        .from('problem_reports')
        .select(`
          *,
          profiles!problem_reports_user_id_fkey (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .order('created_at', { ascending: false });

      if (reportsError) throw reportsError;

      // Load stats
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('is_verified');

      setKycDocuments((kycData || []).map((doc: any) => ({
        ...doc,
        user_profile: doc.profiles || { first_name: '', last_name: '', email: '', avatar_url: '', phone: '', rating: 0 }
      })));
      setProblemReports((reportsData || []).map((report: any) => ({
        ...report,
        user_profile: report.profiles || { first_name: '', last_name: '', email: '', avatar_url: '' }
      })));
      
      // Calculate stats
      const totalUsers = profilesData?.length || 0;
      const verifiedUsers = profilesData?.filter(p => p.is_verified).length || 0;
      const totalKYC = kycData?.length || 0;
      const pendingKYC = kycData?.filter(doc => doc.status === 'pending').length || 0;
      const approvedKYC = kycData?.filter(doc => doc.status === 'approved').length || 0;
      const totalReports = reportsData?.length || 0;
      const openReports = reportsData?.filter(report => report.status === 'open').length || 0;
      const resolvedReports = reportsData?.filter(report => report.status === 'resolved').length || 0;

      setStats({
        totalKYC,
        pendingKYC,
        approvedKYC,
        totalReports,
        openReports,
        resolvedReports,
        verifiedUsers,
        totalUsers
      });
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

  const updateKYCStatus = async (status: 'approved' | 'rejected') => {
    if (!selectedDocument) return;

    try {
      const { error } = await supabase
        .from('kyc_documents')
        .update({
          status,
          notes: reviewNotes,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id
        })
        .eq('id', selectedDocument.id);

      if (error) throw error;

      // If approved, update user verification status
      if (status === 'approved') {
        await supabase
          .from('profiles')
          .update({
            is_verified: true,
            verification_approved_at: new Date().toISOString(),
            verification_approved_by: user?.id
          })
          .eq('user_id', selectedDocument.user_id);
      }

      toast({
        title: status === 'approved' ? "Document approuvé" : "Document rejeté",
        description: status === 'approved' 
          ? "L'utilisateur est maintenant vérifié"
          : "Le document a été rejeté avec des notes",
      });

      setSelectedDocument(null);
      setReviewNotes('');
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

  const updateReportStatus = async () => {
    if (!selectedReport || !reportStatus) return;

    try {
      const { error } = await supabase
        .from('problem_reports')
        .update({
          status: reportStatus,
          resolution_notes: resolutionNotes,
          resolved_at: reportStatus === 'resolved' ? new Date().toISOString() : null,
          resolved_by: reportStatus === 'resolved' ? user?.id : null
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: "Signalement mis à jour",
        description: "Le statut du signalement a été mis à jour avec succès",
      });

      setSelectedReport(null);
      setResolutionNotes('');
      setReportStatus('');
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

  const getStatusBadge = (status: string, type: 'kyc' | 'report' = 'kyc') => {
    const variants = {
      approved: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200', icon: Check },
      rejected: { variant: 'destructive', className: '', icon: X },
      resolved: { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200', icon: Check },
      open: { variant: 'default', className: 'bg-red-100 text-red-800 border-red-200', icon: AlertTriangle },
      pending: { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock },
      'in_progress': { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200', icon: Activity }
    };

    const config = variants[status as keyof typeof variants] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {status === 'approved' && 'Approuvé'}
        {status === 'rejected' && 'Rejeté'}
        {status === 'resolved' && 'Résolu'}
        {status === 'open' && 'Ouvert'}
        {status === 'pending' && 'En attente'}
        {status === 'in_progress' && 'En cours'}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-50/50';
      case 'high':
        return 'border-l-orange-500 bg-orange-50/50';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50/50';
      default:
        return 'border-l-gray-500 bg-gray-50/50';
    }
  };

  const filteredKYC = kycDocuments.filter(doc => {
    const matchesFilter = filter === 'all' || doc.status === filter;
    const matchesSearch = searchTerm === '' || 
      doc.user_profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user_profile.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.user_profile.email.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredReports = problemReports.filter(report => {
    const matchesFilter = filter === 'all' || report.status === filter;
    const matchesSearch = searchTerm === '' || 
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_profile.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.user_profile.last_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/10 to-background">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
              <Shield className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Administration
              </h1>
              <p className="text-lg text-muted-foreground mt-1">
                Gestion des vérifications et signalements
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="lg">
            <Link to="/dashboard" className="flex items-center gap-2">
              <ChevronRight className="h-4 w-4 rotate-180" />
              Tableau de bord
            </Link>
          </Button>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-500/20 to-blue-600/20 rounded-full -mr-10 -mt-10"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalKYC}</p>
                  <p className="text-sm text-muted-foreground">Documents KYC</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-600">{stats.pendingKYC} en attente</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-full -mr-10 -mt-10"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.verifiedUsers}</p>
                  <p className="text-sm text-muted-foreground">Utilisateurs vérifiés</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sur {stats.totalUsers} total</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-600/20 rounded-full -mr-10 -mt-10"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">{stats.totalReports}</p>
                  <p className="text-sm text-muted-foreground">Signalements</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">{stats.openReports} ouverts</span>
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 rounded-full -mr-10 -mt-10"></div>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-bold">
                    {stats.totalUsers > 0 ? Math.round((stats.verifiedUsers / stats.totalUsers) * 100) : 0}%
                  </p>
                  <p className="text-sm text-muted-foreground">Taux de vérification</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Star className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                <Activity className="h-4 w-4 text-yellow-500" />
                <span className="text-sm text-yellow-600">Performance globale</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="kyc" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="kyc" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Vérifications KYC
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Signalements
            </TabsTrigger>
          </TabsList>

          <TabsContent value="kyc" className="space-y-6">
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('pending')}
                >
                  En attente ({stats.pendingKYC})
                </Button>
                <Button
                  variant={filter === 'approved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('approved')}
                >
                  Approuvés ({stats.approvedKYC})
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
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par nom ou email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* KYC Documents */}
            <div className="grid gap-4">
              {filteredKYC.map((document) => (
                <Card key={document.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <Avatar className="w-12 h-12 ring-2 ring-border">
                          <AvatarImage src={document.user_profile.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20">
                            {document.user_profile.first_name[0]}{document.user_profile.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold text-lg">
                                {document.user_profile.first_name} {document.user_profile.last_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{document.user_profile.email}</p>
                              {document.user_profile.phone && (
                                <p className="text-xs text-muted-foreground">{document.user_profile.phone}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {getStatusBadge(document.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <Badge variant="outline">
                              {document.document_type === 'national_id' ? 'Carte d\'identité' : 'Passeport'}
                            </Badge>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{new Date(document.created_at).toLocaleDateString('fr-FR')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3" />
                              <span>{document.user_profile.rating?.toFixed(1) || '0.0'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(document.document_url, '_blank')}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Voir
                        </Button>
                        {document.status === 'pending' && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                size="sm"
                                onClick={() => setSelectedDocument(document)}
                              >
                                Examiner
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Examiner le document</DialogTitle>
                                <DialogDescription>
                                  Prenez une décision concernant ce document KYC
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <label className="text-sm font-medium">Notes de révision</label>
                                  <Textarea
                                    placeholder="Ajoutez vos commentaires..."
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="mt-1"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    onClick={() => updateKYCStatus('approved')}
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    Approuver
                                  </Button>
                                  <Button
                                    onClick={() => updateKYCStatus('rejected')}
                                    variant="destructive"
                                    className="flex-1"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Rejeter
                                  </Button>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>

                    {document.notes && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Notes d'examen:</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg">{document.notes}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {/* Filters and Search */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filter === 'open' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('open')}
                >
                  Ouverts ({stats.openReports})
                </Button>
                <Button
                  variant={filter === 'in_progress' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('in_progress')}
                >
                  En cours
                </Button>
                <Button
                  variant={filter === 'resolved' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('resolved')}
                >
                  Résolus ({stats.resolvedReports})
                </Button>
                <Button
                  variant={filter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilter('all')}
                >
                  Tous
                </Button>
              </div>
              <div className="flex-1 max-w-sm">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher par titre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Problem Reports */}
            <div className="grid gap-4">
              {filteredReports.map((report) => (
                <Card key={report.id} className={`border-l-4 ${getPriorityColor(report.priority)} hover:shadow-md transition-shadow`}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-lg mb-1">{report.title}</h3>
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="outline" className="text-xs">
                                {report.category}
                              </Badge>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  report.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                                  report.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}
                              >
                                {report.priority}
                              </Badge>
                              {getStatusBadge(report.status, 'report')}
                            </div>
                          </div>
                        </div>
                        
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {report.description}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={report.user_profile.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {report.user_profile.first_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{report.user_profile.first_name} {report.user_profile.last_name}</span>
                            <span>•</span>
                            <span>{new Date(report.created_at).toLocaleDateString('fr-FR')}</span>
                          </div>
                          
                          <div className="flex gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => setSelectedReport(report)}
                                >
                                  Voir détails
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>{report.title}</DialogTitle>
                                  <DialogDescription>
                                    Signalement de {report.user_profile.first_name} {report.user_profile.last_name}
                                  </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-medium mb-2">Description</h4>
                                    <p className="text-sm bg-muted/50 p-3 rounded-lg">{report.description}</p>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <span className="text-muted-foreground">Catégorie:</span>
                                      <span className="ml-2 font-medium">{report.category}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">Priorité:</span>
                                      <span className="ml-2 font-medium">{report.priority}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-3">
                                    <div>
                                      <label className="text-sm font-medium">Nouveau statut</label>
                                      <Select value={reportStatus} onValueChange={setReportStatus}>
                                        <SelectTrigger className="mt-1">
                                          <SelectValue placeholder="Choisir un statut" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="open">Ouvert</SelectItem>
                                          <SelectItem value="in_progress">En cours</SelectItem>
                                          <SelectItem value="resolved">Résolu</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    
                                    <div>
                                      <label className="text-sm font-medium">Notes de résolution</label>
                                      <Textarea
                                        placeholder="Décrivez les actions prises..."
                                        value={resolutionNotes}
                                        onChange={(e) => setResolutionNotes(e.target.value)}
                                        className="mt-1"
                                      />
                                    </div>
                                    
                                    <Button 
                                      onClick={updateReportStatus}
                                      disabled={!reportStatus}
                                      className="w-full"
                                    >
                                      Mettre à jour le signalement
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </div>
                    </div>
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