import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateShipment from "./pages/CreateShipment";
import CreateTrip from "./pages/CreateTrip";
import SearchTrips from "./pages/SearchTrips";
import SearchShipments from "./pages/SearchShipments";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Tracking from "./pages/Tracking";
import MyShipments from "./pages/MyShipments";
import MyTrips from "./pages/MyTrips";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/sender/create-shipment" 
                element={
                  <ProtectedRoute requiredRole="sender">
                    <CreateShipment />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/traveler/create-trip" 
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <CreateTrip />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/search-trips" 
                element={
                  <ProtectedRoute requiredRole="sender">
                    <SearchTrips />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/search-shipments" 
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <SearchShipments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/messages" 
                element={
                  <ProtectedRoute>
                    <Messages />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/profile" 
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/tracking" 
                element={
                  <ProtectedRoute>
                    <Tracking />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-shipments" 
                element={
                  <ProtectedRoute requiredRole="sender">
                    <MyShipments />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/my-trips" 
                element={
                  <ProtectedRoute requiredRole="traveler">
                    <MyTrips />
                  </ProtectedRoute>
                } 
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
