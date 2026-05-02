import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, Filter, RefreshCw, MapPin, Clock, DollarSign } from "lucide-react";
import { segments, genres, priceLevels, timeFilters, distanceRadiusMilesOptions } from "../../data/events";
import { cn } from "../../lib/utils";

interface FilterBarProps {
  selectedSegment: string;
  selectedGenre: string;
  selectedPrice?: string;
  selectedTime?: string;
  selectedDistance?: number | null;
  onSegmentChange: (segment: string) => void;
  onGenreChange: (genre: string) => void;
  onPriceChange?: (price: string) => void;
  onTimeChange?: (time: string) => void;
  onDistanceChange?: (distance: number | null) => void;
  onSearchArea: () => void;
  eventCount: number;
  showAdvancedFilters?: boolean;
  /**
   * Optional live counts for each segment/genre derived from currently loaded
   * events. When provided, the dropdowns include data-driven entries that
   * aren't in the canonical hardcoded list, show counts inline, and disable
   * options that would yield zero results.
   */
  segmentCounts?: Record<string, number>;
  genreCounts?: Record<string, number>;
}

interface DropdownOption {
  value: string;
  label: string;
  disabled: boolean;
}

const buildDynamicOptions = (
  canonical: string[],
  counts: Record<string, number> | undefined,
  formatLabel: (value: string, count: number | undefined) => string,
): DropdownOption[] => {
  if (!counts) {
    return canonical.map((value) => ({
      value,
      label: formatLabel(value, undefined),
      disabled: false,
    }));
  }

  // Union of canonical (preserves intentional ordering for known values) and
  // any data-only values, sorted alphabetically among the data-only set.
  const seen = new Set<string>();
  const ordered: string[] = [];

  canonical.forEach((value) => {
    if (!seen.has(value)) {
      ordered.push(value);
      seen.add(value);
    }
  });

  Object.keys(counts)
    .filter((value) => value && value !== "All")
    .sort((a, b) => a.localeCompare(b))
    .forEach((value) => {
      if (!seen.has(value)) {
        ordered.push(value);
        seen.add(value);
      }
    });

  return ordered.map((value) => {
    const count = value === "All" ? undefined : counts[value] ?? 0;
    return {
      value,
      label: formatLabel(value, count),
      // "All" never disables; everything else disables when count would be 0.
      disabled: value !== "All" && (count ?? 0) === 0,
    };
  });
};

const FilterBar = ({
  selectedSegment,
  selectedGenre,
  selectedPrice = "All",
  selectedTime = "All",
  selectedDistance = null,
  onSegmentChange,
  onGenreChange,
  onPriceChange,
  onTimeChange,
  onDistanceChange,
  onSearchArea,
  eventCount,
  showAdvancedFilters = true,
  segmentCounts,
  genreCounts,
}: FilterBarProps) => {
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const segmentOptions = useMemo(
    () =>
      buildDynamicOptions(segments, segmentCounts, (value, count) => {
        const display = value === "All" ? "All Categories" : value;
        return count != null ? `${display} (${count})` : display;
      }),
    [segmentCounts],
  );

  const genreOptions = useMemo(
    () =>
      buildDynamicOptions(genres, genreCounts, (value, count) => {
        const display = value === "All" ? "All Genres" : value;
        return count != null ? `${display} (${count})` : display;
      }),
    [genreCounts],
  );

  const mobileSelectClass =
    "w-full appearance-none bg-secondary text-secondary-foreground py-1.5 px-2 pr-8 rounded-md text-xs font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50";
  const mobileSelectIconPad = "pl-7";

  return (
    <>
      {/* Mobile: compact collapsed bar - expanded filters steal list space on Map view */}
      <div className="border-b border-border md:hidden">
        <button
          type="button"
          onClick={() => setMobileFiltersOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/40 transition-colors"
        >
          <span className="flex items-center gap-2 text-muted-foreground min-w-0">
            <Filter className="w-4 h-4 shrink-0" />
            <span className="truncate">
              <span className="font-semibold text-foreground">{eventCount}</span> events
              {!mobileFiltersOpen && (
                <span className="text-muted-foreground font-normal">
                  {" · "}
                  <span className="text-xs">tap to filter</span>
                </span>
              )}
            </span>
          </span>
          <span className="flex items-center gap-1 shrink-0 text-xs font-medium text-primary">
            {mobileFiltersOpen ? "Hide" : "Filters"}
            <ChevronDown className={cn("w-4 h-4 transition-transform", mobileFiltersOpen && "rotate-180")} />
          </span>
        </button>

        {mobileFiltersOpen && (
          <div className="grid grid-cols-2 gap-2 border-t border-border bg-card/40 px-3 pb-3 pt-2">
            <div className="relative col-span-2">
              <select
                value={selectedSegment}
                onChange={(e) => onSegmentChange(e.target.value)}
                className={mobileSelectClass}
              >
                {segmentOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>
            <div className="relative col-span-2">
              <select
                value={selectedGenre}
                onChange={(e) => onGenreChange(e.target.value)}
                className={mobileSelectClass}
              >
                {genreOptions.map((option) => (
                  <option key={option.value} value={option.value} disabled={option.disabled}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            </div>

            {showAdvancedFilters && onPriceChange && (
              <div className="relative col-span-1 min-w-0">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedPrice}
                  onChange={(e) => onPriceChange(e.target.value)}
                  className={cn(mobileSelectClass, mobileSelectIconPad)}
                >
                  {priceLevels.map((price) => (
                    <option key={price} value={price}>
                      {price === "All" ? "Any Price" : price}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {showAdvancedFilters && onTimeChange && (
              <div className="relative col-span-1 min-w-0">
                <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedTime}
                  onChange={(e) => onTimeChange(e.target.value)}
                  className={cn(mobileSelectClass, mobileSelectIconPad)}
                >
                  {timeFilters.map((time) => (
                    <option key={time} value={time}>
                      {time === "All" ? "Any Time" : time}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            {showAdvancedFilters && onDistanceChange && (
              <div className="relative col-span-2">
                <MapPin className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <select
                  value={selectedDistance === null || selectedDistance === undefined ? "" : String(selectedDistance)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onDistanceChange(raw === "" ? null : Number(raw));
                  }}
                  className={cn(mobileSelectClass, mobileSelectIconPad)}
                >
                  <option value="">Any distance</option>
                  {distanceRadiusMilesOptions.map((distance) => (
                    <option key={distance} value={String(distance)}>
                      Within {distance} mi
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              </div>
            )}

            <button
              type="button"
              onClick={onSearchArea}
              className="col-span-2 flex items-center justify-center gap-2 rounded-md border border-primary/25 bg-primary/10 py-2 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop / tablet */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="hidden md:flex flex-wrap items-center gap-3 p-4 border-b border-border"
      >
      {/* Segment Filter */}
      <div className="relative">
        <select
          value={selectedSegment}
          onChange={(e) => onSegmentChange(e.target.value)}
          className="appearance-none bg-secondary text-secondary-foreground px-4 py-2 pr-10 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          {segmentOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
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
          {genreOptions.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
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
            value={selectedDistance === null || selectedDistance === undefined ? "" : String(selectedDistance)}
            onChange={(e) => {
              const raw = e.target.value;
              onDistanceChange(raw === "" ? null : Number(raw));
            }}
            className="appearance-none bg-secondary text-secondary-foreground pl-9 pr-10 py-2 rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors border border-border focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="">Any distance</option>
            {distanceRadiusMilesOptions.map((distance) => (
              <option key={distance} value={String(distance)}>
                Within {distance} mi
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
      )}

      {/* Reset Filters Button */}
      <button
        onClick={onSearchArea}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
      >
        <RefreshCw className="w-4 h-4" />
        Reset filters
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
    </>
  );
};

export default FilterBar;
