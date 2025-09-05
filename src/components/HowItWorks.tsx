import { Card, CardContent } from "@/components/ui/card";
import { Package, Users, Shield, Truck, Smartphone, CreditCard, Send } from "lucide-react";
import { useState } from "react";

const HowItWorks = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const senderSteps = [
    {
      icon: <Package className="h-8 w-8" />,
      title: "Décrivez votre colis",
      description: "Ajoutez les détails de votre envoi : dimensions, poids, destination"
    },
    {
      icon: <Users className="h-8 w-8" />,
      title: "Trouvez un transporteur",
      description: "Notre algorithme vous met en relation avec des voyageurs sur votre trajet"
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "Payez en sécurité",
      description: "Paiement sécurisé avec notre système d'entiercement"
    },
    {
      icon: <Smartphone className="h-8 w-8" />,
      title: "Suivez en temps réel",
      description: "Tracking GPS et notifications à chaque étape de la livraison"
    }
  ];

  const travelerSteps = [
    {
      icon: <Truck className="h-8 w-8" />,
      title: "Publiez votre trajet",
      description: "Indiquez vos dates de voyage et l'espace disponible"
    },
    {
      icon: <Package className="h-8 w-8" />,
      title: "Acceptez des colis",
      description: "Choisissez les demandes qui correspondent à votre itinéraire"
    },
    {
      icon: <Shield className="h-8 w-8" />,
      title: "Transport sécurisé",
      description: "Tous les colis sont assurés et vérifiés"
    },
    {
      icon: <CreditCard className="h-8 w-8" />,
      title: "Recevez votre paiement",
      description: "Paiement automatique à la livraison confirmée"
    }
  ];

  return (
    <section id="how-it-works" className="py-20 px-4 bg-gradient-subtle">
      <div className="container mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-6">
            Comment fonctionne 
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent"> KoliGo</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Une plateforme simple et sécurisée qui connecte expéditeurs et voyageurs du monde entier
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Pour les expéditeurs */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 bg-primary/10 rounded-full px-6 py-3 mb-6">
                <Send className="h-6 w-6 text-primary" />
                <span className="font-semibold text-primary">Pour les expéditeurs</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {senderSteps.map((step, index) => (
                <Card 
                  key={index} 
                  className="border-none shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer group"
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center text-primary-foreground transition-transform duration-300 ${
                        hoveredCard === index ? 'scale-110 rotate-6' : ''
                      }`}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">{step.title}</h3>
                        <p className="text-muted-foreground group-hover:text-foreground transition-colors">{step.description}</p>
                      </div>
                      <div className={`flex-shrink-0 w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        hoveredCard === index ? 'bg-primary text-primary-foreground scale-110' : ''
                      }`}>
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Pour les voyageurs */}
          <div>
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-3 bg-secondary/10 rounded-full px-6 py-3 mb-6">
                <Users className="h-6 w-6 text-secondary" />
                <span className="font-semibold text-secondary">Pour les voyageurs</span>
              </div>
            </div>
            
            <div className="space-y-6">
              {travelerSteps.map((step, index) => (
                <Card 
                  key={index} 
                  className="border-none shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer group"
                  onMouseEnter={() => setHoveredCard(index + 10)}
                  onMouseLeave={() => setHoveredCard(null)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className={`flex-shrink-0 w-12 h-12 bg-gradient-to-br from-secondary to-secondary-light rounded-xl flex items-center justify-center text-secondary-foreground transition-transform duration-300 ${
                        hoveredCard === index + 10 ? 'scale-110 rotate-6' : ''
                      }`}>
                        {step.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 group-hover:text-secondary transition-colors">{step.title}</h3>
                        <p className="text-muted-foreground group-hover:text-foreground transition-colors">{step.description}</p>
                      </div>
                      <div className={`flex-shrink-0 w-8 h-8 bg-secondary/20 rounded-full flex items-center justify-center transition-all duration-300 ${
                        hoveredCard === index + 10 ? 'bg-secondary text-secondary-foreground scale-110' : ''
                      }`}>
                        <span className="text-sm font-bold">{index + 1}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;