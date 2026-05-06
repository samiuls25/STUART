import React, { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  trackAnalytics,
  trackSessionStartIfNeeded,
  trackThemeSnapshotIfNeeded,
} from "../../lib/analytics";

/** SPA virtual page views + one session_start per browser tab (sessionStorage). */
export function AnalyticsRouteTracker() {
  const location = useLocation();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    trackSessionStartIfNeeded();
    trackThemeSnapshotIfNeeded();
    const path = location.pathname;
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    trackAnalytics("spa_route_view", {
      route: path,
      viewport_w: typeof window !== "undefined" ? window.innerWidth : null,
    });
  }, [location.pathname]);

  return null;
}
