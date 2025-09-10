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
import Dashboard from "./pages/Dashboard";
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
                      <Dashboard />
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