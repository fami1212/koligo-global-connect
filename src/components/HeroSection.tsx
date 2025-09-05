import { Button } from "@/components/ui/button";
import { Send, Users, MapPin, Clock } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { useState, useEffect } from "react";

const HeroSection = () => {
  const [deliveredPackages, setDeliveredPackages] = useState(0);
  const [countriesCovered, setCountriesCovered] = useState(0);
  const [averageRating, setAverageRating] = useState(0);

  // Animated counters for stats
  useEffect(() => {
    const animateCounter = (target: number, setter: (value: number) => void, duration: number = 2000) => {
      let start = 0;
      const increment = target / (duration / 16);
      const timer = setInterval(() => {
        start += increment;
        if (start >= target) {
          setter(target);
          clearInterval(timer);
        } else {
          setter(Math.floor(start));
        }
      }, 16);
    };

    // Stagger the animations
    setTimeout(() => animateCounter(10000, setDeliveredPackages), 300);
    setTimeout(() => animateCounter(50, setCountriesCovered), 600);
    setTimeout(() => animateCounter(4.9, (val) => setAverageRating(Number(val.toFixed(1)))), 900);
  }, []);

  return (
    <section className="pt-20 pb-16 px-4 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-slide-up">
            <div className="space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  Livraison collaborative
                </span>
                <br />
                mondiale
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Connectez-vous avec des voyageurs du monde entier pour envoyer vos colis 
                en toute sécurité et économiser jusqu'à 70% sur les frais de livraison.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button variant="hero" size="lg" className="text-lg px-8 py-6 h-auto">
                <Send className="h-5 w-5" />
                Envoyer un colis
              </Button>
              <Button variant="secondary" size="lg" className="text-lg px-8 py-6 h-auto">
                <Users className="h-5 w-5" />
                Devenir transporteur
              </Button>
            </div>

            {/* Stats with animated counters */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center group">
                <div className="text-2xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
                  {deliveredPackages.toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground">Colis livrés</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-secondary group-hover:scale-110 transition-transform duration-300">
                  {countriesCovered}+
                </div>
                <div className="text-sm text-muted-foreground">Pays couverts</div>
              </div>
              <div className="text-center group">
                <div className="text-2xl font-bold text-accent group-hover:scale-110 transition-transform duration-300">
                  {averageRating}/5
                </div>
                <div className="text-sm text-muted-foreground">Note moyenne</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-strong">
              <img 
                src={heroImage} 
                alt="KoliGo - Livraison collaborative mondiale" 
                className="w-full h-auto animate-fade-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent" />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-4 -right-4 bg-background rounded-full p-4 shadow-medium animate-float">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <div className="absolute -bottom-4 -left-4 bg-background rounded-full p-4 shadow-medium animate-float" style={{ animationDelay: '2s' }}>
              <Clock className="h-6 w-6 text-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;