import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Heart, Navigation, Zap, ThumbsUp, ThumbsDown, DollarSign } from "lucide-react";
import type { Event } from "../../data/events.ts";

interface EventCardProps {
  event: Event;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (event: Event) => void;
  index: number;
}

const EventCard = ({
  event,
  isSelected,
  isHovered,
  onHover,
  onClick,
  index,
}: EventCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onMouseEnter={() => onHover(event.id)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onClick(event)}
      className={`card-event group ${isSelected || isHovered ? "selected" : ""}`}
    >
      <div className="flex gap-4 p-3">
        {/* Thumbnail */}
        <div className="relative w-28 h-28 flex-shrink-0 rounded-lg overflow-hidden">
          <img
            src={event.heroImage}
            alt={event.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {/* Happening Now / Tonight Badge */}
          {event.happeningNow && (
            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">
              <Zap className="w-3 h-3" />
              NOW
            </div>
          )}
          {!event.happeningNow && event.isTonight && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
              TONIGHT
            </div>
          )}
          
          {/* Save button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-primary/20"
          >
            <Heart className="w-3.5 h-3.5 text-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 py-1">
          {/* Genre Tag + Distance */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`genre-tag ${isSelected ? "active" : ""}`}>
              {event.genre}
            </span>
            {event.distance && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Navigation className="w-3 h-3" />
                {event.distance} mi
              </span>
            )}
          </div>

          {/* Event Name */}
          <h3 className="font-heading font-semibold text-foreground truncate mb-2 group-hover:text-primary transition-colors">
            {event.name}
          </h3>

          {/* Date, Time & Travel Time */}
          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-1.5">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{event.date}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{event.time}</span>
            </div>
            {event.travelTime && (
              <span className="text-xs text-accent-foreground bg-accent/30 px-1.5 py-0.5 rounded">
                ~{event.travelTime} min
              </span>
            )}
          </div>

          {/* Venue */}
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" />
            <span className="truncate">{event.venue}</span>
          </div>

          {/* Price + Recommendation */}
          <div className="flex items-center gap-3 mt-2">
            {event.price && (
              <p className="text-primary font-semibold text-sm flex items-center gap-1">
                {event.priceLevel === "free" ? (
                  <span className="text-green-500">Free</span>
                ) : (
                  <>
                    <DollarSign className="w-3 h-3" />
                    {event.price}
                  </>
                )}
              </p>
            )}
            {event.isRecommended && (
              <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-full font-medium">
                ★ Recommended
              </span>
            )}
          </div>
        </div>
      </div>
      
      {/* Quick Feedback (shown on hover) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-2 px-3 pb-2 text-xs text-muted-foreground">
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-green-500/10 hover:text-green-500 transition-colors"
        >
          <ThumbsUp className="w-3 h-3" />
          More like this
        </button>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <ThumbsDown className="w-3 h-3" />
          Not interested
        </button>
      </div>
    </motion.div>
  );
};

export default EventCard;
