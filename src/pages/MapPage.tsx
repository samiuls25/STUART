import React from "react";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "../components/layout/Navbar";
import FilterBar from "../components/shared/FilterBar";
import EventCard from "../components/events/EventCard";
import MapView from "../components/map/MapView";
import EventDetailModal from "../components/events/EventDetailModel";
import EmptyState from "../components/shared/EmptyState";
import LocationBanner from "../components/shared/LocationBanner";
import { fetchEvents, type Event } from "../data/events";
import { useAuth } from "../lib/AuthContext";
import {
  parseEventDate,
  isThisWeekend,
  isThisWeek,
  distanceMiles,
  computeFilterCounts,
  isEventUpcomingForBrowse,
  withComputedDistance,
} from "../lib/eventFilters";
import { useUserLocation } from "../hooks/useUserLocation";
import { toast } from "../hooks/use-toast";

const MapPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedTime, setSelectedTime] = useState("All");
  const [selectedDistance, setSelectedDistance] = useState<number | null>(null);
  const {
    location: userLocation,
    usingFallback: locationUsingFallback,
    requestLocation,
  } = useUserLocation();
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

  const browseEvents = useMemo(
    () => events.filter(isEventUpcomingForBrowse),
    [events],
  );

  const handleUseMyLocation = () => {
    requestLocation();
    // If the browser has hard-blocked the prompt (3+ dismissals), the call
    // will fail silently and stay on the NYC fallback. Surface a hint so the
    // user knows to fix it via the address-bar lock icon.
    setTimeout(() => {
      if (locationUsingFallback) {
        toast({
          title: "Location still blocked",
          description:
            "Click the lock icon in the address bar to enable Location for this site, then try again.",
        });
      }
    }, 1000);
  };

  const { segmentCounts, genreCounts } = useMemo(
    () =>
      computeFilterCounts(browseEvents, {
        segment: selectedSegment,
        genre: selectedGenre,
        price: selectedPrice,
        time: selectedTime,
        distance: selectedDistance,
        userLocation,
      }),
    [
      browseEvents,
      selectedSegment,
      selectedGenre,
      selectedPrice,
      selectedTime,
      selectedDistance,
      userLocation,
    ],
  );

  const filteredEvents = useMemo(() => {
    return browseEvents.filter((event) => {
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
        selectedDistance == null
        || eventDistance == null
        || eventDistance <= selectedDistance;

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
    }).map((event) => withComputedDistance(event, userLocation));
  }, [
    browseEvents,
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
    setHoveredEventId(null);
  };

  const handleSearchArea = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
    setSelectedPrice("All");
    setSelectedTime("All");
    setSelectedDistance(null);
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

      <main className="pt-[72px] flex flex-col h-[calc(100dvh-72px)] min-h-0 overflow-hidden md:h-screen">
        <div className="flex flex-1 flex-col md:flex-row min-h-0 overflow-hidden">
          {/* Map — visible on mobile above the list; desktop fills remaining width */}
          <div className="order-1 flex h-[38vh] min-h-[240px] w-full shrink-0 flex-col border-b border-border md:order-2 md:h-auto md:min-h-0 md:flex-1 md:border-b-0 md:border-l md:border-border">
            <MapView
              events={filteredEvents}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              onEventSelect={handleEventClick}
              onEventHover={handleEventHover}
              onBackgroundClick={handleClearSelection}
              userLocation={userLocation}
              showUserLocationPin={Boolean(userLocation && !locationUsingFallback)}
              distanceLimitMiles={selectedDistance}
            />
          </div>

          {/* Left: Event List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="order-2 flex min-h-0 flex-1 flex-col bg-card/50 md:order-1 md:h-full md:w-[360px] md:flex-none lg:w-[440px] xl:w-[480px] shrink-0 border-border md:border-r"
          >
            {locationUsingFallback && (
              <div className="px-4 pt-3">
                <LocationBanner
                  usingFallback={locationUsingFallback}
                  onUseRealLocation={handleUseMyLocation}
                />
              </div>
            )}
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
              segmentCounts={segmentCounts}
              genreCounts={genreCounts}
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
                    showQuickFeedback={Boolean(event.isRecommended || event.isTrending)}
                  />
                ))
              ) : (
                <EmptyState onSearchArea={handleSearchArea} />
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={handleClearSelection} />
    </div>
  );
};

export default MapPage;
