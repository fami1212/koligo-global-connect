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
  Shield
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
import { useTranslation } from 'react-i18next'

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<any>;
  badge?: number;
}

export function ModernSidebar() {
  const { user, profile, hasRole } = useAuth()
  const { t } = useTranslation()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

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
      { title: t('sidebar.dashboard'), url: "/dashboard", icon: Home },
    ]

    const senderItems: NavItem[] = [
      { title: t('sidebar.myShipments'), url: "/my-shipments", icon: Package2 },
      { title: t('sidebar.newShipment'), url: "/sender/create-shipment", icon: Plus },
      { title: t('sidebar.searchTrips'), url: "/search-trips", icon: Search },
    ]

    const travelerItems: NavItem[] = [
      { title: t('sidebar.myTrips'), url: "/my-trips", icon: Truck },
      { title: t('sidebar.newTrip'), url: "/traveler/create-trip", icon: Plus },
    ]

    const commonItems: NavItem[] = [
      { title: t('sidebar.reservations'), url: "/reservations", icon: Sparkles },
      { title: t('sidebar.tracking'), url: "/tracking", icon: MapPin },
      { title: t('sidebar.messages'), url: "/messages", icon: MessageCircle, badge: unreadCount },
    ]

    const profileItems: NavItem[] = [
      { title: t('sidebar.profile'), url: "/profile", icon: User },
    ]

    const adminItems: NavItem[] = hasRole('admin') ? [
      { title: t('sidebar.administration'), url: "/admin", icon: Shield },
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

  const NavContent = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-card via-background to-muted/20">
      {/* Header */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary shadow-lg">
              <Package2 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              KoliGo
            </h2>
            <p className="text-xs text-muted-foreground font-medium">{t('sidebar.intelligentTransport')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <nav className="px-4 space-y-1">
          {getNavItems().map((item) => (
            <NavLink
              key={item.url}
              to={item.url}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary/20 to-secondary/20 text-primary shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/70"
                )
              }
            >
              <div className="p-1.5 rounded-lg bg-background/50 shadow-sm">
                <item.icon className="h-4 w-4" />
              </div>
              <span className="flex-1">{item.title}</span>
              {item.badge && item.badge > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* User Profile */}
      <div className="p-6 border-t border-border/40 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 shadow-lg">
            <AvatarImage src={(profile as any)?.avatar_url} />
            <AvatarFallback className="bg-gradient-to-br from-primary via-secondary to-accent text-primary-foreground font-semibold text-sm">
              {profile?.first_name?.charAt(0) || user?.email?.charAt(0)?.toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate">
                {profile?.first_name || 'Utilisateur'}
              </p>
              {(profile as any)?.is_verified && (
                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs">✓</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="secondary" className="text-xs h-5 px-2 bg-gradient-to-r from-yellow-100 to-orange-100 text-yellow-800 border-yellow-200">
                <Star className="h-3 w-3 mr-1" />
                {profile?.rating?.toFixed(1) || '0.0'}
              </Badge>
            </div>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="w-full justify-start text-xs text-muted-foreground hover:text-foreground rounded-lg"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {t('sidebar.logout')}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 lg:z-50 lg:border-r lg:border-border/40">
        <NavContent />
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur-md border border-border/40 rounded-xl shadow-lg"
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
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-0 flex-1 relative",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground"
                )
              }
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="text-xs truncate">{item.title}</span>
              {item.badge && item.badge > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center">
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
                className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg min-w-0 flex-1"
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span className="text-xs">{t('sidebar.more')}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[50vh]">
              <div className="py-4 space-y-2">
                <h3 className="font-semibold mb-4">{t('sidebar.quickActions')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {getNavItems().slice(4).map((item) => (
                    <NavLink
                      key={item.title}
                      to={item.url}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
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
      <div className="lg:hidden h-16" />
    </>
  )
}