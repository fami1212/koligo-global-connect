import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar, MapPin, Package, Star, Heart, Search, Plane, Car, Train, Ship, Shield } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ImprovedBookingWorkflow } from '@/components/ImprovedBookingWorkflow';
import { Pagination } from '@/components/Pagination';
import { usePullToRefresh } from '@/hooks/usePullToRefresh';
import { PullToRefreshIndicator } from '@/components/PullToRefreshIndicator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Liste des pays
const COUNTRIES = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola", "Antigua-et-Barbuda",
  "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan", "Bahamas", "Bahreïn",
  "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan", "Biélorussie", "Birmanie", "Bolivie",
  "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei", "Bulgarie", "Burkina Faso", "Burundi", "Cambodge",
  "Cameroun", "Canada", "Cap-Vert", "Centrafrique", "Chili", "Chine", "Chypre", "Colombie", "Comores",
  "Corée du Nord", "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Djibouti",
  "Dominique", "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie", "Eswatini",
  "États-Unis", "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie", "Géorgie", "Ghana", "Grèce",
  "Grenade", "Guatemala", "Guinée", "Guinée équatoriale", "Guinée-Bissau", "Guyana", "Haïti", "Honduras",
  "Hongrie", "Inde", "Indonésie", "Irak", "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque",
  "Japon", "Jordanie", "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos", "Lesotho",
  "Lettonie", "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord",
  "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice", "Mauritanie",
  "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro", "Mozambique", "Namibie",
  "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège", "Nouvelle-Zélande", "Oman", "Ouganda",
  "Ouzbékistan", "Pakistan", "Palaos", "Palestine", "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay",
  "Pays-Bas", "Pérou", "Philippines", "Pologne", "Portugal", "Qatar", "République dominicaine",
  "République tchèque", "Roumanie", "Royaume-Uni", "Russie", "Rwanda", "Saint-Kitts-et-Nevis",
  "Saint-Vincent-et-les-Grenadines", "Sainte-Lucie", "Salomon", "Salvador", "Samoa", "São Tomé-et-Príncipe",
  "Sénégal", "Serbie", "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie",
  "Soudan", "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", "Tadjikistan", "Tanzanie",
  "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago", "Tunisie", "Turkménistan",
  "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican", "Venezuela", "Viêt Nam", "Yémen",
  "Zambie", "Zimbabwe"
];

const POPULAR_COUNTRIES = [
  "France", "Belgique", "Luxembourg", "Allemagne", "Espagne", "Italie", 
  "Royaume-Uni", "États-Unis", "Canada", "Sénégal", "Côte d'Ivoire", "Maroc"
];

interface Trip {
  id: string;
  departure_city: string;
  departure_country: string;
  arrival_city: string;
  arrival_country: string;
  departure_date: string;
  arrival_date?: string;
  available_weight_kg: number;
  max_weight_kg: number;
  price_per_kg: number;
  currency: string;
  transport_type: string;
  description?: string;
  pickup_address?: string;
  delivery_address?: string;
  pickup_time_limit: string;
  traveler_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
    rating: number;
    total_reviews: number;
    is_verified: boolean;
    avatar_url?: string;
    phone?: string;
    email: string;
  } | null;
  isFavorite?: boolean;
}

export default function SearchTrips() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [countryFilter, setCountryFilter] = useState("");
  const itemsPerPage = 10;
  
  const [filters, setFilters] = useState({
    departure_country: searchParams.get('from') || '',
    arrival_country: searchParams.get('to') || '',
  });

  // Auto-search on URL params change
  useEffect(() => {
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    if (from || to) {
      setFilters({ departure_country: from || '', arrival_country: to || '' });
      searchTrips(from || '', to || '');
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      loadFavorites();
    }
  }, [user]);

  const loadFavorites = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('trip_id')
      .eq('user_id', user.id);
    
    setFavoriteIds(new Set(data?.map(f => f.trip_id) || []));
  };

  const searchTrips = async (depCountry?: string, arrCountry?: string) => {
    const departureCountry = depCountry ?? filters.departure_country;
    const arrivalCountry = arrCountry ?? filters.arrival_country;
    
    try {
      setLoading(true);
      setHasSearched(true);

      let countQuery = supabase
        .from('trips')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('departure_date', new Date().toISOString());

      let query = supabase
        .from('trips')
        .select('*')
        .eq('is_active', true)
        .gte('departure_date', new Date().toISOString());

      // Recherche exacte sur les pays
      if (departureCountry.trim()) {
        query = query.eq('departure_country', departureCountry.trim());
        countQuery = countQuery.eq('departure_country', departureCountry.trim());
      }
      if (arrivalCountry.trim()) {
        query = query.eq('arrival_country', arrivalCountry.trim());
        countQuery = countQuery.eq('arrival_country', arrivalCountry.trim());
      }

      const { count } = await countQuery;
      setTotalCount(count || 0);

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data: tripsData, error } = await query
        .order('departure_date', { ascending: true })
        .range(from, to);

      if (error) throw error;

      const travelerIds = [...new Set(tripsData?.map(t => t.traveler_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, rating, total_reviews, is_verified, avatar_url, phone, email')
        .in('user_id', travelerIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);

      const tripsWithProfiles = tripsData?.map(trip => ({
        ...trip,
        profiles: profilesMap.get(trip.traveler_id) || null,
        isFavorite: favoriteIds.has(trip.id)
      }))?.sort((a, b) => {
        if (a.profiles?.is_verified && !b.profiles?.is_verified) return -1;
        if (!a.profiles?.is_verified && b.profiles?.is_verified) return 1;
        return (b.profiles?.rating || 0) - (a.profiles?.rating || 0);
      }) || [];

      setTrips(tripsWithProfiles);
    } catch (error) {
      console.error('Error searching trips:', error);
      toast({
        title: "Erreur",
        description: "Impossible de rechercher les trajets",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { containerRef, isPulling, isRefreshing, pullDistance, threshold } = usePullToRefresh({
    onRefresh: searchTrips,
    threshold: 80
  });

  const toggleFavorite = async (tripId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      navigate('/auth');
      return;
    }

    const isFavorite = favoriteIds.has(tripId);

    try {
      if (isFavorite) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('trip_id', tripId);
        
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(tripId);
          return next;
        });
        toast({ title: "Retiré des favoris" });
      } else {
        await supabase
          .from('favorites')
          .insert({ user_id: user.id, trip_id: tripId });
        
        setFavoriteIds(prev => new Set(prev).add(tripId));
        toast({ title: "Ajouté aux favoris" });
      }

      setTrips(prev => prev.map(t => 
        t.id === tripId ? { ...t, isFavorite: !isFavorite } : t
      ));
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Erreur",
        description: "Impossible de modifier les favoris",
        variant: "destructive",
      });
    }
  };

  const openBooking = (trip: Trip) => {
    setSelectedTrip(trip);
    setBookingOpen(true);
  };

  const getTransportIcon = (type: string) => {
    switch (type) {
      case 'avion': return <Plane className="h-4 w-4" />;
      case 'voiture': return <Car className="h-4 w-4" />;
      case 'train': return <Train className="h-4 w-4" />;
      case 'bateau': return <Ship className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    searchTrips();
  };

  const filteredCountries = (filter: string) => 
    COUNTRIES.filter(c => c.toLowerCase().includes(filter.toLowerCase()));

  return (
    <div 
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8 overflow-x-hidden overflow-y-auto"
    >
      <PullToRefreshIndicator 
        pullDistance={pullDistance} 
        isRefreshing={isRefreshing}
        isPulling={isPulling}
        threshold={threshold}
      />
      
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Trouver un trajet
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Recherchez un transporteur pour votre colis
          </p>
        </div>

        <Card>
          <CardContent className="p-4 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Plane className="h-4 w-4 text-primary" />
                    Pays de départ
                  </label>
                  <Select 
                    value={filters.departure_country} 
                    onValueChange={(val) => {
                      setFilters(prev => ({ ...prev, departure_country: val }))
                      setCountryFilter("")
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Tous les pays" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="p-2 sticky top-0 bg-background z-10">
                        <Input
                          placeholder="Rechercher..."
                          value={countryFilter}
                          onChange={(e) => setCountryFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-[250px]">
                        {countryFilter === "" && (
                          <>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">Populaires</div>
                            {POPULAR_COUNTRIES.map(c => (
                              <SelectItem key={`pop-dep-${c}`} value={c}>{c}</SelectItem>
                            ))}
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 border-t mt-1">Tous</div>
                          </>
                        )}
                        {filteredCountries(countryFilter).map(c => (
                          <SelectItem key={`dep-${c}`} value={c}>{c}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-secondary" />
                    Pays d'arrivée
                  </label>
                  <Select 
                    value={filters.arrival_country} 
                    onValueChange={(val) => {
                      setFilters(prev => ({ ...prev, arrival_country: val }))
                      setCountryFilter("")
                    }}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Tous les pays" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="p-2 sticky top-0 bg-background z-10">
                        <Input
                          placeholder="Rechercher..."
                          value={countryFilter}
                          onChange={(e) => setCountryFilter(e.target.value)}
                          className="h-9"
                        />
                      </div>
                      <div className="overflow-y-auto max-h-[250px]">
                        {countryFilter === "" && (
                          <>
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">Populaires</div>
                            {POPULAR_COUNTRIES.map(c => (
                              <SelectItem key={`pop-arr-${c}`} value={c}>{c}</SelectItem>
                            ))}
                            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground bg-muted/50 border-t mt-1">Tous</div>
                          </>
                        )}
                        {filteredCountries(countryFilter).map(c => (
                          <SelectItem key={`arr-${c}`} value={c}>{c}</SelectItem>
                        ))}
                      </div>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="submit" className="w-full h-12" disabled={loading}>
                <Search className="h-5 w-5 mr-2" />
                {loading ? 'Recherche...' : 'Rechercher'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {hasSearched && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {totalCount} trajet{totalCount > 1 ? 's' : ''} trouvé{totalCount > 1 ? 's' : ''}
            </p>

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Recherche en cours...</p>
              </div>
            ) : trips.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Aucun trajet trouvé</h3>
                  <p className="text-muted-foreground">
                    Essayez de modifier vos critères de recherche
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <Card 
                      key={trip.id} 
                      className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-br from-background to-muted/20"
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col gap-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border-2 border-primary/20">
                                <AvatarImage src={trip.profiles?.avatar_url || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {trip.profiles?.first_name?.[0]}{trip.profiles?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-semibold text-sm sm:text-base">
                                    {trip.profiles?.first_name} {trip.profiles?.last_name}
                                  </p>
                                  {trip.profiles?.is_verified && (
                                    <Badge variant="outline" className="bg-success/10 text-success border-success text-xs gap-1">
                                      <Shield className="h-3 w-3" />
                                      Vérifié
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Star className="h-3 w-3 fill-warning text-warning" />
                                  <span>{trip.profiles?.rating?.toFixed(1) || '5.0'}</span>
                                  <span>({trip.profiles?.total_reviews || 0})</span>
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => toggleFavorite(trip.id, e)}
                              className="shrink-0"
                            >
                              <Heart 
                                className={`h-5 w-5 ${trip.isFavorite ? 'fill-red-500 text-red-500' : ''}`} 
                              />
                            </Button>
                          </div>

                          <div className="flex items-center gap-3 text-sm">
                            <div className="flex-1 bg-primary/5 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Départ</p>
                              <p className="font-bold text-base">{trip.departure_city}</p>
                              <p className="text-xs text-muted-foreground">{trip.departure_country}</p>
                            </div>
                            <div className="shrink-0">
                              {getTransportIcon(trip.transport_type)}
                            </div>
                            <div className="flex-1 bg-secondary/5 p-3 rounded-lg">
                              <p className="text-xs text-muted-foreground mb-1">Arrivée</p>
                              <p className="font-bold text-base">{trip.arrival_city}</p>
                              <p className="text-xs text-muted-foreground">{trip.arrival_country}</p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline" className="gap-1 text-xs">
                                <Calendar className="h-3 w-3" />
                                {new Date(trip.departure_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short'
                                })}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {trip.available_weight_kg} kg
                              </Badge>
                            </div>
                            <span className="text-success font-bold text-base">
                              {trip.price_per_kg} {trip.currency}/kg
                            </span>
                          </div>

                          <Button 
                            className="w-full bg-gradient-primary hover:opacity-90"
                            onClick={() => openBooking(trip)}
                          >
                            Choisir ce trajet
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {totalCount > itemsPerPage && (
                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(totalCount / itemsPerPage)}
                    onPageChange={(page) => {
                      setCurrentPage(page);
                      searchTrips();
                    }}
                  />
                )}
              </>
            )}
          </div>
        )}

        {selectedTrip && (
          <ImprovedBookingWorkflow 
            trip={selectedTrip} 
            open={bookingOpen}
            onClose={() => {
              setBookingOpen(false);
              setSelectedTrip(null);
            }} 
          />
        )}
      </div>
    </div>
  );
}
