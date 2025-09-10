import { useState, useEffect } from "react"
import { 
  Package2, 
  Search, 
  Truck, 
  MessageCircle, 
  User, 
  MapPin, 
  Plus,
  BarChart3,
  Home,
  Settings,
  LogOut,
  Sparkles
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { VerificationBadge } from "@/components/VerificationBanner"

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, profile, hasRole } = useAuth()
  const collapsed = state === "collapsed"
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasUnread, setHasUnread] = useState(false)

  useEffect(() => {
    if (user) {
      loadUnreadMessages()
      
      // Subscribe to new messages
      const channel = supabase
        .channel('messages-channel')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'messages' },
          () => loadUnreadMessages()
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    }
  }, [user])

  const loadUnreadMessages = async () => {
    if (!user) return
    
    try {
      const { data: conversations } = await supabase
        .from('conversations')
        .select('id')
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)

      if (!conversations) return

      const conversationIds = conversations.map(c => c.id)
      
      const { data: unreadMessages } = await supabase
        .from('messages')
        .select('id')
        .in('conversation_id', conversationIds)
        .neq('sender_id', user.id)
        .is('read_at', null)

      const count = unreadMessages?.length || 0
      setUnreadCount(count)
      setHasUnread(count > 0)
    } catch (error) {
      console.error('Error loading unread messages:', error)
    }
  }

  const senderItems = [
    { title: "Tableau de bord", url: "/dashboard", icon: Home },
    { title: "Mes colis", url: "/my-shipments", icon: Package2 },
    { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
    { title: "Rechercher trajets", url: "/search-trips", icon: Search },
    { title: "Réservations", url: "/reservations", icon: Sparkles },
    { title: "Suivi", url: "/tracking", icon: MapPin },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Profil", url: "/profile", icon: User },
  ]

  const travelerItems = [
    { title: "Tableau de bord", url: "/dashboard", icon: Home },
    { title: "Mes trajets", url: "/my-trips", icon: Truck },
    { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
    { title: "Rechercher colis", url: "/search-shipments", icon: Search },
    { title: "Réservations", url: "/reservations", icon: Sparkles },
    { title: "Suivi", url: "/tracking", icon: MapPin },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Profil", url: "/profile", icon: User },
  ]

  const getMenuItems = () => {
    if (hasRole('sender') && !hasRole('traveler')) return senderItems
    if (hasRole('traveler') && !hasRole('sender')) return travelerItems
    
    // User with both roles or no specific role gets combined menu
    return [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
      { title: "Mes colis", url: "/my-shipments", icon: Package2 },
      { title: "Mes trajets", url: "/my-trips", icon: Truck },
      { title: "Rechercher trajets", url: "/search-trips", icon: Search },
      { title: "Rechercher colis", url: "/search-shipments", icon: Package2 },
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle },
      { title: "Profil", url: "/profile", icon: User },
      { title: "Administration", url: "/admin", icon: Settings },
    ]
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary border-l-4 border-l-primary shadow-lg shadow-primary/10" 
      : "hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all duration-200 hover:shadow-md"

  return (
    <Sidebar className={`${collapsed ? "w-16" : "w-72"} hidden md:flex transition-all duration-300 ease-in-out border-r border-border/40 bg-gradient-to-b from-card via-background to-muted/20`} collapsible="icon">
      <SidebarHeader className="border-b border-border/40 p-6 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary shrink-0 shadow-lg shadow-primary/25">
              <Package2 className="h-7 w-7 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                KoliGo
              </h2>
              <p className="text-xs text-muted-foreground/80 font-medium">Transport intelligent</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 px-3 py-2 font-semibold">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getMenuItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 rounded-xl">
                     <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <div className="p-2 rounded-lg bg-background/50">
                          <item.icon className="h-5 w-5 shrink-0" />
                        </div>
                        {!collapsed && <span className="font-medium">{item.title}</span>}
                      </div>
                      {item.url === '/messages' && hasUnread && (
                        <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {hasRole('sender') && hasRole('traveler') && !collapsed && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-2">
              Actions rapides
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-9">
                    <NavLink to="/sender/create-shipment" className="text-sm">
                      <Plus className="h-4 w-4" />
                      Nouveau colis
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="h-9">
                    <NavLink to="/traveler/create-trip" className="text-sm">
                      <Plus className="h-4 w-4" />
                      Nouveau trajet
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/60 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 shrink-0 ring-4 ring-primary/10 shadow-lg">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="text-sm bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground font-semibold">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {profile?.first_name || 'Utilisateur'}
                </p>
                <VerificationBadge isVerified={(profile as any)?.is_verified || false} />
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs h-6 gap-1 px-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200">
                  <Sparkles className="h-3 w-3" />
                  {profile?.rating?.toFixed(1) || '0.0'}
                </Badge>
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs text-muted-foreground hover:text-foreground justify-start rounded-lg hover:bg-muted/70 transition-all duration-200"
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/';
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Déconnexion
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}