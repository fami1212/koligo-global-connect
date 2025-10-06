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
      ? "bg-gradient-to-r from-blue-500/20 via-green-400/20 to-orange-400/20 text-blue-600 font-semibold shadow-md scale-[1.02]"
      : "hover:bg-white/20 hover:backdrop-blur-lg text-muted-foreground hover:text-foreground transition-all duration-300"

  return (
    <Sidebar
      className={`${collapsed ? "w-16" : "w-72"} hidden md:flex transition-all duration-500 border-r border-border/20 bg-gradient-to-b from-blue-50/40 via-white/50 to-green-50/40 backdrop-blur-xl shadow-lg`}
      collapsible="icon"
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-border/30 p-4 bg-gradient-to-r from-blue-100/60 via-green-100/60 to-orange-100/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={Logo} alt="GP Connect" className="h-9 w-auto object-contain drop-shadow-md" />
          {!collapsed && (
            <h2 className="text-lg font-bold bg-gradient-to-r from-blue-600 via-green-600 to-orange-600 bg-clip-text text-transparent">
              GP Connect
            </h2>
          )}
        </div>
      </SidebarHeader>

      {/* MENU */}
      <SidebarContent className="px-3 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-2">
              {getNavItems().map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-11 rounded-xl">
                     <NavLink to={item.url} end className={getNavCls}>
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <div className={`p-2 rounded-lg transition-colors ${
                              isActive 
                                ? "bg-gradient-to-br from-blue-500 to-green-500 text-white shadow-md" 
                                : "bg-gradient-to-br from-blue-200 to-green-200 text-blue-700"
                            }`}>
                              <item.icon className="h-5 w-5 shrink-0" />
                            </div>
                            {!collapsed && <span>{item.title}</span>}
                          </div>
                          {item.badge && item.badge > 0 && (
                            <span
                              className="ml-2 inline-block w-2 h-2 rounded-full bg-destructive animate-pulse"
                              aria-label="Nouveaux messages"
                            />
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
      <SidebarFooter className="border-t border-border/30 p-4 bg-white/40 backdrop-blur-lg">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11 ring-2 ring-blue-200 shadow-md">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-green-500 text-white font-bold">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold">{profile?.first_name || "Utilisateur"}</p>
                {(profile as any)?.is_verified && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300">
                    <svg className="w-3 h-3 text-green-700" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="text-xs text-green-700 font-semibold">Vérifié</span>
                  </div>
                )}
              </div>
              <Badge
                variant="secondary"
                className="bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200 mt-1"
              >
                <Star className="h-3 w-3 mr-1" />
                {profile?.rating?.toFixed(1) || "0.0"}
              </Badge>
            </div>
          )}
        </div>

        {!collapsed && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-3 text-xs text-muted-foreground hover:text-red-600 justify-start rounded-lg hover:bg-red-50"
            onClick={() => {
              signOut();
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
