import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Check, X, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';

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

interface KYCSectionProps {
  documents: KYCDocument[];
  filter: string;
  onFilterChange: (filter: string) => void;
  onUpdateStatus: (documentId: string, status: 'approved' | 'rejected', notes?: string) => void;
}

export function KYCSection({ documents, filter, onFilterChange, onUpdateStatus }: KYCSectionProps) {
  const filteredDocs = documents.filter(doc => 
    filter === 'all' || doc.status === filter
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approuvé
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejeté
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('pending')}
        >
          En attente ({documents.filter(d => d.status === 'pending').length})
        </Button>
        <Button
          variant={filter === 'approved' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('approved')}
        >
          Approuvés ({documents.filter(d => d.status === 'approved').length})
        </Button>
        <Button
          variant={filter === 'rejected' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('rejected')}
        >
          Rejetés ({documents.filter(d => d.status === 'rejected').length})
        </Button>
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
        >
          Tous ({documents.length})
        </Button>
      </div>

      {/* Documents List */}
      <div className="space-y-3">
        {filteredDocs.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">Aucun document à afficher</p>
            </CardContent>
          </Card>
        ) : (
          filteredDocs.map((document) => (
            <Card key={document.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={document.user_profile?.avatar_url} />
                    <AvatarFallback>
                      {document.user_profile?.first_name?.[0]}{document.user_profile?.last_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold">
                          {document.user_profile?.first_name} {document.user_profile?.last_name}
                        </h3>
                        <p className="text-sm text-muted-foreground">{document.user_profile?.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {document.document_type === 'national_id' ? 'Carte d\'identité' : 'Passeport'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(document.created_at).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
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
                              onUpdateStatus(document.id, 'approved', notes);
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
                              onUpdateStatus(document.id, 'rejected', notes);
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
                        <p className="text-sm font-medium mb-1">Notes:</p>
                        <p className="text-sm text-muted-foreground">{document.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
