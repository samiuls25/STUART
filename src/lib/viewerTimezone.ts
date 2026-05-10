import { format, parseISO } from "date-fns";
import type { Event } from "../data/events";

/**
 * Hangout schedule is stored as YYYY-MM-DD + clock strings (no separate timezone field).
 * Pickers and labels follow the viewer's device timezone; this surfaces that in the UI.
 */
export function getViewerTimezoneDisplay(): {
  iana: string;
  abbrev: string;
  genericLong: string;
} {
  const iana = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  let abbrev = "";
  let genericLong = "";
  try {
    const now = new Date();
    abbrev =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "shortGeneric" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
    genericLong =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "longGeneric" })
        .formatToParts(now)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    /* ignore */
  }
  return { iana, abbrev, genericLong };
}

/** Format an ISO instant in the viewer's local zone, including a zone tag (e.g. confirmation timestamps). */
export function formatIsoInstantInViewerTimezone(iso: string): string {
  const d = parseISO(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const base = format(d, "MMM d, yyyy 'at' h:mm a");
  let tz = "";
  try {
    tz =
      new Intl.DateTimeFormat(undefined, { timeZoneName: "shortGeneric" })
        .formatToParts(d)
        .find((p) => p.type === "timeZoneName")?.value ?? "";
  } catch {
    /* ignore */
  }
  return tz ? `${base} ${tz}` : base;
}

/** Short caption for Explore/Map listings — Ticketmaster supplies venue-local date/time. */
export function eventListingTimeCaption(event: Pick<Event, "source" | "venueTimezone">): string | null {
  const raw = event.venueTimezone?.trim();
  if (raw) {
    return `Venue local · ${raw.replace(/_/g, " ")}`;
  }
  if (event.source === "ticketmaster") {
    return "Venue local time";
  }
  return null;
}
