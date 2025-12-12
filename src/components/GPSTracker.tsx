import { useState, useEffect, useCallback } from 'react';
import { Navigation, MapPin, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface GPSTrackerProps {
  assignmentId: string;
  onClose?: () => void;
}

export function GPSTracker({ assignmentId, onClose }: GPSTrackerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tracking, setTracking] = useState(false);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const saveLocation = useCallback(async (latitude: number, longitude: number) => {
    if (!user) return;
    
    try {
      await supabase.from('tracking_events').insert({
        assignment_id: assignmentId,
        event_type: 'location_update',
        latitude,
        longitude,
        description: 'Position GPS partagée',
        location: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        created_by: user.id
      });
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error saving location:', error);
    }
  }, [assignmentId, user]);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      toast({
        title: "Non supporté",
        description: "La géolocalisation n'est pas disponible",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        setTracking(true);
        setLoading(false);
        saveLocation(latitude, longitude);
      },
      (error) => {
        setLoading(false);
        toast({
          title: "Erreur GPS",
          description: error.message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 15000
      }
    );

    setWatchId(id);
  }, [saveLocation, toast]);

  const stopTracking = useCallback(() => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
    setCoords(null);
  }, [watchId]);

  useEffect(() => {
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [watchId]);

  return (
    <div className="bg-card border rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Partage GPS</span>
          {tracking && (
            <Badge variant="default" className="bg-green-500 text-xs animate-pulse">
              Actif
            </Badge>
          )}
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {coords && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
          <MapPin className="h-3 w-3" />
          <span className="font-mono">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
          {lastUpdate && (
            <span className="ml-auto">
              {lastUpdate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      )}

      {!tracking ? (
        <Button 
          onClick={startTracking} 
          disabled={loading}
          size="sm"
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Activation...
            </>
          ) : (
            <>
              <Navigation className="h-4 w-4 mr-2" />
              Partager ma position
            </>
          )}
        </Button>
      ) : (
        <Button 
          onClick={stopTracking} 
          variant="outline"
          size="sm"
          className="w-full"
        >
          Arrêter le partage
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Le client pourra voir votre position en temps réel
      </p>
    </div>
  );
}
