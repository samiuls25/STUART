import { supabase } from "./supabase";
import { Hangout } from "../data/friends";

interface HangoutRow {
  id: string;
  title: string;
  description: string | null;
  activity_type: Hangout["activityType"];
  created_by: string;
  status: Hangout["status"];
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  confirmed_date: string | null;
  confirmed_start_time: string | null;
  confirmed_end_time: string | null;
  location_name: string | null;
  location_address: string | null;
  is_flexible_location: boolean;
  created_at: string;
}

interface HangoutInviteRow {
  hangout_id: string;
  friend_id: string;
  is_highlighted: boolean;
  response_status: "invited" | "yes" | "no" | "maybe" | "pending-availability";
  availability_submitted: Array<{ start: string; end: string; preference: "preferred" | "available" | "if-needed" }> | null;
  responded_at: string | null;
}

export interface CreateHangoutInput {
  title: string;
  description?: string;
  activityType: Hangout["activityType"];
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
}

const setupIssueCodes = new Set(["42P01", "PGRST205", "42P17"]);

export function isHangoutsSetupError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string; details?: string };
  if (candidate.code && setupIssueCodes.has(candidate.code)) return true;

  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();
  return (
    (message.includes("hangout") && (message.includes("does not exist") || message.includes("not found"))) ||
    message.includes("infinite recursion detected in policy")
  );
}

export async function fetchHangoutsForCurrentUser(): Promise<Hangout[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const [{ data: createdRows, error: createdError }, { data: inviteRefs, error: inviteRefError }] = await Promise.all([
    supabase.from("hangouts").select("*").eq("created_by", user.id),
    supabase.from("hangout_invites").select("hangout_id").eq("friend_id", user.id),
  ]);

  if (createdError) throw createdError;
  if (inviteRefError) throw inviteRefError;

  const invitedIds = [...new Set((inviteRefs || []).map((row) => row.hangout_id))];

  let invitedRows: HangoutRow[] = [];
  if (invitedIds.length > 0) {
    const { data, error } = await supabase.from("hangouts").select("*").in("id", invitedIds);
    if (error) throw error;
    invitedRows = (data || []) as HangoutRow[];
  }

  const mergedRows = new Map<string, HangoutRow>();
  for (const row of (createdRows || []) as HangoutRow[]) mergedRows.set(row.id, row);
  for (const row of invitedRows) mergedRows.set(row.id, row);

  if (mergedRows.size === 0) return [];

  const hangoutIds = [...mergedRows.keys()];
  const { data: inviteRows, error: inviteRowsError } = await supabase
    .from("hangout_invites")
    .select("hangout_id, friend_id, is_highlighted, response_status, availability_submitted, responded_at")
    .in("hangout_id", hangoutIds);

  if (inviteRowsError) throw inviteRowsError;

  const inviteMap = new Map<string, HangoutInviteRow[]>();
  for (const invite of (inviteRows || []) as HangoutInviteRow[]) {
    const list = inviteMap.get(invite.hangout_id) || [];
    list.push(invite);
    inviteMap.set(invite.hangout_id, list);
  }

  return [...mergedRows.values()]
    .map((row) => mapRowToHangout(row, inviteMap.get(row.id) || []))
    .sort((a, b) => {
      const aDate = a.confirmedTime?.date || a.proposedTimeRange.date;
      const bDate = b.confirmedTime?.date || b.proposedTimeRange.date;
      return aDate.localeCompare(bDate);
    });
}

export async function createHangout(input: CreateHangoutInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to create a hangout.");

  const { data: insertedHangout, error: hangoutError } = await supabase
    .from("hangouts")
    .insert({
      title: input.title,
      description: input.description?.trim() || null,
      activity_type: input.activityType,
      created_by: user.id,
      status: "pending",
      proposed_date: input.proposedTimeRange.date,
      proposed_start_time: input.proposedTimeRange.startTime,
      proposed_end_time: input.proposedTimeRange.endTime,
      location_name: input.location?.name?.trim() || null,
      location_address: input.location?.address?.trim() || null,
      is_flexible_location: input.location?.isFlexible ?? true,
    })
    .select("id")
    .single();

  if (hangoutError) throw hangoutError;

  const uniqueInvites = [...new Set(input.invitedFriends)].filter((friendId) => friendId && friendId !== user.id);

  if (uniqueInvites.length === 0) return;

  const highlighted = new Set(input.highlightedFriends);
  const { error: inviteError } = await supabase.from("hangout_invites").insert(
    uniqueInvites.map((friendId) => ({
      hangout_id: insertedHangout.id,
      friend_id: friendId,
      is_highlighted: highlighted.has(friendId),
      response_status: "invited",
      availability_submitted: [],
    }))
  );

  if (inviteError) throw inviteError;
}

export async function respondToHangout(hangoutId: string, response: "yes" | "no" | "maybe"): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to respond.");

  const { error } = await supabase
    .from("hangout_invites")
    .update({
      response_status: response,
      responded_at: new Date().toISOString(),
    })
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id);

  if (error) throw error;
}

function mapRowToHangout(row: HangoutRow, invites: HangoutInviteRow[]): Hangout {
  const responses = invites.map((invite) => ({
    friendId: invite.friend_id,
    status: invite.response_status,
    availabilitySubmitted: invite.availability_submitted || undefined,
    respondedAt: invite.responded_at || undefined,
  }));

  return {
    id: row.id,
    title: row.title,
    description: row.description || undefined,
    activityType: row.activity_type,
    createdBy: row.created_by,
    proposedTimeRange: {
      date: row.proposed_date,
      startTime: row.proposed_start_time,
      endTime: row.proposed_end_time,
    },
    location: row.location_name
      ? {
          name: row.location_name,
          address: row.location_address || undefined,
          isFlexible: row.is_flexible_location,
        }
      : undefined,
    invitedFriends: invites.map((invite) => invite.friend_id),
    highlightedFriends: invites.filter((invite) => invite.is_highlighted).map((invite) => invite.friend_id),
    responses,
    status: row.status,
    confirmedTime:
      row.confirmed_date && row.confirmed_start_time && row.confirmed_end_time
        ? {
            date: row.confirmed_date,
            startTime: row.confirmed_start_time,
            endTime: row.confirmed_end_time,
          }
        : undefined,
  };
}
