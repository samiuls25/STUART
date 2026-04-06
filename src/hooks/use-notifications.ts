import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import {
  type AppNotification,
  fetchNotificationsForCurrentUser,
  fetchUnreadNotificationCount,
  isNotificationsSetupError,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../lib/notifications";

export function useNotificationCount() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refreshCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    try {
      const count = await fetchUnreadNotificationCount();
      setUnreadCount(count);
    } catch (error) {
      console.warn("Unable to refresh notification count", error);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notification-count-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          void refreshCount();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshCount, user]);

  return {
    unreadCount,
    loading,
    refreshCount,
  };
}

export function useNotificationsFeed(limit = 100) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  const refreshFeed = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setLoading(false);
      return;
    }

    try {
      const rows = await fetchNotificationsForCurrentUser({ limit });
      setNotifications(rows);
    } catch (error) {
      if (!isNotificationsSetupError(error)) {
        console.warn("Unable to refresh notifications", error);
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [limit, user]);

  useEffect(() => {
    void refreshFeed();
  }, [refreshFeed]);

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notification-feed-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        () => {
          void refreshFeed();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshFeed, user]);

  const markRead = useCallback(
    async (notificationId: string) => {
      await markNotificationAsRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, isRead: true, readAt: notification.readAt || new Date().toISOString() }
            : notification
        )
      );
    },
    []
  );

  const markAllRead = useCallback(async () => {
    await markAllNotificationsAsRead();
    const now = new Date().toISOString();
    setNotifications((current) =>
      current.map((notification) =>
        notification.isRead ? notification : { ...notification, isRead: true, readAt: now }
      )
    );
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    refreshFeed,
    markRead,
    markAllRead,
  };
}
