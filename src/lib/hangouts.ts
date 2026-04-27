import { supabase } from "./supabase";
import { Hangout, TimeRange } from "../data/friends";
import { createNotification, createNotificationsBatch } from "./notifications";

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
  updated_at: string;
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

interface HangoutStatusSyncRow {
  proposed_date: string;
  proposed_start_time: string;
  proposed_end_time: string;
  is_public?: boolean;
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

const getUserDisplayName = (user: { email?: string | null; user_metadata?: { full_name?: string } }) => {
  return user.user_metadata?.full_name || user.email || "A friend";
};

const createHangoutInviteNotifications = async (
  creator: { id: string; email?: string | null; user_metadata?: { full_name?: string } },
  invitedUserIds: string[],
  hangoutId: string,
  hangoutTitle: string
) => {
  if (invitedUserIds.length === 0) return;

  const creatorName = getUserDisplayName(creator);

  await createNotificationsBatch({
    recipientUserIds: invitedUserIds,
    type: "hangout_invite",
    title: "New hangout invite",
    message: `${creatorName} invited you to \"${hangoutTitle}\".`,
    entityType: "hangout",
    entityId: hangoutId,
    metadata: {
      hangoutId,
      hangoutTitle,
    },
  });
};

const notifyHangoutHostOfResponse = async (args: {
  actor: { id: string; email?: string | null; user_metadata?: { full_name?: string } };
  hostUserId: string;
  hangoutId: string;
  hangoutTitle: string;
  response: "yes" | "no" | "maybe";
}) => {
  if (args.actor.id === args.hostUserId) return;

  const actorName = getUserDisplayName(args.actor);
  const responseLabel =
    args.response === "yes" ? "is in" : args.response === "maybe" ? "is maybe" : "can't make it";

  await createNotification({
    recipientUserId: args.hostUserId,
    type: "hangout_response",
    title: "Hangout response update",
    message: `${actorName} ${responseLabel} for \"${args.hangoutTitle}\".`,
    entityType: "hangout",
    entityId: args.hangoutId,
    metadata: {
      hangoutId: args.hangoutId,
      hangoutTitle: args.hangoutTitle,
      response: args.response,
      responderId: args.actor.id,
    },
  });
};

const fetchHangoutOwnerAndTitle = async (
  hangoutId: string
): Promise<{ createdBy: string; title: string } | null> => {
  const { data, error } = await supabase
    .from("hangouts")
    .select("created_by,title")
    .eq("id", hangoutId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as { created_by?: string; title?: string };
  if (!row.created_by || !row.title) {
    return null;
  }

  return {
    createdBy: row.created_by,
    title: row.title,
  };
};

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
    .delete()
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

  const shouldCreatePublicHangout = input.isPublic ?? false;

  const baseInsertPayload = {
    title: input.title,
    description: input.description?.trim() || null,
    activity_type: input.activityType,
    created_by: user.id,
    status: shouldCreatePublicHangout ? "confirmed" : "pending",
    proposed_date: input.proposedTimeRange.date,
    proposed_start_time: input.proposedTimeRange.startTime,
    proposed_end_time: input.proposedTimeRange.endTime,
    confirmed_date: shouldCreatePublicHangout ? input.proposedTimeRange.date : null,
    confirmed_start_time: shouldCreatePublicHangout ? input.proposedTimeRange.startTime : null,
    confirmed_end_time: shouldCreatePublicHangout ? input.proposedTimeRange.endTime : null,
    location_name: input.location?.name?.trim() || null,
    location_address: input.location?.address?.trim() || null,
    is_flexible_location: input.location?.isFlexible ?? true,
  };

  const insertPayload = {
    ...baseInsertPayload,
    is_public: shouldCreatePublicHangout,
  };

  const { data: insertedHangout, error: hangoutError } = await supabase
    .from("hangouts")
    .insert(insertPayload)
    .select("id,is_public")
    .single();

  if (hangoutError && isMissingColumnError(hangoutError, "is_public")) {
    if (shouldCreatePublicHangout) {
      throw new Error("Public hangouts are unavailable until the is_public column is active in Supabase API.");
    }

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

    try {
      await createHangoutInviteNotifications(user, uniqueInvites, fallbackInserted.id, input.title);
    } catch (notificationError) {
      console.warn("Hangout invite notifications skipped", notificationError);
    }

    await syncHangoutStatus(fallbackInserted.id);
    return;
  }

  if (hangoutError) throw hangoutError;

  if (!insertedHangout) {
    throw new Error("Failed to create hangout");
  }

  if (shouldCreatePublicHangout && insertedHangout.is_public !== true) {
    throw new Error("Public hangout creation failed to persist visibility. Please retry.");
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

  try {
    await createHangoutInviteNotifications(user, uniqueInvites, insertedHangout.id, input.title);
  } catch (notificationError) {
    console.warn("Hangout invite notifications skipped", notificationError);
  }

  await syncHangoutStatus(insertedHangout.id);
}

export async function respondToHangout(hangoutId: string, response: "yes" | "no" | "maybe"): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to respond.");

  const hangoutContext = await fetchHangoutOwnerAndTitle(hangoutId);

  if (response === "no") {
    let isPublicHangout = false;

    const publicProbe = await supabase
      .from("hangouts")
      .select("is_public")
      .eq("id", hangoutId)
      .single();

    if (publicProbe.error) {
      if (!isMissingColumnError(publicProbe.error, "is_public")) {
        throw publicProbe.error;
      }
    } else {
      isPublicHangout = Boolean((publicProbe.data as { is_public?: boolean }).is_public);
    }

    if (isPublicHangout) {
      const { error: leaveError } = await supabase
        .from("hangout_invites")
        .delete()
        .eq("hangout_id", hangoutId)
        .eq("friend_id", user.id);

      if (!leaveError) {
        await syncHangoutStatus(hangoutId);

        if (hangoutContext) {
          try {
            await notifyHangoutHostOfResponse({
              actor: user,
              hostUserId: hangoutContext.createdBy,
              hangoutId,
              hangoutTitle: hangoutContext.title,
              response,
            });
          } catch (notificationError) {
            console.warn("Hangout response notification skipped", notificationError);
          }
        }

        return;
      }

      const leaveMessage = `${(leaveError as { message?: string }).message || ""}`.toLowerCase();
      const isDeletePolicyDenied =
        (leaveError as { code?: string }).code === "42501"
        || leaveMessage.includes("row-level security")
        || leaveMessage.includes("permission denied");

      if (!isDeletePolicyDenied) {
        throw leaveError;
      }

      // Compatibility fallback for environments that still block invitee deletes.
      // In this case, keep behavior functional by writing an explicit "no" response.
      // UI will hide declined public attendees from membership lists.
      console.warn("Public leave delete blocked by RLS; falling back to response_status='no'.");

    }
  }

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

  if (hangoutContext) {
    try {
      await notifyHangoutHostOfResponse({
        actor: user,
        hostUserId: hangoutContext.createdBy,
        hangoutId,
        hangoutTitle: hangoutContext.title,
        response,
      });
    } catch (notificationError) {
      console.warn("Hangout response notification skipped", notificationError);
    }
  }
}

export async function submitHangoutAvailability(hangoutId: string, availability: TimeRange[]): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to submit availability.");

  const { data: membership, error: membershipError } = await supabase
    .from("hangout_invites")
    .select("response_status")
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id)
    .single();

  if (membershipError) throw membershipError;

  const currentStatus = (membership as HangoutMembershipRow).response_status;
  const shouldMarkPendingAvailability = availability.length > 0 && currentStatus !== "no";

  const { error } = await supabase
    .from("hangout_invites")
    .update({
      availability_submitted: availability,
      ...(shouldMarkPendingAvailability ? { response_status: "pending-availability" as const } : {}),
      responded_at: new Date().toISOString(),
    })
    .eq("hangout_id", hangoutId)
    .eq("friend_id", user.id);

  if (error) throw error;

  await syncHangoutStatus(hangoutId);
}

export async function applySuggestedHangoutTime(
  hangoutId: string,
  suggestedTime: { date: string; startTime: string; endTime: string }
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("You must be signed in to finalize a hangout time.");

  const { error } = await supabase
    .from("hangouts")
    .update({
      status: "confirmed",
      proposed_date: suggestedTime.date,
      proposed_start_time: suggestedTime.startTime,
      proposed_end_time: suggestedTime.endTime,
      confirmed_date: suggestedTime.date,
      confirmed_start_time: suggestedTime.startTime,
      confirmed_end_time: suggestedTime.endTime,
      updated_at: new Date().toISOString(),
    })
    .eq("id", hangoutId)
    .eq("created_by", user.id);

  if (error) throw error;

  const [hangoutContext, inviteesResult] = await Promise.all([
    fetchHangoutOwnerAndTitle(hangoutId),
    supabase
      .from("hangout_invites")
      .select("friend_id,response_status")
      .eq("hangout_id", hangoutId),
  ]);

  if (inviteesResult.error) {
    console.warn("Could not fetch hangout invitees for notifications", inviteesResult.error);
    return;
  }

  const recipientUserIds = ((inviteesResult.data as Array<{ friend_id: string; response_status: string }> | null) || [])
    .filter((row) => row.friend_id !== user.id && row.response_status !== "no")
    .map((row) => row.friend_id);

  if (recipientUserIds.length === 0) {
    return;
  }

  try {
    await createNotificationsBatch({
      recipientUserIds,
      type: "hangout_confirmed",
      title: "Hangout time confirmed",
      message: `\"${hangoutContext?.title || "Your hangout"}\" is confirmed for ${suggestedTime.date} at ${suggestedTime.startTime}.`,
      entityType: "hangout",
      entityId: hangoutId,
      metadata: {
        hangoutId,
        date: suggestedTime.date,
        startTime: suggestedTime.startTime,
        endTime: suggestedTime.endTime,
      },
    });
  } catch (notificationError) {
    console.warn("Hangout confirmation notifications skipped", notificationError);
  }
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
  let hangoutRow: HangoutStatusSyncRow;
  let isPublicHangout = false;

  const withPublicColumn = await supabase
    .from("hangouts")
    .select("is_public,proposed_date,proposed_start_time,proposed_end_time")
    .eq("id", hangoutId)
    .single();

  if (withPublicColumn.error) {
    if (!isMissingColumnError(withPublicColumn.error, "is_public")) {
      throw withPublicColumn.error;
    }

    const withoutPublicColumn = await supabase
      .from("hangouts")
      .select("proposed_date,proposed_start_time,proposed_end_time")
      .eq("id", hangoutId)
      .single();

    if (withoutPublicColumn.error) throw withoutPublicColumn.error;
    hangoutRow = withoutPublicColumn.data as HangoutStatusSyncRow;
  } else {
    hangoutRow = withPublicColumn.data as HangoutStatusSyncRow;
    isPublicHangout = Boolean((withPublicColumn.data as { is_public?: boolean }).is_public);
  }

  const { data: inviteRows, error: inviteError } = await supabase
    .from("hangout_invites")
    .select("response_status")
    .eq("hangout_id", hangoutId);

  if (inviteError) throw inviteError;

  const responses = inviteRows || [];
  const hasCommittedParticipant = responses.some(
    (row) => row.response_status === "yes" || row.response_status === "pending-availability"
  );
  const hasUnanswered = responses.some((row) => row.response_status === "invited");

  let nextStatus: Hangout["status"] = "pending";

  if (isPublicHangout) {
    // Public hangouts should stay discoverable and joinable even when people leave.
    nextStatus = "confirmed";
  } else if (hasUnanswered) {
    nextStatus = "suggested";
  } else if (hasCommittedParticipant) {
    nextStatus = "confirmed";
  }

  const updatePayload: {
    status: Hangout["status"];
    confirmed_date: string | null;
    confirmed_start_time: string | null;
    confirmed_end_time: string | null;
    updated_at: string;
  } = {
    status: nextStatus,
    confirmed_date: null,
    confirmed_start_time: null,
    confirmed_end_time: null,
    updated_at: new Date().toISOString(),
  };

  if (nextStatus === "confirmed") {
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
    confirmedAt: row.status === "confirmed" ? (row.updated_at || row.created_at) : undefined,
    confirmedByUserId: row.created_by,
  };
}
