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
  bio?: string | null;
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
    .select("id, name, email, avatar_url, bio")
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
      bio: profile?.bio ?? undefined,
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
    .select("id, name, email, avatar_url, bio")
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
      bio: profile?.bio ?? undefined,
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

export type FriendRequestByUserIdOutcome =
  | { ok: true; outcome: "sent" | "already_friends" }
  | {
      ok: false;
      outcome: "self" | "pending_outbound" | "pending_inbound" | "blocked" | "error";
      message?: string;
    };

/** Send a friend request when you already know the target user's id (e.g. invite links). */
export async function sendFriendRequestByUserId(targetUserId: string): Promise<FriendRequestByUserIdOutcome> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, outcome: "error", message: "You must be signed in." };
  }

  if (!targetUserId || targetUserId === user.id) {
    return { ok: false, outcome: "self" };
  }

  const { data: rows, error: fetchError } = await supabase
    .from("friendships")
    .select("user_id, friend_id, status")
    .or(`and(user_id.eq.${user.id},friend_id.eq.${targetUserId}),and(user_id.eq.${targetUserId},friend_id.eq.${user.id})`);

  if (fetchError) {
    console.error("sendFriendRequestByUserId fetch:", fetchError);
    return { ok: false, outcome: "error", message: fetchError.message };
  }

  const list = rows || [];

  if (list.some((r) => r.status === "accepted")) {
    return { ok: true, outcome: "already_friends" };
  }

  if (list.some((r) => r.status === "blocked")) {
    return { ok: false, outcome: "blocked", message: "Friend requests are not available for this connection." };
  }

  if (list.some((r) => r.user_id === user.id && r.friend_id === targetUserId && r.status === "pending")) {
    return { ok: false, outcome: "pending_outbound" };
  }

  if (list.some((r) => r.user_id === targetUserId && r.friend_id === user.id && r.status === "pending")) {
    return { ok: false, outcome: "pending_inbound" };
  }

  const { error: insertError } = await supabase.from("friendships").insert({
    user_id: user.id,
    friend_id: targetUserId,
    status: "pending",
  });

  if (insertError) {
    console.error("sendFriendRequestByUserId insert:", insertError);
    return { ok: false, outcome: "error", message: insertError.message };
  }

  try {
    const senderName =
      (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name || user.email || "A friend";

    await createNotification({
      recipientUserId: targetUserId,
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

  return { ok: true, outcome: "sent" };
}

export interface ResolvedFriendInvite {
  issuerId: string;
  issuerName: string;
  issuerAvatarUrl: string | null;
}

/** Public-safe lookup for invite landing page. Returns null if invalid or revoked. */
export async function resolveFriendInviteToken(rawToken: string): Promise<ResolvedFriendInvite | null> {
  const trimmed = rawToken.trim();
  if (trimmed.length < 16) return null;

  const { data, error } = await supabase.rpc("resolve_friend_invite_token", { p_token: trimmed });

  if (error) {
    console.warn("resolve_friend_invite_token:", error);
    return null;
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || typeof row !== "object") return null;

  const issuerId = (row as { issuer_id?: string }).issuer_id;
  if (!issuerId) return null;

  return {
    issuerId,
    issuerName: String((row as { issuer_name?: string }).issuer_name || "Someone"),
    issuerAvatarUrl: (row as { issuer_avatar_url?: string | null }).issuer_avatar_url ?? null,
  };
}

export async function fetchActiveFriendInviteToken(): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("friend_invite_links")
    .select("token")
    .eq("user_id", user.id)
    .is("revoked_at", null)
    .maybeSingle();

  if (error) {
    if ((error as { code?: string }).code === "42P01" || `${error.message}`.toLowerCase().includes("does not exist")) {
      console.warn("friend_invite_links table missing — run docs/db/friend_invite_links.sql");
      return null;
    }
    console.warn("fetchActiveFriendInviteToken:", error);
    return null;
  }

  const token = (data as { token?: string } | null)?.token;
  return token?.trim() || null;
}

export async function rotateFriendInviteLink(): Promise<string> {
  const { data, error } = await supabase.rpc("create_friend_invite_link");

  if (error) {
    throw error;
  }

  if (typeof data !== "string" || !data.trim()) {
    throw new Error("Invite link could not be created.");
  }

  return data.trim();
}

export async function revokeActiveFriendInviteLinks(): Promise<void> {
  const { error } = await supabase.rpc("revoke_friend_invite_links");
  if (error) {
    throw error;
  }
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