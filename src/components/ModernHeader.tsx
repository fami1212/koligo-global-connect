import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const ModernHeader = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

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

  const handleLogin = () => {
    navigate('/auth');
  };

  const handleStart = () => {
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg">
            <span className="text-primary-foreground font-bold text-lg">GP</span>
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            GP Connect
          </h1>
        </div>

        <nav className="hidden lg:flex items-center gap-6">
          <a href="#how-it-works" className="text-foreground/80 hover:text-foreground transition-colors">
            Comment ça marche
          </a>
          <a href="#advantages" className="text-foreground/80 hover:text-foreground transition-colors">
            Avantages
          </a>
          <a href="#trips" className="text-foreground/80 hover:text-foreground transition-colors">
            Trajets
          </a>
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <select className="bg-transparent text-sm border-none outline-none cursor-pointer">
              <option value="fr">FR</option>
              <option value="en">EN</option>
              <option value="es">ES</option>
            </select>
          </div>
        </nav>

        <div className="flex items-center gap-3">
          {!user && (
            <Button variant="outline" size="sm" className="hidden md:inline-flex" onClick={handleLogin}>
              Se connecter
            </Button>
          )}
          <Button variant="hero" size="sm" onClick={handleStart}>
            {user ? 'Tableau de bord' : 'Commencer'}
          </Button>
        </div>
      </div>
    </header>
  );
};

export default ModernHeader;