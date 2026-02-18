import { supabase } from "./supabase";

export interface Friend {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  status: 'pending' | 'accepted' | 'blocked';
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

  // Combine data
  return friendships.map(f => {
    const profile = profiles?.find(p => p.id === f.friend_id);
    return {
      id: f.friend_id,
      name: profile?.name || profile?.email || "Unknown",
      email: profile?.email || "",
      avatar_url: profile?.avatar_url,
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

  console.log("Current user:", user.email);
  console.log("Searching for friend:", normalizedEmail);

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

  console.log("Friend profile search result:", friendProfile);
  console.log("Profile error:", profileError);

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