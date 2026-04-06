import { supabase } from "./supabase";

export type NotificationType =
  | "friend_request"
  | "friend_request_accepted"
  | "hangout_invite"
  | "hangout_response"
  | "hangout_confirmed"
  | "hangout_reminder"
  | "friend_activity";

export interface AppNotification {
  id: string;
  recipientUserId: string;
  actorUserId: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationRow {
  id: string;
  recipient_user_id: string;
  actor_user_id: string | null;
  type: NotificationType;
  title: string;
  message: string | null;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationPreferences {
  hangoutInvites: boolean;
  friendRequests: boolean;
  eventReminders: boolean;
  friendActivity: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  hangoutInvites: true,
  friendRequests: true,
  eventReminders: true,
  friendActivity: false,
};

const setupIssueCodes = new Set(["42P01", "42703", "PGRST204", "PGRST205", "PGRST202"]);

const mapRow = (row: NotificationRow): AppNotification => ({
  id: row.id,
  recipientUserId: row.recipient_user_id,
  actorUserId: row.actor_user_id,
  type: row.type,
  title: row.title,
  message: row.message,
  entityType: row.entity_type,
  entityId: row.entity_id,
  metadata: row.metadata || {},
  isRead: row.is_read,
  readAt: row.read_at,
  createdAt: row.created_at,
});

export const isNotificationsSetupError = (error: unknown): boolean => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string; details?: string };
  if (candidate.code && setupIssueCodes.has(candidate.code)) return true;

  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();
  return (
    (message.includes("notification") && (message.includes("does not exist") || message.includes("not found")))
    || message.includes("create_app_notification")
  );
};

const isMissingColumnError = (error: unknown, columnName: string) => {
  if (!error || typeof error !== "object") return false;

  const candidate = error as { code?: string; message?: string; details?: string };
  const message = `${candidate.message || ""} ${candidate.details || ""}`.toLowerCase();

  const hasMissingColumnMessage =
    message.includes("could not find")
    && message.includes(columnName.toLowerCase())
    && message.includes("column");

  return (
    (candidate.code === "42703" && message.includes(columnName.toLowerCase()))
    || (candidate.code === "PGRST204" && hasMissingColumnMessage)
  );
};

const toPreferenceKey = (
  type: NotificationType
): keyof NotificationPreferences | null => {
  if (type === "friend_request" || type === "friend_request_accepted") return "friendRequests";
  if (type === "hangout_invite") return "hangoutInvites";
  if (type === "hangout_confirmed" || type === "hangout_reminder") return "eventReminders";
  if (type === "friend_activity") return "friendActivity";
  return null;
};

const fetchProfileNotificationPreferences = async (
  userId: string
): Promise<NotificationPreferences> => {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "notification_hangout_invites,notification_friend_requests,notification_event_reminders,notification_friend_activity"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (
      isMissingColumnError(error, "notification_hangout_invites")
      || isMissingColumnError(error, "notification_friend_requests")
      || isMissingColumnError(error, "notification_event_reminders")
      || isMissingColumnError(error, "notification_friend_activity")
    ) {
      return { ...DEFAULT_PREFERENCES };
    }
    throw error;
  }

  const row =
    (data as {
      notification_hangout_invites?: boolean | null;
      notification_friend_requests?: boolean | null;
      notification_event_reminders?: boolean | null;
      notification_friend_activity?: boolean | null;
    } | null) || null;

  if (!row) return { ...DEFAULT_PREFERENCES };

  return {
    hangoutInvites: row.notification_hangout_invites !== false,
    friendRequests: row.notification_friend_requests !== false,
    eventReminders: row.notification_event_reminders !== false,
    friendActivity: row.notification_friend_activity !== false,
  };
};

export async function fetchCurrentUserNotificationPreferences(): Promise<NotificationPreferences> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ...DEFAULT_PREFERENCES };

  try {
    const profilePreferences = await fetchProfileNotificationPreferences(user.id);
    return profilePreferences;
  } catch (error) {
    console.warn("Falling back to auth metadata notification preferences", error);
    const meta = (user as { user_metadata?: Record<string, unknown> }).user_metadata || {};
    return {
      hangoutInvites: meta.notification_hangout_invites !== false,
      friendRequests: meta.notification_friend_requests !== false,
      eventReminders: meta.notification_event_reminders !== false,
      friendActivity: meta.notification_friend_activity === true,
    };
  }
}

export async function fetchNotificationsForCurrentUser(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<AppNotification[]> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  let query = supabase
    .from("notifications")
    .select(
      "id,recipient_user_id,actor_user_id,type,title,message,entity_type,entity_id,metadata,is_read,read_at,created_at"
    )
    .eq("recipient_user_id", user.id)
    .order("created_at", { ascending: false });

  if (options?.unreadOnly) {
    query = query.eq("is_read", false);
  }

  if (options?.limit && options.limit > 0) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    if (isNotificationsSetupError(error)) return [];
    throw error;
  }

  return ((data || []) as NotificationRow[]).map(mapRow);
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return 0;

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("recipient_user_id", user.id)
    .eq("is_read", false);

  if (error) {
    if (isNotificationsSetupError(error)) return 0;
    throw error;
  }

  return count || 0;
}

export async function markNotificationAsRead(notificationId: string): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("id", notificationId)
    .eq("is_read", false);

  if (error) {
    if (isNotificationsSetupError(error)) return;
    throw error;
  }
}

export async function markAllNotificationsAsRead(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const { error } = await supabase
    .from("notifications")
    .update({
      is_read: true,
      read_at: new Date().toISOString(),
    })
    .eq("recipient_user_id", user.id)
    .eq("is_read", false);

  if (error) {
    if (isNotificationsSetupError(error)) return;
    throw error;
  }
}

export async function createNotification(input: {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const preferenceKey = toPreferenceKey(input.type);
  if (preferenceKey) {
    try {
      const preferences = await fetchProfileNotificationPreferences(input.recipientUserId);
      if (!preferences[preferenceKey]) {
        return;
      }
    } catch (error) {
      if (!isNotificationsSetupError(error)) {
        console.warn("Could not resolve recipient notification preferences", error);
      }
    }
  }

  const payload = {
    recipient_user_id: input.recipientUserId,
    actor_user_id: user.id,
    type: input.type,
    title: input.title,
    message: input.message || null,
    entity_type: input.entityType || null,
    entity_id: input.entityId || null,
    metadata: input.metadata || {},
  };

  const rpcPayload = {
    p_recipient_user_id: payload.recipient_user_id,
    p_type: payload.type,
    p_title: payload.title,
    p_message: payload.message,
    p_entity_type: payload.entity_type,
    p_entity_id: payload.entity_id,
    p_metadata: payload.metadata,
  };

  const { error: rpcError } = await supabase.rpc("create_app_notification", rpcPayload);

  if (!rpcError) {
    return;
  }

  if (!isNotificationsSetupError(rpcError)) {
    throw rpcError;
  }

  const { error: insertError } = await supabase.from("notifications").insert(payload);

  if (insertError) {
    if (isNotificationsSetupError(insertError)) return;
    throw insertError;
  }
}

export async function createNotificationsBatch(input: {
  recipientUserIds: string[];
  type: NotificationType;
  title: string;
  message?: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const uniqueRecipients = [...new Set(input.recipientUserIds)].filter(Boolean);

  for (const recipientUserId of uniqueRecipients) {
    try {
      await createNotification({
        recipientUserId,
        type: input.type,
        title: input.title,
        message: input.message,
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: input.metadata,
      });
    } catch (error) {
      console.warn("Unable to create notification", error);
    }
  }
}

export async function fetchAcceptedFriendIdsForUser(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("user_id", userId)
    .eq("status", "accepted");

  if (error) {
    console.warn("Unable to fetch accepted friend ids", error);
    return [];
  }

  return ((data as Array<{ friend_id: string }> | null) || []).map((row) => row.friend_id);
}
