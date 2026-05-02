import { supabase } from "./supabase";
import { createNotification } from "./notifications";

export interface FriendBadgeSummary {
  id: string;
  name: string;
  icon: string;
  level: number;
  progress: number;
  unlocked: boolean;
}

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'busy' | 'pending' | 'accepted' | 'blocked';
  badges?: string[];
  badgeSummaries?: FriendBadgeSummary[];
  mutualFriends?: number;
  hangoutsTogether?: number;
  isMuted?: boolean;
  isBlocked?: boolean;
  created_at: string;
}

// Get all friends for the current user
export async function getFriends(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get accepted friendships
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("friend_id, status, created_at")
    .eq("user_id", user.id)
    .eq("status", "accepted");

  if (friendshipsError) {
    console.error("Error fetching friendships:", friendshipsError);
    return [];
  }

  if (!friendships || friendships.length === 0) return [];

  // Get friend profiles separately
  const friendIds = friendships.map(f => f.friend_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .in("id", friendIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  type FriendBadgeRow = {
    user_id: string;
    badge_type: string;
    title: string | null;
    icon: string | null;
    metadata: {
      level?: number;
      progress?: number;
      unlocked?: boolean;
    } | null;
  };

  const badgeSummaryByUserId = new Map<string, FriendBadgeSummary[]>();

  const { data: badgeRows, error: badgeError } = await supabase
    .from("badges")
    .select("user_id,badge_type,title,icon,metadata")
    .in("user_id", friendIds);

  if (badgeError) {
    console.warn("Error fetching friend badges:", badgeError);
  } else {
    (badgeRows as FriendBadgeRow[] | null)?.forEach((row) => {
      const level = Number(row.metadata?.level || 0);
      const progress = Number(row.metadata?.progress || 0);
      const unlocked = typeof row.metadata?.unlocked === "boolean"
        ? row.metadata.unlocked
        : level > 0;

      if (!unlocked) {
        return;
      }

      const list = badgeSummaryByUserId.get(row.user_id) || [];
      list.push({
        id: row.badge_type,
        name: row.title || row.badge_type,
        icon: row.icon || "🏅",
        level,
        progress,
        unlocked,
      });
      badgeSummaryByUserId.set(row.user_id, list);
    });

    badgeSummaryByUserId.forEach((list, key) => {
      list.sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        if (b.progress !== a.progress) return b.progress - a.progress;
        return a.name.localeCompare(b.name);
      });
      badgeSummaryByUserId.set(key, list);
    });
  }

  // Combine data
  return friendships.map(f => {
    const profile = profiles?.find(p => p.id === f.friend_id);
    const badgeSummaries = badgeSummaryByUserId.get(f.friend_id) || [];
    return {
      id: f.friend_id,
      name: profile?.name || profile?.email || "Unknown",
      email: profile?.email || "",
      avatar_url: profile?.avatar_url,
      badges: badgeSummaries.map((badge) => badge.id),
      badgeSummaries,
      status: f.status as 'pending' | 'accepted' | 'blocked',
      created_at: f.created_at,
    };
  });
}

// Get pending friend requests (incoming)
export async function getPendingRequests(): Promise<Friend[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  // Get pending requests where current user is the recipient
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("user_id, status, created_at")
    .eq("friend_id", user.id)
    .eq("status", "pending");

  if (friendshipsError) {
    console.error("Error fetching requests:", friendshipsError);
    return [];
  }

  if (!friendships || friendships.length === 0) return [];

  // Get requester profiles
  const userIds = friendships.map(f => f.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, name, email, avatar_url")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles:", profilesError);
    return [];
  }

  return friendships.map(f => {
    const profile = profiles?.find(p => p.id === f.user_id);
    return {
      id: f.user_id,
      name: profile?.name || profile?.email || "Unknown",
      email: profile?.email || "",
      avatar_url: profile?.avatar_url,
      status: f.status as 'pending' | 'accepted' | 'blocked',
      created_at: f.created_at,
    };
  });
}

// Send a friend request
export async function sendFriendRequest(friendEmail: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Trim email
  const normalizedEmail = friendEmail.trim();

  // console.log("Current user:", user.email);
  // console.log("Searching for friend:", normalizedEmail);

  // Check if trying to add yourself
  if (normalizedEmail.toLowerCase() === user.email?.toLowerCase()) {
    console.error("Cannot send friend request to yourself");
    return false;
  }

  // Find user by email in profiles table (case-insensitive search)
  const { data: friendProfile, error: profileError } = await supabase
    .from("profiles")
    .select("id, email")
    .ilike("email", normalizedEmail) // Use ilike for case-insensitive
    .maybeSingle();

  // console.log("Friend profile search result:", friendProfile);
  // console.log("Profile error:", profileError);

  if (profileError) {
    console.error("Error finding friend:", profileError);
    return false;
  }

  if (!friendProfile) {
    console.error("No user found with that email address");
    return false;
  }

  // Check if friendship already exists
  const { data: existingFriendship } = await supabase
    .from("friendships")
    .select("id")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendProfile.id}),and(user_id.eq.${friendProfile.id},friend_id.eq.${user.id})`)
    .maybeSingle();

  if (existingFriendship) {
    console.error("Friend request already exists or you're already friends");
    return false;
  }

  const { error } = await supabase
    .from("friendships")
    .insert({
      user_id: user.id,
      friend_id: friendProfile.id,
      status: "pending",
    });

  if (error) {
    console.error("Error sending request:", error);
    return false;
  }

  try {
    const senderName =
      (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
      || user.email
      || "A friend";

    await createNotification({
      recipientUserId: friendProfile.id,
      type: "friend_request",
      title: "New friend request",
      message: `${senderName} sent you a friend request.`,
      entityType: "friendship",
      entityId: user.id,
      metadata: {
        senderId: user.id,
      },
    });
  } catch (notificationError) {
    console.warn("Friend request notification skipped", notificationError);
  }

  return true;
}

// Accept a friend request
export async function acceptFriendRequest(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Update the request status
  const { error: updateError } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("user_id", friendId)
    .eq("friend_id", user.id);

  if (updateError) {
    console.error("Error accepting request:", updateError);
    return false;
  }

  // Create reciprocal friendship
  const { error: insertError } = await supabase
    .from("friendships")
    .insert({
      user_id: user.id,
      friend_id: friendId,
      status: "accepted",
    });

  if (insertError) {
    console.error("Error creating reciprocal friendship:", insertError);
    return false;
  }

  try {
    const acceptorName =
      (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
      || user.email
      || "Your friend";

    await createNotification({
      recipientUserId: friendId,
      type: "friend_request_accepted",
      title: "Friend request accepted",
      message: `${acceptorName} accepted your friend request.`,
      entityType: "friendship",
      entityId: user.id,
      metadata: {
        accepterId: user.id,
      },
    });
  } catch (notificationError) {
    console.warn("Friend acceptance notification skipped", notificationError);
  }

  return true;
}

// Reject a friend request
export async function rejectFriendRequest(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("user_id", friendId)
    .eq("friend_id", user.id);

  if (error) {
    console.error("Error rejecting request:", error);
    return false;
  }

  return true;
}

// Remove a friend
export async function removeFriend(friendId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Delete both directions
  const { error } = await supabase
    .from("friendships")
    .delete()
    .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);

  if (error) {
    console.error("Error removing friend:", error);
    return false;
  }

  return true;
}