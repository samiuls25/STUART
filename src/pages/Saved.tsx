import { useState, useEffect } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Heart, Trash2 } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import EventDetailModal from "../components/events/EventDetailModel";
import { type Event, fetchEvents } from "../data/events";
import { getSavedEventIds, unsaveEvent } from "../lib/SavedEvents";
import { useAuth } from "../lib/AuthContext";
import { toast } from "../hooks/use-toast";

type SavedView = "upcoming" | "past";

const parseSavedEventDate = (value: string) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const isPastEvent = (event: Event) => {
  const eventDate = parseSavedEventDate(event.date);
  if (!eventDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  return eventDate < today;
};

const compareByDateAsc = (a: Event, b: Event) => {
  const aDate = parseSavedEventDate(a.date);
  const bDate = parseSavedEventDate(b.date);
  if (!aDate || !bDate) return 0;
  return aDate.getTime() - bDate.getTime();
};

const Saved = () => {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [savedEventIds, setSavedEventIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [savedView, setSavedView] = useState<SavedView>("upcoming");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([fetchEvents(user.id), getSavedEventIds()])
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
  const upcomingSavedEvents = savedEvents
    .filter((event) => !isPastEvent(event))
    .sort(compareByDateAsc);
  const pastSavedEvents = savedEvents
    .filter((event) => isPastEvent(event))
    .sort((a, b) => compareByDateAsc(b, a));
  const activeSavedEvents = savedView === "upcoming" ? upcomingSavedEvents : pastSavedEvents;

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
            <>
              <div className="mb-6 flex items-center gap-3">
                <button
                  onClick={() => setSavedView("upcoming")}
                  className={`btn-secondary px-4 py-2 ${savedView === "upcoming" ? "bg-primary text-primary-foreground" : ""}`}
                >
                  Upcoming ({upcomingSavedEvents.length})
                </button>
                <button
                  onClick={() => setSavedView("past")}
                  className={`btn-secondary px-4 py-2 ${savedView === "past" ? "bg-primary text-primary-foreground" : ""}`}
                >
                  Past ({pastSavedEvents.length})
                </button>
              </div>

              {activeSavedEvents.length === 0 ? (
                <EmptySavedState
                  title={savedView === "upcoming" ? "No upcoming saved events" : "No past saved events"}
                  description={
                    savedView === "upcoming"
                      ? "You can move events here by saving upcoming events from Explore."
                      : "Past events you saved will appear here automatically."
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeSavedEvents.map((event, index) => (
                    <SavedEventCard
                      key={event.id}
                      event={event}
                      index={index}
                      onUnsave={() => handleUnsave(event.id)}
                      onClick={() => setDetailEvent(event)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

interface SavedEventCardProps {
  event: Event;
  onUnsave: () => void;
  index: number;
  onClick: () => void;
}

const SavedEventCard = ({ event, onUnsave, index, onClick }: SavedEventCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      onClick={onClick}
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

const EmptySavedState = ({
  title = "No saved events",
  description = "Start exploring and save events you're interested in",
}: {
  title?: string;
  description?: string;
}) => {
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
        {title}
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {description}
      </p>
      <a href="/" className="btn-primary inline-block">
        Explore Events
      </a>
    </motion.div>
  );
};

export default Saved;