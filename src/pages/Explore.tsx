import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, X, Heart, MapPin, ArrowUp } from "lucide-react";
import React from "react";
import Fuse from "fuse.js";
import Navbar from "../components/layout/Navbar.tsx";
import FilterBar from "../components/shared/FilterBar.tsx";
import EventDetailModal from "../components/events/EventDetailModel.tsx";
import EmptyState from "../components/shared/EmptyState.tsx"; 
import MoodSelector from "../components/profile/MoodSelector.tsx";
import WeatherIndicator from "../components/shared/WeatherIndicator.tsx";
import TrendingSection from "../components/events/TrendingSection.tsx";
import RecommendedSection from "../components/events/RecommendedSection.tsx";
import PlanBuilderCard from "../components/shared/PlanBuilderCard.tsx";
// import { events, type Event } from "../data/events.ts";
import { type Event, fetchEvents } from "../data/events";
import { toast } from "../hooks/use-toast.ts";
import { saveEvent, unsaveEvent, getSavedEventIds } from "../lib/SavedEvents";
import { trackEventView } from "../lib/eventIntelligence";
import { useAuth } from "../lib/AuthContext";
import { parseEventDate, isThisWeekend, isThisWeek, distanceMiles } from "../lib/eventFilters";

const searchPlaceholders = [
  "free concerts this weekend",
  "things to do tonight",
  "outdoor events near me",
  "jazz clubs in village",
  "family-friendly activities",
];

const EVENTS_PER_PAGE = 24;

const Explore = () => {
  const { user, loading: authLoading } = useAuth();
  const [selectedSegment, setSelectedSegment] = useState<string>("All");
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
  const [selectedPrice, setSelectedPrice] = useState<string>("All");
  const [selectedTime, setSelectedTime] = useState<string>("All");
  const [selectedDistance, setSelectedDistance] = useState<number>(5);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [detailEvent, setDetailEvent] = useState<Event | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholderIndex] = useState(Math.floor(Math.random() * searchPlaceholders.length));

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [searchResults, setSearchResults] = useState<Event[] | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    let isMounted = true;
    setLoading(true);

    fetchEvents(user?.id)
      .then((data) => {
        if (!isMounted) return;
        setEvents(data);
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
    setCurrentPage(1);
  }, [
    searchQuery,
    selectedSegment,
    selectedGenre,
    selectedPrice,
    selectedTime,
    selectedDistance,
    selectedMood,
  ]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => setUserLocation({ lat: 40.7128, lon: -74.006 }) // NYC default
    );
  }, []);

  const fuse = useMemo(() => {
    if (!events.length) return null;

    const searchable = events.map((event) => ({
      ...event,
      title: event.name,
      vibe: (event.tags ?? []).join(" "),
    }));

    return new Fuse(searchable, {
      threshold: 0.35,
      keys: [
        { name: "title", weight: 0.7 },
        { name: "vibe", weight: 0.2 },
        { name: "venue", weight: 0.1 },
      ],
    });
  }, [events]);

  const handleSearch = (query: string, options?: { skipFuzzy?: boolean }) => {
    setSearchQuery(query);

    const trimmed = query.trim();
    if (!trimmed || !fuse || options?.skipFuzzy) {
      // Empty query or explicit skip: show all events (base list)
      setSearchResults(null);
      return;
    }

    const results = fuse.search(trimmed).map((r) => r.item as Event);
    setSearchResults(results);
  };

  const filteredEvents = useMemo(() => {
    const baseEvents = searchResults ?? events;

    return baseEvents.filter((event) => {
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
          event.longitude
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

      const matchesMood =
        !selectedMood ||
        (selectedMood === "adventurous" && event.tags?.includes("immersive")) ||
        (selectedMood === "chill" && (event.tags?.includes("intimate") || event.tags?.includes("cultural"))) ||
        (selectedMood === "social" && (event.tags?.includes("nightlife") || event.tags?.includes("concert"))) ||
        (selectedMood === "artsy" && (event.segment === "Arts" || event.tags?.includes("art")));

      return (
        matchesSegment &&
        matchesGenre &&
        matchesPrice &&
        matchesDistance &&
        matchesTime &&
        matchesMood
      );
    });
  }, [
    events,
    searchResults,
    userLocation,
    selectedSegment,
    selectedGenre,
    selectedPrice,
    selectedTime,
    selectedDistance,
    selectedMood,
    searchQuery,
  ]);

  const handleEventClick = (event: Event) => {
    setDetailEvent(event);
    void trackEventView(event.id, "explore-card");
  };

  const handleSearchArea = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
    setSelectedPrice("All");
    setSelectedTime("All");
    setSelectedMood(null);
    handleSearch("", { skipFuzzy: true });
  };

  const handleBuildPlan = () => {
    toast({
      title: "Building your perfect plan...",
      description: "STUART is creating a personalized itinerary for you.",
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / EVENTS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * EVENTS_PER_PAGE;
  const endIndex = startIndex + EVENTS_PER_PAGE;
  const pagedEvents = filteredEvents.slice(startIndex, endIndex);

  const goToPrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const scrollToEventsTop = () => {
    const allEventsAnchor = document.getElementById("all-events-anchor");
    if (allEventsAnchor) {
      allEventsAnchor.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <span className="text-muted-foreground text-lg">Loading events...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
          <div className="max-w-7xl mx-auto px-6 py-12 md:py-16 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-center max-w-3xl mx-auto"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                <span>New York City Events</span>
              </div>
              
              <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
                Discover what's happening{" "}
                <span className="text-gradient">around you</span>
              </h1>
              
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                Find concerts, sports, theater, and more. Plan activities with friends
                and never miss out on the best experiences in the city.
              </p>

              {/* Search Bar */}
              <div className="relative max-w-xl mx-auto mb-6">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  placeholder={`Try "${searchPlaceholders[placeholderIndex]}"`}
                  className="input-field w-full pl-14 pr-12 py-4 text-base rounded-2xl shadow-lg shadow-primary/5"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearch("", { skipFuzzy: true })}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Mood Selector */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">What's your vibe today?</p>
                <MoodSelector
                  selectedMood={selectedMood}
                  onMoodChange={setSelectedMood}
                  onMoodSearch={(label) => handleSearch(label, { skipFuzzy: true })}
                />
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Weather */}
        <section className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <WeatherIndicator className="flex-shrink-0" />
            <div className="flex-1" />
          </div>
        </section>

        {/* Content Sections */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          {/* Plan Builder */}
          <PlanBuilderCard onBuildPlan={handleBuildPlan} />
          
          {/* Trending Section */}
          <TrendingSection events={filteredEvents} onEventClick={handleEventClick} />
          
          {/* Recommended Section */}
          <RecommendedSection events={events} onEventClick={handleEventClick} />

          {/* Filters */}
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
            showAdvancedFilters={true}
          />

          {/* All Events Grid */}
          <div id="all-events-anchor" className="mt-6 mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              All Events
            </h2>
          </div>
          
          {filteredEvents.length > 0 ? (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {pagedEvents.map((event, index) => (
                  <EventCardGrid
                    key={event.id}
                    event={event}
                    onClick={handleEventClick}
                    index={index}
                  />
                ))}
              </motion.div>

              {totalPages > 1 && (
                <div className="mt-8 flex flex-col items-center gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setCurrentPage(1)}
                      disabled={safePage <= 1}
                      className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      First
                    </button>
                    <button
                      onClick={goToPrevPage}
                      disabled={safePage <= 1}
                      className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-muted-foreground">
                      Page {safePage} of {totalPages}
                    </span>
                    <button
                      onClick={goToNextPage}
                      disabled={safePage >= totalPages}
                      className="btn-secondary px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={safePage >= totalPages}
                    className="btn-secondary px-5 py-2.5"
                  >
                    Jump To Last Page
                  </button>
                  <button
                    onClick={scrollToEventsTop}
                    className="btn-secondary px-5 py-2.5 inline-flex items-center gap-2"
                  >
                    <ArrowUp className="w-4 h-4" />
                    Top
                  </button>
                  <p className="text-xs text-muted-foreground">
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredEvents.length)} of {filteredEvents.length}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="mt-8">
              <EmptyState onSearchArea={handleSearchArea} />
            </div>
          )}
        </section>
      </main>

      <EventDetailModal event={detailEvent} onClose={() => setDetailEvent(null)} />
    </div>
  );
};

// Grid variant of EventCard for Explore page
const EventCardGrid = ({
  event,
  onClick,
  index,
}: {
  event: Event;
  onClick: (event: Event) => void;
  index: number;
}) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);

  const toScoreLabel = (score?: number) => {
    if (typeof score !== "number" || Number.isNaN(score) || score <= 0) {
      return "RECOMMENDED";
    }
    return `SCORE ${Math.round(score)}`;
  };

  useEffect(() => {
    if (user) {
      getSavedEventIds().then((savedIds) => {
        setIsSaved(savedIds.includes(event.id));
      });
    }
  }, [user, event.id]);

  const handleSaveToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save events",
        variant: "destructive",
      });
      return;
    }

    const success = isSaved ? await unsaveEvent(event.id) : await saveEvent(event.id);
    
    if (success) {
      setIsSaved(!isSaved);
      toast({
        title: isSaved ? "Removed from saved" : "Event saved!",
        description: isSaved ? "Event removed from your saved list" : "You can find this in your Saved events",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update saved events",
        variant: "destructive",
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.03 }}
      onClick={() => onClick(event)}
      className="card-event group"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={event.heroImage}
          alt={event.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {event.happeningNow && (
            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded-full animate-pulse">
              NOW
            </span>
          )}
          {!event.happeningNow && event.isTonight && (
            <span className="px-2 py-0.5 bg-primary text-primary-foreground text-[10px] font-bold rounded-full">
              TONIGHT
            </span>
          )}
          {event.isRecommended && (
            <span className="px-2 py-0.5 bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-full backdrop-blur-sm">
              ★ {toScoreLabel(event.recommendationScore)}
            </span>
          )}
        </div>
        
        {/* Save Button */}
        <button
          onClick={handleSaveToggle}
          className={`absolute top-3 right-3 p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all ${
            isSaved 
              ? "bg-primary text-primary-foreground" 
              : "bg-background/80 hover:bg-primary/20"
          }`}
        >
          <Heart className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
        </button>

        <div className="absolute bottom-3 left-3">
          <span className="genre-tag active">{event.genre}</span>
        </div>
      </div>

      <div className="p-4">
        <h3 className="font-heading font-semibold text-foreground mb-2 truncate group-hover:text-primary transition-colors">
          {event.name}
        </h3>
        <p className="text-sm text-muted-foreground mb-1">
          {event.date} • {event.time}
        </p>
        <p className="text-sm text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5" />
          {event.venue}
        </p>
        {event.price && (
          <p className="text-primary font-semibold text-sm mt-2">{event.price}</p>
        )}
      </div>
    </motion.div>
  );
};

export default Explore;
