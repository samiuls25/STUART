import React from "react";
import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import {
  addDays,
  endOfWeek,
  isValid,
  startOfDay,
  startOfWeek,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import FilterBar from "../components/shared/FilterBar";
import EventCard from "../components/events/EventCard";
import MapView from "../components/map/MapView";
import EventDetailModal from "../components/events/EventDetailModel";
import EmptyState from "../components/shared/EmptyState";
import { fetchEvents, type Event } from "../data/events";
import { useAuth } from "../lib/AuthContext";

const EVENTS_PER_PAGE = 10;
const EARTH_RADIUS_MILES = 3958.8;

type Coordinates = {
  lat: number;
  lng: number;
};

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

const parseEventDate = (dateValue: string) => {
  const parsedDate = new Date(dateValue);

  if (!isValid(parsedDate)) {
    return null;
  }

  return startOfDay(parsedDate);
};

const isDateInRange = (date: Date, rangeStart: Date, rangeEnd: Date) =>
  date >= rangeStart && date <= rangeEnd;

const getDistanceInMiles = (
  from: Coordinates,
  to: Coordinates
) => {
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const fromLatitude = toRadians(from.lat);
  const toLatitude = toRadians(to.lat);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_MILES * arc;
};

const MapPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState("All");
  const [selectedGenre, setSelectedGenre] = useState("All");
  const [selectedPrice, setSelectedPrice] = useState("All");
  const [selectedTime, setSelectedTime] = useState("All");
  const [selectedDistance, setSelectedDistance] = useState(25);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [hasManualLocationFocus, setHasManualLocationFocus] = useState(false);
  const [hasAdjustedDistance, setHasAdjustedDistance] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [page, setPage] = useState(0);
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
            typeof event.latitude === "number" &&
            Number.isFinite(event.latitude) &&
            typeof event.longitude === "number" &&
            Number.isFinite(event.longitude)
        );

        setEvents(mappableRows);
      })
      .catch((error) => {
        console.error("Supabase events fetch error:", error);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id]);

  useEffect(() => {
    if (userLocation || !navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.error("Location error:", error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000,
      }
    );
  }, [userLocation]);

  const today = startOfDay(new Date());
  const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
  const endOfThisWeek = endOfWeek(today, { weekStartsOn: 1 });
  const startOfThisWeekend = addDays(startOfThisWeek, 5);
  const endOfThisWeekend = addDays(startOfThisWeek, 6);

  const baseFilteredEvents = useMemo(() => {
    return events.filter((event) => {
      const matchesSegment =
        selectedSegment === "All" || event.segment === selectedSegment;

      const matchesGenre =
        selectedGenre === "All" || event.genre === selectedGenre;

      const matchesPrice =
        selectedPrice === "All" ||
        (selectedPrice === "Free" && event.priceLevel === "free") ||
        event.priceLevel === selectedPrice;

      const eventDate = parseEventDate(event.date);

      const matchesTime =
        selectedTime === "All" ||
        (selectedTime === "Now" && event.happeningNow) ||
        (selectedTime === "Tonight" && event.isTonight) ||
        (selectedTime === "This Week" &&
          !!eventDate &&
          isDateInRange(eventDate, today, endOfThisWeek)) ||
        (selectedTime === "This Weekend" &&
          !!eventDate &&
          isDateInRange(eventDate, startOfThisWeekend, endOfThisWeekend));

      return (
        matchesSegment &&
        matchesGenre &&
        matchesPrice &&
        matchesTime
      );
    });
  }, [
    events,
    selectedSegment,
    selectedGenre,
    selectedPrice,
    selectedTime,
    today,
    endOfThisWeek,
    startOfThisWeekend,
    endOfThisWeekend,
  ]);

  const distanceFilteredEvents = useMemo(() => {
    if (!userLocation) {
      return baseFilteredEvents;
    }

    return baseFilteredEvents.filter(
      (event) =>
        getDistanceInMiles(userLocation, {
          lat: event.latitude,
          lng: event.longitude,
        }) <= selectedDistance
    );
  }, [baseFilteredEvents, selectedDistance, userLocation]);

  const filteredEvents = useMemo(() => {
    const shouldFallbackToBaseEvents =
      userLocation &&
      !hasManualLocationFocus &&
      !hasAdjustedDistance &&
      distanceFilteredEvents.length === 0 &&
      baseFilteredEvents.length > 0;

    if (shouldFallbackToBaseEvents) {
      return baseFilteredEvents;
    }

    return distanceFilteredEvents;
  }, [
    baseFilteredEvents,
    distanceFilteredEvents,
    hasAdjustedDistance,
    hasManualLocationFocus,
    userLocation,
  ]);

  const totalPages = Math.ceil(filteredEvents.length / EVENTS_PER_PAGE);

  const visibleEvents = useMemo(() => {
    const start = page * EVENTS_PER_PAGE;
    const end = start + EVENTS_PER_PAGE;
    return filteredEvents.slice(start, end);
  }, [filteredEvents, page]);

  useEffect(() => {
    setPage(0);
    setSelectedEventId(null);
    setHoveredEventId(null);
  }, [
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

  const handleDistanceChange = (distance: number) => {
    setSelectedDistance(distance);
    setHasAdjustedDistance(true);
  };

  const handleUserLocationChange = (
    location: Coordinates,
    source: "auto" | "manual" = "manual"
  ) => {
    setUserLocation(location);

    if (source === "manual") {
      setHasManualLocationFocus(true);
    }
  };

  const handleResetFilters = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
    setSelectedPrice("All");
    setSelectedTime("All");
    setSelectedDistance(25);
    setHasManualLocationFocus(false);
    setHasAdjustedDistance(false);
    setPage(0);
  };

  const handlePreviousPage = () => {
    setPage((currentPage) => Math.max(currentPage - 1, 0));
  };

  const handleNextPage = () => {
    setPage((currentPage) => Math.min(currentPage + 1, totalPages - 1));
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
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full lg:w-[440px] xl:w-[480px] flex flex-col border-r border-border bg-card/50"
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
              onDistanceChange={handleDistanceChange}
              onSearchArea={handleResetFilters}
              eventCount={filteredEvents.length}
            />

            <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  Showing {visibleEvents.length} of {filteredEvents.length} events
                </p>
                <p className="text-xs text-muted-foreground">
                  Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePreviousPage}
                  disabled={page === 0}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextPage}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-3">
              {visibleEvents.length > 0 ? (
                visibleEvents.map((event, index) => (
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
                <EmptyState onSearchArea={handleResetFilters} />
              )}
            </div>
          </motion.div>

          <div className="hidden lg:flex flex-1">
            <MapView
              events={visibleEvents}
              userLocation={userLocation}
              selectedEventId={selectedEventId}
              hoveredEventId={hoveredEventId}
              onEventSelect={handleEventClick}
              onEventHover={handleEventHover}
              onUserLocationChange={handleUserLocationChange}
            />
          </div>
        </div>
      </main>

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

export default MapPage;
