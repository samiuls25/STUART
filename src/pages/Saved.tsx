import { useState, useEffect } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Heart, Trash2 } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import { type Event, fetchEvents } from "../data/events";
import { getSavedEventIds, unsaveEvent } from "../lib/SavedEvents";
import { useAuth } from "../lib/AuthContext";
import { toast } from "../hooks/use-toast";

const Saved = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([fetchEvents(), getSavedEventIds()])
      .then(([allEvents, savedIds]) => {
        setEvents(allEvents);
        setSavedEventIds(savedIds);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleUnsave = async (eventId: string) => {
    const success = await unsaveEvent(eventId);
    if (success) {
      setSavedEventIds(savedEventIds.filter((id) => id !== eventId));
      toast({ title: "Event removed from saved" });
    } else {
      toast({ title: "Failed to remove event", variant: "destructive" });
    }
  };

  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-lg">Loading...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-5xl mx-auto px-6 py-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">
              Sign in to view saved events
            </h2>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[72px]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Saved Events
            </h1>
            <p className="text-muted-foreground">
              {savedEvents.length} event{savedEvents.length !== 1 ? "s" : ""} saved
            </p>
          </motion.div>

          {savedEvents.length === 0 ? (
            <EmptySavedState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedEvents.map((event, index) => (
                <SavedEventCard
                  key={event.id}
                  event={event}
                  index={index}
                  onUnsave={() => handleUnsave(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

interface SavedEventCardProps {
  event: Event;
  onUnsave: () => void;
  index: number;
}

const SavedEventCard = ({ event, onUnsave, index }: SavedEventCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="card-event group"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.heroImage}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Remove Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnsave();
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        <div className="absolute bottom-3 left-3">
          <span className="genre-tag active">{event.genre}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-heading font-semibold text-foreground mb-1 truncate group-hover:text-primary transition-colors">
          {event.name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {event.date} • {event.time}
        </p>
        <p className="text-sm text-muted-foreground truncate">{event.venue}</p>
        {event.price && (
          <p className="text-primary font-semibold text-sm mt-2">{event.price}</p>
        )}
      </div>
    </motion.div>
  );
};

const EmptySavedState = () => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-20"
    >
      <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
        <Heart className="w-10 h-10 text-muted-foreground" />
      </div>
      <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
        No saved events
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        Start exploring and save events you're interested in
      </p>
      <a href="/" className="btn-primary inline-block">
        Explore Events
      </a>
    </motion.div>
  );
};

export default Saved;