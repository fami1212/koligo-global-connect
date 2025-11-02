import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ModernDashboard from "./pages/ModernDashboard";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Tracking from "./pages/Tracking";
import CreateShipment from "./pages/CreateShipment";
import CreateTrip from "./pages/CreateTrip";
import UltraModernTracking from "./pages/UltraModernTracking";
import ModernAdmin from "./pages/ModernAdmin";
import SearchTrips from "./pages/SearchTrips";
import MyShipments from "./pages/MyShipments";
import MyTrips from "./pages/MyTrips";
import Reservations from "./pages/Reservations";
import Reviews from "./pages/Reviews";
import ProofOfDelivery from "./pages/ProofOfDelivery";
import Notifications from "./pages/Notifications";
import AdminKYC from "./pages/AdminKYC";
import Disputes from "./pages/Disputes";
import Support from "./pages/Support";
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
                      <ModernDashboard />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/messages"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Messages />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Profile />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tracking"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <UltraModernTracking />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />

              <Route
                path="/sender/create-shipment"
                element={
                  <ProtectedRoute requiredRole="sender">
                    <AppLayout>
                      <CreateShipment />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/traveler/create-trip"
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <AppLayout>
                      <CreateTrip />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <ModernAdmin />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/search-trips"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <SearchTrips />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-shipments"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MyShipments />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-trips"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <MyTrips />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reservations"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Reservations />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/reviews"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Reviews />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/proof-of-delivery"
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <AppLayout>
                      <ProofOfDelivery />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Notifications />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kyc"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AppLayout>
                      <AdminKYC />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/disputes"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Disputes />
                    </AppLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/support"
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Support />
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