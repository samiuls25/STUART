import React from "react";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import FilterBar from "../components/shared/FilterBar";
import EventCard from "../components/events/EventCard";
import MapView from "../components/map/MapView";
import EventDetailModal from "../components/events/EventDetailModel";
import EmptyState from "../components/shared/EmptyState";
import { events, type Event } from "../data/events";


const MapPage = () => {
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSegment =
        selectedSegment === "All" || event.segment === selectedSegment;
      const matchesGenre =
        selectedGenre === "All" || event.genre === selectedGenre;
      return matchesSegment && matchesGenre;
    });
  }, [selectedSegment, selectedGenre]);

  const handleEventClick = (event: Event) => {
    setSelectedEventId(event.id);
    setDetailEvent(event);
  };

  const handleEventHover = (id: string | null) => {
    setHoveredEventId(id);
  };

  const handleSearchArea = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px] h-screen flex flex-col">
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Event List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full lg:w-[440px] xl:w-[480px] flex flex-col border-r border-border bg-card/50"
          >
            <FilterBar
              selectedSegment={selectedSegment}
              selectedGenre={selectedGenre}
              onSegmentChange={setSelectedSegment}
              onGenreChange={setSelectedGenre}
              onSearchArea={handleSearchArea}
              eventCount={filteredEvents.length}
            />

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {filteredEvents.length > 0 ? (
                filteredEvents.map((event, index) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    isSelected={selectedEventId === event.id}
                    isHovered={hoveredEventId === event.id}
                    onHover={handleEventHover}
                    onClick={handleEventClick}
                    index={index}
                  />
                ))
              ) : (
                <EmptyState onSearchArea={handleSearchArea} />
              )}
            </div>
          </motion.div>

          {/* Right: Map */}
          <div className="hidden lg:flex flex-1">
            <MapView
              events={filteredEvents}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              onEventSelect={handleEventClick}
              onEventHover={handleEventHover}
            />
          </div>
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

export default MapPage;