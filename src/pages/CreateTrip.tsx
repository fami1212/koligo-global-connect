import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Truck, MapPin, Calendar, DollarSign, Upload, Shield, AlertTriangle, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Liste des pays
const COUNTRIES = [
  "Afghanistan", "Afrique du Sud", "Albanie", "Algérie", "Allemagne", "Andorre", "Angola",
  "Arabie saoudite", "Argentine", "Arménie", "Australie", "Autriche", "Azerbaïdjan",
  "Bahamas", "Bahreïn", "Bangladesh", "Barbade", "Belgique", "Belize", "Bénin", "Bhoutan",
  "Biélorussie", "Birmanie", "Bolivie", "Bosnie-Herzégovine", "Botswana", "Brésil", "Brunei",
  "Bulgarie", "Burkina Faso", "Burundi", "Cambodge", "Cameroun", "Canada", "Cap-Vert",
  "Centrafrique", "Chili", "Chine", "Chypre", "Colombie", "Comores", "Corée du Nord",
  "Corée du Sud", "Costa Rica", "Côte d'Ivoire", "Croatie", "Cuba", "Danemark", "Djibouti",
  "Dominique", "Égypte", "Émirats arabes unis", "Équateur", "Érythrée", "Espagne", "Estonie",
  "Eswatini", "États-Unis", "Éthiopie", "Fidji", "Finlande", "France", "Gabon", "Gambie",
  "Géorgie", "Ghana", "Grèce", "Grenade", "Guatemala", "Guinée", "Guinée équatoriale",
  "Guinée-Bissau", "Guyana", "Haïti", "Honduras", "Hongrie", "Inde", "Indonésie", "Irak",
  "Iran", "Irlande", "Islande", "Israël", "Italie", "Jamaïque", "Japon", "Jordanie",
  "Kazakhstan", "Kenya", "Kirghizistan", "Kiribati", "Koweït", "Laos", "Lesotho", "Lettonie",
  "Liban", "Liberia", "Libye", "Liechtenstein", "Lituanie", "Luxembourg", "Macédoine du Nord",
  "Madagascar", "Malaisie", "Malawi", "Maldives", "Mali", "Malte", "Maroc", "Maurice",
  "Mauritanie", "Mexique", "Micronésie", "Moldavie", "Monaco", "Mongolie", "Monténégro",
  "Mozambique", "Namibie", "Nauru", "Népal", "Nicaragua", "Niger", "Nigeria", "Norvège",
  "Nouvelle-Zélande", "Oman", "Ouganda", "Ouzbékistan", "Pakistan", "Palaos", "Palestine",
  "Panama", "Papouasie-Nouvelle-Guinée", "Paraguay", "Pays-Bas", "Pérou", "Philippines",
  "Pologne", "Portugal", "Qatar", "République dominicaine", "République tchèque", "Roumanie",
  "Royaume-Uni", "Russie", "Rwanda", "Saint-Kitts-et-Nevis", "Saint-Vincent-et-les-Grenadines",
  "Sainte-Lucie", "Salomon", "Salvador", "Samoa", "São Tomé-et-Príncipe", "Sénégal", "Serbie",
  "Seychelles", "Sierra Leone", "Singapour", "Slovaquie", "Slovénie", "Somalie", "Soudan",
  "Soudan du Sud", "Sri Lanka", "Suède", "Suisse", "Suriname", "Syrie", "Tadjikistan",
  "Tanzanie", "Tchad", "Thaïlande", "Timor oriental", "Togo", "Tonga", "Trinité-et-Tobago",
  "Tunisie", "Turkménistan", "Turquie", "Tuvalu", "Ukraine", "Uruguay", "Vanuatu", "Vatican",
  "Venezuela", "Viêt Nam", "Yémen", "Zambie", "Zimbabwe"
];

const POPULAR_COUNTRIES = [
  "France", "Belgique", "Luxembourg", "Allemagne", "Espagne", "Italie",
  "Royaume-Uni", "États-Unis", "Canada", "Sénégal", "Côte d'Ivoire", "Maroc"
];

export default function CreateTrip() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [transportType, setTransportType] = useState('');
  const [currency, setCurrency] = useState('EUR');
  const [departureCountry, setDepartureCountry] = useState('');
  const [arrivalCountry, setArrivalCountry] = useState('');
  const [ticketProof, setTicketProof] = useState<File | null>(null);
  const [uploadingTicket, setUploadingTicket] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isVerified = (profile as any)?.is_verified === true;

  // Vérification KYC au chargement
  useEffect(() => {
    if (profile && !(profile as any)?.is_verified) {
      toast({
        title: "Vérification requise",
        description: "Vous devez être vérifié pour publier des trajets",
        variant: "destructive",
      });
    }
  }, [profile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Fichier trop volumineux",
          description: "La taille maximum est de 5 Mo",
          variant: "destructive",
        });
        return;
      }
      setTicketProof(file);
    }
  };

  const uploadTicketProof = async (): Promise<string | null> => {
    if (!ticketProof || !user) return null;

    setUploadingTicket(true);
    try {
      const fileExt = ticketProof.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, ticketProof);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading ticket proof:', error);
      toast({
        title: "Erreur",
        description: "Impossible de télécharger la preuve d'achat",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingTicket(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    if (!isVerified) {
      toast({
        title: "Vérification requise",
        description: "Vous devez être vérifié pour publier un trajet",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    
    const formData = new FormData(e.currentTarget);
    
    // Upload ticket proof if provided
    const ticketProofUrl = await uploadTicketProof();
    
    const tripData = {
      traveler_id: user.id,
      departure_city: formData.get('departureCity') as string,
      departure_country: departureCountry,
      arrival_city: formData.get('arrivalCity') as string,
      arrival_country: arrivalCountry,
      departure_date: new Date(formData.get('departureDate') as string).toISOString(),
      arrival_date: formData.get('arrivalDate') ? new Date(formData.get('arrivalDate') as string).toISOString() : null,
      transport_type: transportType,
      max_weight_kg: parseFloat(formData.get('maxWeight') as string),
      available_weight_kg: parseFloat(formData.get('maxWeight') as string),
      max_volume_m3: parseFloat(formData.get('maxVolume') as string) || null,
      price_per_kg: parseFloat(formData.get('pricePerKg') as string),
      currency: currency,
      pickup_address: formData.get('pickupAddress') as string,
      delivery_address: formData.get('deliveryAddress') as string || null,
      pickup_time_limit: formData.get('pickupTimeLimit') as string,
      last_deposit_date: formData.get('lastDepositDate') ? new Date(formData.get('lastDepositDate') as string).toISOString() : null,
      description: formData.get('description') as string || null,
      ticket_proof_url: ticketProofUrl,
    };

    try {
      const { error } = await supabase
        .from('trips')
        .insert([tripData]);

      if (error) throw error;

      toast({
        title: "Trajet créé avec succès",
        description: "Votre offre de transport a été publiée.",
      });

      navigate('/my-trips');
    } catch (error) {
      console.error('Error creating trip:', error);
      toast({
        title: "Erreur",
        description: "Une erreur est survenue lors de la création du trajet.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification required message if not verified
  if (!isVerified) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
          <div className="mb-6">
            <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-3 text-sm">
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertTitle className="text-amber-800">Vérification requise</AlertTitle>
            <AlertDescription className="text-amber-700 mt-2">
              <p className="mb-4">
                Pour publier des trajets et transporter des colis, vous devez d'abord faire vérifier votre identité.
              </p>
              <p className="mb-4 text-sm">
                Cette vérification nous permet de garantir la sécurité de tous les utilisateurs de la plateforme.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link to="/profile">
                    <Shield className="h-4 w-4 mr-2" />
                    Soumettre mes documents
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Retour</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background pb-20 md:pb-8">
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-8 max-w-2xl">
        <div className="mb-6 sm:mb-8">
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-primary hover:text-primary/80 mb-3 sm:mb-4 text-sm sm:text-base">
            <ArrowLeft className="h-4 w-4" />
            Retour au tableau de bord
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Truck className="h-6 w-6 sm:h-8 sm:w-8 text-accent" />
            Publier un trajet
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Publiez votre trajet pour transporter des colis et gagner de l'argent
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {/* Route Information */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <MapPin className="h-5 w-5 text-primary" />
                Itinéraire
              </CardTitle>
              <CardDescription className="text-sm">Définissez votre parcours de transport</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays de départ *</Label>
                  <Select value={departureCountry} onValueChange={setDepartureCountry} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Populaires</div>
                      {POPULAR_COUNTRIES.map(c => (
                        <SelectItem key={`pop-dep-${c}`} value={c}>{c}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1">Tous les pays</div>
                      {COUNTRIES.map(c => (
                        <SelectItem key={`dep-${c}`} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departureCity">Ville de départ *</Label>
                  <Input
                    id="departureCity"
                    name="departureCity"
                    required
                    placeholder="Paris"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pays d'arrivée *</Label>
                  <Select value={arrivalCountry} onValueChange={setArrivalCountry} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un pays" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Populaires</div>
                      {POPULAR_COUNTRIES.map(c => (
                        <SelectItem key={`pop-arr-${c}`} value={c}>{c}</SelectItem>
                      ))}
                      <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1">Tous les pays</div>
                      {COUNTRIES.map(c => (
                        <SelectItem key={`arr-${c}`} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrivalCity">Ville d'arrivée *</Label>
                  <Input
                    id="arrivalCity"
                    name="arrivalCity"
                    required
                    placeholder="Dakar"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pickupAddress">Adresse de dépôt (départ) *</Label>
                <Input
                  id="pickupAddress"
                  name="pickupAddress"
                  required
                  placeholder="123 Rue de la Paix, 75001 Paris"
                />
                <p className="text-xs text-muted-foreground">
                  Lieu où les clients déposeront leurs colis
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deliveryAddress">Adresse de retrait (destination)</Label>
                <Input
                  id="deliveryAddress"
                  name="deliveryAddress"
                  placeholder="456 Avenue Cheikh Anta Diop, Dakar"
                />
                <p className="text-xs text-muted-foreground">
                  Lieu où les destinataires récupéreront leurs colis
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Date and Transport */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <Calendar className="h-5 w-5 text-accent" />
                Dates et transport
              </CardTitle>
              <CardDescription>Quand voyagez-vous et comment ?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="departureDate">Date de départ *</Label>
                  <Input
                    id="departureDate"
                    name="departureDate"
                    type="datetime-local"
                    required
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="arrivalDate">Date d'arrivée</Label>
                  <Input
                    id="arrivalDate"
                    name="arrivalDate"
                    type="datetime-local"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="lastDepositDate">Dernière date de dépôt</Label>
                  <Input
                    id="lastDepositDate"
                    name="lastDepositDate"
                    type="datetime-local"
                  />
                  <p className="text-xs text-muted-foreground">
                    Date limite pour déposer les colis
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupTimeLimit">Heure limite *</Label>
                  <Input
                    id="pickupTimeLimit"
                    name="pickupTimeLimit"
                    type="time"
                    required
                    defaultValue="18:00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="transportType">Mode de transport *</Label>
                <Select value={transportType} onValueChange={setTransportType} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisissez votre mode de transport" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plane">✈️ Avion</SelectItem>
                    <SelectItem value="car">🚗 Voiture</SelectItem>
                    <SelectItem value="train">🚄 Train</SelectItem>
                    <SelectItem value="bus">🚌 Bus</SelectItem>
                    <SelectItem value="boat">🚢 Bateau</SelectItem>
                    <SelectItem value="truck">🚚 Camion</SelectItem>
                    <SelectItem value="other">Autre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Capacity and Pricing */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <DollarSign className="h-5 w-5 text-success" />
                Capacité et tarification
              </CardTitle>
              <CardDescription>Définissez ce que vous pouvez transporter et vos tarifs</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="maxWeight">Poids maximum (kg) *</Label>
                  <Input
                    id="maxWeight"
                    name="maxWeight"
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    placeholder="20"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxVolume">Volume max (m³)</Label>
                  <Input
                    id="maxVolume"
                    name="maxVolume"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pricePerKg">Prix par kg *</Label>
                  <Input
                    id="pricePerKg"
                    name="pricePerKg"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="5.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise *</Label>
                  <Select value={currency} onValueChange={setCurrency} required>
                    <SelectTrigger>
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EUR">€ Euro</SelectItem>
                      <SelectItem value="USD">$ Dollar US</SelectItem>
                      <SelectItem value="GBP">£ Livre Sterling</SelectItem>
                      <SelectItem value="CHF">CHF Franc Suisse</SelectItem>
                      <SelectItem value="CAD">CAD Dollar Canadien</SelectItem>
                      <SelectItem value="XOF">CFA Franc CFA</SelectItem>
                      <SelectItem value="MAD">MAD Dirham Marocain</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Proof & Description */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                <FileText className="h-5 w-5 text-primary" />
                Documents et remarques
              </CardTitle>
              <CardDescription>Ajoutez votre preuve d'achat et des informations complémentaires</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div className="space-y-2">
                <Label>Preuve d'achat de billet</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    ticketProof ? 'border-green-500 bg-green-50' : 'border-border hover:border-primary hover:bg-muted/50'
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {ticketProof ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 mx-auto bg-green-100 rounded-full flex items-center justify-center">
                        <Upload className="h-6 w-6 text-green-600" />
                      </div>
                      <p className="text-sm font-medium text-green-700">{ticketProof.name}</p>
                      <p className="text-xs text-green-600">Cliquez pour changer</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Cliquez ou glissez pour télécharger
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Image ou PDF (max 5 Mo)
                      </p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Téléchargez une copie de votre billet d'avion, de train, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Remarques</Label>
                <Textarea
                  id="description"
                  name="description"
                  placeholder="Ex: Trajet régulier, véhicule spacieux, possibilité de récupération en gare, types de colis acceptés..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sticky bottom-16 sm:bottom-0 bg-background/95 backdrop-blur-sm p-4 sm:p-0 -mx-3 sm:mx-0 border-t sm:border-t-0 border-border/50">
            <Button type="button" variant="outline" onClick={() => navigate('/dashboard')} className="flex-1 h-11 sm:h-10">
              Annuler
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || uploadingTicket || !transportType || !departureCountry || !arrivalCountry} 
              className="flex-1 h-11 sm:h-10"
            >
              {isLoading || uploadingTicket ? "Publication..." : "Publier le trajet"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
