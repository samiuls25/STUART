import { supabase } from "./supabase";
import { Hangout, TimeRange } from "../data/friends";
import { hasHangoutsIsPublicColumn } from "./hangoutsSchema";

interface HangoutRow {
  id: string;
  title: string;
  description: string | null;
  activity_type: Hangout["activityType"];
  is_public?: boolean;
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

interface HangoutMembershipRow {
  response_status: "invited" | "yes" | "no" | "maybe" | "pending-availability";
}

export interface CreateHangoutInput {
  title: string;
  description?: string;
  activityType: Hangout["activityType"];
  isPublic?: boolean;
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
  creatorAvailability?: TimeRange[];
}

const setupIssueCodes = new Set(["42P01", "PGRST205", "42P17"]);

const isMissingColumnError = (error: unknown, columnName: string) => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();

  const hasMissingColumnMessage = message.includes("could not find")
    && message.includes(columnName.toLowerCase())
    && message.includes("column");

  return (
    (candidate.code === "42703" && message.includes(columnName.toLowerCase()))
    || (candidate.code === "PGRST204" && hasMissingColumnMessage)
  );
};

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

export async function getCurrentUserHangoutMembership(hangoutId: string): Promise<{
  joined: boolean;
  status?: "invited" | "yes" | "no" | "maybe" | "pending-availability";
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { joined: false };
  }

  const { data, error } = await supabase
    .from("hangout_invites")
    .select("response_status")
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const membership = data as HangoutMembershipRow | null;
  if (!membership) {
    return { joined: false };
  }

  return {
    joined: membership.response_status !== "no",
    status: membership.response_status,
  };
}

export async function joinPublicHangout(hangoutId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to join this hangout.");
  }

  const existingMembership = await getCurrentUserHangoutMembership(hangoutId);
  if (existingMembership.joined) {
    return;
  }

  if (existingMembership.status === "no") {
    const { error: rejoinError } = await supabase
      .from("hangout_invites")
      .update({
        response_status: "yes",
        availability_submitted: [],
        responded_at: new Date().toISOString(),
      })
      .eq("hangout_id", hangoutId)
      .eq("friend_id", user.id);

    if (rejoinError) {
      throw rejoinError;
    }

    return;
  }

  const { error } = await supabase.from("hangout_invites").insert({
    hangout_id: hangoutId,
    friend_id: user.id,
    is_highlighted: false,
    response_status: "yes",
    availability_submitted: [],
    responded_at: new Date().toISOString(),
  });

  if (error) {
    // Ignore duplicate row races if another request inserted first.
    if ((error as { code?: string }).code === "23505") {
      return;
    }
    throw error;
  }
}

export async function leavePublicHangout(hangoutId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("You must be signed in to leave this hangout.");
  }

  const { error } = await supabase
    .from("hangout_invites")
    .update({
      response_status: "no",
      availability_submitted: [],
      responded_at: new Date().toISOString(),
    })
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id);

  if (error) {
    throw error;
  }
}

export async function createHangout(input: CreateHangoutInput): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to create a hangout.");

  const baseInsertPayload = {
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
  };

  const supportsIsPublicColumn = await hasHangoutsIsPublicColumn();

  const insertPayload = supportsIsPublicColumn
    ? {
        ...baseInsertPayload,
        is_public: input.isPublic ?? false,
      }
    : baseInsertPayload;

  const { data: insertedHangout, error: hangoutError } = await supabase
    .from("hangouts")
    .insert(insertPayload)
    .select("id")
    .single();

  if (hangoutError && isMissingColumnError(hangoutError, "is_public")) {
    const retry = await supabase
      .from("hangouts")
      .insert(baseInsertPayload)
      .select("id")
      .single();

    if (retry.error) throw retry.error;

    const fallbackInserted = retry.data;
    if (!fallbackInserted) {
      throw new Error("Failed to create hangout");
    }

    const uniqueInvites = [...new Set(input.invitedFriends)].filter((friendId) => friendId && friendId !== user.id);

    const inviteRows = [
      {
        hangout_id: fallbackInserted.id,
        friend_id: user.id,
        is_highlighted: false,
        response_status: "yes" as const,
        availability_submitted: input.creatorAvailability || [],
      },
      ...uniqueInvites.map((friendId) => ({
        hangout_id: fallbackInserted.id,
        friend_id: friendId,
        is_highlighted: new Set(input.highlightedFriends).has(friendId),
        response_status: "invited" as const,
        availability_submitted: [],
      })),
    ];

    const { error: inviteError } = await supabase.from("hangout_invites").insert(inviteRows);

    if (inviteError) throw inviteError;

    await syncHangoutStatus(fallbackInserted.id);
    return;
  }

  if (hangoutError) throw hangoutError;

  if (!insertedHangout) {
    throw new Error("Failed to create hangout");
  }

  const uniqueInvites = [...new Set(input.invitedFriends)].filter((friendId) => friendId && friendId !== user.id);

  const inviteRows = [
    {
      hangout_id: insertedHangout.id,
      friend_id: user.id,
      is_highlighted: false,
      response_status: "yes" as const,
      availability_submitted: input.creatorAvailability || [],
    },
    ...uniqueInvites.map((friendId) => ({
      hangout_id: insertedHangout.id,
      friend_id: friendId,
      is_highlighted: new Set(input.highlightedFriends).has(friendId),
      response_status: "invited" as const,
      availability_submitted: [],
    })),
  ];

  const { error: inviteError } = await supabase.from("hangout_invites").insert(inviteRows);

  if (inviteError) throw inviteError;

  await syncHangoutStatus(insertedHangout.id);
}

export async function respondToHangout(hangoutId: string, response: "yes" | "no" | "maybe"): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to respond.");

  const responseUpdate: {
    response_status: "yes" | "no" | "maybe";
    responded_at: string;
    availability_submitted?: TimeRange[];
  } = {
    response_status: response,
    responded_at: new Date().toISOString(),
  };

  if (response === "no") {
    responseUpdate.availability_submitted = [];
  }

  const { error } = await supabase
    .from("hangout_invites")
    .update(responseUpdate)
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id);

  if (error) throw error;

  await syncHangoutStatus(hangoutId);
}

export async function submitHangoutAvailability(hangoutId: string, availability: TimeRange[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to submit availability.");

  const { error } = await supabase
    .from("hangout_invites")
    .update({
      availability_submitted: availability,
      responded_at: new Date().toISOString(),
    })
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id);

  if (error) throw error;

  await syncHangoutStatus(hangoutId);
}

export async function deleteHangout(hangoutId: string): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to delete a hangout.");

  const { error } = await supabase
    .from("hangouts")
    .delete()
    .eq("id", hangoutId)
    .eq("created_by", user.id);

  if (error) throw error;
}

async function syncHangoutStatus(hangoutId: string): Promise<void> {
  const { data: inviteRows, error: inviteError } = await supabase
    .from("hangout_invites")
    .select("response_status")
    .eq("hangout_id", hangoutId);

  if (inviteError) throw inviteError;

  const responses = inviteRows || [];
  const hasYes = responses.some((row) => row.response_status === "yes");
  const hasUnanswered = responses.some((row) => row.response_status === "invited");

  let nextStatus: Hangout["status"] = "pending";
  if (hasUnanswered) {
    nextStatus = "suggested";
  } else if (hasYes) {
    nextStatus = "confirmed";
  }

  const updatePayload: {
    status: Hangout["status"];
    confirmed_date: string | null;
    confirmed_start_time: string | null;
    confirmed_end_time: string | null;
  } = {
    status: nextStatus,
    confirmed_date: null,
    confirmed_start_time: null,
    confirmed_end_time: null,
  };

  if (nextStatus === "confirmed") {
    const { data: hangoutRow, error: hangoutReadError } = await supabase
      .from("hangouts")
      .select("proposed_date, proposed_start_time, proposed_end_time")
      .eq("id", hangoutId)
      .single();

    if (hangoutReadError) throw hangoutReadError;

    updatePayload.confirmed_date = hangoutRow.proposed_date;
    updatePayload.confirmed_start_time = hangoutRow.proposed_start_time;
    updatePayload.confirmed_end_time = hangoutRow.proposed_end_time;
  }

  const { error: updateError } = await supabase.from("hangouts").update(updatePayload).eq("id", hangoutId);

  if (updateError) throw updateError;
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
    isPublic: Boolean(row.is_public),
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
