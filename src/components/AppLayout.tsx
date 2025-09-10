import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { UltraModernSidebar } from "@/components/UltraModernSidebar"
import { MobileBottomNav } from "@/components/MobileBottomNav"
import { useAuth } from "@/contexts/AuthContext"
import { Navigate } from "react-router-dom"
import { Loader2, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { user, isLoading } = useAuth()

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
        <div className="flex-1 flex flex-col min-w-0">
          {/* Desktop Header with Sidebar Toggle */}
          <header className="hidden md:flex h-16 items-center border-b border-border/40 px-6 bg-gradient-to-r from-background to-muted/20 backdrop-blur-md sticky top-0 z-40">
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

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </SidebarProvider>
  )
}