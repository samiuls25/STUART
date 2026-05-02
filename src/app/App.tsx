import React, { Suspense, lazy } from "react";
import { Toaster } from "../components/ui/toaster";
import { Toaster as Sonner } from "../components/ui/sonner";
import { TooltipProvider } from "../components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "../lib/AuthContext";

// Route-level code splitting: each page becomes its own JS chunk that the
// browser only downloads when the user actually visits that route.
const Explore = lazy(() => import("../pages/Explore"));
const MapPage = lazy(() => import("../pages/MapPage"));
const Hangouts = lazy(() => import("../pages/Hangouts"));
const Friends = lazy(() => import("../pages/Friends"));
const Saved = lazy(() => import("../pages/Saved"));
const Profile = lazy(() => import("../pages/Profile"));
const Settings = lazy(() => import("../pages/Settings"));
const Notifications = lazy(() => import("../pages/Notifications"));
const NotFound = lazy(() => import("../pages/NotFound"));

const queryClient = new QueryClient();

const RouteFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3 text-muted-foreground">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      <p className="text-sm">Loading…</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<Explore />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/hangouts" element={<Hangouts />} />
              <Route path="/friends" element={<Friends />} />
              <Route path="/saved" element={<Saved />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/settings" element={<Settings />} />
              {/* Redirect old groups routes */}
              <Route path="/groups" element={<Navigate to="/hangouts" replace />} />
              <Route path="/groups/:id" element={<Navigate to="/hangouts" replace />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
