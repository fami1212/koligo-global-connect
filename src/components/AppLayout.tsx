import { SidebarProvider } from "@/components/ui/sidebar" // <-- adapte le chemin
import { AppSidebar } from "@/components/AppSidebar"
import { UltraModernBottomMenu } from "@/components/UltraModernBottomMenu"
import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "react-router-dom"
import { Loader2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useState, useEffect } from "react"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth()
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

      const count = unreadMessages?.length || 0
      setUnreadCount(count)
    } catch (error) {
      console.error("Error loading unread messages:", error)
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
        {/* Sidebar (Desktop only) */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-muted/10 to-background">
            <div className="container mx-auto p-4 md:p-8 pb-20 max-w-7xl">
              {children}
            </div>
          </main>

          {/* Bottom menu (Mobile only) */}
          <div className="md:hidden">
            <UltraModernBottomMenu unreadCount={unreadCount} />
          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}
