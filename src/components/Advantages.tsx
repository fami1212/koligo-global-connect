import { Card, CardContent } from "@/components/ui/card";
import { 
  DollarSign, 
  Clock, 
  Shield, 
  Globe, 
  Heart, 
  Zap,
  Users,
  CheckCircle 
} from "lucide-react";

const Advantages = () => {
  const advantages = [
    {
      icon: <DollarSign className="h-8 w-8" />,
      title: "Économisez jusqu'à 70%",
      description: "Des tarifs ultra-compétitifs grâce à l'économie collaborative",
      color: "from-green-500 to-green-600"
    },
    {
      icon: <Clock className="h-8 w-8" />,
      title: "Livraison rapide",
      description: "Profitez des voyages existants pour une livraison plus rapide",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "100% sécurisé",
      description: "Assurance complète, vérification d'identité et paiement sécurisé",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: <Globe className="h-8 w-8" />,
      title: "Couverture mondiale",
      description: "Plus de 50 pays couverts avec notre réseau de transporteurs",
      color: "from-orange-500 to-orange-600"
    },
    {
      icon: <Heart className="h-8 w-8" />,
      title: "Écologique",
      description: "Réduisez l'empreinte carbone en optimisant les trajets existants",
      color: "from-emerald-500 to-emerald-600"
    },
    {
      icon: <Zap className="h-8 w-8" />,
      title: "Simple et rapide",
      description: "Interface intuitive pour publier ou trouver un transporteur en 2 minutes",
      color: "from-yellow-500 to-yellow-600"
    }
  ];

  const testimonials = [
    {
      name: "Marie L.",
      location: "Paris → Dakar",
      text: "J'ai économisé 400€ sur l'envoi de colis familiaux au Sénégal. Service parfait !",
      rating: 5
    },
    {
      name: "Ahmed K.",
      location: "Transporteur",
      text: "Je finance mes voyages en transportant des colis. Revenue supplémentaire appréciable.",
      rating: 5
    },
    {
      name: "Sophie M.",
      location: "Lyon → Casablanca",
      text: "Livraison en 3 jours au lieu de 2 semaines avec La Poste. Formidable !",
      rating: 5
    }
  ];

  return (
    <section id="advantages" className="py-20 px-4">
      <div className="container mx-auto">
        {/* Advantages */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">
            Pourquoi choisir 
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent"> KoliGo</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une solution révolutionnaire qui transforme la façon d'envoyer des colis dans le monde
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {advantages.map((advantage, index) => (
            <Card key={index} className="border-none shadow-soft hover:shadow-medium transition-all duration-300 group">
              <CardContent className="p-8 text-center">
                <div className={`w-16 h-16 bg-gradient-to-br ${advantage.color} rounded-2xl flex items-center justify-center text-white mx-auto mb-6 group-hover:scale-110 transition-transform`}>
                  {advantage.icon}
                </div>
                <h3 className="text-xl font-semibold mb-4">{advantage.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{advantage.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Testimonials */}
        <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl p-12">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold mb-4">Ce que disent nos utilisateurs</h3>
            <p className="text-muted-foreground">Plus de 10 000 personnes nous font confiance</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="border-none shadow-soft">
                <CardContent className="p-6">
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <CheckCircle key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-foreground mb-4 italic">"{testimonial.text}"</p>
                  <div>
                    <div className="font-semibold">{testimonial.name}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Advantages;