import { useEffect, useState, useRef } from 'react';
import { MapPin, Navigation, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TrackingMapProps {
  transporterLocation: { lat: number; lng: number } | null;
  pickupCity?: string;
  pickupCountry?: string;
  deliveryCity?: string;
  deliveryCountry?: string;
  className?: string;
}

interface GeocodedLocation {
  lat: number;
  lng: number;
  name: string;
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const createIcon = (color: string, size: number = 24) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${color};
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

const pickupIcon = createIcon('#f97316', 20); // Orange
const deliveryIcon = createIcon('#22c55e', 20); // Green
const transporterIcon = L.divIcon({
  className: 'transporter-marker',
  html: `
    <div style="
      width: 36px;
      height: 36px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 50%;
      border: 3px solid white;
      box-shadow: 0 4px 12px rgba(59,130,246,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      animation: pulse 2s infinite;
    ">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
        <polygon points="12,2 19,21 12,17 5,21"></polygon>
      </svg>
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { transform: scale(1); opacity: 1; }
        50% { transform: scale(1.1); opacity: 0.8; }
      }
    </style>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Geocoding function using Nominatim (OpenStreetMap)
async function geocodeCity(city: string, country?: string): Promise<GeocodedLocation | null> {
  try {
    const query = country ? `${city}, ${country}` : city;
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        name: city,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export function TrackingMap({ 
  transporterLocation, 
  pickupCity,
  pickupCountry,
  deliveryCity,
  deliveryCountry,
  className = ''
}: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const transporterMarkerRef = useRef<L.Marker | null>(null);
  
  const [pickupLocation, setPickupLocation] = useState<GeocodedLocation | null>(null);
  const [deliveryLocation, setDeliveryLocation] = useState<GeocodedLocation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Geocode cities when they change
  useEffect(() => {
    const geocodeCities = async () => {
      setIsLoading(true);
      
      const [pickup, delivery] = await Promise.all([
        pickupCity ? geocodeCity(pickupCity, pickupCountry) : Promise.resolve(null),
        deliveryCity ? geocodeCity(deliveryCity, deliveryCountry) : Promise.resolve(null),
      ]);
      
      setPickupLocation(pickup);
      setDeliveryLocation(delivery);
      setIsLoading(false);
    };
    
    geocodeCities();
  }, [pickupCity, pickupCountry, deliveryCity, deliveryCountry]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;
    
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: true,
    }).setView([46.603354, 1.888334], 5); // Default to France
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18,
    }).addTo(map);
    
    // Add zoom control on the right
    L.control.zoom({ position: 'topright' }).addTo(map);
    
    mapInstanceRef.current = map;
    setMapReady(true);
    
    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    
    // Clear existing markers (except transporter)
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker && layer !== transporterMarkerRef.current) {
        map.removeLayer(layer);
      }
      if (layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });
    
    const bounds: L.LatLngBounds[] = [];
    const points: L.LatLng[] = [];
    
    // Add pickup marker
    if (pickupLocation) {
      const marker = L.marker([pickupLocation.lat, pickupLocation.lng], { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Départ</b><br>${pickupLocation.name}`);
      points.push(L.latLng(pickupLocation.lat, pickupLocation.lng));
    }
    
    // Add delivery marker
    if (deliveryLocation) {
      const marker = L.marker([deliveryLocation.lat, deliveryLocation.lng], { icon: deliveryIcon })
        .addTo(map)
        .bindPopup(`<b>Destination</b><br>${deliveryLocation.name}`);
      points.push(L.latLng(deliveryLocation.lat, deliveryLocation.lng));
    }
    
    // Add transporter marker
    if (transporterLocation) {
      points.push(L.latLng(transporterLocation.lat, transporterLocation.lng));
    }
    
    // Draw route line
    if (points.length >= 2) {
      const routeLine = L.polyline(
        pickupLocation && deliveryLocation 
          ? [
              [pickupLocation.lat, pickupLocation.lng],
              ...(transporterLocation ? [[transporterLocation.lat, transporterLocation.lng] as [number, number]] : []),
              [deliveryLocation.lat, deliveryLocation.lng]
            ]
          : points.map(p => [p.lat, p.lng] as [number, number]),
        {
          color: '#3b82f6',
          weight: 3,
          opacity: 0.6,
          dashArray: '10, 10',
        }
      ).addTo(map);
    }
    
    // Fit bounds
    if (points.length > 0) {
      const group = L.latLngBounds(points);
      map.fitBounds(group, { padding: [50, 50], maxZoom: 10 });
    }
  }, [pickupLocation, deliveryLocation, mapReady]);

  // Update transporter marker in real-time
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapReady) return;
    
    if (transporterLocation) {
      if (transporterMarkerRef.current) {
        // Animate marker movement
        transporterMarkerRef.current.setLatLng([transporterLocation.lat, transporterLocation.lng]);
      } else {
        transporterMarkerRef.current = L.marker(
          [transporterLocation.lat, transporterLocation.lng],
          { icon: transporterIcon, zIndexOffset: 1000 }
        )
          .addTo(map)
          .bindPopup('<b>Transporteur</b><br>Position en direct');
      }
    } else if (transporterMarkerRef.current) {
      map.removeLayer(transporterMarkerRef.current);
      transporterMarkerRef.current = null;
    }
  }, [transporterLocation, mapReady]);

  return (
    <div className={`relative rounded-lg border border-border overflow-hidden ${className}`}>
      {/* Map container */}
      <div ref={mapRef} className="absolute inset-0 z-0" />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-10 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="absolute bottom-2 left-2 z-20 bg-background/90 backdrop-blur-sm rounded-lg p-2 text-xs space-y-1 shadow-lg">
        {pickupCity && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
            <span className="truncate max-w-[120px]">{pickupCity}</span>
          </div>
        )}
        {deliveryCity && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 border-2 border-white shadow-sm" />
            <span className="truncate max-w-[120px]">{deliveryCity}</span>
          </div>
        )}
        {transporterLocation && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm animate-pulse" />
            <span>Transporteur (live)</span>
          </div>
        )}
      </div>
      
      {/* Live indicator */}
      {transporterLocation && (
        <div className="absolute top-2 right-12 z-20 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
          EN DIRECT
        </div>
      )}
    </div>
  );
}
