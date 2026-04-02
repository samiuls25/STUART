import React, { useMemo, useRef } from "react";
import { motion } from "framer-motion";
import { Navigation, ZoomIn, ZoomOut, Layers } from "lucide-react";
import { GoogleMap, useLoadScript } from "@react-google-maps/api";
import type { Event } from "../../data/events";
import MapPin from "./MapPin";

interface MapViewProps {
  events: Event[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onEventSelect: (event: Event) => void;
  onEventHover: (id: string | null) => void;
}

const containerStyle = { width: "100%", height: "100%" };

export default function MapView({
  events,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
}: MapViewProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const mapRef = useRef<google.maps.Map | null>(null);

  const center = useMemo(() => {
    // If you have events, center around first event; otherwise NYC
    if (events.length) return { lat: events[0].latitude, lng: events[0].longitude };
    return { lat: 40.7128, lng: -74.006 };
  }, [events]);

  if (loadError) return <div className="p-4">Google Map failed to load.</div>;
  if (!isLoaded) return <div className="p-4">Loading map…</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full overflow-hidden"
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={(map) => {
  mapRef.current = map;
}}
        options={{
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        }}
      >
        {events.map((event) => (
          <MapPin
            key={event.id}
            event={event}
            isActive={selectedEventId === event.id}
            isHovered={hoveredEventId === event.id}
            onSelect={onEventSelect}
            onHover={onEventHover}
          />
        ))}
      </GoogleMap>

      {/* Your controls (you can wire these up to mapRef) */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) + 1)}
        >
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>
        <button
          className="p-2.5 rounded-lg glass hover:bg-muted transition-colors"
          onClick={() => mapRef.current?.setZoom((mapRef.current.getZoom() ?? 12) - 1)}
        >
          <ZoomOut className="w-5 h-5 text-foreground" />
        </button>
        <div className="h-px bg-border my-1" />
        <button className="p-2.5 rounded-lg glass hover:bg-muted transition-colors">
          <Layers className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* GPS button - later you’ll hook this to navigator.geolocation */}
      <button className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all">
        <Navigation className="w-5 h-5" />
      </button>
    </motion.div>
  );
}