import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle, Send, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProblemReporterProps {
  assignmentId?: string;
  className?: string;
}

export function ProblemReporter({ assignmentId, className = '' }: ProblemReporterProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [reportData, setReportData] = useState({
    title: '',
    description: '',
    category: 'general',
    priority: 'medium'
  });

  const categories = [
    { value: 'general', label: 'Problème général' },
    { value: 'payment', label: 'Problème de paiement' },
    { value: 'delivery', label: 'Problème de livraison' },
    { value: 'communication', label: 'Problème de communication' },
    { value: 'user_behavior', label: 'Comportement inapproprié' },
    { value: 'technical', label: 'Problème technique' },
  ];

  const priorities = [
    { value: 'low', label: 'Faible' },
    { value: 'medium', label: 'Moyenne' },
    { value: 'high', label: 'Haute' },
    { value: 'urgent', label: 'Urgente' },
  ];

  const submitReport = async () => {
    if (!user) return;

    try {
      setSubmitting(true);
      
      const { error } = await supabase
        .from('problem_reports')
        .insert({
          user_id: user.id,
          title: reportData.title,
          description: reportData.description,
          category: reportData.category,
          priority: reportData.priority,
          assignment_id: assignmentId || null,
        });

      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Votre signalement a été envoyé à notre équipe de support",
      });

      setOpen(false);
      setReportData({
        title: '',
        description: '',
        category: 'general',
        priority: 'medium'
      });
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le signalement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={className}>
          <Flag className="h-4 w-4 mr-2" />
          Signaler un problème
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Signaler un problème
          </DialogTitle>
          <DialogDescription>
            Décrivez le problème rencontré pour que notre équipe puisse vous aider
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Titre du problème</Label>
            <Input
              id="title"
              placeholder="Résumé du problème..."
              value={reportData.title}
              onChange={(e) => setReportData(prev => ({...prev, title: e.target.value}))}
            />
          </div>
          
          <div>
            <Label htmlFor="category">Catégorie</Label>
            <Select 
              value={reportData.category} 
              onValueChange={(value) => setReportData(prev => ({...prev, category: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="priority">Priorité</Label>
            <Select 
              value={reportData.priority} 
              onValueChange={(value) => setReportData(prev => ({...prev, priority: value}))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map(priority => (
                  <SelectItem key={priority.value} value={priority.value}>
                    {priority.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="description">Description détaillée</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le problème en détail..."
              value={reportData.description}
              onChange={(e) => setReportData(prev => ({...prev, description: e.target.value}))}
              rows={4}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={submitReport} 
              disabled={submitting || !reportData.title || !reportData.description}
              className="flex-1"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? 'Envoi...' : 'Envoyer le signalement'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}