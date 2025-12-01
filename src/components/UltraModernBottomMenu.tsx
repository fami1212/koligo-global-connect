import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import {
  Home,
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
  ChevronUp,
  Star,
  AlertCircle,
  HelpCircle,
  Heart,
  Bell
} from "lucide-react"

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
  roles?: string[];
}

export function UltraModernBottomMenu({ unreadCount }: { unreadCount: number }) {
  const { user, profile, hasRole, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (!user) return

    loadNotificationCount()

    const channel = supabase
      .channel('notifications-bottom-menu')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => loadNotificationCount()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const loadNotificationCount = async () => {
    if (!user) return

    try {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)

      setNotificationCount(count || 0)
    } catch (error) {
      console.error('Error loading notification count:', error)
    }
  }

  const getAllNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
      { title: "Rechercher", url: "/search-trips", icon: Search },
    ]

    // Traveler items
    if (hasRole('traveler')) {
      items.push(
        { title: "Mes trajets", url: "/my-trips", icon: Truck },
        { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
      )
    }

    // Common items
    items.push(
      { title: "Favoris", url: "/favorites", icon: Heart },
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle, badge: unreadCount },
      { title: "Notifications", url: "/notifications", icon: Bell, badge: notificationCount },
      { title: "Avis", url: "/reviews", icon: Star },
      
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
      {/* Primary Bottom Navigation - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1 max-w-screen-lg mx-auto">
          {primaryItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 p-1.5 rounded-lg transition-all duration-200 min-w-[60px] max-w-[80px] flex-1 relative",
                  isActive
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">{item.title.split(' ')[0]}</span>
              {item.title === 'Messages' && item.badge && item.badge > 0 && (
                <span className="absolute top-0 right-1 w-2 h-2 bg-destructive rounded-full" />
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
              <div className="flex flex-col h-full">
                {/* Handle */}
                <div className="pt-4 pb-2 flex justify-center">
                  <div className="w-12 h-1 bg-muted-foreground/30 rounded-full"></div>
                </div>

                {/* Header - Fixed */}
                <div className="px-6 pb-4 flex-shrink-0">
                  <div className="text-center">
                    <h3 className="text-xl font-bold">Menu complet</h3>
                    <p className="text-muted-foreground">Accédez à toutes vos fonctionnalités</p>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-6 pb-6">
                  {/* User Profile */}
                  <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl mb-6">
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
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200">
                          <Star className="h-3 w-3 mr-1" />
                          {profile?.rating?.toFixed(1) || '0.0'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  {/* Navigation Grid */}
                  <div className="space-y-6 mb-6">
                    <div className="grid grid-cols-2 gap-4">
                      {secondaryItems.map((item) => (
                        <NavLink
                          key={item.title}
                          to={item.url}
                          onClick={() => setIsOpen(false)}
                          className="group flex items-center gap-3 p-3 rounded-xl hover:bg-muted/70 transition-all duration-200 border border-border/20 shadow-sm hover:shadow-md"
                        >
                          <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 group-hover:from-primary/20 group-hover:to-secondary/20 transition-colors">
                            <item.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="font-medium text-sm truncate block">{item.title}</span>
                            {item.badge && item.badge > 0 && (
                              <span className="ml-2 inline-block w-2 h-2 rounded-full bg-destructive align-middle" />
                            )}
                          </div>
                        </NavLink>
                      ))}
                    </div>
                  </div>

                  <Separator className="mb-6" />

                  {/* Quick Actions - Fixed at bottom of scroll area */}
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
                        className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive hover:border-destructive/50"
                        onClick={() => {
                          setIsOpen(false)
                          signOut()
                        }}
                      >
                        <LogOut className="h-5 w-5" />
                        Déconnexion
                      </Button>
                    </div>
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