import React from "react";
import { motion } from "framer-motion";
import { MapPin, Search } from "lucide-react";

interface EmptyStateProps {
  onSearchArea: () => void;
}

const EmptyState = ({ onSearchArea }: EmptyStateProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center h-full p-8 text-center"
    >
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <MapPin className="w-10 h-10 text-muted-foreground" />
      </div>
      
      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
        No events in this area
      </h3>
      
      <p className="text-muted-foreground text-sm max-w-xs mb-6">
        Try zooming out or panning the map to discover more events in New York City
      </p>
      
      <button
        onClick={onSearchArea}
        className="btn-primary flex items-center gap-2"
      >
        <Search className="w-4 h-4" />
        Search this area
      </button>
    </motion.div>
  );
};

export default EmptyState;
