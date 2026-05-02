import { parseISO, startOfDay, nextSaturday, nextSunday, addDays } from "date-fns";
import type { Event } from "../data/events";

/** Parse event date string (ISO "2024-12-28" or "Dec 28, 2024") to Date or null */
export function parseEventDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  const trimmed = String(dateStr).trim();
  if (!trimmed) return null;
  // ISO format
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    const d = parseISO(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/** True if date falls on Saturday or Sunday of this week or next */
export function isThisWeekend(d: Date | null): boolean {
  if (!d) return false;
  const today = startOfDay(new Date());
  const sat = nextSaturday(today);
  const sun = nextSunday(today);
  const day = startOfDay(d);
  return day.getTime() === sat.getTime() || day.getTime() === sun.getTime();
}

/** True if date is within the next 7 days from today */
export function isThisWeek(d: Date | null): boolean {
  if (!d) return false;
  const today = startOfDay(new Date());
  const weekEnd = addDays(today, 7);
  const day = startOfDay(d);
  return day.getTime() >= today.getTime() && day.getTime() < weekEnd.getTime();
}

/** Haversine distance in miles between two lat/lon points */
export function distanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export interface FilterState {
  segment: string;
  genre: string;
  price: string;
  time: string;
  /** `null` means no distance cap ("Any distance"). */
  distance: number | null;
  userLocation: { lat: number; lon: number } | null;
}

const matchesSegment = (event: Event, value: string) =>
  value === "All" || event.segment === value;

const matchesGenre = (event: Event, value: string) =>
  value === "All" || event.genre === value;

const matchesPrice = (event: Event, value: string) => {
  if (value === "All") return true;
  if (value === "Free") return event.priceLevel === "free";
  return event.priceLevel === value;
};

const matchesTime = (event: Event, value: string) => {
  if (value === "All") return true;
  if (value === "Now") return Boolean(event.happeningNow);
  if (value === "Tonight") return Boolean(event.isTonight);
  const eventDate = parseEventDate(event.date);
  if (value === "This Weekend") return isThisWeekend(eventDate);
  if (value === "This Week") return isThisWeek(eventDate);
  return true;
};

const matchesDistance = (
  event: Event,
  maxDistance: number | null,
  userLocation: FilterState["userLocation"],
) => {
  if (maxDistance == null) return true;

  let eventDistance = event.distance ?? null;
  if (
    userLocation != null &&
    typeof event.latitude === "number" &&
    typeof event.longitude === "number"
  ) {
    eventDistance = distanceMiles(
      userLocation.lat,
      userLocation.lon,
      event.latitude,
      event.longitude,
    );
  }
  return eventDistance == null || eventDistance <= maxDistance;
};

/** Hide events whose calendar date is strictly before today (local timezone). */
export function isEventUpcomingForBrowse(event: Event): boolean {
  const d = parseEventDate(event.date);
  if (!d) return true;
  return startOfDay(d).getTime() >= startOfDay(new Date()).getTime();
}

/** Attach a freshly computed mile distance when lat/lon + userLocation exist. */
export function withComputedDistance(
  event: Event,
  userLocation: { lat: number; lon: number } | null,
): Event {
  if (
    userLocation == null ||
    typeof event.latitude !== "number" ||
    typeof event.longitude !== "number"
  ) {
    return event;
  }
  return {
    ...event,
    distance: distanceMiles(
      userLocation.lat,
      userLocation.lon,
      event.latitude,
      event.longitude,
    ),
  };
}

/**
 * Compute counts of events that would match each segment/genre value if the
 * user changed only that one filter, holding the others constant. This drives
 * the dynamic dropdown labels and disabled state in the FilterBar so users
 * see exactly how many events each option will yield.
 */
export function computeFilterCounts(events: Event[], filters: FilterState) {
  const segmentCounts: Record<string, number> = {};
  const genreCounts: Record<string, number> = {};

  for (const event of events) {
    const passesGenre = matchesGenre(event, filters.genre);
    const passesPrice = matchesPrice(event, filters.price);
    const passesTime = matchesTime(event, filters.time);
    const passesDistance = matchesDistance(event, filters.distance, filters.userLocation);
    const passesSegment = matchesSegment(event, filters.segment);

    // Segment column count: holds genre/price/time/distance, varies segment.
    if (passesGenre && passesPrice && passesTime && passesDistance) {
      segmentCounts.All = (segmentCounts.All ?? 0) + 1;
      const segmentKey = event.segment ?? "Other";
      segmentCounts[segmentKey] = (segmentCounts[segmentKey] ?? 0) + 1;
    }

    // Genre column count: holds segment/price/time/distance, varies genre.
    if (passesSegment && passesPrice && passesTime && passesDistance) {
      genreCounts.All = (genreCounts.All ?? 0) + 1;
      const genreKey = event.genre ?? "Other";
      genreCounts[genreKey] = (genreCounts[genreKey] ?? 0) + 1;
    }
  }

  return { segmentCounts, genreCounts };
}
