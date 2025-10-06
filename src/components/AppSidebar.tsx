import { useState, useEffect } from "react"
import {
  Package2, Search, Truck, MessageCircle, User, MapPin, Plus,
  Shield, Home, LogOut, Sparkles, Star
} from "lucide-react"
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
      { title: "Profil", url: "/profile", icon: User },
    )

    if (hasRole("admin")) {
      items.push({ title: "Administration", url: "/admin", icon: Shield })
    }

    return items
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive
      ? "bg-sidebar-accent text-sidebar-primary font-semibold shadow-sm border-l-4 border-primary"
      : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-primary transition-all duration-200"

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-72"} hidden md:flex transition-all duration-300 border-r border-sidebar-border bg-sidebar shadow-xl`}
      collapsible="icon"
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-sidebar-border p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={Logo} alt="GP Connect" className="h-10 w-auto object-contain drop-shadow-lg" />
            <div className="absolute -inset-1 bg-gradient-to-r from-primary via-secondary to-accent opacity-20 blur-xl rounded-full -z-10" />
          </div>
          {!collapsed && (
            <h2 className="text-lg font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent animate-fade-in">
              GP Connect
            </h2>
          )}
        </div>
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getNavItems().map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-12 rounded-lg group">
                     <NavLink to={item.url} end className={getNavCls}>
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2.5 rounded-lg transition-all duration-200 ${
                              isActive 
                                ? "bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-md scale-110" 
                                : "bg-sidebar-accent text-sidebar-foreground group-hover:scale-105 group-hover:bg-gradient-to-br group-hover:from-primary/10 group-hover:to-secondary/10"
                            }`}>
                              <item.icon className="h-5 w-5 shrink-0" />
                            </div>
                            {!collapsed && (
                              <span className="font-medium transition-all duration-200">{item.title}</span>
                            )}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <div className="flex items-center">
                              <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-full bg-destructive text-destructive-foreground animate-pulse shadow-sm">
                                {item.badge}
                              </span>
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
      <SidebarFooter className="border-t border-sidebar-border p-4 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 backdrop-blur-sm">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12 ring-2 ring-primary/20 shadow-lg transition-all duration-200 hover:ring-primary/40 hover:scale-105">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-lg">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">
                  {profile?.first_name || "Utilisateur"}
                </p>
                {(profile as any)?.is_verified && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success/10 border border-success/30 shrink-0">
                    <svg className="w-3 h-3 text-success" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-success font-medium">Vérifié</span>
                  </div>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-warning/10 text-warning-foreground border-warning/30 hover:bg-warning/20 transition-colors"
              >
                <Star className="h-3 w-3 mr-1 fill-current" />
                <span className="font-semibold">{profile?.rating?.toFixed(1) || "0.0"}</span>
              </Badge>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-sm text-muted-foreground hover:text-destructive justify-start rounded-lg hover:bg-destructive/10 transition-all duration-200 group"
            onClick={() => {
              signOut();
            }}
          >
            <LogOut className="h-4 w-4 mr-2 group-hover:animate-bounce-gentle" />
            Déconnexion
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}
