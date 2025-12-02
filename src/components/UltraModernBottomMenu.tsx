import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import {
  Home,
  Search,
  Truck,
  MessageCircle,
  User,
  Shield,
  LogOut,
  Menu,
  Star,
  Bell,
  MapPin,
  Sparkles
} from "lucide-react"

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
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
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => loadNotificationCount()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [user])

  const loadNotificationCount = async () => {
    if (!user) return
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)
    setNotificationCount(count || 0)
  }

  // Simplified navigation - only 5 main items
  const mainNavItems: NavItem[] = [
    { title: "Accueil", url: "/dashboard", icon: Home },
    { title: "Rechercher", url: "/search-trips", icon: Search },
    { title: "Réservations", url: "/reservations", icon: Sparkles },
    { title: "Messages", url: "/messages", icon: MessageCircle, badge: unreadCount },
  ]

  const menuItems: NavItem[] = [
    { title: "Suivi", url: "/tracking", icon: MapPin },
    { title: "Notifications", url: "/notifications", icon: Bell, badge: notificationCount },
    { title: "Profil", url: "/profile", icon: User },
  ]

  if (hasRole('traveler')) {
    menuItems.unshift({ title: "Mes trajets", url: "/my-trips", icon: Truck })
  }

  if (hasRole('admin')) {
    menuItems.push({ title: "Admin", url: "/admin", icon: Shield })
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40 md:hidden">
        <div className="flex items-center justify-around h-16 px-2 max-w-screen-lg mx-auto">
          {mainNavItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-0.5 p-2 rounded-lg transition-all min-w-[56px] relative",
                  isActive ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{item.title}</span>
              {item.badge && item.badge > 0 && (
                <span className="absolute top-1 right-2 w-2 h-2 bg-destructive rounded-full" />
              )}
            </NavLink>
          ))}

          {/* Menu Button */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" className="flex flex-col items-center gap-0.5 p-2 min-w-[56px]">
                <div className="relative">
                  <Menu className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </div>
                <span className="text-[10px] font-medium">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl p-0">
              <div className="p-4">
                {/* Handle */}
                <div className="flex justify-center mb-4">
                  <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl mb-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={(profile as any)?.avatar_url} />
                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                      {profile?.first_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{profile?.first_name || 'Utilisateur'}</span>
                      {(profile as any)?.is_verified && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">Vérifié</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3 w-3 fill-warning text-warning" />
                      {profile?.rating?.toFixed(1) || '0.0'}
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {menuItems.map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      onClick={() => setIsOpen(false)}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors relative"
                    >
                      <item.icon className="h-6 w-6 text-primary" />
                      <span className="text-xs font-medium">{item.title}</span>
                      {item.badge && item.badge > 0 && (
                        <Badge variant="destructive" className="absolute top-1 right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                          {item.badge > 9 ? '9+' : item.badge}
                        </Badge>
                      )}
                    </NavLink>
                  ))}
                </div>

                {/* Logout */}
                <Button
                  variant="outline"
                  className="w-full justify-center gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => { setIsOpen(false); signOut() }}
                >
                  <LogOut className="h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
      <div className="h-16 md:hidden" />
    </>
  )
}
