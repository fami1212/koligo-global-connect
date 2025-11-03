import { useState } from "react"
import { 
  Home, 
  Search, 
  Plus, 
  MapPin, 
  User,
  Package2,
  Truck,
  MessageCircle,
  ChevronUp,
  Sparkles,
  Bell,
  Star,
  AlertCircle,
  HelpCircle,
  Camera
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet"

export function MobileBottomNav() {
  const { hasRole } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const mainNavItems = [
    { title: "Accueil", url: "/dashboard", icon: Home },
    { title: "Recherche", url: hasRole('sender') ? "/search-trips" : "/search-shipments", icon: Search },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Profil", url: "/profile", icon: User },
  ]

  const quickActions = [
    ...(hasRole('sender') ? [
      { title: "Mes colis", url: "/my-shipments", icon: Package2 },
      { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
    ] : []),
    ...(hasRole('traveler') ? [
      { title: "Mes trajets", url: "/my-trips", icon: Truck },
      { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
      { title: "Preuve livraison", url: "/proof-of-delivery", icon: Camera },
    ] : []),
    { title: "Réservations", url: "/reservations", icon: Sparkles },
    { title: "Suivi", url: "/tracking", icon: MapPin },
    { title: "Notifications", url: "/notifications", icon: Bell },
    { title: "Avis", url: "/reviews", icon: Star },
    { title: "Litiges", url: "/disputes", icon: AlertCircle },
    { title: "Support", url: "/support", icon: HelpCircle },
  ]

  return (
    <div className="md:hidden">
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-xs truncate">{item.title}</span>
            </NavLink>
          ))}
          
          {/* Menu Sheet Trigger */}
          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg min-w-0 flex-1 h-auto"
              >
                <ChevronUp className="h-5 w-5 shrink-0" />
                <span className="text-xs">Plus</span>
              </Button>
            </SheetTrigger>
            
            <SheetContent side="bottom" className="h-[400px] rounded-t-2xl">
              <SheetHeader className="mb-6">
                <SheetTitle>Actions rapides</SheetTitle>
              </SheetHeader>
              
              <div className="grid grid-cols-2 gap-3">
                {quickActions.map((action) => (
                  <NavLink
                    key={action.title}
                    to={action.url}
                    onClick={() => setIsMenuOpen(false)}
                    className="flex flex-col items-center gap-3 p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div className="p-3 rounded-full bg-primary/10">
                      <action.icon className="h-6 w-6 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-center">{action.title}</span>
                  </NavLink>
                ))}
              </div>
              
              <div className="mt-6 pt-6 border-t border-border">
                <NavLink
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="p-2 rounded-full bg-secondary/20">
                    <User className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="font-medium">Mon profil</p>
                    <p className="text-sm text-muted-foreground">Paramètres et informations</p>
                  </div>
                </NavLink>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      
      {/* Spacer to prevent content from being hidden behind the bottom nav */}
      <div className="h-16" />
    </div>
  )
}