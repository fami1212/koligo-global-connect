import { useState, useEffect } from "react"
import {
  Package2, Search, Truck, MessageCircle, User, MapPin, Plus,
  Shield, Home, LogOut, Sparkles, Star, Bell, AlertCircle, HelpCircle, Camera
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
}

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, profile, hasRole, signOut } = useAuth()
  const collapsed = state === "collapsed"
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (user) {
      loadUnreadMessages()
      const channel = supabase
        .channel("messages-channel")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () =>
          loadUnreadMessages()
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
        .from("conversations")
        .select("id")
        .or(`sender_id.eq.${user.id},traveler_id.eq.${user.id}`)

      if (!conversations) return
      const conversationIds = conversations.map(c => c.id)

      const { data: unreadMessages } = await supabase
        .from("messages")
        .select("id")
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .is("read_at", null)

      setUnreadCount(unreadMessages?.length || 0)
    } catch (error) {
      console.error("Error loading unread messages:", error)
    }
  }

  const getNavItems = (): NavItem[] => {
    const items: NavItem[] = [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
    ]

    if (hasRole("sender")) {
      items.push(
        { title: "Mes colis", url: "/my-shipments", icon: Package2 },
        { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
        { title: "Rechercher trajets", url: "/search-trips", icon: Search },
      )
    }

    if (hasRole("traveler")) {
      items.push(
        { title: "Mes trajets", url: "/my-trips", icon: Truck },
        { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
      )
    }

    items.push(
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle, badge: unreadCount },
      { title: "Notifications", url: "/notifications", icon: Bell },
      { title: "Avis", url: "/reviews", icon: Star },
      { title: "Litiges", url: "/disputes", icon: AlertCircle },
      { title: "Support", url: "/support", icon: HelpCircle },
      { title: "Profil", url: "/profile", icon: User },
    )

    if (hasRole("traveler")) {
      items.push({ title: "Preuve livraison", url: "/proof-of-delivery", icon: Camera })
    }

    if (hasRole("admin")) {
      items.push(
        { title: "Administration", url: "/admin", icon: Shield },
        { title: "KYC Admin", url: "/admin/kyc", icon: Shield }
      )
    }

    return items
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "relative bg-gradient-to-r from-primary/10 via-secondary/5 to-transparent text-sidebar-primary font-semibold shadow-lg border-l-4 border-primary before:absolute before:inset-0 before:bg-gradient-to-r before:from-primary/5 before:to-transparent before:rounded-r-lg"
      : "text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-primary hover:shadow-md transition-all duration-300 hover:translate-x-1"

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-72"} hidden md:flex transition-all duration-300 border-r border-sidebar-border bg-sidebar shadow-xl`}
      collapsible="icon"
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-sidebar-border p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 opacity-50" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.15),transparent_50%)]" />
        
        <div className="relative flex items-center gap-3">
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary via-secondary to-accent opacity-30 blur-xl rounded-full transition-all duration-500 group-hover:opacity-50 group-hover:blur-2xl" />
            <img 
              src={Logo} 
              alt="GP Connect" 
              className="relative h-12 w-auto object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-110" 
            />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <h2 className="text-xl font-extrabold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in tracking-tight">
                GP Connect
              </h2>
              <p className="text-xs text-muted-foreground font-medium">Livraison collaborative</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="px-3 py-4 overflow-y-auto no-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getNavItems().map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 rounded-xl group overflow-hidden">
                     <NavLink to={item.url} end className={getNavCls}>
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-4 flex-1 relative z-10">
                            <div className={`relative p-3 rounded-xl transition-all duration-300 ${
                              isActive 
                                ? "bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground shadow-xl scale-110" 
                                : "bg-sidebar-accent/50 text-sidebar-foreground group-hover:scale-110 group-hover:bg-gradient-to-br group-hover:from-primary/20 group-hover:to-secondary/20 group-hover:shadow-lg"
                            }`}>
                              {isActive && (
                                <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary opacity-20 blur-md rounded-xl" />
                              )}
                              <item.icon className={`h-5 w-5 shrink-0 relative z-10 transition-transform duration-300 ${isActive ? 'animate-pulse' : ''}`} />
                            </div>
                            {!collapsed && (
                              <span className={`font-semibold transition-all duration-300 ${isActive ? 'text-transparent bg-gradient-to-r from-primary to-secondary bg-clip-text' : ''}`}>
                                {item.title}
                              </span>
                            )}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <div className="flex items-center relative z-10">
                              <div className="relative">
                                <div className="absolute inset-0 bg-destructive/30 blur-lg rounded-full animate-pulse" />
                                <span className="relative ml-2 px-2.5 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground shadow-lg ring-2 ring-destructive/20">
                                  {item.badge}
                                </span>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="border-t border-sidebar-border p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-secondary/5 to-transparent" />
        
        {/* Theme Toggle */}
        {!collapsed && (
          <div className="relative mb-4 flex justify-center">
            <ThemeToggle />
          </div>
        )}
        
        <div className="relative flex items-center gap-4 mb-4">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-br from-primary via-secondary to-accent opacity-30 blur-md rounded-full transition-all duration-300 group-hover:opacity-50 group-hover:blur-lg" />
            <Avatar className="relative h-14 w-14 ring-2 ring-primary/30 shadow-xl transition-all duration-300 hover:ring-primary/50 hover:scale-110 hover:shadow-2xl">
              <AvatarImage src={(profile as any)?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground font-bold text-xl">
                {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-sm font-bold text-sidebar-foreground truncate">
                  {profile?.first_name || "Utilisateur"}
                </p>
                {(profile as any)?.is_verified && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gradient-to-r from-success/20 to-success/10 border border-success/40 shrink-0 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-success drop-shadow-md" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-success font-bold">Vérifié</span>
                  </div>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-warning/20 to-warning/10 text-warning-foreground border-warning/40 hover:from-warning/30 hover:to-warning/20 transition-all duration-300 shadow-sm"
              >
                <Star className="h-3.5 w-3.5 mr-1.5 fill-current drop-shadow-sm" />
                <span className="font-bold">{profile?.rating?.toFixed(1) || "0.0"}</span>
              </Badge>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="relative w-full text-sm text-muted-foreground hover:text-destructive justify-start rounded-xl hover:bg-destructive/15 transition-all duration-300 group overflow-hidden shadow-sm hover:shadow-lg"
            onClick={() => {
              signOut();
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-destructive/0 via-destructive/5 to-destructive/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <LogOut className="relative h-4 w-4 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            <span className="relative font-medium">Déconnexion</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
