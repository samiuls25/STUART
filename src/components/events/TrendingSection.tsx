import { motion } from "framer-motion";
import React from "react";
import { TrendingUp, Flame, Users, Bookmark } from "lucide-react";
import type { Event } from "../../data/events";

interface TrendingSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const TrendingSection = ({ events, onEventClick }: TrendingSectionProps) => {
  const trendingEvents = events
    .filter((e) => e.isTrending)
    .sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99))
    .slice(0, 5);

  if (trendingEvents.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <TrendingUp className="w-5 h-5 text-orange-500" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Trending Today
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {trendingEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onEventClick(event)}
            className="flex-shrink-0 w-64 bg-card rounded-xl border border-border overflow-hidden cursor-pointer group hover:shadow-lg hover:border-primary/30 transition-all"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={event.heroImage}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              
              {/* Rank Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                <Flame className="w-3 h-3" />
                #{event.trendingRank}
              </div>
              
              {/* Social Proof */}
              <div className="absolute bottom-2 left-2 flex items-center gap-3 text-xs text-white/90">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  2.4k interested
                </span>
                <span className="flex items-center gap-1">
                  <Bookmark className="w-3 h-3" />
                  890 saved
                </span>
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                {event.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {event.date} • {event.venue}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
