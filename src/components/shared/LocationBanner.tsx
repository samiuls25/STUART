import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, X, Navigation } from "lucide-react";

interface LocationBannerProps {
  /** True when the user's location is the NYC fallback rather than a real
   *  geolocation reading (granted permission). */
  usingFallback: boolean;
  /** Trigger a fresh geolocation prompt and update the parent's state. */
  onUseRealLocation: () => void;
}

const STORAGE_KEY = "stuart.locationBannerDismissed.v1";

const LocationBanner = ({ usingFallback, onUseRealLocation }: LocationBannerProps) => {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  });

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    }
  };

  const visible = usingFallback && !dismissed;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/30 bg-primary/5 text-sm"
          role="status"
        >
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          <span className="flex-1 text-foreground/90">
            Showing distance from <span className="font-medium">New York City</span>{" "}
            because location access was denied or unavailable.
          </span>
          <button
            onClick={onUseRealLocation}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-colors"
          >
            <Navigation className="w-3 h-3" />
            Use my location
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LocationBanner;
