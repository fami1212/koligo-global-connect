import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

interface TrackingMapProps {
  transporterLocation: { lat: number; lng: number } | null;
  pickupLocation?: { lat: number; lng: number; city: string };
  deliveryLocation?: { lat: number; lng: number; city: string };
  className?: string;
}

export function TrackingMap({ 
  transporterLocation, 
  pickupLocation, 
  deliveryLocation,
  className = ''
}: TrackingMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const transporterMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string>(() => 
    localStorage.getItem('mapbox_token') || ''
  );
  const [isTokenSet, setIsTokenSet] = useState(() => !!localStorage.getItem('mapbox_token'));
  const [tokenInput, setTokenInput] = useState('');

  const saveToken = () => {
    if (tokenInput.trim()) {
      localStorage.setItem('mapbox_token', tokenInput.trim());
      setMapboxToken(tokenInput.trim());
      setIsTokenSet(true);
    }
  };

  useEffect(() => {
    if (!mapContainer.current || !isTokenSet || !mapboxToken) return;

    try {
      mapboxgl.accessToken = mapboxToken;
      
      // Default center (France)
      const center: [number, number] = transporterLocation 
        ? [transporterLocation.lng, transporterLocation.lat]
        : [2.3522, 48.8566];

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center,
        zoom: transporterLocation ? 12 : 5,
      });

      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add pickup marker if available
      if (pickupLocation) {
        new mapboxgl.Marker({ color: '#f97316' })
          .setLngLat([pickupLocation.lng, pickupLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Départ</strong><br/>${pickupLocation.city}`))
          .addTo(map.current);
      }

      // Add delivery marker if available
      if (deliveryLocation) {
        new mapboxgl.Marker({ color: '#22c55e' })
          .setLngLat([deliveryLocation.lng, deliveryLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>Destination</strong><br/>${deliveryLocation.city}`))
          .addTo(map.current);
      }

      // Add transporter marker
      if (transporterLocation) {
        const el = document.createElement('div');
        el.className = 'transporter-marker';
        el.innerHTML = `
          <div style="
            width: 40px;
            height: 40px;
            background: hsl(var(--primary));
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
            animation: pulse 2s infinite;
          ">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
            </svg>
          </div>
        `;
        
        transporterMarker.current = new mapboxgl.Marker(el)
          .setLngLat([transporterLocation.lng, transporterLocation.lat])
          .setPopup(new mapboxgl.Popup().setHTML('<strong>Position du transporteur</strong>'))
          .addTo(map.current);
      }

    } catch (error) {
      console.error('Error initializing map:', error);
      setIsTokenSet(false);
      localStorage.removeItem('mapbox_token');
    }

    return () => {
      map.current?.remove();
    };
  }, [isTokenSet, mapboxToken]);

  // Update transporter location in real-time
  useEffect(() => {
    if (map.current && transporterMarker.current && transporterLocation) {
      transporterMarker.current.setLngLat([transporterLocation.lng, transporterLocation.lat]);
      map.current.flyTo({
        center: [transporterLocation.lng, transporterLocation.lat],
        zoom: 14,
        duration: 1000
      });
    }
  }, [transporterLocation]);

  if (!isTokenSet) {
    return (
      <div className={`bg-muted/50 rounded-lg p-4 ${className}`}>
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="p-3 rounded-full bg-primary/10">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-medium text-sm">Activer la carte</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Entrez votre token Mapbox pour voir la position en temps réel
            </p>
            <a 
              href="https://mapbox.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline"
            >
              Obtenir un token gratuit →
            </a>
          </div>
          <div className="w-full max-w-sm space-y-2">
            <Input
              type="text"
              placeholder="pk.eyJ1Ijoi..."
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="text-xs"
            />
            <Button onClick={saveToken} size="sm" className="w-full">
              Activer la carte
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}>
      <div ref={mapContainer} className="w-full h-full min-h-[200px]" />
      
      {/* Overlay info */}
      {transporterLocation && (
        <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded-lg p-2 shadow-lg">
          <div className="flex items-center gap-2">
            <Navigation className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-xs font-medium">En direct</span>
          </div>
        </div>
      )}

      {!transporterLocation && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Position non disponible
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
