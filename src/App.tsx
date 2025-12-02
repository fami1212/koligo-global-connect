import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import { PageTransition } from "@/components/PageTransition";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ModernDashboard from "./pages/ModernDashboard";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import CreateShipment from "./pages/CreateShipment";
import CreateTrip from "./pages/CreateTrip";
import UltraModernTracking from "./pages/UltraModernTracking";
import AdminDashboard from "./pages/AdminDashboard";
import SearchTrips from "./pages/SearchTrips";
import MyTrips from "./pages/MyTrips";
import Reservations from "./pages/Reservations";
import Reviews from "./pages/Reviews";
import ProofOfDelivery from "./pages/ProofOfDelivery";
import Notifications from "./pages/Notifications";
import Disputes from "./pages/Disputes";
import Support from "./pages/Support";
import Favorites from "./pages/Favorites";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              {/* Protected routes with layout */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <ModernDashboard />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Messages />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Profile />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <UltraModernTracking />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sender/create-shipment"
                element={
                  <ProtectedRoute requiredRole="sender">
                    <AppLayout>
                      <PageTransition>
                        <CreateShipment />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/traveler/create-trip"
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <AppLayout>
                      <PageTransition>
                        <CreateTrip />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AppLayout>
                      <PageTransition>
                        <AdminDashboard />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search-trips"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <SearchTrips />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/favorites"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Favorites />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-trips"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <MyTrips />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Reservations />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Reviews />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proof-of-delivery"
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <AppLayout>
                      <PageTransition>
                        <ProofOfDelivery />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Notifications />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/disputes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Disputes />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <PageTransition>
                        <Support />
                      </PageTransition>
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
