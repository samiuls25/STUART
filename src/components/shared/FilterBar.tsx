import React from "react";
import { motion } from "framer-motion";
import { ChevronDown, Filter, RefreshCw, MapPin, Clock, DollarSign } from "lucide-react";
import { segments, genres, priceLevels, timeFilters, distanceOptions } from "../../data/events";

interface FilterBarProps {
  selectedSegment: string;
  selectedGenre: string;
  selectedPrice?: string;
  selectedTime?: string;
  selectedDistance?: number;
  onSegmentChange: (segment: string) => void;
  onGenreChange: (genre: string) => void;
  onPriceChange?: (price: string) => void;
  onTimeChange?: (time: string) => void;
  onDistanceChange?: (distance: number) => void;
  onSearchArea: () => void;
  eventCount: number;
  showAdvancedFilters?: boolean;
}

const FilterBar = ({
  selectedSegment,
  selectedGenre,
  selectedPrice = "All",
  selectedTime = "All",
  selectedDistance = 5,
  onSegmentChange,
  onGenreChange,
  onPriceChange,
  onTimeChange,
  onDistanceChange,
  onSearchArea,
  eventCount,
  showAdvancedFilters = true,
}: FilterBarProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="flex flex-wrap items-center gap-3 p-4 border-b border-border"
    >
      {/* Segment Filter */}
      <div className="relative">
        <select
          value={selectedSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="appearance-none bg-secondary text-secondary-foreground px-4 py-2 pr-10 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {segments.map((segment) => (
            <option key={segment} value={segment}>
              {segment === "All" ? "All Categories" : segment}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Genre Filter */}
      <div className="relative">
        <select
          value={selectedGenre}
          onChange={(e) => onGenreChange(e.target.value)}
          className="appearance-none bg-secondary text-secondary-foreground px-4 py-2 pr-10 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {genres.map((genre) => (
            <option key={genre} value={genre}>
              {genre === "All" ? "All Genres" : genre}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
      </div>

      {/* Price Filter */}
      {showAdvancedFilters && onPriceChange && (
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={selectedPrice}
            onChange={(e) => onPriceChange(e.target.value)}
            className="appearance-none bg-secondary text-secondary-foreground pl-9 pr-10 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {priceLevels.map((price) => (
              <option key={price} value={price}>
                {price === "All" ? "Any Price" : price}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Time Filter */}
      {showAdvancedFilters && onTimeChange && (
        <div className="relative">
          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={selectedTime}
            onChange={(e) => onTimeChange(e.target.value)}
            className="appearance-none bg-secondary text-secondary-foreground pl-9 pr-10 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {timeFilters.map((time) => (
              <option key={time} value={time}>
                {time === "All" ? "Any Time" : time}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Distance Filter */}
      {showAdvancedFilters && onDistanceChange && (
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <select
            value={selectedDistance}
            onChange={(e) => onDistanceChange(Number(e.target.value))}
            className="appearance-none bg-secondary text-secondary-foreground pl-9 pr-10 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {distanceOptions.map((distance) => (
              <option key={distance} value={distance}>
                Within {distance} mi
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Search This Area Button */}
      <button
        onClick={onSearchArea}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <RefreshCw className="w-4 h-4" />
        Search this area
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Event Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Filter className="w-4 h-4" />
        <span>
          <span className="font-semibold text-foreground">{eventCount}</span>{" "}
          events found
        </span>
      </div>
    </motion.div>
  );
};

export default FilterBar;
