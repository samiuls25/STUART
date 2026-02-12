import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin as MapPinIcon, Music, Trophy, Palette } from "lucide-react";
import type { Event } from "../../data/events";

interface MapPinProps {
  event: Event;
  position: { x: number; y: number };
  isActive: boolean;
  isHovered: boolean;
  onSelect: (event: Event) => void;
  onHover: (id: string | null) => void;
}

const MapPin = ({
  event,
  position,
  isActive,
  isHovered,
  onSelect,
  onHover,
}: MapPinProps) => {
  const getIcon = () => {
    switch (event.segment) {
      case "Music":
        return <Music className="w-3.5 h-3.5" />;
      case "Sports":
        return <Trophy className="w-3.5 h-3.5" />;
      case "Arts":
        return <Palette className="w-3.5 h-3.5" />;
      default:
        return <MapPinIcon className="w-3.5 h-3.5" />;
    }
  };

  return (
    <motion.div
      className="absolute z-10"
      style={{ left: `${position.x}%`, top: `${position.y}%` }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
    >
      {/* Pin */}
      <motion.button
        onClick={() => onSelect(event)}
        onMouseEnter={() => onHover(event.id)}
        onMouseLeave={() => onHover(null)}
        className={`map-pin -translate-x-1/2 -translate-y-1/2 ${
          isActive ? "active" : isHovered ? "border-primary bg-primary/20 scale-110" : ""
        }`}
        animate={{
          scale: isActive ? 1.25 : isHovered ? 1.1 : 1,
        }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
      >
        <span className={isActive ? "text-primary-foreground" : "text-muted-foreground"}>
          {getIcon()}
        </span>
      </motion.button>

      {/* Tooltip on hover */}
      <AnimatePresence>
        {(isHovered || isActive) && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-20"
          >
            <div className="glass-strong rounded-lg p-3 shadow-elevated min-w-[180px]">
              <p className="font-heading font-semibold text-sm text-foreground truncate max-w-[200px]">
                {event.name}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {event.venue}
              </p>
              <p className="text-xs text-primary font-medium mt-1">
                {event.date} • {event.time}
              </p>
              {/* Arrow */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-card" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MapPin;
