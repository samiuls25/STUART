import React from "react";
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../lib/AuthContext";
import Explore from "../pages/Explore";
import MapPage from "../pages/MapPage";
import Hangouts from "../pages/Hangouts";
import Friends from "../pages/Friends";
import Saved from "../pages/Saved";
import Profile from "../pages/Profile";
import Settings from "../pages/Settings";
import NotFound from "../pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Explore />} />
            <Route path="/map" element={<MapPage />} />
            <Route path="/hangouts" element={<Hangouts />} />
            <Route path="/friends" element={<Friends />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            {/* Redirect old groups routes */}
            <Route path="/groups" element={<Navigate to="/hangouts" replace />} />
            <Route path="/groups/:id" element={<Navigate to="/hangouts" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
