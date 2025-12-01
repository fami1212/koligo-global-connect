import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Plane, MapPin, ArrowRight } from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

// Liste complète des pays du monde
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

// Pays populaires à mettre en avant
const POPULAR_COUNTRIES = [
  "France", "Belgique", "Luxembourg", "Allemagne", "Espagne", "Italie", 
  "Royaume-Uni", "États-Unis", "Canada", "Sénégal", "Côte d'Ivoire", "Maroc"
];

const HomeTripSearch = () => {
  const navigate = useNavigate();
  const [departureCountry, setDepartureCountry] = useState("");
  const [arrivalCountry, setArrivalCountry] = useState("");
  const [departureFilter, setDepartureFilter] = useState("");
  const [arrivalFilter, setArrivalFilter] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (departureCountry) params.set("from", departureCountry);
    if (arrivalCountry) params.set("to", arrivalCountry);
    navigate(`/search-trips?${params.toString()}`);
  };

  const filteredDepartureCountries = COUNTRIES.filter(country => 
    country.toLowerCase().includes(departureFilter.toLowerCase())
  );

  const filteredArrivalCountries = COUNTRIES.filter(country => 
    country.toLowerCase().includes(arrivalFilter.toLowerCase())
  );

  return (
    <section className="py-16 px-4 bg-gradient-to-b from-background to-muted/30">
      <div className="container mx-auto">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary mb-4">
            <Search className="h-4 w-4" />
            Rechercher un trajet
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trouvez un <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">GP</span> pour votre colis
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Sélectionnez votre pays de départ et d'arrivée pour voir les trajets disponibles
          </p>
        </div>

        <Card className="max-w-4xl mx-auto border-none shadow-xl bg-background/80 backdrop-blur-sm">
          <CardContent className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {/* Pays de départ */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Plane className="h-4 w-4 text-primary" />
                  Pays de départ
                </label>
                <Select value={departureCountry} onValueChange={setDepartureCountry}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <div className="p-2 sticky top-0 bg-background">
                      <Input
                        placeholder="Rechercher un pays..."
                        value={departureFilter}
                        onChange={(e) => setDepartureFilter(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    {departureFilter === "" && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Pays populaires
                        </div>
                        {POPULAR_COUNTRIES.map((country) => (
                          <SelectItem key={`pop-dep-${country}`} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2">
                          Tous les pays
                        </div>
                      </>
                    )}
                    
                    {filteredDepartureCountries.map((country) => (
                      <SelectItem key={`dep-${country}`} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Pays d'arrivée */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-secondary" />
                  Pays d'arrivée
                </label>
                <Select value={arrivalCountry} onValueChange={setArrivalCountry}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue placeholder="Sélectionner un pays" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <div className="p-2 sticky top-0 bg-background">
                      <Input
                        placeholder="Rechercher un pays..."
                        value={arrivalFilter}
                        onChange={(e) => setArrivalFilter(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    
                    {arrivalFilter === "" && (
                      <>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          Pays populaires
                        </div>
                        {POPULAR_COUNTRIES.map((country) => (
                          <SelectItem key={`pop-arr-${country}`} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-t mt-2 pt-2">
                          Tous les pays
                        </div>
                      </>
                    )}
                    
                    {filteredArrivalCountries.map((country) => (
                      <SelectItem key={`arr-${country}`} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleSearch}
              size="lg"
              className="w-full mt-6 h-14 text-lg bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Search className="h-5 w-5 mr-2" />
              Rechercher des trajets
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>

            {/* Quick links */}
            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center mb-3">Trajets populaires</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { from: "France", to: "Sénégal" },
                  { from: "France", to: "Côte d'Ivoire" },
                  { from: "Belgique", to: "Maroc" },
                  { from: "États-Unis", to: "France" },
                ].map((route, idx) => (
                  <Button
                    key={idx}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setDepartureCountry(route.from);
                      setArrivalCountry(route.to);
                    }}
                  >
                    {route.from} → {route.to}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default HomeTripSearch;
