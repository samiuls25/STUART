import { motion } from "framer-motion";
import React from "react";
import { Sparkles, Star, Info, Heart } from "lucide-react";
import type { Event } from "../../data/events";

interface RecommendedSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const RecommendedSection = ({ events, onEventClick }: RecommendedSectionProps) => {
  const recommendedEvents = events
    .filter((e) => e.isRecommended)
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
    .slice(0, 4);

  if (recommendedEvents.length === 0) return null;

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-primary/10">
          <Sparkles className="w-5 h-5 text-primary" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Recommended for You
        </h2>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
          AI-powered
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendedEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onEventClick(event)}
            className="relative bg-gradient-to-br from-primary/5 to-accent/5 rounded-xl border border-primary/20 overflow-hidden cursor-pointer group hover:shadow-lg hover:border-primary/40 transition-all"
          >
            <div className="flex gap-4 p-4">
              {/* Thumbnail */}
              <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                <img
                  src={event.heroImage}
                  alt={event.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                
                {/* Score Badge */}
                <div className="absolute top-1 right-1 flex items-center gap-0.5 px-1.5 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  {event.recommendationScore}%
                </div>
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                  {event.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {event.date} • {event.time}
                </p>
                
                {/* Recommendation Reasons */}
                {event.recommendationReasons && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Info className="w-3 h-3" />
                      Why we recommend this:
                    </p>
                    <ul className="space-y-0.5">
                      {event.recommendationReasons.slice(0, 2).map((reason, i) => (
                        <li key={i} className="text-xs text-primary flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-primary" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              
              {/* Save Button */}
              <button
                onClick={(e) => e.stopPropagation()}
                className="absolute top-3 right-3 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
              >
                <Heart className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecommendedSection;
