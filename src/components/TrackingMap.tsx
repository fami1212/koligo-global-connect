import { MapPin, Navigation } from 'lucide-react';

interface TrackingMapProps {
  transporterLocation: { lat: number; lng: number } | null;
  pickupCity?: string;
  deliveryCity?: string;
  className?: string;
}

export function TrackingMap({ 
  transporterLocation, 
  pickupCity,
  deliveryCity,
  className = ''
}: TrackingMapProps) {
  return (
    <div className={`relative bg-muted/30 rounded-lg border border-border overflow-hidden ${className}`}>
      {/* Simple placeholder map */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--border)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }}
      />

      <div className="relative h-full flex flex-col items-center justify-center p-4 text-center">
        {transporterLocation ? (
          <>
            <div className="p-3 rounded-full bg-primary/20 mb-3 animate-pulse">
              <Navigation className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">Position en direct</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">
              {transporterLocation.lat.toFixed(4)}, {transporterLocation.lng.toFixed(4)}
            </p>
          </>
        ) : (
          <>
            <div className="p-3 rounded-full bg-muted mb-3">
              <MapPin className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">Carte bientôt disponible</p>
          </>
        )}

        {/* Route info */}
        {(pickupCity || deliveryCity) && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-background/80 backdrop-blur-sm rounded-lg p-2 text-xs">
            {pickupCity && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="truncate">{pickupCity}</span>
              </div>
            )}
            {deliveryCity && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="truncate">{deliveryCity}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
