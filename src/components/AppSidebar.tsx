import { useState } from "react"
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
  LogOut
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

export function AppSidebar() {
  const { state } = useSidebar()
  const { user, profile, hasRole } = useAuth()
  const collapsed = state === "collapsed"

  const senderItems = [
    { title: "Tableau de bord", url: "/dashboard", icon: Home },
    { title: "Mes colis", url: "/my-shipments", icon: Package2 },
    { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
    { title: "Rechercher trajets", url: "/search-trips", icon: Search },
    { title: "Mes demandes", url: "/reservations", icon: BarChart3 },
    { title: "Suivi", url: "/tracking", icon: MapPin },
    { title: "Messages", url: "/messages", icon: MessageCircle },
    { title: "Profil", url: "/profile", icon: User },
  ]

  const travelerItems = [
    { title: "Tableau de bord", url: "/dashboard", icon: Home },
    { title: "Mes trajets", url: "/my-trips", icon: Truck },
    { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
    { title: "Rechercher colis", url: "/search-shipments", icon: Search },
    { title: "Demandes reçues", url: "/reservations", icon: BarChart3 },
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
      { title: "Rechercher", url: "/search-trips", icon: Search },
      { title: "Réservations", url: "/reservations", icon: BarChart3 },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle },
      { title: "Profil", url: "/profile", icon: User },
    ]
  }

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive 
      ? "bg-primary/10 text-primary border-r-2 border-r-primary font-medium" 
      : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"}>
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-secondary shrink-0">
            <Package2 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                KoliGo
              </h2>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase text-muted-foreground px-2">
            {!collapsed && "Navigation"}
          </SidebarGroupLabel>
          
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {getMenuItems().map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="h-10">
                    <NavLink 
                      to={item.url} 
                      end 
                      className={getNavCls}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="ml-3">{item.title}</span>}
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

      <SidebarFooter className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {profile?.first_name || 'Utilisateur'}
              </p>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-xs h-5">
                  ★ {profile?.rating?.toFixed(1) || '0.0'}
                </Badge>
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full text-xs"
            onClick={() => {
              supabase.auth.signOut();
              window.location.href = '/';
            }}
          >
            <LogOut className="h-3 w-3 mr-2" />
            Déconnexion
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  )
}