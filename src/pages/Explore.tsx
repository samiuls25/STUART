import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, X } from "lucide-react";
import React from "react";
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

const searchPlaceholders = [
  "free concerts this weekend",
  "things to do tonight",
  "outdoor events near me",
  "jazz clubs in village",
  "family-friendly activities",
];

const Explore = () => {
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

  useEffect(() => {
    fetchEvents()
      .then((data) => {
        console.log("Fetched events from Supabase:", data);
        if (data.length > 0) {
          console.log("First event object:", data[0]);
          Object.entries(data[0]).forEach(([k, v]) => console.log(`${k}:`, v));
        }
        setEvents(data);
      })
      .finally(() => setLoading(false));
}, []);

console.log("Filter state:", {
  selectedSegment,
  selectedGenre,
  selectedPrice,
  selectedTime,
  selectedDistance,
  selectedMood,
  searchQuery,
});

  const filteredEvents = useMemo(() => {
    const filtered = events.filter((event) => {
      const matchesSegment =
        selectedSegment === "All" || event.segment === selectedSegment;
      const matchesGenre =
        selectedGenre === "All" || event.genre === selectedGenre;
      const matchesPrice =
        selectedPrice === "All" ||
        (selectedPrice === "Free" && event.priceLevel === "free") ||
        event.priceLevel === selectedPrice;
      const matchesDistance =
        !event.distance || event.distance <= selectedDistance;
      const matchesTime =
        selectedTime === "All" ||
        (selectedTime === "Now" && event.happeningNow) ||
        (selectedTime === "Tonight" && event.isTonight) ||
        (!event.happeningNow && !event.isTonight);
      const matchesSearch =
        searchQuery === "" ||
        (event.name && event.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.venue && event.venue.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (event.genre && event.genre.toLowerCase().includes(searchQuery.toLowerCase()));
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
        matchesSearch &&
        matchesMood
      );
    });
    console.log("Filtered events:", filtered);
    return filtered;
  }, [
    events,
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
  };

  const handleSearchArea = () => {
    setSelectedSegment("All");
    setSelectedGenre("All");
    setSelectedPrice("All");
    setSelectedTime("All");
    setSelectedMood(null);
    setSearchQuery("");
  };

  const handleBuildPlan = () => {
    toast({
      title: "Building your perfect plan...",
      description: "STUART is creating a personalized itinerary for you.",
    });
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
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={`Try "${searchPlaceholders[placeholderIndex]}"`}
                  className="input-field w-full pl-14 pr-12 py-4 text-base rounded-2xl shadow-lg shadow-primary/5"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>

              {/* Mood Selector */}
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm text-muted-foreground">What's your vibe today?</p>
                <MoodSelector selectedMood={selectedMood} onMoodChange={setSelectedMood} />
              </div>
            </motion.div>
          </div>
        </motion.section>

        {/* Weather + Filters */}
        <section className="max-w-7xl mx-auto px-6">
          <div className="flex items-center gap-4 mb-6">
            <WeatherIndicator className="flex-shrink-0" />
            <div className="flex-1" />
          </div>
          
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
        </section>

        {/* Content Sections */}
        <section className="max-w-7xl mx-auto px-6 py-8">
          {/* Plan Builder */}
          <PlanBuilderCard onBuildPlan={handleBuildPlan} />
          
          {/* Trending Section */}
          <TrendingSection events={events} onEventClick={handleEventClick} />
          
          {/* Recommended Section */}
          <RecommendedSection events={events} onEventClick={handleEventClick} />

          {/* All Events Grid */}
          <div className="mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">
              All Events
            </h2>
          </div>
          
          {filteredEvents.length > 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {filteredEvents.map((event, index) => (
                <EventCardGrid
                  key={event.id}
                  event={event}
                  onClick={handleEventClick}
                  index={index}
                />
              ))}
            </motion.div>
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
          {event.isTrending && (
            <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded-full">
              🔥 #{event.trendingRank}
            </span>
          )}
        </div>
        
        {/* Distance Badge */}
        {event.distance && (
          <div className="absolute top-3 right-3 px-2 py-0.5 bg-background/80 backdrop-blur-sm text-[10px] font-medium rounded-full text-foreground">
            {event.distance} mi
          </div>
        )}
        
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="genre-tag active">{event.genre}</span>
          {event.isRecommended && (
            <span className="px-2 py-0.5 bg-primary/90 text-primary-foreground text-[10px] font-bold rounded-full">
              ★ For You
            </span>
          )}
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
        <div className="flex items-center justify-between mt-2">
          {event.price && (
            <p className={`font-semibold text-sm ${event.priceLevel === 'free' ? 'text-green-500' : 'text-primary'}`}>
              {event.priceLevel === 'free' ? 'Free' : event.price}
            </p>
          )}
          {event.travelTime && (
            <span className="text-xs text-muted-foreground">
              ~{event.travelTime} min away
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Explore;
