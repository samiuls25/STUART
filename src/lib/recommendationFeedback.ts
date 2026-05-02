import { supabase } from "./supabase";

export type RecommendationFeedbackType =
  | "more"
  | "not-interested"
  | "too-expensive"
  | "too-far";

const STORAGE_KEY = "stuart.recommendationFeedback.v1";

interface StoredFeedbackEntry {
  eventId: string;
  feedback: RecommendationFeedbackType;
  createdAt: string;
}

const readLocalFeedback = (): StoredFeedbackEntry[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is StoredFeedbackEntry =>
        typeof item?.eventId === "string" &&
        typeof item?.feedback === "string" &&
        typeof item?.createdAt === "string",
    );
  } catch {
    return [];
  }
};

const writeLocalFeedback = (entries: StoredFeedbackEntry[]): void => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Storage may be full or disabled (private mode). Failure here is non-fatal.
  }
};

const upsertLocalFeedback = (entry: StoredFeedbackEntry): void => {
  const existing = readLocalFeedback();
  const next = existing.filter((row) => row.eventId !== entry.eventId);
  next.unshift(entry);
  writeLocalFeedback(next.slice(0, 500));
};

const isMissingTableError = (error: { code?: string; message?: string } | null): boolean => {
  if (!error) return false;
  if (error.code === "42P01" || error.code === "PGRST205" || error.code === "PGRST204") {
    return true;
  }
  return /relation .* does not exist|could not find the table|schema cache/i.test(
    error.message || "",
  );
};

/**
 * Record a user's feedback on a recommended event.
 *
 * Always writes to localStorage for immediate, offline-friendly persistence.
 * Additionally attempts a best-effort write to the optional
 * `event_recommendation_feedback` table; if the table doesn't exist or RLS
 * blocks the insert, the local copy is still preserved.
 */
export async function recordRecommendationFeedback(
  eventId: string,
  feedback: RecommendationFeedbackType,
): Promise<void> {
  const createdAt = new Date().toISOString();
  upsertLocalFeedback({ eventId, feedback, createdAt });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("event_recommendation_feedback")
      .upsert(
        {
          user_id: user.id,
          event_id: eventId,
          feedback,
          created_at: createdAt,
        },
        { onConflict: "user_id,event_id" },
      );

    if (error && !isMissingTableError(error)) {
      console.warn("Failed to persist recommendation feedback to Supabase:", error.message);
    }
  } catch (err) {
    // Auth failure or transient network issue — local copy already saved.
    console.warn("Recommendation feedback Supabase write skipped:", err);
  }
}

export function getLocalFeedbackForEvent(eventId: string): RecommendationFeedbackType | null {
  const match = readLocalFeedback().find((row) => row.eventId === eventId);
  return match ? match.feedback : null;
}

export function getAllLocalFeedback(): StoredFeedbackEntry[] {
  return readLocalFeedback();
}
