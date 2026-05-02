import React from "react";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import FilterBar from "../components/shared/FilterBar";
import EventCard from "../components/events/EventCard";
import MapView from "../components/map/MapView";
import EventDetailModal from "../components/events/EventDetailModel";
import EmptyState from "../components/shared/EmptyState";
import { fetchEvents, type Event } from "../data/events";
import { useAuth } from "../lib/AuthContext";
import {
  parseEventDate,
  isThisWeekend,
  isThisWeek,
  distanceMiles,
} from "../lib/eventFilters";

const MapPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedTime, setSelectedTime] = useState("All");
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    let isMounted = true;
    setLoading(true);

    fetchEvents(user?.id)
      .then((rows) => {
        if (!isMounted) return;

        const mappableRows = rows.filter(
          (event) =>
            typeof event.latitude === "number"
            && Number.isFinite(event.latitude)
            && typeof event.longitude === "number"
            && Number.isFinite(event.longitude)
        );

        setEvents(mappableRows);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id]);

  // Mirror Explore's geolocation flow: prompt the browser, fall back to NYC
  // center if denied/unavailable so the distance filter still produces sensible
  // results. The Recenter button on the map handles re-prompting.
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setUserLocation({ lat: 40.7128, lon: -74.006 }),
    );
  }, []);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSegment =
        selectedSegment === "All" || event.segment === selectedSegment;
      const matchesGenre =
        selectedGenre === "All" || event.genre === selectedGenre;
      const matchesPrice =
        selectedPrice === "All" ||
        (selectedPrice === "Free" && event.priceLevel === "free") ||
        event.priceLevel === selectedPrice;

      let eventDistance = event.distance;
      if (userLocation != null && event.latitude != null && event.longitude != null) {
        eventDistance = distanceMiles(
          userLocation.lat,
          userLocation.lon,
          event.latitude,
          event.longitude,
        );
      }
      const matchesDistance =
        eventDistance == null || eventDistance <= selectedDistance;

      const eventDate = parseEventDate(event.date);
      const matchesTime =
        selectedTime === "All" ||
        (selectedTime === "Now" && event.happeningNow) ||
        (selectedTime === "Tonight" && event.isTonight) ||
        (selectedTime === "This Weekend" && isThisWeekend(eventDate)) ||
        (selectedTime === "This Week" && isThisWeek(eventDate));

      return (
        matchesSegment &&
        matchesGenre &&
        matchesPrice &&
        matchesDistance &&
        matchesTime
      );
    });
  }, [
    events,
    selectedSegment,
    selectedGenre,
    selectedPrice,
    selectedTime,
    selectedDistance,
    userLocation,
  ]);

  const handleEventClick = (event: Event) => {
    setSelectedEventId(event.id);
    setDetailEvent(event);
  };

  const handleEventHover = (id: string | null) => {
    setHoveredEventId(id);
  };

  // Closing the modal or clicking the bare map should both clear the selected
  // pin so it stops rendering in its highlighted/active state.
  const handleClearSelection = () => {
    setDetailEvent(null);
    setSelectedEventId(null);
  };

  const handleSearchArea = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
    setSelectedPrice("All");
    setSelectedTime("All");
    setSelectedDistance(5);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-lg">Loading map events...</span>
      </div>
    );
  }

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
            className="w-full md:w-[360px] lg:w-[440px] xl:w-[480px] flex-shrink-0 flex flex-col border-r border-border bg-card/50"
          >
            <FilterBar
              selectedSegment={selectedSegment}
              selectedGenre={selectedGenre}
              selectedPrice={selectedPrice}
              selectedTime={selectedTime}
              selectedDistance={selectedDistance}
              onSegmentChange={setSelectedSegment}
              onGenreChange={setSelectedGenre}
              onPriceChange={setSelectedPrice}
              onTimeChange={setSelectedTime}
              onDistanceChange={setSelectedDistance}
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
          <div className="hidden md:flex flex-1 min-w-0">
            <MapView
              events={filteredEvents}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              onEventSelect={handleEventClick}
              onEventHover={handleEventHover}
              onBackgroundClick={handleClearSelection}
            />
          </div>
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={handleClearSelection} />
    </div>
  );
};

export default MapPage;
