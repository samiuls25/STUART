import { supabase } from "./supabase";
import { trackAnalytics } from "./analytics";

const SAVED_IDS_CACHE_TTL_MS = 15000;

let savedIdsCache:
  | {
      userId: string;
      ids: string[];
      fetchedAt: number;
    }
  | null = null;

let inFlightSavedIdsPromise: Promise<string[]> | null = null;
let inFlightUserIdPromise: Promise<string | null> | null = null;

/** Drop cached IDs so the next getSavedEventIds() hits Supabase (avoids stale grid vs modal). */
function clearSavedIdsCache(): void {
  savedIdsCache = null;
}

async function getAuthenticatedUserId(): Promise<string | null> {
  if (inFlightUserIdPromise) {
    return inFlightUserIdPromise;
  }

  inFlightUserIdPromise = (async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return session?.user?.id ?? null;
  })();

  try {
    return await inFlightUserIdPromise;
  } finally {
    inFlightUserIdPromise = null;
  }
}

export async function getSavedEventIds(): Promise<string[]> {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return [];
    }

    const now = Date.now();
    if (
      savedIdsCache &&
      savedIdsCache.userId === userId &&
      now - savedIdsCache.fetchedAt < SAVED_IDS_CACHE_TTL_MS
    ) {
      return savedIdsCache.ids;
    }

    if (inFlightSavedIdsPromise) {
      return inFlightSavedIdsPromise;
    }

    inFlightSavedIdsPromise = (async () => {
      const { data, error } = await supabase
        .from("saved_events")
        .select("event_id")
        .eq("user_id", userId);

      if (error) {
        console.error("Error fetching saved events:", error);
        return [];
      }

      const ids = data?.map((row) => row.event_id) || [];
      savedIdsCache = {
        userId,
        ids,
        fetchedAt: Date.now(),
      };

      return ids;
    })();

    const ids = await inFlightSavedIdsPromise;
    inFlightSavedIdsPromise = null;

    return ids;
  } catch (error) {
    inFlightSavedIdsPromise = null;
    console.error("Unexpected error in getSavedEventIds:", error);
    return [];
  }
}

export async function saveEvent(eventId: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("saved_events")
    .insert({ user_id: userId, event_id: eventId });

  if (error) {
    const code = (error as { code?: string }).code;
    // Already saved (e.g. grid UI stale after modal save). Treat as success and resync cache.
    if (code === "23505") {
      clearSavedIdsCache();
      return true;
    }
    console.error("Error saving event:", error);
    return false;
  }

  trackAnalytics("event_saved", { event_id: eventId });
  clearSavedIdsCache();

  return true;
}

export async function unsaveEvent(eventId: string): Promise<boolean> {
  const userId = await getAuthenticatedUserId();
  if (!userId) return false;

  const { error } = await supabase
    .from("saved_events")
    .delete()
    .eq("user_id", userId)
    .eq("event_id", eventId);

  if (error) {
    console.error("Error unsaving event:", error);
    return false;
  }

  trackAnalytics("event_unsaved", { event_id: eventId });
  clearSavedIdsCache();

  return true;
}