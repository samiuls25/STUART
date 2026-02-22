export interface Friend {
    id: string;
    name: string;
    email?: string;
    avatar?: string;
    status: "online" | "offline" | "busy";
    badges: string[]; // badge IDs
    mutualFriends: number;
    hangoutsTogether: number;
    isMuted: boolean;
    isBlocked: boolean;
  }
  
  export interface FriendRequest {
    id: string;
    from: Friend;
    sentAt: string;
    status: "pending" | "accepted" | "declined";
  }
  
  export interface Availability {
    id: string;
    userId: string;
    activityType: "chill" | "outdoor" | "social" | "late-night" | "active" | "creative";
    timeRanges: TimeRange[];
    isRecurring: boolean;
    daysOfWeek?: number[]; // 0-6 for Sun-Sat
  }
  
  export interface TimeRange {
    start: string; // "HH:mm" format
    end: string;
    preference: "preferred" | "available" | "if-needed";
  }
  
  export interface Hangout {
    id: string;
    title: string;
    description?: string;
    activityType: "chill" | "outdoor" | "social" | "late-night" | "active" | "creative";
    createdBy: string;
    proposedTimeRange: {
      date: string;
      startTime: string;
      endTime: string;
    };
    location?: {
      name: string;
      address?: string;
      isFlexible: boolean;
    };
    invitedFriends: string[]; // friend IDs
    highlightedFriends: string[]; // priority friends
    responses: HangoutResponse[];
    status: "suggested" | "pending" | "confirmed" | "completed" | "cancelled";
    confirmedTime?: {
      date: string;
      startTime: string;
      endTime: string;
    };
  }
  
  export interface HangoutResponse {
    friendId: string;
    status: "invited" | "yes" | "no" | "maybe" | "pending-availability";
    availabilitySubmitted?: TimeRange[];
    respondedAt?: string;
  }
  
  // Activity type metadata
  export const activityTypes = [
    { id: "chill", label: "Chill Hangout", icon: "☕", color: "bg-amber-500/20 text-amber-600" },
    { id: "outdoor", label: "Outdoor Walk", icon: "🌳", color: "bg-green-500/20 text-green-600" },
    { id: "social", label: "Social Outing", icon: "🎉", color: "bg-pink-500/20 text-pink-600" },
    { id: "late-night", label: "Late Night", icon: "🌙", color: "bg-indigo-500/20 text-indigo-600" },
    { id: "active", label: "Active/Sports", icon: "⚡", color: "bg-orange-500/20 text-orange-600" },
    { id: "creative", label: "Creative/Art", icon: "🎨", color: "bg-purple-500/20 text-purple-600" },
  ] as const;
  
  // Mock friends data
  export const friends: Friend[] = [
    {
      id: "1",
      name: "Jordan Lee",
      avatar: undefined,
      status: "online",
      badges: ["night-pulse", "urban-explorer"],
      mutualFriends: 5,
      hangoutsTogether: 12,
      isMuted: false,
      isBlocked: false,
    },
    {
      id: "2",
      name: "Sam Rivera",
      avatar: undefined,
      status: "offline",
      badges: ["whimsical-wanderer", "sunlit-lounger"],
      mutualFriends: 3,
      hangoutsTogether: 8,
      isMuted: false,
      isBlocked: false,
    },
    {
      id: "3",
      name: "Riley Chen",
      avatar: undefined,
      status: "online",
      badges: ["urban-explorer"],
      mutualFriends: 7,
      hangoutsTogether: 15,
      isMuted: false,
      isBlocked: false,
    },
    {
      id: "4",
      name: "Morgan Taylor",
      avatar: undefined,
      status: "busy",
      badges: ["night-pulse", "whimsical-wanderer", "urban-explorer"],
      mutualFriends: 2,
      hangoutsTogether: 6,
      isMuted: true,
      isBlocked: false,
    },
    {
      id: "5",
      name: "Casey Kim",
      avatar: undefined,
      status: "online",
      badges: ["sunlit-lounger"],
      mutualFriends: 4,
      hangoutsTogether: 3,
      isMuted: false,
      isBlocked: false,
    },
  ];
  
  export const friendRequests: FriendRequest[] = [
    {
      id: "req-1",
      from: {
        id: "new-1",
        name: "Drew Martinez",
        status: "online",
        badges: ["urban-explorer"],
        mutualFriends: 2,
        hangoutsTogether: 0,
        isMuted: false,
        isBlocked: false,
      },
      sentAt: "2025-02-03",
      status: "pending",
    },
    {
      id: "req-2",
      from: {
        id: "new-2",
        name: "Quinn Johnson",
        status: "offline",
        badges: [],
        mutualFriends: 1,
        hangoutsTogether: 0,
        isMuted: false,
        isBlocked: false,
      },
      sentAt: "2025-02-01",
      status: "pending",
    },
  ];
  
  // Mock user's own availability
  export const userAvailability: Availability[] = [
    {
      id: "avail-1",
      userId: "current-user",
      activityType: "chill",
      timeRanges: [
        { start: "18:00", end: "22:00", preference: "preferred" },
        { start: "14:00", end: "17:00", preference: "available" },
      ],
      isRecurring: true,
      daysOfWeek: [5, 6], // Fri, Sat
    },
    {
      id: "avail-2",
      userId: "current-user",
      activityType: "outdoor",
      timeRanges: [
        { start: "09:00", end: "12:00", preference: "preferred" },
        { start: "15:00", end: "18:00", preference: "available" },
      ],
      isRecurring: true,
      daysOfWeek: [0, 6], // Sun, Sat
    },
    {
      id: "avail-3",
      userId: "current-user",
      activityType: "late-night",
      timeRanges: [
        { start: "21:00", end: "02:00", preference: "preferred" },
      ],
      isRecurring: true,
      daysOfWeek: [5, 6], // Fri, Sat
    },
  ];
  
  // Mock hangouts data - empty by default, users create their own hangouts
  export const hangouts: Hangout[] = [];
  
  // Previous mock data (kept for reference, can be reused if needed)
  const mockHangouts: Hangout[] = [
    {
      id: "hangout-1",
      title: "Coffee & Catch-up",
      description: "Let's grab coffee and chat!",
      activityType: "chill",
      createdBy: "1", // Jordan
      proposedTimeRange: {
        date: "2025-02-08",
        startTime: "14:00",
        endTime: "16:00",
      },
      location: {
        name: "Blue Bottle Coffee",
        address: "Chelsea Market",
        isFlexible: true,
      },
      invitedFriends: ["current-user", "2", "3"],
      highlightedFriends: ["current-user"],
      responses: [
        { friendId: "current-user", status: "invited" },
        { friendId: "2", status: "yes", respondedAt: "2025-02-04" },
        { friendId: "3", status: "maybe" },
      ],
      status: "suggested",
    },
    {
      id: "hangout-2",
      title: "Central Park Walk",
      description: "Morning walk around the reservoir",
      activityType: "outdoor",
      createdBy: "3", // Riley
      proposedTimeRange: {
        date: "2025-02-09",
        startTime: "10:00",
        endTime: "12:00",
      },
      location: {
        name: "Central Park Reservoir",
        isFlexible: false,
      },
      invitedFriends: ["current-user", "1", "5"],
      highlightedFriends: [],
      responses: [
        { friendId: "current-user", status: "invited" },
        { friendId: "1", status: "pending-availability", availabilitySubmitted: [{ start: "09:00", end: "11:00", preference: "preferred" }] },
        { friendId: "5", status: "yes", respondedAt: "2025-02-03" },
      ],
      status: "suggested",
    },
    {
      id: "hangout-3",
      title: "Game Night",
      description: "Board games at my place",
      activityType: "social",
      createdBy: "current-user",
      proposedTimeRange: {
        date: "2025-02-15",
        startTime: "19:00",
        endTime: "23:00",
      },
      location: {
        name: "My Apartment",
        isFlexible: false,
      },
      invitedFriends: ["1", "2", "3", "5"],
      highlightedFriends: ["1", "3"],
      responses: [
        { friendId: "1", status: "yes", respondedAt: "2025-02-04" },
        { friendId: "2", status: "pending-availability" },
        { friendId: "3", status: "invited" },
        { friendId: "5", status: "yes", respondedAt: "2025-02-03" },
      ],
      status: "pending",
    },
    {
      id: "hangout-4",
      title: "Jazz Night at Blue Note",
      activityType: "late-night",
      createdBy: "current-user",
      proposedTimeRange: {
        date: "2025-02-07",
        startTime: "21:00",
        endTime: "00:00",
      },
      location: {
        name: "Blue Note Jazz Club",
        address: "131 W 3rd St",
        isFlexible: false,
      },
      invitedFriends: ["1", "4"],
      highlightedFriends: ["1"],
      responses: [
        { friendId: "1", status: "yes", respondedAt: "2025-02-02" },
        { friendId: "4", status: "yes", respondedAt: "2025-02-02" },
      ],
      status: "confirmed",
      confirmedTime: {
        date: "2025-02-07",
        startTime: "21:00",
        endTime: "00:00",
      },
    },
    {
      id: "hangout-5",
      title: "Brunch at Cafe Mogador",
      activityType: "chill",
      createdBy: "2", // Sam
      proposedTimeRange: {
        date: "2025-02-02",
        startTime: "11:00",
        endTime: "13:00",
      },
      location: {
        name: "Cafe Mogador",
        address: "East Village",
        isFlexible: false,
      },
      invitedFriends: ["current-user", "3", "5"],
      highlightedFriends: [],
      responses: [
        { friendId: "current-user", status: "yes", respondedAt: "2025-01-30" },
        { friendId: "3", status: "yes", respondedAt: "2025-01-31" },
        { friendId: "5", status: "yes", respondedAt: "2025-01-30" },
      ],
      status: "completed",
      confirmedTime: {
        date: "2025-02-02",
        startTime: "11:00",
        endTime: "13:00",
      },
    },
  ];
  
  // Helper function to get friend by ID
  export const getFriendById = (id: string): Friend | undefined => {
    if (id === "current-user") {
      return {
        id: "current-user",
        name: "You",
        status: "online",
        badges: ["night-pulse", "urban-explorer", "whimsical-wanderer"],
        mutualFriends: 0,
        hangoutsTogether: 0,
        isMuted: false,
        isBlocked: false,
      };
    }
    return friends.find((f) => f.id === id);
  };
  
  // Helper to get activity type metadata
  export const getActivityType = (id: string) => {
    return activityTypes.find((a) => a.id === id);
  };
  