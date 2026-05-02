export interface Event {
    id: string;
    name: string;
    heroImage: string;
    date: string;
    time: string;
    venue: string;
    neighborhood: string;
  latitude: number | null;
  longitude: number | null;
    segment: string;
    genre: string;
    ticketUrl: string;
  source?: string;
  sourceLabel?: string;
  organizerName?: string;
  hangoutId?: string;
  isJoinedByCurrentUser?: boolean;
  hangoutJoinStatus?: "invited" | "yes" | "no" | "maybe" | "pending-availability";
  isSaveable?: boolean;
  isTrackable?: boolean;
    price?: string;
    // Enhanced fields
    description?: string;
    distance?: number; // in miles
    travelTime?: number; // in minutes
    tags?: string[];
    priceLevel?: "free" | "$" | "$$" | "$$$";
    isRecommended?: boolean;
    recommendationScore?: number;
    recommendationReasons?: string[];
    isTrending?: boolean;
    trendingRank?: number;
    happeningNow?: boolean;
    isTonight?: boolean;
    additionalTimes?: string[];
  }
  
  // export const events: Event[] = [
  //   {
  //     id: "1",
  //     name: "Taylor Swift | The Eras Tour",
  //     heroImage: "https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80",
  //     date: "Dec 28, 2024",
  //     time: "7:00 PM",
  //     venue: "Madison Square Garden",
  //     neighborhood: "Midtown",
  //     latitude: 40.7505,
  //     longitude: -73.9934,
  //     segment: "Music",
  //     genre: "Pop",
  //     ticketUrl: "#",
  //     price: "$150+",
  //     description: "Experience the phenomenon that is The Eras Tour. Taylor Swift takes you on a journey through all her musical eras with stunning visuals, incredible performances, and unforgettable moments.",
  //     distance: 0.8,
  //     travelTime: 12,
  //     tags: ["concert", "pop", "indoor", "iconic"],
  //     priceLevel: "$$$",
  //     isRecommended: true,
  //     recommendationScore: 95,
  //     recommendationReasons: ["Matches your music taste", "Popular with your friends", "High-energy event"],
  //     isTrending: true,
  //     trendingRank: 1,
  //     isTonight: true,
  //   },
  //   {
  //     id: "2",
  //     name: "Brooklyn Nets vs Lakers",
  //     heroImage: "https://images.unsplash.com/photo-1504450758481-7338bbe75c8e?w=800&q=80",
  //     date: "Dec 29, 2024",
  //     time: "8:30 PM",
  //     venue: "Barclays Center",
  //     neighborhood: "Brooklyn",
  //     latitude: 40.6826,
  //     longitude: -73.9754,
  //     segment: "Sports",
  //     genre: "Basketball",
  //     ticketUrl: "#",
  //     price: "$85+",
  //     description: "Watch the Brooklyn Nets take on the Los Angeles Lakers in this exciting NBA matchup. Experience world-class basketball in one of NYC's premier arenas.",
  //     distance: 2.4,
  //     travelTime: 25,
  //     tags: ["sports", "basketball", "indoor", "nba"],
  //     priceLevel: "$$",
  //     isRecommended: true,
  //     recommendationScore: 88,
  //     recommendationReasons: ["You attended similar events", "Fits your evening schedule"],
  //     isTrending: true,
  //     trendingRank: 3,
  //   },
  //   {
  //     id: "3",
  //     name: "Hamilton - Broadway",
  //     heroImage: "https://images.unsplash.com/photo-1507676184212-d03ab07a01bf?w=800&q=80",
  //     date: "Dec 30, 2024",
  //     time: "2:00 PM",
  //     venue: "Richard Rodgers Theatre",
  //     neighborhood: "Times Square",
  //     latitude: 40.7590,
  //     longitude: -73.9845,
  //     segment: "Arts",
  //     genre: "Musical",
  //     ticketUrl: "#",
  //     price: "$200+",
  //     description: "The revolutionary musical that took Broadway by storm. Hamilton tells the story of America's Founding Father Alexander Hamilton through hip-hop, jazz, blues, R&B, and Broadway.",
  //     distance: 1.2,
  //     travelTime: 15,
  //     tags: ["theater", "musical", "broadway", "cultural"],
  //     priceLevel: "$$$",
  //     isTrending: true,
  //     trendingRank: 2,
  //   },
  //   {
  //     id: "4",
  //     name: "Disclosure DJ Set",
  //     heroImage: "https://images.unsplash.com/photo-1571266028243-d220c6a89596?w=800&q=80",
  //     date: "Dec 31, 2024",
  //     time: "10:00 PM",
  //     venue: "Brooklyn Mirage",
  //     neighborhood: "Brooklyn",
  //     latitude: 40.7128,
  //     longitude: -73.9341,
  //     segment: "Music",
  //     genre: "Electronic",
  //     ticketUrl: "#",
  //     price: "$75+",
  //     description: "Ring in the New Year with Disclosure's legendary DJ set. An outdoor electronic music experience under the stars at Brooklyn's premier venue.",
  //     distance: 3.1,
  //     travelTime: 35,
  //     tags: ["nightlife", "electronic", "outdoor", "nye"],
  //     priceLevel: "$$",
  //     isRecommended: true,
  //     recommendationScore: 92,
  //     recommendationReasons: ["Perfect for NYE", "Matches your music preferences", "Outdoor venue you love"],
  //   },
  //   {
  //     id: "5",
  //     name: "NY Knicks vs Celtics",
  //     heroImage: "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  //     date: "Jan 2, 2025",
  //     time: "7:30 PM",
  //     venue: "Madison Square Garden",
  //     neighborhood: "Midtown",
  //     latitude: 40.7505,
  //     longitude: -73.9934,
  //     segment: "Sports",
  //     genre: "Basketball",
  //     ticketUrl: "#",
  //     price: "$120+",
  //     description: "The rivalry continues! Watch the New York Knicks face off against the Boston Celtics in this classic Eastern Conference showdown at The World's Most Famous Arena.",
  //     distance: 0.8,
  //     travelTime: 12,
  //     tags: ["sports", "basketball", "indoor", "rivalry"],
  //     priceLevel: "$$$",
  //     isTrending: true,
  //     trendingRank: 4,
  //   },
  //   {
  //     id: "6",
  //     name: "Van Gogh: The Immersive Experience",
  //     heroImage: "https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=800&q=80",
  //     date: "Jan 3, 2025",
  //     time: "11:00 AM",
  //     venue: "Pier 36",
  //     neighborhood: "Lower East Side",
  //     latitude: 40.7112,
  //     longitude: -73.9847,
  //     segment: "Arts",
  //     genre: "Exhibition",
  //     ticketUrl: "#",
  //     price: "$45+",
  //     description: "Step inside Van Gogh's masterpieces in this stunning 360-degree digital art exhibition. Walk through Starry Night, Sunflowers, and more iconic works.",
  //     distance: 1.8,
  //     travelTime: 20,
  //     tags: ["art", "exhibition", "immersive", "cultural"],
  //     priceLevel: "$$",
  //     isRecommended: true,
  //     recommendationScore: 85,
  //     recommendationReasons: ["Great for a chill day", "Highly rated by visitors", "Indoor activity"],
  //   },
  //   {
  //     id: "7",
  //     name: "Fred Again.. Live",
  //     heroImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  //     date: "Jan 5, 2025",
  //     time: "8:00 PM",
  //     venue: "Terminal 5",
  //     neighborhood: "Hell's Kitchen",
  //     latitude: 40.7679,
  //     longitude: -73.9923,
  //     segment: "Music",
  //     genre: "Electronic",
  //     ticketUrl: "#",
  //     price: "$95+",
  //     description: "British producer Fred Again.. brings his emotional electronic soundscapes to Terminal 5. Known for his viral sampling and heartfelt productions.",
  //     distance: 1.5,
  //     travelTime: 18,
  //     tags: ["concert", "electronic", "indoor", "viral"],
  //     priceLevel: "$$",
  //     isTrending: true,
  //     trendingRank: 5,
  //   },
  //   {
  //     id: "8",
  //     name: "NY Rangers vs Devils",
  //     heroImage: "https://images.unsplash.com/photo-1580748142459-e63c88b92c07?w=800&q=80",
  //     date: "Jan 6, 2025",
  //     time: "7:00 PM",
  //     venue: "Madison Square Garden",
  //     neighborhood: "Midtown",
  //     latitude: 40.7505,
  //     longitude: -73.9934,
  //     segment: "Sports",
  //     genre: "Hockey",
  //     ticketUrl: "#",
  //     price: "$90+",
  //     description: "The Hudson River Rivalry heats up as the NY Rangers battle the New Jersey Devils. One of the most intense matchups in NHL history.",
  //     distance: 0.8,
  //     travelTime: 12,
  //     tags: ["sports", "hockey", "indoor", "rivalry"],
  //     priceLevel: "$$",
  //   },
  //   {
  //     id: "9",
  //     name: "Sleep No More",
  //     heroImage: "https://images.unsplash.com/photo-1503095396549-807759245b35?w=800&q=80",
  //     date: "Jan 8, 2025",
  //     time: "7:30 PM",
  //     venue: "McKittrick Hotel",
  //     neighborhood: "Chelsea",
  //     latitude: 40.7448,
  //     longitude: -74.0047,
  //     segment: "Arts",
  //     genre: "Theater",
  //     ticketUrl: "#",
  //     price: "$130+",
  //     description: "The groundbreaking immersive theater experience where you explore a mysterious hotel and follow characters through a reimagined Macbeth.",
  //     distance: 2.1,
  //     travelTime: 22,
  //     tags: ["theater", "immersive", "unique", "cultural"],
  //     priceLevel: "$$$",
  //     isRecommended: true,
  //     recommendationScore: 90,
  //     recommendationReasons: ["Unique experience", "Highly rated", "Perfect for adventurous types"],
  //   },
  //   {
  //     id: "10",
  //     name: "Kendrick Lamar | GNX Tour",
  //     heroImage: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=800&q=80",
  //     date: "Jan 10, 2025",
  //     time: "8:00 PM",
  //     venue: "Barclays Center",
  //     neighborhood: "Brooklyn",
  //     latitude: 40.6826,
  //     longitude: -73.9754,
  //     segment: "Music",
  //     genre: "Hip-Hop",
  //     ticketUrl: "#",
  //     price: "$175+",
  //     description: "Pulitzer Prize-winning artist Kendrick Lamar brings his highly anticipated GNX Tour to Brooklyn. An unforgettable night of groundbreaking hip-hop.",
  //     distance: 2.4,
  //     travelTime: 25,
  //     tags: ["concert", "hip-hop", "indoor", "iconic"],
  //     priceLevel: "$$$",
  //     isTrending: true,
  //     trendingRank: 6,
  //   },
  //   {
  //     id: "11",
  //     name: "Blue Note Jazz Night",
  //     heroImage: "https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=800&q=80",
  //     date: "Jan 12, 2025",
  //     time: "9:00 PM",
  //     venue: "Blue Note Jazz Club",
  //     neighborhood: "Greenwich Village",
  //     latitude: 40.7308,
  //     longitude: -74.0006,
  //     segment: "Music",
  //     genre: "Jazz",
  //     ticketUrl: "#",
  //     price: "$35+",
  //     description: "Experience authentic jazz at NYC's legendary Blue Note. Intimate setting, world-class musicians, and the soul of Greenwich Village.",
  //     distance: 1.0,
  //     travelTime: 14,
  //     tags: ["jazz", "nightlife", "intimate", "cultural"],
  //     priceLevel: "$",
  //     isRecommended: true,
  //     recommendationScore: 82,
  //     recommendationReasons: ["Affordable option", "Close to you", "Perfect evening vibe"],
  //   },
  //   {
  //     id: "12",
  //     name: "Comedy Cellar: All-Stars",
  //     heroImage: "https://images.unsplash.com/photo-1527224538127-2104bb71c51b?w=800&q=80",
  //     date: "Dec 20, 2024",
  //     time: "9:30 PM",
  //     venue: "Comedy Cellar",
  //     neighborhood: "Greenwich Village",
  //     latitude: 40.7300,
  //     longitude: -74.0002,
  //     segment: "Arts",
  //     genre: "Comedy",
  //     ticketUrl: "#",
  //     price: "$25+",
  //     description: "The legendary Comedy Cellar hosts its All-Stars night featuring surprise appearances from NYC's best comedians and occasional celebrity drop-ins.",
  //     distance: 1.0,
  //     travelTime: 14,
  //     tags: ["comedy", "nightlife", "intimate", "entertainment"],
  //     priceLevel: "$",
  //     happeningNow: true,
  //     isTonight: true,
  //   },
  //   {
  //     id: "13",
  //     name: "Central Park Ice Skating",
  //     heroImage: "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=800&q=80",
  //     date: "Dec 20, 2024",
  //     time: "All Day",
  //     venue: "Wollman Rink",
  //     neighborhood: "Central Park",
  //     latitude: 40.7678,
  //     longitude: -73.9743,
  //     segment: "Arts",
  //     genre: "Exhibition",
  //     ticketUrl: "#",
  //     price: "Free",
  //     description: "Glide across the ice at Central Park's iconic Wollman Rink. Stunning views of the Manhattan skyline make this a magical winter experience.",
  //     distance: 0.5,
  //     travelTime: 8,
  //     tags: ["outdoor", "winter", "family", "free"],
  //     priceLevel: "free",
  //     happeningNow: true,
  //     isTonight: true,
  //     isRecommended: true,
  //     recommendationScore: 94,
  //     recommendationReasons: ["Free entry", "10 minutes away", "Perfect weather today"],
  //   },
  // ];
  
  export const segments = ["All", "Music", "Sports", "Arts"];
  
  export const genres = [
    "All",
    "Pop",
    "Electronic",
    "Hip-Hop",
    "Jazz",
    "Basketball",
    "Hockey",
    "Musical",
    "Theater",
    "Exhibition",
    "Comedy",
    "Hangout",
  ];
  
  export const priceLevels = ["All", "Free", "$", "$$", "$$$"];
  
  export const timeFilters = ["All", "Now", "Tonight", "This Weekend", "This Week"];
  
  /** Numeric radius presets for the distance dropdown ("Any distance" is `null`, handled in FilterBar). */
  export const distanceRadiusMilesOptions = [1, 2, 3, 5, 10, 25, 50, 100] as const;
  
  export const moods = [
    { id: "adventurous", label: "Adventurous", icon: "🚀", description: "Unique, immersive experiences" },
    { id: "chill", label: "Chill", icon: "☕", description: "Relaxed, low-key activities" },
    { id: "social", label: "Social", icon: "🎉", description: "Great for groups and meeting people" },
    { id: "artsy", label: "Artsy", icon: "🎨", description: "Cultural and creative events" },
  ];
  


// export async fetcher
import { supabase } from "../lib/supabase";
import { hasHangoutsIsPublicColumn } from "../lib/hangoutsSchema";

interface UserRecommendationRow {
  event_id: string;
  recommendation_score: number;
  recommendation_reasons: string[] | null;
}

interface HangoutPublicRow {
  id: string;
  title: string;
  description: string | null;
  activity_type: "chill" | "outdoor" | "social" | "late-night" | "active" | "creative";
  created_by: string;
  status: string;
  is_public?: boolean;
  proposed_date: string;
  proposed_start_time: string;
  confirmed_date: string | null;
  confirmed_start_time: string | null;
  location_name: string | null;
  location_address: string | null;
  latitude?: number | null;
  longitude?: number | null;
  hero_image?: string | null;
  tags?: string[] | null;
}

interface ProfileNameRow {
  id: string;
  name: string | null;
}

interface HangoutMembershipRow {
  hangout_id: string;
  response_status: "invited" | "yes" | "no" | "maybe" | "pending-availability";
}

const normalizeEventKeyPart = (value?: string) => {
  if (!value) return "";
  return value
    .toLowerCase()
    .replace(/\((new york|ny|nyc)\)/gi, "")
    .replace(/\b(new york|ny|nyc)\b/gi, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim();
};

const buildConsolidationKey = (event: Event) => {
  if (event.source === "hangout" && event.hangoutId) {
    return `hangout|${event.hangoutId}`;
  }

  return [
    event.source || "ticketmaster",
    normalizeEventKeyPart(event.name),
    event.date,
    normalizeEventKeyPart(event.venue),
  ].join("|");
};

const HANGOUT_ACTIVITY_METADATA: Record<string, { segment: string; genre: string; tags: string[]; heroImage: string }> = {
  chill: {
    segment: "Arts",
    genre: "Hangout",
    tags: ["hangout", "chill", "social"],
    heroImage: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=1200&q=80",
  },
  outdoor: {
    segment: "Arts",
    genre: "Hangout",
    tags: ["hangout", "outdoor", "social"],
    heroImage: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80",
  },
  social: {
    segment: "Music",
    genre: "Hangout",
    tags: ["hangout", "social", "group"],
    heroImage: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=1200&q=80",
  },
  "late-night": {
    segment: "Music",
    genre: "Hangout",
    tags: ["hangout", "nightlife", "social"],
    heroImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=1200&q=80",
  },
  active: {
    segment: "Sports",
    genre: "Hangout",
    tags: ["hangout", "active", "fitness"],
    heroImage: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1200&q=80",
  },
  creative: {
    segment: "Arts",
    genre: "Hangout",
    tags: ["hangout", "creative", "art"],
    heroImage: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=1200&q=80",
  },
};

const defaultHangoutMetadata = HANGOUT_ACTIVITY_METADATA.social;

const deriveNeighborhoodFromAddress = (address?: string | null) => {
  if (!address) return "New York";

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) return parts[1];
  return parts[0] || "New York";
};

const isHangoutsTableMissing = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();

  return candidate.code === "42P01" || message.includes("relation") && message.includes("hangouts") && message.includes("does not exist");
};

const fetchPublicHangoutEvents = async (userId?: string): Promise<Event[]> => {
  const supportsIsPublicColumn = await hasHangoutsIsPublicColumn();
  const discoverablePublicStatuses: HangoutPublicRow["status"][] = ["confirmed", "suggested", "pending"];

  const { data: hangoutRows, error: hangoutError } = await supabase
    .from("hangouts")
    .select("*")
    .in("status", discoverablePublicStatuses)
    .order("confirmed_date", { ascending: true });

  if (hangoutError) {
    if (isHangoutsTableMissing(hangoutError)) {
      return [];
    }

    console.error("Error fetching hangouts for events feed:", hangoutError);
    return [];
  }

  const confirmedRows = (hangoutRows as HangoutPublicRow[] | null) || [];

  const hasExplicitIsPublicFlag = confirmedRows.some((row) => typeof row.is_public === "boolean");
  const useIsPublicFiltering = supportsIsPublicColumn || hasExplicitIsPublicFlag;

  const publicRows = useIsPublicFiltering
    ? confirmedRows.filter((row) => row.is_public === true)
    : confirmedRows.filter((row) => !userId || row.created_by === userId);

  if (publicRows.length === 0) {
    return [];
  }

  const creatorIds = [...new Set(publicRows.map((row) => row.created_by).filter(Boolean))];
  const profileNameMap = new Map<string, string>();
  const membershipMap = new Map<string, HangoutMembershipRow["response_status"]>();

  if (creatorIds.length > 0) {
    const { data: profileRows, error: profileError } = await supabase
      .from("profiles")
      .select("id,name")
      .in("id", creatorIds);

    if (profileError) {
      console.error("Error fetching public hangout organizers:", profileError);
    } else {
      ((profileRows as ProfileNameRow[] | null) || []).forEach((row) => {
        if (row.name) {
          profileNameMap.set(row.id, row.name);
        }
      });
    }
  }

  if (userId) {
    const hangoutIds = publicRows.map((row) => row.id);
    if (hangoutIds.length > 0) {
      const { data: membershipRows, error: membershipError } = await supabase
        .from("hangout_invites")
        .select("hangout_id,response_status")
        .eq("friend_id", userId)
        .in("hangout_id", hangoutIds);

      if (membershipError) {
        console.error("Error fetching hangout memberships:", membershipError);
      } else {
        ((membershipRows as HangoutMembershipRow[] | null) || []).forEach((row) => {
          membershipMap.set(row.hangout_id, row.response_status);
        });
      }
    }
  }

  return publicRows
    .map((row): Event | null => {
      const activityMetadata = HANGOUT_ACTIVITY_METADATA[row.activity_type] || defaultHangoutMetadata;
      const date = row.confirmed_date || row.proposed_date;
      if (!date) return null;

      const time = row.confirmed_start_time || row.proposed_start_time || "TBA";
      const joinStatus = membershipMap.get(row.id);

      return {
        id: `hangout:${row.id}`,
        hangoutId: row.id,
        name: row.title,
        heroImage: row.hero_image || activityMetadata.heroImage,
        date,
        time,
        venue: row.location_name || "TBD",
        neighborhood: deriveNeighborhoodFromAddress(row.location_address),
        latitude: row.latitude ?? null,
        longitude: row.longitude ?? null,
        segment: activityMetadata.segment,
        genre: activityMetadata.genre,
        ticketUrl: "",
        source: "hangout",
        sourceLabel: useIsPublicFiltering ? "Public Hangout" : "Hangout",
        organizerName: profileNameMap.get(row.created_by),
        isJoinedByCurrentUser: joinStatus ? joinStatus !== "no" : false,
        hangoutJoinStatus: joinStatus,
        isSaveable: false,
        isTrackable: false,
        price: "Free",
        description: row.description || "Community hangout",
        travelTime: undefined,
        tags: row.tags?.length ? row.tags : activityMetadata.tags,
        priceLevel: "free",
        isRecommended: false,
        recommendationScore: 0,
        recommendationReasons: [],
        isTrending: false,
        trendingRank: 0,
        happeningNow: false,
        isTonight: false,
      };
    })
    .filter((event): event is Event => event !== null);
};

const PLACEHOLDER_IMAGE_MIN_ROWS = 60;
const PLACEHOLDER_IMAGE_MIN_UNIQUE_NAMES = 25;
const EXPLICIT_PLACEHOLDER_IMAGE_URLS = new Set([
  "https://s1.ticketm.net/dam/c/8cf/a6653880-7899-4f67-8067-1f95f4d158cf_124761_TABLET_LANDSCAPE_16_9.jpg",
]);

const normalizeImageUrl = (value?: string | null) => {
  if (!value) return "";
  return value.trim().split("?")[0];
};

const isExplicitPlaceholderImage = (value?: string | null) => {
  const normalized = normalizeImageUrl(value);
  return normalized.length > 0 && EXPLICIT_PLACEHOLDER_IMAGE_URLS.has(normalized);
};

const filterLikelyPlaceholderImageEvents = (events: Event[]) => {
  const explicitPlaceholderFiltered = events.filter(
    (event) => !isExplicitPlaceholderImage(event.heroImage)
  );

  const imageStats = new Map<string, { count: number; names: Set<string> }>();

  for (const event of explicitPlaceholderFiltered) {
    if (!event.heroImage) continue;

    const normalizedUrl = normalizeImageUrl(event.heroImage);
    if (!normalizedUrl) continue;

    const existing = imageStats.get(normalizedUrl) ?? { count: 0, names: new Set<string>() };
    existing.count += 1;
    existing.names.add(normalizeEventKeyPart(event.name));
    imageStats.set(normalizedUrl, existing);
  }

  const placeholderImages = new Set<string>();
  for (const [url, stats] of imageStats.entries()) {
    if (
      stats.count >= PLACEHOLDER_IMAGE_MIN_ROWS
      && stats.names.size >= PLACEHOLDER_IMAGE_MIN_UNIQUE_NAMES
    ) {
      placeholderImages.add(url);
    }
  }

  if (placeholderImages.size === 0) {
    return explicitPlaceholderFiltered;
  }

  return explicitPlaceholderFiltered.filter(
    (event) => !placeholderImages.has(normalizeImageUrl(event.heroImage))
  );
};

const consolidateEvents = (events: Event[]) => {
  const grouped = new Map<string, Event[]>();

  for (const event of events) {
    const key = buildConsolidationKey(event);
    const existing = grouped.get(key);
    if (existing) {
      existing.push(event);
    } else {
      grouped.set(key, [event]);
    }
  }

  return Array.from(grouped.values()).map((group) => {
    if (group.length === 1) {
      return group[0];
    }

    const sortedByPriority = [...group].sort((a, b) => {
      const scoreDiff = (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0);
      if (scoreDiff !== 0) return scoreDiff;

      const aRank = a.trendingRank && a.trendingRank > 0 ? a.trendingRank : Number.MAX_SAFE_INTEGER;
      const bRank = b.trendingRank && b.trendingRank > 0 ? b.trendingRank : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;

      return (a.time || "").localeCompare(b.time || "");
    });

    const primary = sortedByPriority[0];
    const uniqueTimes = Array.from(new Set(group.map((event) => event.time).filter(Boolean))).sort();

    const bestRecommendation = [...group].sort(
      (a, b) => (b.recommendationScore ?? 0) - (a.recommendationScore ?? 0)
    )[0];

    const minTrendingRank = group
      .map((event) => event.trendingRank)
      .filter((rank): rank is number => typeof rank === "number" && rank > 0)
      .reduce((min, rank) => Math.min(min, rank), Number.MAX_SAFE_INTEGER);

    const baseTime = primary.time || uniqueTimes[0] || "TBA";

    return {
      ...primary,
      time:
        uniqueTimes.length > 1
          ? `${baseTime} (+${uniqueTimes.length - 1} more)`
          : baseTime,
      additionalTimes: uniqueTimes.filter((time) => time !== baseTime),
      isRecommended: group.some((event) => Boolean(event.isRecommended)),
      recommendationScore: bestRecommendation.recommendationScore ?? 0,
      recommendationReasons: bestRecommendation.recommendationReasons ?? [],
      isTrending: group.some((event) => Boolean(event.isTrending)),
      trendingRank: minTrendingRank === Number.MAX_SAFE_INTEGER ? 0 : minTrendingRank,
    };
  });
};

const ensureRecommendationFallback = (events: Event[]) => {
  if (events.some((event) => event.isRecommended)) {
    return events;
  }

  const fallbackCandidates = [...events]
    .filter((event) => event.source !== "hangout")
    .sort((a, b) => {
      const aRank = a.trendingRank && a.trendingRank > 0 ? a.trendingRank : Number.MAX_SAFE_INTEGER;
      const bRank = b.trendingRank && b.trendingRank > 0 ? b.trendingRank : Number.MAX_SAFE_INTEGER;
      if (aRank !== bRank) return aRank - bRank;

      if ((a.happeningNow ? 1 : 0) !== (b.happeningNow ? 1 : 0)) {
        return (b.happeningNow ? 1 : 0) - (a.happeningNow ? 1 : 0);
      }

      if ((a.isTonight ? 1 : 0) !== (b.isTonight ? 1 : 0)) {
        return (b.isTonight ? 1 : 0) - (a.isTonight ? 1 : 0);
      }

      return (a.date || "").localeCompare(b.date || "");
    })
    .slice(0, 4);

  if (fallbackCandidates.length === 0) {
    return events;
  }

  const fallbackIdSet = new Set(fallbackCandidates.map((event) => event.id));

  return events.map((event) => {
    if (!fallbackIdSet.has(event.id)) {
      return event;
    }

    const fallbackScore = event.trendingRank && event.trendingRank > 0
      ? Math.max(70, 100 - event.trendingRank * 3)
      : 72;

    return {
      ...event,
      isRecommended: true,
      recommendationScore: event.recommendationScore && event.recommendationScore > 0
        ? event.recommendationScore
        : fallbackScore,
      recommendationReasons:
        event.recommendationReasons && event.recommendationReasons.length > 0
          ? event.recommendationReasons
          : ["Popular around NYC right now", "Great match while we personalize your feed"],
    };
  });
};
 
export async function fetchEvents(userId?: string): Promise<Event[]> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const effectiveUserId = session?.user?.id ?? userId;

  const allEvents: any[] = [];
  const pageSize = 1000;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .order("date", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const rows = data ?? [];
    allEvents.push(...rows);

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  const recommendationMap = new Map<string, UserRecommendationRow>();
  if (effectiveUserId) {
    const { data: recommendationRows, error: recommendationError } = await supabase
      .from("user_event_recommendations")
      .select("event_id,recommendation_score,recommendation_reasons")
      .eq("user_id", effectiveUserId);

    if (recommendationError) {
      console.error("Error fetching recommendations:", recommendationError);
    } else {
      (recommendationRows as UserRecommendationRow[] | null)?.forEach((row) => {
        recommendationMap.set(row.event_id, row);
      });

      if ((recommendationRows?.length ?? 0) === 0) {
        console.warn("No personalized recommendations found for user", effectiveUserId);
      }
    }
  }

  const hasAuthenticatedUser = Boolean(effectiveUserId);

  const mappedEvents = allEvents.map((e: any) => {
    const personalizedRecommendation = recommendationMap.get(e.id);
    const fallbackScore = e.recommendation_score ?? e.recommendationScore ?? 0;
    const fallbackReasons = e.recommendation_reasons ?? e.recommendationReasons ?? [];
    const resolvedScore = hasAuthenticatedUser
      ? (personalizedRecommendation?.recommendation_score ?? fallbackScore)
      : fallbackScore;
    const resolvedReasons = hasAuthenticatedUser
      ? (personalizedRecommendation?.recommendation_reasons ?? fallbackReasons)
      : fallbackReasons;
    const resolvedRecommended = resolvedScore > 0 || Boolean(e.is_recommended ?? e.isRecommended ?? false);

    return {
      id: e.id,
      name: e.name,
      heroImage: e.hero_image || e.heroImage || "",
      date: e.date,
      time: e.time,
      venue: e.venue,
      neighborhood: e.neighborhood,
      latitude: e.latitude ?? null,
      longitude: e.longitude ?? null,
      segment: e.segment,
      genre: e.genre,
      ticketUrl: e.ticket_url || e.ticketUrl || "",
      source: e.source || "ticketmaster",
      sourceLabel: e.source === "manual" ? "Manual" : "Ticketmaster",
      organizerName: undefined,
      isSaveable: true,
      isTrackable: true,
      price: e.price,
      description: e.description,
      distance: e.distance ?? 1,
      travelTime: e.travel_time ?? e.travelTime ?? 10,
      tags: e.tags ?? [],
      priceLevel: e.price_level ?? e.priceLevel ?? "$", // <-- use snake_case first
      isRecommended: resolvedRecommended,
      recommendationScore: resolvedScore,
      recommendationReasons: resolvedReasons,
      isTrending: e.is_trending ?? e.isTrending ?? false,
      trendingRank: e.trending_rank ?? e.trendingRank ?? 0,
      happeningNow: e.happening_now ?? e.happeningNow ?? false,
      isTonight: e.is_tonight ?? e.isTonight ?? false,
    };
  });

  const publicHangoutEvents = await fetchPublicHangoutEvents(effectiveUserId);

  const mergedEvents = [...mappedEvents, ...publicHangoutEvents];
  mergedEvents.sort((a, b) => {
    const aTs = new Date(a.date).getTime();
    const bTs = new Date(b.date).getTime();

    if (!Number.isNaN(aTs) && !Number.isNaN(bTs) && aTs !== bTs) {
      return bTs - aTs;
    }

    return (b.date || "").localeCompare(a.date || "");
  });

  const filteredByImageQuality = filterLikelyPlaceholderImageEvents(mergedEvents);
  const consolidated = consolidateEvents(filteredByImageQuality);
  return ensureRecommendationFallback(consolidated);
}