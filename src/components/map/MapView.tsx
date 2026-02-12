import React from "react";
import { motion } from "framer-motion";
import { Navigation, ZoomIn, ZoomOut, Layers } from "lucide-react";
import type { Event } from "../../data/events";
import MapPin from "./MapPin";

interface MapViewProps {
  events: Event[];
  selectedEventId: string | null;
  hoveredEventId: string | null;
  onEventSelect: (event: Event) => void;
  onEventHover: (id: string | null) => void;
}

const MapView = ({
  events,
  selectedEventId,
  hoveredEventId,
  onEventSelect,
  onEventHover,
}: MapViewProps) => {
  // Calculate pin positions based on lat/lng (simplified visualization)
  const getPosition = (lat: number, lng: number) => {
    // NYC bounds approximately: lat 40.5-40.9, lng -74.25 to -73.7
    const minLat = 40.5;
    const maxLat = 40.9;
    const minLng = -74.25;
    const maxLng = -73.7;

    const x = ((lng - minLng) / (maxLng - minLng)) * 100;
    const y = ((maxLat - lat) / (maxLat - minLat)) * 100;

    return { x: Math.max(5, Math.min(95, x)), y: Math.max(5, Math.min(95, y)) };
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-full bg-map-background overflow-hidden"
    >
      {/* Stylized Map Background */}
      <div className="absolute inset-0">
        {/* Water areas */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-map-water opacity-60" />
        <div className="absolute bottom-0 left-0 w-1/2 h-1/4 bg-map-water opacity-40" />
        
        {/* Land patterns */}
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          {/* Grid pattern for streets */}
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path
                d="M 60 0 L 0 0 0 60"
                fill="none"
                stroke="hsl(var(--map-road))"
                strokeWidth="1"
                opacity="0.5"
              />
            </pattern>
            <pattern id="diagonal" width="30" height="30" patternUnits="userSpaceOnUse">
              <path
                d="M 0 30 L 30 0"
                fill="none"
                stroke="hsl(var(--map-road))"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Major roads */}
          <line x1="0" y1="30%" x2="100%" y2="30%" stroke="hsl(var(--map-road))" strokeWidth="3" opacity="0.6" />
          <line x1="0" y1="60%" x2="100%" y2="60%" stroke="hsl(var(--map-road))" strokeWidth="3" opacity="0.6" />
          <line x1="30%" y1="0" x2="30%" y2="100%" stroke="hsl(var(--map-road))" strokeWidth="3" opacity="0.6" />
          <line x1="70%" y1="0" x2="70%" y2="100%" stroke="hsl(var(--map-road))" strokeWidth="3" opacity="0.6" />
          
          {/* Diagonal (Broadway-like) */}
          <line x1="20%" y1="0" x2="80%" y2="100%" stroke="hsl(var(--map-road))" strokeWidth="2" opacity="0.5" />
        </svg>

        {/* Borough labels */}
        <div className="absolute top-[20%] left-[15%] text-muted-foreground/30 font-heading text-lg tracking-widest uppercase">
          Manhattan
        </div>
        <div className="absolute top-[60%] right-[25%] text-muted-foreground/30 font-heading text-lg tracking-widest uppercase">
          Brooklyn
        </div>

        {/* Parks (green areas) */}
        <div className="absolute top-[25%] left-[35%] w-16 h-32 bg-success/10 rounded-lg rotate-12" />
        <div className="absolute top-[50%] left-[50%] w-12 h-12 bg-success/10 rounded-full" />
      </div>

      {/* Event Pins */}
      {events.map((event) => {
        const pos = getPosition(event.latitude, event.longitude);
        const isActive = selectedEventId === event.id;
        const isHovered = hoveredEventId === event.id;

        return (
          <MapPin
            key={event.id}
            event={event}
            position={pos}
            isActive={isActive}
            isHovered={isHovered}
            onSelect={onEventSelect}
            onHover={onEventHover}
          />
        );
      })}

      {/* Map Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button className="p-2.5 rounded-lg glass hover:bg-muted transition-colors">
          <ZoomIn className="w-5 h-5 text-foreground" />
        </button>
        <button className="p-2.5 rounded-lg glass hover:bg-muted transition-colors">
          <ZoomOut className="w-5 h-5 text-foreground" />
        </button>
        <div className="h-px bg-border my-1" />
        <button className="p-2.5 rounded-lg glass hover:bg-muted transition-colors">
          <Layers className="w-5 h-5 text-foreground" />
        </button>
      </div>

      {/* GPS Button */}
      <button className="absolute bottom-4 right-4 p-3 rounded-full bg-primary text-primary-foreground shadow-glow hover:brightness-110 transition-all">
        <Navigation className="w-5 h-5" />
      </button>

      {/* Scale indicator */}
      <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-16 h-0.5 bg-muted-foreground/50" />
        <span>1 mi</span>
      </div>
    </motion.div>
  );
};

export default MapView;
