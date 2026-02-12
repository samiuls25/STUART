import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, Trash2 } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import EventCard from "../components/events/EventCard.tsx";
import EventDetailModal from "../components/events/EventDetailModel.tsx";
import { events, type Event } from "../data/events";

// Mock saved events (first 4 events)
const savedEventIds = ["1", "3", "7", "10"];

const Saved = () => {
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  
  const savedEvents = events.filter((e) => savedEventIds.includes(e.id));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-5xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-10"
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Saved Events
            </h1>
            <p className="text-muted-foreground">
              Events you've bookmarked for later
            </p>
          </motion.div>

          {/* Saved Events Grid */}
          {savedEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
            >
              {savedEvents.map((event, index) => (
                <SavedEventCard
                  key={event.id}
                  event={event}
                  onClick={() => setDetailEvent(event)}
                  index={index}
                />
              ))}
            </motion.div>
          ) : (
            <EmptySavedState />
          )}
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

interface SavedEventCardProps {
  event: Event;
  onClick: () => void;
  index: number;
}

const SavedEventCard = ({ event, onClick, index }: SavedEventCardProps) => {
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