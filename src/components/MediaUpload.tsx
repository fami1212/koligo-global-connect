import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, X, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface MediaUploadProps {
  bucket: string;
  folder?: string;
  accept?: string;
  maxSize?: number; // in MB
  multiple?: boolean;
  maxFiles?: number;
  onUploadComplete: (urls: string[]) => void;
}

export function MediaUpload({
  bucket,
  folder = '',
  accept = 'image/*',
  maxSize = 5,
  multiple = false,
  maxFiles = 10,
  onUploadComplete,
}: MediaUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Validate max files
    if (files.length > maxFiles) {
      toast({
        title: 'Trop de fichiers',
        description: `Maximum ${maxFiles} fichiers autorisés`,
        variant: 'destructive',
      });
      return;
    }

    // Validate file sizes
    const oversizedFiles = files.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      toast({
        title: 'Fichiers trop volumineux',
        description: `La taille maximale est de ${maxSize}MB`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError, data } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        uploadedUrls.push(urlData.publicUrl);
      }

      onUploadComplete(uploadedUrls);
      toast({
        title: 'Upload réussi',
        description: `${files.length} fichier(s) uploadé(s)`,
      });

      // Reset
      setPreviews([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Erreur d\'upload',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileSelect}
        className="hidden"
      />

      <Card className="border-2 border-dashed hover:border-primary/50 transition-colors">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full p-8 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Upload className="h-8 w-8" />
          <div className="text-center">
            <p className="font-medium">
              {uploading ? 'Upload en cours...' : 'Cliquez pour uploader'}
            </p>
            <p className="text-xs">
              {accept} • Max {maxSize}MB {multiple && '• Multiple fichiers'}
            </p>
          </div>
        </button>
      </Card>

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {previews.map((preview, index) => (
            <Card key={index} className="relative p-2">
              <Button
                variant="destructive"
                size="icon"
                className="absolute -top-2 -right-2 h-6 w-6"
                onClick={() => setPreviews(prev => prev.filter((_, i) => i !== index))}
              >
                <X className="h-4 w-4" />
              </Button>
              <img
                src={preview}
                alt={`Preview ${index + 1}`}
                className="w-full h-24 object-cover rounded"
              />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}