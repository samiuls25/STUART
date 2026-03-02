import { parseISO, startOfDay, nextSaturday, nextSunday, addDays } from "date-fns";

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
