import { Button } from "@/components/ui/button";
import { Package, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-br from-primary to-secondary text-primary-foreground">
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary-foreground/20">
                <Package className="h-6 w-6" />
              </div>
              <h3 className="text-2xl font-bold">KoliGo</h3>
            </div>
            <p className="text-primary-foreground/80 leading-relaxed">
              La première plateforme mondiale de livraison collaborative. 
              Connectons le monde, un colis à la fois.
            </p>
            <div className="flex gap-4">
              <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/20">
                <Facebook className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/20">
                <Twitter className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/20">
                <Instagram className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hover:bg-primary-foreground/20">
                <Linkedin className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Services</h4>
            <ul className="space-y-3 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Envoyer un colis</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Devenir transporteur</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Suivi de colis</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Assurance</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Support professionnel</a></li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Support</h4>
            <ul className="space-y-3 text-primary-foreground/80">
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Centre d'aide</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Conditions d'utilisation</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-primary-foreground transition-colors">Signaler un problème</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-6">Contact</h4>
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-primary-foreground/80">
                <Mail className="h-5 w-5" />
                <span>contact@koligo.com</span>
              </div>
              <div className="flex items-center gap-3 text-primary-foreground/80">
                <Phone className="h-5 w-5" />
                <span>+33 1 23 45 67 89</span>
              </div>
              <div className="flex items-center gap-3 text-primary-foreground/80">
                <MapPin className="h-5 w-5" />
                <span>Paris, France</span>
              </div>
            </div>
            
            <div className="mt-6">
              <Button variant="secondary" className="w-full">
                Nous contacter
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-primary-foreground/20 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 KoliGo. Tous droits réservés.
          </p>
          <div className="flex gap-6 text-sm text-primary-foreground/60 mt-4 md:mt-0">
            <a href="#" className="hover:text-primary-foreground transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Cookies</a>
            <a href="#" className="hover:text-primary-foreground transition-colors">Plan du site</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;