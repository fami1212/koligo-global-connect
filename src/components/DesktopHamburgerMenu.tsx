import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Link, useLocation } from 'react-router-dom';
import { 
  Menu, 
  Home,
  Package,
  Truck,
  Search,
  MessageSquare,
  MapPin,
  User,
  LogOut,
  Settings,
  Bell,
  Shield
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export function DesktopHamburgerMenu() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadUserProfile();
      loadUserRoles();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadUserRoles = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      setUserRoles(data?.map(r => r.role) || []);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { icon: Home, label: 'Accueil', path: '/', show: true },
    { icon: Home, label: 'Tableau de bord', path: '/dashboard', show: !!user },
    { icon: Package, label: 'Mes Colis', path: '/my-shipments', show: userRoles.includes('sender') },
    { icon: Package, label: 'Créer un Colis', path: '/sender/create-shipment', show: userRoles.includes('sender') },
    { icon: Search, label: 'Rechercher Trajets', path: '/search-trips', show: userRoles.includes('sender') },
    { icon: Truck, label: 'Mes Trajets', path: '/my-trips', show: userRoles.includes('traveler') },
    { icon: Truck, label: 'Créer un Trajet', path: '/traveler/create-trip', show: userRoles.includes('traveler') },
    { icon: Search, label: 'Rechercher Colis', path: '/search-shipments', show: userRoles.includes('traveler') },
    { icon: MapPin, label: 'Suivi', path: '/tracking', show: !!user },
    { icon: MessageSquare, label: 'Messages', path: '/messages', show: !!user },
    { icon: Bell, label: 'Réservations', path: '/reservations', show: !!user },
    { icon: Shield, label: 'Administration', path: '/admin', show: userRoles.includes('admin') },
    { icon: User, label: 'Profil', path: '/profile', show: !!user },
  ];

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="md:flex hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <ScrollArea className="h-full">
          <div className="p-6 space-y-6">
            {/* User Profile Section */}
            {user && profile && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={profile.avatar_url || ''} />
                    <AvatarFallback>
                      {profile.first_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">
                      {profile.first_name} {profile.last_name}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {profile.email}
                    </p>
                  </div>
                </div>
                
                {/* User Roles */}
                <div className="flex flex-wrap gap-2">
                  {userRoles.includes('sender') && (
                    <Badge variant="secondary">Expéditeur</Badge>
                  )}
                  {userRoles.includes('traveler') && (
                    <Badge variant="secondary">Transporteur</Badge>
                  )}
                  {userRoles.includes('admin') && (
                    <Badge variant="default">Admin</Badge>
                  )}
                  {profile.is_verified && (
                    <Badge className="bg-green-100 text-green-800 border-green-300">
                      ✓ Vérifié
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <Separator />

            {/* Navigation Menu */}
            <nav className="space-y-1">
              {menuItems
                .filter(item => item.show)
                .map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                      isActive(item.path)
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
            </nav>

            <Separator />

            {/* Settings & Logout */}
            {user && (
              <div className="space-y-1">
                <Link
                  to="/profile"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4" />
                  <span>Paramètres</span>
                </Link>
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm hover:bg-destructive/10 text-destructive transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Déconnexion</span>
                </button>
              </div>
            )}

            {!user && (
              <div className="space-y-2">
                <Link to="/auth" onClick={() => setOpen(false)}>
                  <Button className="w-full">
                    Se connecter
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}