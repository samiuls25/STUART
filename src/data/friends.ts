export interface FriendRequest {
  id: string;
  from: {
    id: string;
    name: string;
    email: string;
  };
  sentAt: string;
  status: "pending" | "accepted" | "declined";
}

export interface Availability {
  id: string;
  userId: string;
  activityType: "chill" | "outdoor" | "social" | "late-night" | "active" | "creative";
  timeRanges: TimeRange[];
  isRecurring: boolean;
  daysOfWeek?: number[];
}

export interface TimeRange {
  start: string;
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
  invitedFriends: string[];
  highlightedFriends: string[];
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

// Mock data for development
export const friends = []; // Empty - use Supabase data
export const friendRequests: FriendRequest[] = [];
export const userAvailability: Availability[] = [];
export const hangouts: Hangout[] = [];

export const getFriendById = (id: string) => {
  return friends.find((f) => f.id === id);
};

export const getActivityType = (id: string) => {
  return activityTypes.find((a) => a.id === id);
};
