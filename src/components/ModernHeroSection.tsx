import { Button } from "@/components/ui/button";
import { Send, Users, MapPin, Clock, Package, Star } from "lucide-react";
import heroImage from "@/assets/hero-image.jpg";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

const ModernHeroSection = () => {
  const { t } = useTranslation();
  const [deliveredPackages, setDeliveredPackages] = useState(0);
  const [countriesCovered, setCountriesCovered] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

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
    setTimeout(() => animateCounter(15000, setDeliveredPackages), 300);
    setTimeout(() => animateCounter(75, setCountriesCovered), 600);
    setTimeout(() => animateCounter(4.8, (val) => setAverageRating(Number(val.toFixed(1)))), 900);
  }, []);

  const handleSendPackage = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/sender/create-shipment');
    }
  };

  const handleBecomeTransporter = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/traveler/create-trip');
    }
  };

  return (
    <section className="pt-24 pb-16 px-4 bg-gradient-to-br from-background via-background to-accent/5 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-48 h-48 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="container mx-auto relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8 animate-fade-in">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary">
                <Package className="h-4 w-4" />
                {t('hero.badge')}
              </div>

              <h1 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  {t('hero.title')}
                </span>
                <br />
                <span className="text-foreground">{t('hero.subtitle')}</span>
              </h1>
              
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                {t('hero.description')}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                variant="hero" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleSendPackage}
              >
                <Send className="h-5 w-5" />
                {t('hero.sendPackage')}
              </Button>
              <Button 
                variant="secondary" 
                size="lg" 
                className="text-lg px-8 py-6 h-auto shadow-md hover:shadow-lg transition-all duration-300"
                onClick={handleBecomeTransporter}
              >
                <Users className="h-5 w-5" />
                {t('hero.becomeCarrier')}
              </Button>
            </div>

            {/* Stats with animated counters */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center group cursor-pointer">
                <div className="text-3xl font-bold text-primary group-hover:scale-110 transition-transform duration-300">
                  {deliveredPackages.toLocaleString()}+
                </div>
                <div className="text-sm text-muted-foreground font-medium">{t('hero.packagesDelivered')}</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="text-3xl font-bold text-secondary group-hover:scale-110 transition-transform duration-300">
                  {countriesCovered}+
                </div>
                <div className="text-sm text-muted-foreground font-medium">{t('hero.countriesCovered')}</div>
              </div>
              <div className="text-center group cursor-pointer">
                <div className="flex items-center justify-center gap-1 text-3xl font-bold text-accent group-hover:scale-110 transition-transform duration-300">
                  <Star className="h-6 w-6 fill-current" />
                  {averageRating}
                </div>
                <div className="text-sm text-muted-foreground font-medium">{t('hero.averageRating')}</div>
              </div>
            </div>
          </div>

          {/* Right Image */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src={heroImage} 
                alt="GP Connect - Livraison collaborative mondiale" 
                className="w-full h-auto animate-scale-in"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 via-transparent to-transparent" />
            </div>
            
            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 bg-background/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl animate-float border border-border/20">
              <MapPin className="h-8 w-8 text-primary" />
              <div className="text-xs font-medium mt-1">{t('hero.realTimeTracking')}</div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-background/90 backdrop-blur-sm rounded-2xl p-4 shadow-xl animate-float border border-border/20" style={{ animationDelay: '2s' }}>
              <Clock className="h-8 w-8 text-accent" />
              <div className="text-xs font-medium mt-1">{t('hero.fastDelivery')}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ModernHeroSection;