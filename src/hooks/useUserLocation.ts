import { useCallback, useEffect, useState } from "react";

export interface UserLocation {
  lat: number;
  lon: number;
}

interface UseUserLocationResult {
  location: UserLocation | null;
  /** True when `location` is the NYC fallback rather than a real reading. */
  usingFallback: boolean;
  /** Re-trigger a geolocation prompt; on failure we keep the fallback. */
  requestLocation: () => void;
  /** True when a permission request is currently in-flight. */
  pending: boolean;
}

const NYC_FALLBACK: UserLocation = { lat: 40.7128, lon: -74.006 };

/**
 * Centralized geolocation flow. On mount, asks the browser once for the
 * user's current position; if denied or unavailable, falls back to NYC and
 * flips `usingFallback` so the UI can show a banner.
 */
export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [pending, setPending] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocation(NYC_FALLBACK);
      setUsingFallback(true);
      return;
    }

    setPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setUsingFallback(false);
        setPending(false);
      },
      () => {
        setLocation(NYC_FALLBACK);
        setUsingFallback(true);
        setPending(false);
      },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60_000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return { location, usingFallback, requestLocation, pending };
}
