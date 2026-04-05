import { badgeDefinitions, type Badge } from "../data/badges";
import { type Hangout } from "../data/friends";
import { fetchHangoutsForCurrentUser } from "./hangouts";
import { supabase } from "./supabase";

type BadgeCategory = "social" | "explorer" | "vibe" | "special";

type BadgeDefinitionRuntime = {
  id: string;
  name: string;
  icon: string;
  description: string;
  category: BadgeCategory;
  maxLevel: number;
};

type BadgeId =
  | "night-pulse"
  | "urban-explorer"
  | "sunlit-lounger"
  | "whimsical-wanderer"
  | "social-butterfly"
  | "culture-vulture"
  | "early-bird"
  | "group-guru";

type EventDetail = {
  id: string;
  segment?: string | null;
  genre?: string | null;
  neighborhood?: string | null;
  tags?: string[] | null;
  time?: string | null;
};

type JoinedEventPayload = {
  event_id: string;
  events?:
    | {
        segment?: string | null;
        genre?: string | null;
        neighborhood?: string | null;
        tags?: string[] | null;
        time?: string | null;
      }
    | Array<{
        segment?: string | null;
        genre?: string | null;
        neighborhood?: string | null;
        tags?: string[] | null;
        time?: string | null;
      }>
    | null;
};

type PersistedBadgeRow = {
  badge_type: string;
  title?: string | null;
  description?: string | null;
  icon?: string | null;
  earned_at?: string | null;
  metadata?: {
    level?: number;
    progress?: number;
    unlocked?: boolean;
    category?: string;
    maxLevel?: number;
    signalCount?: number;
    lastComputedAt?: string;
  } | null;
};

type BadgeCatalogRow = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  category: string | null;
  max_level: number | null;
  is_active?: boolean | null;
  sort_order?: number | null;
};

const LEVEL_TARGETS: Record<BadgeId, number[]> = {
  "night-pulse": [2, 5, 10, 18, 30],
  "urban-explorer": [3, 6, 10, 16, 24],
  "sunlit-lounger": [2, 5, 9, 15, 24],
  "whimsical-wanderer": [2, 5, 9, 14, 20],
  "social-butterfly": [3, 6, 10, 15, 22],
  "culture-vulture": [2, 5, 9, 14, 20],
  "early-bird": [2, 5, 10, 16, 24],
  "group-guru": [1, 3, 6, 10, 15],
};

const normalizeBadgeCategory = (value: string | null | undefined): BadgeCategory => {
  if (value === "social" || value === "explorer" || value === "vibe" || value === "special") {
    return value;
  }

  return "special";
};

const toRuntimeDefinition = (row: BadgeCatalogRow): BadgeDefinitionRuntime => {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || "🏅",
    description: row.description || "",
    category: normalizeBadgeCategory(row.category),
    maxLevel: Number.isFinite(row.max_level) && (row.max_level || 0) > 0 ? Number(row.max_level) : 5,
  };
};

const getFallbackDefinitions = (): BadgeDefinitionRuntime[] => {
  return badgeDefinitions.map((badge) => ({
    id: badge.id,
    name: badge.name,
    icon: badge.icon,
    description: badge.description,
    category: badge.category,
    maxLevel: badge.maxLevel,
  }));
};

const fetchBadgeCatalogDefinitions = async (): Promise<BadgeDefinitionRuntime[]> => {
  const { data, error } = await supabase
    .from("badge_catalog")
    .select("id,name,icon,description,category,max_level,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return getFallbackDefinitions();
  }

  return (data as BadgeCatalogRow[]).map(toRuntimeDefinition);
};

const POSITIVE_RESPONSE_STATUSES = new Set(["yes", "maybe", "pending-availability"]);

const CULTURE_GENRES = ["musical", "theater", "exhibition", "comedy", "opera", "dance", "jazz"];

const parseHour = (rawTime: string | null | undefined): number | null => {
  if (!rawTime) return null;

  const value = rawTime.trim().toLowerCase();

  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/i);
  if (twelveHour) {
    const hourPart = Number(twelveHour[1]);
    const meridiem = twelveHour[3].toLowerCase();
    if (Number.isNaN(hourPart)) return null;

    if (meridiem === "am") {
      return hourPart % 12;
    }

    return (hourPart % 12) + 12;
  }

  const twentyFourHour = value.match(/^(\d{1,2})(?::\d{2})?/);
  if (!twentyFourHour) return null;

  const hour = Number(twentyFourHour[1]);
  if (Number.isNaN(hour) || hour < 0 || hour > 23) return null;
  return hour;
};

const isNightHour = (hour: number | null): boolean => {
  if (hour === null) return false;
  return hour >= 20 || hour <= 2;
};

const isEarlyHour = (hour: number | null): boolean => {
  if (hour === null) return false;
  return hour >= 5 && hour <= 10;
};

const isDaylightHour = (hour: number | null): boolean => {
  if (hour === null) return false;
  return hour >= 10 && hour <= 17;
};

const getLevelAndProgress = (count: number, targets: number[]) => {
  let level = 0;

  targets.forEach((target, index) => {
    if (count >= target) {
      level = index + 1;
    }
  });

  if (level >= targets.length) {
    return {
      level,
      progress: 100,
    };
  }

  const previousTarget = level === 0 ? 0 : targets[level - 1];
  const nextTarget = targets[level];
  const span = Math.max(1, nextTarget - previousTarget);
  const relativeProgress = ((count - previousTarget) / span) * 100;

  return {
    level,
    progress: Math.max(0, Math.min(99, Math.round(relativeProgress))),
  };
};

const isParticipatingInHangout = (hangout: Hangout, userId: string): boolean => {
  if (hangout.createdBy === userId) return true;

  const response = hangout.responses.find((item) => item.friendId === userId);
  if (!response) return false;

  return POSITIVE_RESPONSE_STATUSES.has(response.status);
};

const normalizeJoinedEvent = (row: JoinedEventPayload): EventDetail => {
  const nestedEvent = Array.isArray(row.events) ? row.events[0] : row.events;

  return {
    id: row.event_id,
    segment: nestedEvent?.segment ?? null,
    genre: nestedEvent?.genre ?? null,
    neighborhood: nestedEvent?.neighborhood ?? null,
    tags: nestedEvent?.tags ?? null,
    time: nestedEvent?.time ?? null,
  };
};

const fetchSavedEvents = async (userId: string): Promise<EventDetail[]> => {
  const { data, error } = await supabase
    .from("saved_events")
    .select("event_id, events(segment, genre, neighborhood, tags, time)")
    .eq("user_id", userId);

  if (!error && data) {
    return data.map((row: JoinedEventPayload) => normalizeJoinedEvent(row));
  }

  const { data: savedRows, error: savedError } = await supabase
    .from("saved_events")
    .select("event_id")
    .eq("user_id", userId);

  if (savedError || !savedRows || savedRows.length === 0) {
    return [];
  }

  const eventIds = [...new Set(savedRows.map((row) => row.event_id).filter(Boolean))];
  if (eventIds.length === 0) {
    return [];
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("id, segment, genre, neighborhood, tags, time")
    .in("id", eventIds);

  if (eventsError || !eventsData) {
    return [];
  }

  const byId = new Map(eventsData.map((row) => [row.id, row]));

  return eventIds.map((id) => {
    const event = byId.get(id);
    return {
      id,
      segment: event?.segment ?? null,
      genre: event?.genre ?? null,
      neighborhood: event?.neighborhood ?? null,
      tags: event?.tags ?? null,
      time: event?.time ?? null,
    };
  });
};

const fetchViewedEvents = async (userId: string): Promise<EventDetail[]> => {
  const { data: viewRows, error: viewsError } = await supabase
    .from("event_views")
    .select("event_id")
    .eq("user_id", userId);

  if (viewsError || !viewRows || viewRows.length === 0) {
    return [];
  }

  const eventIds = [...new Set(viewRows.map((row) => row.event_id).filter(Boolean))];
  if (eventIds.length === 0) {
    return [];
  }

  const { data: eventsData, error: eventsError } = await supabase
    .from("events")
    .select("id, segment, genre, neighborhood, tags, time")
    .in("id", eventIds);

  if (eventsError || !eventsData) {
    return eventIds.map((id) => ({ id }));
  }

  const byId = new Map(eventsData.map((row) => [row.id, row]));

  return eventIds.map((id) => {
    const event = byId.get(id);
    return {
      id,
      segment: event?.segment ?? null,
      genre: event?.genre ?? null,
      neighborhood: event?.neighborhood ?? null,
      tags: event?.tags ?? null,
      time: event?.time ?? null,
    };
  });
};

const fetchPersistedBadgeRows = async (userId: string): Promise<PersistedBadgeRow[]> => {
  const { data, error } = await supabase
    .from("badges")
    .select("badge_type, title, description, icon, earned_at, metadata")
    .eq("user_id", userId);

  if (error || !data) {
    return [];
  }

  return data as PersistedBadgeRow[];
};

const normalizeCategory = (value: string | undefined, fallback: Badge["category"]): Badge["category"] => {
  if (value === "social" || value === "explorer" || value === "vibe" || value === "special") {
    return value;
  }

  return fallback;
};

const mapPersistedRowsToBadges = (
  definitions: BadgeDefinitionRuntime[],
  rows: PersistedBadgeRow[],
  fallbackById: Map<string, Badge>
): Badge[] => {
  const byType = new Map(rows.map((row) => [row.badge_type, row]));

  return definitions.map((definition) => {
    const row = byType.get(definition.id);
    const fallback = fallbackById.get(definition.id) || {
      ...definition,
      level: 0,
      progress: 0,
      unlocked: false,
    };

    const rowLevel = Number(row?.metadata?.level);
    const rowProgress = Number(row?.metadata?.progress);
    const rowMaxLevel = Number(row?.metadata?.maxLevel);
    const rowUnlocked = row?.metadata?.unlocked;

    const level = Number.isFinite(rowLevel) ? Math.max(0, Math.floor(rowLevel)) : fallback.level;
    const progress = Number.isFinite(rowProgress)
      ? Math.max(0, Math.min(100, Math.floor(rowProgress)))
      : fallback.progress;

    const maxLevel = Number.isFinite(rowMaxLevel) && rowMaxLevel > 0
      ? Math.floor(rowMaxLevel)
      : fallback.maxLevel;

    const unlocked = typeof rowUnlocked === "boolean" ? rowUnlocked : fallback.unlocked;

    return {
      ...definition,
      name: row?.title || definition.name,
      description: row?.description || definition.description,
      icon: row?.icon || definition.icon,
      category: normalizeCategory(row?.metadata?.category, definition.category),
      maxLevel,
      level,
      progress,
      unlocked,
      unlockedAt: unlocked ? formatEarnedAt(row?.earned_at || undefined) : undefined,
    };
  });
};

const syncBadgesToSupabase = async (
  userId: string,
  badges: Badge[],
  persistedRows: PersistedBadgeRow[]
): Promise<void> => {
  const persistedByType = new Map(persistedRows.map((row) => [row.badge_type, row]));
  const nowIso = new Date().toISOString();

  const rows = badges.map((badge) => {
    const existing = persistedByType.get(badge.id);
    const earnedAt = existing?.earned_at || (badge.unlocked ? nowIso : nowIso);

    return {
      user_id: userId,
      badge_type: badge.id,
      title: badge.name,
      description: badge.description,
      icon: badge.icon,
      earned_at: earnedAt,
      metadata: {
        level: badge.level,
        progress: badge.progress,
        unlocked: badge.unlocked,
        category: badge.category,
        maxLevel: badge.maxLevel,
        lastComputedAt: nowIso,
      },
    };
  });

  const { error } = await supabase
    .from("badges")
    .upsert(rows, { onConflict: "user_id,badge_type" });

  if (error) {
    console.warn("Failed to sync badges table", error);
  }
};

const formatEarnedAt = (earnedAt: string | undefined) => {
  if (!earnedAt) return undefined;

  const parsed = new Date(earnedAt);
  if (Number.isNaN(parsed.getTime())) return undefined;

  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const runtimeDefinitions = await fetchBadgeCatalogDefinitions();

  if (!userId) {
    return runtimeDefinitions.map((definition) => ({
      ...definition,
      level: 0,
      progress: 0,
      unlocked: false,
    }));
  }

  const [hangouts, savedEvents, viewedEvents, persistedRows] = await Promise.all([
    fetchHangoutsForCurrentUser(),
    fetchSavedEvents(userId),
    fetchViewedEvents(userId),
    fetchPersistedBadgeRows(userId),
  ]);

  const participatingHangouts = hangouts.filter((hangout) => isParticipatingInHangout(hangout, userId));

  const attendedHangouts = participatingHangouts.filter(
    (hangout) => hangout.status === "confirmed" || hangout.status === "completed"
  );

  const createdHangouts = hangouts.filter((hangout) => hangout.createdBy === userId);
  const interactedEventsById = new Map<string, EventDetail>();

  [...savedEvents, ...viewedEvents].forEach((event) => {
    interactedEventsById.set(event.id, event);
  });

  const interactedEvents = [...interactedEventsById.values()];

  const uniqueNeighborhoods = new Set<string>();
  interactedEvents.forEach((event) => {
    const neighborhood = event.neighborhood?.trim();
    if (neighborhood) uniqueNeighborhoods.add(neighborhood);
  });
  participatingHangouts.forEach((hangout) => {
    const place = hangout.location?.name?.trim();
    if (place) uniqueNeighborhoods.add(place);
  });

  const uniqueActivityTypes = new Set(participatingHangouts.map((hangout) => hangout.activityType));
  const publicHangoutCount = participatingHangouts.filter((hangout) => hangout.isPublic).length;

  const uniqueSocialConnections = new Set<string>();
  participatingHangouts.forEach((hangout) => {
    if (hangout.createdBy !== userId) {
      uniqueSocialConnections.add(hangout.createdBy);
    }

    hangout.responses.forEach((response) => {
      if (response.friendId === userId) return;
      if (POSITIVE_RESPONSE_STATUSES.has(response.status)) {
        uniqueSocialConnections.add(response.friendId);
      }
    });
  });

  const hostedGroupHangoutCount = createdHangouts.filter((hangout) => {
    const attendeeIds = new Set<string>([userId]);

    hangout.responses.forEach((response) => {
      if (POSITIVE_RESPONSE_STATUSES.has(response.status)) {
        attendeeIds.add(response.friendId);
      }
    });

    return attendeeIds.size >= 3;
  }).length;

  const hangoutNightCount = attendedHangouts.filter((hangout) => {
    const startTime = hangout.confirmedTime?.startTime ?? hangout.proposedTimeRange.startTime;
    return isNightHour(parseHour(startTime));
  }).length;

  const hangoutEarlyCount = attendedHangouts.filter((hangout) => {
    const startTime = hangout.confirmedTime?.startTime ?? hangout.proposedTimeRange.startTime;
    return isEarlyHour(parseHour(startTime));
  }).length;

  const hangoutSunlitCount = attendedHangouts.filter((hangout) => {
    const startTime = hangout.confirmedTime?.startTime ?? hangout.proposedTimeRange.startTime;
    return hangout.activityType === "outdoor" && isDaylightHour(parseHour(startTime));
  }).length;

  const eventNightCount = interactedEvents.filter((event) => isNightHour(parseHour(event.time))).length;
  const eventEarlyCount = interactedEvents.filter((event) => isEarlyHour(parseHour(event.time))).length;

  const eventCultureCount = interactedEvents.filter((event) => {
    const segment = (event.segment || "").toLowerCase();
    const genre = (event.genre || "").toLowerCase();

    if (segment === "arts") return true;
    return CULTURE_GENRES.some((candidate) => genre.includes(candidate));
  }).length;

  const creativeHangoutCount = attendedHangouts.filter((hangout) => hangout.activityType === "creative").length;

  const counters: Record<BadgeId, number> = {
    "night-pulse": hangoutNightCount + eventNightCount,
    "urban-explorer": uniqueNeighborhoods.size,
    "sunlit-lounger": hangoutSunlitCount,
    "whimsical-wanderer": uniqueActivityTypes.size + publicHangoutCount,
    "social-butterfly": uniqueSocialConnections.size,
    "culture-vulture": eventCultureCount + creativeHangoutCount,
    "early-bird": hangoutEarlyCount + eventEarlyCount,
    "group-guru": hostedGroupHangoutCount,
  };

  const persistedByType = new Map<string, PersistedBadgeRow>(persistedRows.map((row) => [row.badge_type, row]));

  const computedBadges = runtimeDefinitions.map((definition) => {
    const badgeId = definition.id as BadgeId;
    const targetLevels = LEVEL_TARGETS[badgeId] || [1, 3, 6, 10, 15];
    const computedCount = counters[badgeId] || 0;
    const computed = getLevelAndProgress(computedCount, targetLevels);

    const persisted = persistedByType.get(definition.id);
    const persistedLevel = Number(persisted?.metadata?.level || 0);
    const persistedProgress = Number(persisted?.metadata?.progress || 0);

    const finalLevel = Math.min(definition.maxLevel, Math.max(computed.level, persistedLevel));
    const isUnlocked = finalLevel > 0 || Boolean(persisted);
    const finalProgress = finalLevel >= definition.maxLevel
      ? 100
      : Math.max(computed.progress, persistedProgress, isUnlocked ? 1 : 0);

    return {
      ...definition,
      level: finalLevel,
      progress: finalProgress,
      unlocked: isUnlocked,
      unlockedAt: formatEarnedAt(persisted?.earned_at),
    };
  });

  await syncBadgesToSupabase(userId, computedBadges, persistedRows);

  const refreshedRows = await fetchPersistedBadgeRows(userId);
  if (refreshedRows.length === 0) {
    return computedBadges;
  }

  const computedById = new Map(computedBadges.map((badge) => [badge.id, badge]));
  return mapPersistedRowsToBadges(runtimeDefinitions, refreshedRows, computedById);
}
