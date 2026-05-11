/**
 * Hangouts target NYC / Eastern — one shared convention so invitees aren’t guessing.
 * Stored values are wall-clock strings interpreted as Eastern Time (handles EDT/EST via “ET” in UI).
 */
export const HANGOUT_SCHEDULE_ZONE_IANA = "America/New_York";
export const HANGOUT_SCHEDULE_ZONE_ABBREV = "ET";

export const HANGOUT_SCHEDULE_EXPLAINER_SHORT =
  "All hangout times are Eastern Time (ET) - availability slots, suggestions, and the schedule match for everyone.";

export const HANGOUT_AVAILABILITY_SUBMITTED_CAPTION =
  "This grid uses Eastern Time (ET) hours - the same convention as the hangout schedule.";

export const HANGOUT_AVAILABILITY_EDITOR_CAPTION =
  "Select Eastern Time (ET) hours so your slots line up with everyone else.";

export const HANGOUT_HEATMAP_FOOTER = "Hour labels are Eastern Time (ET).";

/** Confirmation timestamps shown in ET for consistency with scheduling copy. */
export function formatIsoInstantInEastern(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: HANGOUT_SCHEDULE_ZONE_IANA,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "shortGeneric",
    }).format(d);
  } catch {
    return iso;
  }
}
