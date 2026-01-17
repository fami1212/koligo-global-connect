import { useEffect, useState, useRef, useMemo } from 'react';
import { MapPin, Navigation, Loader2, Clock, Route } from 'lucide-react';
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

interface ETAInfo {
  distanceKm: number;
  durationMinutes: number;
  durationText: string;
  arrivalTime: string;
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

// Calculate distance between two points using Haversine formula
function calculateDistance(
  lat1: number, 
  lng1: number, 
  lat2: number, 
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Format duration to readable text
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`;
}

// Format arrival time
function formatArrivalTime(durationMinutes: number): string {
  const now = new Date();
  const arrivalDate = new Date(now.getTime() + durationMinutes * 60 * 1000);
  
  const hours = arrivalDate.getHours().toString().padStart(2, '0');
  const minutes = arrivalDate.getMinutes().toString().padStart(2, '0');
  
  // Check if arrival is today or another day
  const isToday = arrivalDate.toDateString() === now.toDateString();
  const isTomorrow = arrivalDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
  
  if (isToday) {
    return `${hours}h${minutes}`;
  } else if (isTomorrow) {
    return `Demain ${hours}h${minutes}`;
  } else {
    const day = arrivalDate.getDate();
    const month = arrivalDate.toLocaleDateString('fr-FR', { month: 'short' });
    return `${day} ${month} ${hours}h${minutes}`;
  }
}

// Calculate ETA based on distance and average speed
function calculateETA(
  transporterLocation: { lat: number; lng: number } | null,
  destinationLocation: GeocodedLocation | null,
  averageSpeedKmh: number = 60 // Default average speed
): ETAInfo | null {
  if (!transporterLocation || !destinationLocation) return null;
  
  const distanceKm = calculateDistance(
    transporterLocation.lat,
    transporterLocation.lng,
    destinationLocation.lat,
    destinationLocation.lng
  );
  
  // Apply road factor (roads are ~1.3x longer than straight line)
  const roadDistanceKm = distanceKm * 1.3;
  const durationMinutes = (roadDistanceKm / averageSpeedKmh) * 60;
  
  return {
    distanceKm: roadDistanceKm,
    durationMinutes,
    durationText: formatDuration(durationMinutes),
    arrivalTime: formatArrivalTime(durationMinutes),
  };
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

  // Calculate ETA
  const etaInfo = useMemo(() => 
    calculateETA(transporterLocation, deliveryLocation),
    [transporterLocation, deliveryLocation]
  );

  // Calculate progress percentage
  const progressPercentage = useMemo(() => {
    if (!pickupLocation || !deliveryLocation || !transporterLocation) return null;
    
    const totalDistance = calculateDistance(
      pickupLocation.lat, pickupLocation.lng,
      deliveryLocation.lat, deliveryLocation.lng
    );
    
    const remainingDistance = calculateDistance(
      transporterLocation.lat, transporterLocation.lng,
      deliveryLocation.lat, deliveryLocation.lng
    );
    
    const progress = ((totalDistance - remainingDistance) / totalDistance) * 100;
    return Math.max(0, Math.min(100, progress));
  }, [pickupLocation, deliveryLocation, transporterLocation]);

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
      
      {/* ETA Panel */}
      {transporterLocation && etaInfo && (
        <div className="absolute top-2 left-2 z-20 bg-background/95 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-border max-w-[220px]">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-muted-foreground">Arrivée estimée</span>
          </div>
          
          {/* Arrival time */}
          <div className="text-2xl font-bold text-foreground mb-0.5">
            {etaInfo.arrivalTime}
          </div>
          
          {/* Duration remaining */}
          <div className="text-sm text-muted-foreground mb-2">
            Dans {etaInfo.durationText}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Route className="h-3 w-3" />
            <span>{etaInfo.distanceKm.toFixed(1)} km restants</span>
          </div>
          
          {progressPercentage !== null && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progression</span>
                <span>{Math.round(progressPercentage)}%</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>
          )}
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