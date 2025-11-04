import { useState, useEffect } from 'react';
import { MapPin, Navigation, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface GeolocationTrackerProps {
  assignmentId: string;
  enabled?: boolean;
  onLocationUpdate?: (coords: { latitude: number; longitude: number }) => void;
}

export function GeolocationTracker({ 
  assignmentId, 
  enabled = false,
  onLocationUpdate 
}: GeolocationTrackerProps) {
  const { toast } = useToast();
  const [tracking, setTracking] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<GeolocationPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      async (position) => {
        setCurrentLocation(position);
        setError(null);
        setTracking(true);

        const { latitude, longitude } = position.coords;
        onLocationUpdate?.({ latitude, longitude });

        // Save tracking event to database
        try {
          await supabase.from('tracking_events').insert({
            assignment_id: assignmentId,
            event_type: 'location_update',
            latitude,
            longitude,
            description: `Position mise à jour`,
            location: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        } catch (err) {
          console.error('Error saving tracking event:', err);
        }
      },
      (error) => {
        setError(`Erreur: ${error.message}`);
        setTracking(false);
        toast({
          title: 'Erreur de géolocalisation',
          description: error.message,
          variant: 'destructive',
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 30000,
        timeout: 27000,
      }
    );

    setWatchId(id);
  };

  const stopTracking = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
  };

  useEffect(() => {
    if (enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [enabled]);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Navigation className="h-5 w-5 text-primary" />
          Suivi GPS en temps réel
          {tracking && (
            <Badge variant="default" className="bg-green-500 animate-pulse">
              Actif
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {currentLocation && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-mono text-xs">
                {currentLocation.coords.latitude.toFixed(6)}, {currentLocation.coords.longitude.toFixed(6)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
              <div>
                <span className="font-medium">Précision:</span> {currentLocation.coords.accuracy.toFixed(0)}m
              </div>
              <div>
                <span className="font-medium">Altitude:</span> {currentLocation.coords.altitude?.toFixed(0) || 'N/A'}m
              </div>
            </div>
            {currentLocation.coords.speed && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Vitesse:</span> {(currentLocation.coords.speed * 3.6).toFixed(1)} km/h
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {!tracking ? (
            <Button onClick={startTracking} className="w-full">
              <Navigation className="h-4 w-4 mr-2" />
              Activer le suivi GPS
            </Button>
          ) : (
            <Button onClick={stopTracking} variant="outline" className="w-full">
              Désactiver le suivi
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}