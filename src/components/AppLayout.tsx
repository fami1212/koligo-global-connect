import { useState, useEffect } from "react"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UltraModernSidebar } from "@/components/UltraModernSidebar"
import { UltraModernBottomMenu } from "@/components/UltraModernBottomMenu"
import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "react-router-dom"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { supabase } from "@/integrations/supabase/client"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Desktop Sidebar */}
        <UltraModernSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 md:ml-0">
          {/* Desktop Header with Sidebar Toggle */}
          <header className="hidden md:flex h-16 items-center border-b border-border/40 px-6 bg-gradient-to-r from-background to-muted/20 backdrop-blur-md sticky top-0 z-30">
            <SidebarTrigger className="mr-4 p-2 hover:bg-muted/60 rounded-lg transition-colors">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            
            <div className="flex-1" />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-muted/10 to-background">
            <div className="container mx-auto p-4 md:p-8 pb-20 md:pb-8 max-w-7xl">
              {children}
            </div>
          </main>
        </div>

        {/* Modern Mobile Bottom Menu */}
        <UltraModernBottomMenu unreadCount={unreadCount} />
      </div>
    </SidebarProvider>
  )
}