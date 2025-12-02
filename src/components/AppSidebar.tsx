import { useState, useEffect } from "react"
import {
  Search, Truck, MessageCircle, User, MapPin,
  Shield, Home, LogOut, Star, Bell, Sparkles
} from "lucide-react"
import { ThemeToggle } from "@/components/ThemeToggle"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import Logo from "@/assets/gp_connect-removebg-preview.png"

interface NavItem {
  title: string
  url: string
  icon: React.ComponentType<any>
  badge?: number
  showBadge?: boolean
}

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, profile, hasRole, signOut } = useAuth()
  const collapsed = state === "collapsed"
  const [notificationCount, setNotificationCount] = useState(0)

  useEffect(() => {
    if (!user) return
    loadNotificationCount()

    const channel = supabase
      .channel('notifications-sidebar')
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

  // Simplified navigation
  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { title: "Accueil", url: "/dashboard", icon: Home },
      { title: "Rechercher", url: "/search-trips", icon: Search },
    ]

    if (hasRole("traveler")) {
      items.push({ title: "Mes trajets", url: "/my-trips", icon: Truck })
    }

    items.push(
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle },
      { title: "Notifications", url: "/notifications", icon: Bell, showBadge: true },
      { title: "Profil", url: "/profile", icon: User }
    )

    if (hasRole("admin")) {
      items.push({ title: "Admin", url: "/admin", icon: Shield })
    }

    return items
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-primary/10 text-primary font-medium"
      : "text-muted-foreground hover:bg-accent hover:text-foreground"

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-64"} hidden md:flex transition-all duration-300 border-r bg-background`}
      collapsible="icon"
    >
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="GP Connect" className="h-10 w-auto object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <h2 className="text-lg font-bold text-foreground">GP Connect</h2>
              <p className="text-xs text-muted-foreground">Livraison collaborative</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2 overflow-y-auto">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getNavItems().map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink to={item.url} end className={getNavCls}>
                      {() => (
                        <div className="flex items-center gap-3 w-full">
                          <item.icon className="h-5 w-5 shrink-0" />
                          {!collapsed && (
                            <>
                              <span className="text-sm font-medium flex-1">{item.title}</span>
                              {item.showBadge && notificationCount > 0 && (
                                <Badge variant="destructive" className="h-5 px-2 text-xs">
                                  {notificationCount > 9 ? '9+' : notificationCount}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        {!collapsed && (
          <div className="mb-3 flex justify-center">
            <ThemeToggle />
          </div>
        )}
        
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold truncate">{profile?.first_name || "Utilisateur"}</p>
                {(profile as any)?.is_verified && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">✓</Badge>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 fill-warning text-warning" />
                <span>{profile?.rating?.toFixed(1) || "0.0"}</span>
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
