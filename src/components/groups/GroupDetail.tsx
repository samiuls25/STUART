import { useState } from "react";
import React from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  UserPlus,
  Calendar,
  ThumbsUp,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import Navbar from "../layout/Navbar";
import EventCard from "../events/EventCard";
import EventDetailModal from ".././events/EventDetailModel.tsx";
import { groups } from "../../data/groups";
import { events, type Event } from "../../data/events";

const GroupDetail = () => {
  const { id } = useParams();
  const group = groups.find((g) => g.id === id);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-[72px] flex items-center justify-center h-[calc(100vh-72px)]">
          <div className="text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-2">
              Group not found
            </h2>
            <Link to="/groups" className="text-primary hover:underline">
              Back to groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Get suggested events data
  const suggestedEventDetails = events.filter((e) =>
    group.suggestedEvents.some((se) => se.eventId === e.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {/* Back Button */}
          <Link
            to="/groups"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to groups</span>
          </Link>

          {/* Group Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border p-6 mb-8"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl"
                  style={{ backgroundColor: `${group.color}20`, color: group.color }}
                >
                  {group.emoji}
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-bold text-foreground">
                    {group.name}
                  </h1>
                  <p className="text-muted-foreground">{group.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button className="btn-secondary py-2 px-4 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" />
                  <span>Invite</span>
                </button>
                <button className="btn-ghost p-2">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Members */}
            <div className="flex items-center gap-4">
              <div className="avatar-group">
                {group.members.map((member) => (
                  <div
                    key={member.id}
                    className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium border-2 border-card"
                    title={member.name}
                  >
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      member.name.charAt(0)
                    )}
                  </div>
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                {group.members.length} members
              </span>
            </div>
          </motion.div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Suggested Events */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-heading text-xl font-semibold text-foreground">
                    Suggested Events
                  </h2>
                  <span className="text-sm text-muted-foreground">
                    {suggestedEventDetails.length} events
                  </span>
                </div>

                {suggestedEventDetails.length > 0 ? (
                  <div className="space-y-4">
                    {suggestedEventDetails.map((event, index) => {
                      const suggestion = group.suggestedEvents.find(
                        (se) => se.eventId === event.id
                      );
                      return (
                        <SuggestedEventCard
                          key={event.id}
                          event={event}
                          votes={suggestion?.votes || 0}
                          suggestedBy={suggestion?.suggestedBy || ""}
                          onClick={() => setDetailEvent(event)}
                          index={index}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-card rounded-xl border border-border p-8 text-center">
                    <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-foreground mb-2">
                      No events suggested yet
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Browse events and suggest them to your group
                    </p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Availability Sidebar */}
            <div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <h2 className="font-heading text-xl font-semibold text-foreground mb-4">
                  Availability
                </h2>
                <div className="bg-card rounded-xl border border-border p-5">
                  <p className="text-sm text-muted-foreground mb-4">
                    Let your group know when you're free
                  </p>
                  
                  {/* Availability Grid Placeholder */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center text-xs font-medium text-muted-foreground"
                      >
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: 28 }).map((_, i) => (
                      <button
                        key={i}
                        className="aspect-square rounded-lg bg-muted/30 hover:bg-primary/20 transition-colors text-xs text-muted-foreground"
                      >
                        {(i % 31) + 1}
                      </button>
                    ))}
                  </div>
                  
                  <button className="btn-secondary w-full py-2 text-sm">
                    Set Availability
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

interface SuggestedEventCardProps {
  event: Event;
  votes: number;
  suggestedBy: string;
  onClick: () => void;
  index: number;
}

const SuggestedEventCard = ({
  event,
  votes,
  suggestedBy,
  onClick,
  index,
}: SuggestedEventCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      onClick={onClick}
      className="bg-card rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-card-hover transition-all cursor-pointer group"
    >
      <div className="flex gap-4">
        <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={event.heroImage}
            alt={event.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <span className="genre-tag mb-2">{event.genre}</span>
          <h3 className="font-heading font-semibold text-foreground truncate group-hover:text-primary transition-colors">
            {event.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            {event.date} • {event.venue}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Suggested by {suggestedBy}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors">
            <ThumbsUp className="w-4 h-4" />
            <span className="text-sm font-medium">{votes}</span>
          </button>
          <button className="p-2 rounded-lg hover:bg-muted transition-colors">
            <MessageSquare className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default GroupDetail;