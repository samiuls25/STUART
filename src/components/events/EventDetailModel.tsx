import { useState } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Heart,
  Share2,
  Navigation,
  Users,
  Car,
  Tag,
  Star,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Info,
} from "lucide-react";
import type { Event } from "../../data/events";
import { toast } from "../../hooks/use-toast";

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
}

const EventDetailModal = ({ event, onClose }: EventDetailModalProps) => {
  const [isSaved, setIsSaved] = useState(false);

  if (!event) return null;

  const handleSave = () => {
    setIsSaved(!isSaved);
    toast({
      title: isSaved ? "Removed from saved" : "Event saved!",
      description: isSaved ? "Event removed from your saved list" : "You can find this in your Saved events",
    });
  };

  const handleSuggestToGroup = () => {
    toast({
      title: "Suggest to group",
      description: "Choose a group to share this event with",
    });
  };

  const handleFeedback = (type: string) => {
    toast({
      title: "Thanks for your feedback!",
      description: "This helps us improve your recommendations",
    });
  };

  return (
    <AnimatePresence>
      {event && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-2xl max-h-[85vh] pointer-events-auto"
            >
              <div className="bg-card rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[85vh]">
                {/* Hero Image */}
                <div className="relative h-56 flex-shrink-0 overflow-hidden">
                  <img src={event.heroImage} alt={event.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                  <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-foreground" />
                  </button>

                  <div className="absolute top-4 left-4 flex gap-2">
                    <button onClick={handleSave} className={`p-2 rounded-full backdrop-blur-sm transition-colors ${isSaved ? 'bg-primary text-primary-foreground' : 'bg-background/80 hover:bg-primary/20'}`}>
                      <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                    </button>
                    <button className="p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-primary/20 transition-colors">
                      <Share2 className="w-5 h-5 text-foreground" />
                    </button>
                  </div>

                  <div className="absolute bottom-4 left-6 flex items-center gap-2">
                    <span className="genre-tag active">{event.genre}</span>
                    {event.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-background/80 backdrop-blur-sm text-xs rounded-full text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{event.name}</h2>
                    {event.description && <p className="text-muted-foreground text-sm">{event.description}</p>}
                  </div>

                  {/* Recommendation Badge */}
                  {event.isRecommended && event.recommendationReasons && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm font-medium text-primary">{event.recommendationScore}% Match</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Recommended because:
                      </p>
                      <ul className="space-y-1">
                        {event.recommendationReasons.map((reason, i) => (
                          <li key={i} className="text-xs text-foreground flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary" /> {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground text-sm">{event.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium text-foreground text-sm">{event.time}</p>
                      </div>
                    </div>
                    {event.distance && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <Navigation className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Distance</p>
                          <p className="font-medium text-foreground text-sm">{event.distance} mi away</p>
                        </div>
                      </div>
                    )}
                    {event.travelTime && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <Car className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Travel Time</p>
                          <p className="font-medium text-foreground text-sm">~{event.travelTime} min</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Venue */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.venue}</p>
                      <p className="text-sm text-muted-foreground">{event.neighborhood}, New York, NY</p>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Help improve recommendations:</span>
                    <button onClick={() => handleFeedback('more')} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-green-500/10 hover:text-green-500 transition-colors">
                      <ThumbsUp className="w-3 h-3" /> More
                    </button>
                    <button onClick={() => handleFeedback('less')} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-red-500/10 hover:text-red-500 transition-colors">
                      <ThumbsDown className="w-3 h-3" /> Less
                    </button>
                  </div>
                </div>

                {/* CTA Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Starting from</p>
                    <p className={`text-xl font-bold ${event.priceLevel === 'free' ? 'text-green-500' : 'text-primary'}`}>
                      {event.priceLevel === 'free' ? 'Free' : event.price}
                    </p>
                  </div>
                  <button onClick={handleSuggestToGroup} className="btn-secondary flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4" /> Suggest to Group
                  </button>
                  <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                    Get Tickets <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default EventDetailModal;
