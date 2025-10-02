import { useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  Home,
  Package2,
  Plus,
  Search,
  Truck,
  Sparkles,
  MapPin,
  MessageCircle,
  User,
  Shield,
  Settings,
  LogOut,
  Menu,
  ChevronUp,
  Star
} from "lucide-react"

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
  roles?: string[];
}

export function UltraModernBottomMenu({ unreadCount }: { unreadCount: number }) {
  const { user, profile, hasRole } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const { signOut } = useAuth();
  const getAllNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
    ]

    // Sender items
    if (hasRole('sender')) {
      items.push(
        { title: "Mes colis", url: "/my-shipments", icon: Package2 },
        { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
        { title: "Rechercher trajets", url: "/search-trips", icon: Search },
      )
    }

    // Traveler items
    if (hasRole('traveler')) {
      items.push(
        { title: "Mes trajets", url: "/my-trips", icon: Truck },
        { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
      )
    }

    // Common items
    items.push(
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle, badge: unreadCount },
      { title: "Profil", url: "/profile", icon: User },
    )

    // Admin items
    if (hasRole('admin')) {
      items.push({ title: "Administration", url: "/admin", icon: Shield })
    }

    return items
  }

  const primaryItems = getAllNavItems().slice(0, 4)
  const secondaryItems = getAllNavItems().slice(4)

  return (
    <>
      {/* Primary Bottom Navigation - Now for both mobile and desktop */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40">
        <div className="flex items-center justify-around h-16 px-2">
          {primaryItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 relative",
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-xs font-medium truncate">{item.title.split(' ')[0]}</span>
              {item.title === 'Messages' && item.badge && item.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </NavLink>
          ))}

          {/* More Menu */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg min-w-0 flex-1 hover:bg-muted/50"
              >
                <div className="relative">
                  <ChevronUp className="h-5 w-5 shrink-0" />
                  {secondaryItems.some(item => item.badge && item.badge > 0) && (
                    <div className="absolute -top-2 -right-2 w-2 h-2 bg-destructive rounded-full animate-pulse"></div>
                  )}
                </div>
                <span className="text-xs font-medium">Plus</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl p-0">
              <div className="p-6 space-y-6">
                {/* Handle */}
                <div className="w-12 h-1 bg-muted-foreground/30 rounded-full mx-auto -mt-3"></div>

                {/* Header */}
                <div className="text-center">
                  <h3 className="text-xl font-bold">Menu complet</h3>
                  <p className="text-muted-foreground">Accédez à toutes vos fonctionnalités</p>
                </div>

                {/* User Profile */}
                <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl">
                  <Avatar className="h-16 w-16 ring-2 ring-primary/20">
                    <AvatarImage src={(profile as any)?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground font-bold text-lg">
                      {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-lg">
                        {profile?.first_name || 'Utilisateur'}
                      </h4>
                      {(profile as any)?.is_verified && (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200">
                        <Star className="h-3 w-3 mr-1" />
                        {profile?.rating?.toFixed(1) || '0.0'}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Navigation Grid */}
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    {secondaryItems.map((item) => (
                      <NavLink
                        key={item.title}
                        to={item.url}
                        onClick={() => setIsOpen(false)}
                        className="group flex items-center gap-4 p-4 rounded-2xl hover:bg-muted/70 transition-all duration-200 border border-border/20 shadow-sm hover:shadow-md"
                      >
                        <div className="p-3 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                          <item.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <span className="font-medium text-sm">{item.title}</span>
                          {item.title === 'Messages' && item.badge && item.badge > 0 && (
                            <span className="ml-2 inline-block w-2 h-2 rounded-full bg-destructive align-middle" />
                          )}
                        </div>
                      </NavLink>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Quick Actions */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Actions rapides</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => setIsOpen(false)}
                    >
                      <Settings className="h-5 w-5" />
                      Paramètres
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                      onClick={() => {
                        setIsOpen(false);
                        signOut(); // Ajouter l'appel à signOut
                      }}
                    >
                      <LogOut className="h-5 w-5" />
                      Déconnexion
                    </Button>
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Spacer for bottom navigation */}
      <div className="h-16" />
    </>
  )
}