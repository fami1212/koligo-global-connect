import { useState, useEffect } from "react"
import { 
  Package2, 
  Search, 
  Truck, 
  MessageCircle, 
  User, 
  MapPin, 
  Plus,
  Home,
  Settings,
  LogOut,
  Sparkles,
  Menu,
  X,
  Bell,
  Star,
  Shield,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { NavLink } from "react-router-dom"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export function UltraModernSidebar() {
  const { user, profile, hasRole } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

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
    } catch (error) {
      console.error('Error loading unread messages:', error)
    }
  }

  const getNavItems = (): NavItem[] => {
    const baseItems: NavItem[] = [
      { title: "Tableau de bord", url: "/dashboard", icon: Home },
    ]

    const senderItems: NavItem[] = [
      { title: "Mes colis", url: "/my-shipments", icon: Package2 },
      { title: "Nouveau colis", url: "/sender/create-shipment", icon: Plus },
      { title: "Rechercher trajets", url: "/search-trips", icon: Search },
    ]

    const travelerItems: NavItem[] = [
      { title: "Mes trajets", url: "/my-trips", icon: Truck },
      { title: "Nouveau trajet", url: "/traveler/create-trip", icon: Plus },
    ]

    const commonItems: NavItem[] = [
      { title: "Réservations", url: "/reservations", icon: Sparkles },
      { title: "Suivi", url: "/tracking", icon: MapPin },
      { title: "Messages", url: "/messages", icon: MessageCircle, badge: unreadCount },
    ]

    const profileItems: NavItem[] = [
      { title: "Profil", url: "/profile", icon: User },
    ]

    const adminItems: NavItem[] = hasRole('admin') ? [
      { title: "Administration", url: "/admin", icon: Shield },
    ] : []

    let allItems = [...baseItems]

    if (hasRole('sender')) {
      allItems = [...allItems, ...senderItems]
    }

    if (hasRole('traveler')) {
      allItems = [...allItems, ...travelerItems]
    }

    allItems = [...allItems, ...commonItems, ...profileItems, ...adminItems]

    return allItems
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const NavContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full bg-gradient-to-b from-card/50 via-background to-muted/30">
      {/* Header */}
      <div className="p-4 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-secondary shadow-lg">
                <Package2 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
            </div>
            {!collapsed && (
              <div>
                <h2 className="text-lg font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                  KoliGo
                </h2>
                <p className="text-xs text-muted-foreground font-medium">Transport intelligent</p>
              </div>
            )}
          </div>
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(true)}
              className="hidden lg:flex h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="px-2 space-y-1">
          <TooltipProvider>
            {getNavItems().map((item) => (
              <Tooltip key={item.url} delayDuration={collapsed ? 300 : 0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to={item.url}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group relative",
                        collapsed ? "justify-center" : "",
                        isActive
                          ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary shadow-md shadow-primary/10 border border-primary/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/70 hover:shadow-sm"
                      )
                    }
                  >
                    <div className={cn(
                      "p-1 rounded-md bg-background/50 shadow-sm transition-all group-hover:scale-105",
                      collapsed ? "p-1.5" : ""
                    )}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    {!collapsed && <span className="flex-1">{item.title}</span>}
                    {!collapsed && item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                    {collapsed && item.badge && item.badge > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
                        <span className="text-white text-xs font-bold">
                          {item.badge > 9 ? '9+' : item.badge}
                        </span>
                      </div>
                    )}
                  </NavLink>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" className="ml-2">
                    <p>{item.title}</p>
                    {item.badge && item.badge > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {item.badge}
                      </Badge>
                    )}
                  </TooltipContent>
                )}
              </Tooltip>
            ))}
          </TooltipProvider>
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-4 border-t border-border/40 space-y-3">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="h-8 w-8 ring-2 ring-primary/20 shadow-md">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground font-semibold text-xs">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold truncate">
                  {profile?.first_name || 'Utilisateur'}
                </p>
                {(profile as any)?.is_verified && (
                  <div className="w-3 h-3 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs h-4 px-1.5 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200">
                  <Star className="h-2.5 w-2.5 mr-1" />
                  {profile?.rating?.toFixed(1) || '0.0'}
                </Badge>
              </div>
            </div>
          )}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "text-xs text-muted-foreground hover:text-foreground rounded-lg",
            collapsed ? "w-8 h-8 p-0" : "w-full justify-start"
          )}
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Déconnexion</span>}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Collapsed Sidebar Toggle */}
      {isCollapsed && (
        <div className="hidden lg:flex lg:w-16 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:border-border/40">
          <NavContent collapsed />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            className="absolute -right-3 top-4 h-6 w-6 p-0 bg-background border rounded-full shadow-md hover:shadow-lg"
          >
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Full Desktop Sidebar */}
      {!isCollapsed && (
        <div className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:border-border/40">
          <NavContent />
        </div>
      )}

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <NavContent />
        </SheetContent>
      </Sheet>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border/40">
        <div className="flex items-center justify-around h-16 px-2">
          {getNavItems().slice(0, 4).map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-all duration-200 min-w-0 flex-1 relative",
                  isActive 
                    ? "text-primary bg-primary/10 shadow-md" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-xs truncate font-medium">{item.title}</span>
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center animate-pulse">
                  <span className="text-white text-xs font-bold">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
          
          {/* More Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg min-w-0 flex-1 hover:bg-muted/50"
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span className="text-xs font-medium">Plus</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[60vh] rounded-t-2xl">
              <div className="py-4 space-y-4">
                <h3 className="font-semibold text-lg mb-4 text-center">Actions rapides</h3>
                <div className="grid grid-cols-2 gap-3">
                  {getNavItems().slice(4).map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className="flex items-center gap-3 p-4 rounded-xl hover:bg-muted/70 transition-all duration-200 border border-border/20 shadow-sm hover:shadow-md"
                    >
                      <div className="p-2 rounded-full bg-primary/10">
                        <item.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <span className="text-sm font-medium">{item.title}</span>
                        {item.badge && item.badge > 0 && (
                          <Badge variant="destructive" className="ml-2 h-4 w-4 p-0 flex items-center justify-center text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    </NavLink>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Mobile spacer */}
      <div className={cn("lg:hidden h-16", isCollapsed ? "lg:ml-16" : "lg:ml-80")} />
    </>
  )
}