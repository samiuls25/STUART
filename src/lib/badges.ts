import { badgeDefinitions, type Badge, type BadgeContribution } from "../data/badges";
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
  | "group-guru"
  | "memory-archivist"
  | "memory-circle"
  | "friend-circle"
  | "invite-all-star"
  | "saved-spotlight";

type ContributionBuildContext = {
  eventNightCount: number;
  hangoutNightCount: number;
  uniqueNeighborhoodCount: number;
  hangoutSunlitCount: number;
  uniqueActivityTypeCount: number;
  publicHangoutCount: number;
  uniqueSocialConnections: number;
  eventCultureCount: number;
  creativeHangoutCount: number;
  hangoutEarlyCount: number;
  eventEarlyCount: number;
  hostedGroupHangoutCount: number;
  memoryCreated: number;
  memoryParticipated: number;
  friendsCount: number;
  invitedHangoutCount: number;
  savedEventCount: number;
};

const BADGE_CONTRIBUTOR_HINTS: Record<string, string> = {
  "night-pulse":
    "Evening and late-night signals from events you save or view, plus hangouts you attended that started after dark.",
  "urban-explorer":
    "Each distinct neighborhood or venue label from saved/viewed events and hangouts you joined counts toward exploration.",
  "sunlit-lounger": "Outdoor hangouts you attended that landed in daytime hours.",
  "whimsical-wanderer":
    "Trying different hangout activity types and joining public hangouts both increase this badge.",
  "social-butterfly":
    "Distinct friends you plan with—hosts plus everyone with a positive RSVP on shared hangouts.",
  "culture-vulture": "Arts-flavored events you engaged with plus creative hangouts you attended.",
  "early-bird": "Morning-window events you engaged with plus early-start hangouts.",
  "group-guru": "Hangouts you hosted that included at least two other people (group size three or more).",
  "memory-archivist": "Total memories you created in STUART.",
  "memory-circle": "Any memory you own or appear on as an attendee.",
  "friend-circle": "Accepted friendships where you sent or accepted the connection.",
  "invite-all-star": "Hangouts someone else started where you are participating.",
  "saved-spotlight": "Events saved to your list—great for planning ahead.",
};

function contributionsForBadge(id: string, ctx: ContributionBuildContext): BadgeContribution[] {
  switch (id) {
    case "night-pulse":
      return [
        { label: "Evening events (saved or viewed)", value: ctx.eventNightCount },
        { label: "Night hangouts attended", value: ctx.hangoutNightCount },
      ];
    case "urban-explorer":
      return [{ label: "Distinct neighborhoods / venues tracked", value: ctx.uniqueNeighborhoodCount }];
    case "sunlit-lounger":
      return [{ label: "Daytime outdoor hangouts", value: ctx.hangoutSunlitCount }];
    case "whimsical-wanderer":
      return [
        { label: "Different hangout vibes tried", value: ctx.uniqueActivityTypeCount },
        { label: "Public hangouts joined", value: ctx.publicHangoutCount },
      ];
    case "social-butterfly":
      return [{ label: "Friends connected through hangouts", value: ctx.uniqueSocialConnections }];
    case "culture-vulture":
      return [
        { label: "Culture-rich events engaged", value: ctx.eventCultureCount },
        { label: "Creative hangouts attended", value: ctx.creativeHangoutCount },
      ];
    case "early-bird":
      return [
        { label: "Morning-hour events engaged", value: ctx.eventEarlyCount },
        { label: "Early hangouts attended", value: ctx.hangoutEarlyCount },
      ];
    case "group-guru":
      return [{ label: "Group hangouts you hosted (3+ people)", value: ctx.hostedGroupHangoutCount }];
    case "memory-archivist":
      return [{ label: "Memories you created", value: ctx.memoryCreated }];
    case "memory-circle":
      return [{ label: "Memories you own or appear in", value: ctx.memoryParticipated }];
    case "friend-circle":
      return [{ label: "Accepted friends", value: ctx.friendsCount }];
    case "invite-all-star":
      return [{ label: "Hangouts you joined (not the host)", value: ctx.invitedHangoutCount }];
    case "saved-spotlight":
      return [{ label: "Saved events", value: ctx.savedEventCount }];
    default:
      return [];
  }
}

const LEVEL_TARGETS: Record<BadgeId, number[]> = {
  "night-pulse": [2, 5, 10, 18, 30],
  "urban-explorer": [3, 6, 10, 16, 24],
  "sunlit-lounger": [2, 5, 9, 15, 24],
  "whimsical-wanderer": [2, 5, 9, 14, 20],
  "social-butterfly": [3, 6, 10, 15, 22],
  "culture-vulture": [2, 5, 9, 14, 20],
  "early-bird": [2, 5, 10, 16, 24],
  "group-guru": [1, 3, 6, 10, 15],
  "memory-archivist": [1, 3, 6, 12, 20],
  "memory-circle": [2, 5, 10, 18, 30],
  "friend-circle": [2, 5, 10, 18, 30],
  "invite-all-star": [2, 5, 10, 18, 28],
  "saved-spotlight": [5, 12, 24, 45, 75],
};

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
  const fallback = getFallbackDefinitions();

  const { data, error } = await supabase
    .from("badge_catalog")
    .select("id,name,icon,description,category,max_level,is_active,sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (error || !data || data.length === 0) {
    return fallback;
  }

  const fromCatalog = (data as BadgeCatalogRow[]).map(toRuntimeDefinition);
  const catalogIds = new Set(fromCatalog.map((row) => row.id));
  const extras = fallback.filter((definition) => !catalogIds.has(definition.id));

  return [...fromCatalog, ...extras];
};

async function fetchMemoryBadgeCounts(userId: string): Promise<{ created: number; participated: number }> {
  try {
    const [{ count: createdHead }, ownedResult, attendeeResult] = await Promise.all([
      supabase.from("memories").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("memories").select("id").eq("user_id", userId),
      supabase.from("memory_attendees").select("memory_id").eq("user_id", userId),
    ]);

    const created = typeof createdHead === "number" ? createdHead : 0;
    const ids = new Set<string>();
    (ownedResult.data ?? []).forEach((row: { id: string }) => {
      if (row.id) ids.add(row.id);
    });
    (attendeeResult.data ?? []).forEach((row: { memory_id: string }) => {
      if (row.memory_id) ids.add(row.memory_id);
    });

    return { created, participated: ids.size };
  } catch {
    return { created: 0, participated: 0 };
  }
}

async function fetchAcceptedFriendsCountForBadges(userId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("friendships")
      .select("friend_id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "accepted");

    if (error || count == null) return 0;
    return count;
  } catch {
    return 0;
  }
}

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
      contributions: fallback.contributions,
      contributorHint: fallback.contributorHint,
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
      contributorHint: BADGE_CONTRIBUTOR_HINTS[definition.id],
      contributions: [],
    }));
  }

  const [hangouts, savedEvents, viewedEvents, persistedRows, memoryBadgeCounts, friendsCount] =
    await Promise.all([
      fetchHangoutsForCurrentUser(),
      fetchSavedEvents(userId),
      fetchViewedEvents(userId),
      fetchPersistedBadgeRows(userId),
      fetchMemoryBadgeCounts(userId),
      fetchAcceptedFriendsCountForBadges(userId),
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

  const invitedHangoutCount = participatingHangouts.filter((hangout) => hangout.createdBy !== userId).length;

  const contributionContext: ContributionBuildContext = {
    eventNightCount,
    hangoutNightCount,
    uniqueNeighborhoodCount: uniqueNeighborhoods.size,
    hangoutSunlitCount,
    uniqueActivityTypeCount: uniqueActivityTypes.size,
    publicHangoutCount,
    uniqueSocialConnections: uniqueSocialConnections.size,
    eventCultureCount,
    creativeHangoutCount,
    hangoutEarlyCount,
    eventEarlyCount,
    hostedGroupHangoutCount,
    memoryCreated: memoryBadgeCounts.created,
    memoryParticipated: memoryBadgeCounts.participated,
    friendsCount,
    invitedHangoutCount,
    savedEventCount: savedEvents.length,
  };

  const counters: Record<string, number> = {
    "night-pulse": hangoutNightCount + eventNightCount,
    "urban-explorer": uniqueNeighborhoods.size,
    "sunlit-lounger": hangoutSunlitCount,
    "whimsical-wanderer": uniqueActivityTypes.size + publicHangoutCount,
    "social-butterfly": uniqueSocialConnections.size,
    "culture-vulture": eventCultureCount + creativeHangoutCount,
    "early-bird": hangoutEarlyCount + eventEarlyCount,
    "group-guru": hostedGroupHangoutCount,
    "memory-archivist": memoryBadgeCounts.created,
    "memory-circle": memoryBadgeCounts.participated,
    "friend-circle": friendsCount,
    "invite-all-star": invitedHangoutCount,
    "saved-spotlight": savedEvents.length,
  };

  const persistedByType = new Map<string, PersistedBadgeRow>(persistedRows.map((row) => [row.badge_type, row]));

  const computedBadges = runtimeDefinitions.map((definition) => {
    const badgeKey = definition.id as BadgeId;
    const targetLevels = LEVEL_TARGETS[badgeKey] ?? [1, 3, 6, 10, 15];
    const computedCount = counters[definition.id] ?? 0;
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
      contributorHint:
        BADGE_CONTRIBUTOR_HINTS[definition.id]
        || "Keep using Explore, Hangouts, Memories, and Friends to grow this badge.",
      contributions: contributionsForBadge(definition.id, contributionContext),
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
