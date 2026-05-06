import { supabase } from "./supabase.ts";

const SESSION_STORAGE_KEY = "stuart.analytics.session.v1";
const SESSION_START_FLAG = "stuart.analytics.session_start_sent.v1";
const THEME_SNAPSHOT_FLAG = "stuart.analytics.theme_snapshot_sent.v1";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

/** Stable tab-scoped id for correlating anonymous events (sessionStorage). */
export function getAnalyticsSessionId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

/** One row per browser tab session for coarse DAU/WAU proxies. */
export function trackSessionStartIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(SESSION_START_FLAG)) return;
    sessionStorage.setItem(SESSION_START_FLAG, "1");
    trackAnalytics("session_start", {});
  } catch {
    trackAnalytics("session_start", {});
  }
}

/** Once per tab: resolved light/dark on DOM after `initializeDocumentTheme()` (see `main.tsx`). */
export function trackThemeSnapshotIfNeeded(): void {
  if (typeof window === "undefined") return;
  try {
    if (sessionStorage.getItem(THEME_SNAPSHOT_FLAG)) return;
    sessionStorage.setItem(THEME_SNAPSHOT_FLAG, "1");
    const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";
    trackAnalytics("theme_snapshot", { theme });
  } catch {
    trackAnalytics("theme_snapshot", { theme: "unknown" });
  }
}

function sanitizeProps(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input)) {
    if (v === undefined || typeof v === "function") continue;
    if (typeof v === "string") {
      out[k] = v.length > 512 ? `${v.slice(0, 509)}...` : v;
      continue;
    }
    if (
      typeof v === "number"
      && (Number.isFinite(v) || Number.isNaN(v))
    ) {
      out[k] = Number.isNaN(v) ? null : v;
      continue;
    }
    if (typeof v === "boolean") {
      out[k] = v;
      continue;
    }
    if (v === null) {
      out[k] = null;
      continue;
    }
    try {
      JSON.stringify(v);
      out[k] = v as unknown;
    } catch {
      /* skip non-serializable */
    }
  }
  return out;
}

function clampEventName(name: string): string {
  const trimmed = name.trim().slice(0, 128);
  return trimmed || "unknown";
}

async function resolveUserId(): Promise<string | null> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.user?.id ?? null;
  } catch {
    return null;
  }
}

export type TrackAnalyticsOptions = {
  /** Use fetch keepalive for unload-sensitive callers (optional). */
  keepalive?: boolean;
};

/**
 * Fire-and-forget analytics enqueue. Never throws to callers.
 * Uses PostgREST insert with current JWT (anon or user).
 */
export function trackAnalytics(
  eventName: string,
  props: Record<string, unknown> = {},
  options?: TrackAnalyticsOptions,
): void {
  void enqueueAnalytics(eventName, props, options);
}

async function enqueueAnalytics(
  eventName: string,
  props: Record<string, unknown>,
  options?: TrackAnalyticsOptions,
): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return;

  const userId = await resolveUserId();
  const sessionId = getAnalyticsSessionId();
  const payload = {
    session_id: sessionId,
    user_id: userId,
    event_name: clampEventName(eventName),
    props: sanitizeProps(props),
  };

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token ?? SUPABASE_ANON_KEY;

    const url = `${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/analytics_events`;
    const body = JSON.stringify(payload);

    await fetch(url, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body,
      keepalive: Boolean(options?.keepalive),
    });
  } catch {
    /* intentionally silent */
  }
}
