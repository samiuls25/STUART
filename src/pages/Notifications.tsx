import React, { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Bell,
  Calendar,
  Check,
  CheckCheck,
  Clock,
  HeartHandshake,
  Trash2,
  Users,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/auth/AuthModal";
import { useAuth } from "../lib/AuthContext";
import { useNotificationsFeed } from "../hooks/use-notifications";
import type { AppNotification } from "../lib/notifications";

type NotificationMeta = {
  icon: React.ComponentType<{ className?: string }>;
  destination: string;
};

const getNotificationMeta = (notification: AppNotification): NotificationMeta => {
  if (notification.type === "friend_request" || notification.type === "friend_request_accepted") {
    return { icon: HeartHandshake, destination: "/friends" };
  }

  if (
    notification.type === "hangout_invite"
    || notification.type === "hangout_response"
    || notification.type === "hangout_confirmed"
    || notification.type === "hangout_reminder"
  ) {
    return { icon: Calendar, destination: "/hangouts" };
  }

  if (notification.type === "friend_activity") {
    return { icon: Users, destination: "/friends" };
  }

  return { icon: Bell, destination: "/" };
};

const Notifications = () => {
  const { user, loading: authLoading } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markRead,
    markAllRead,
    removeNotification,
    clearAllNotifications,
  } = useNotificationsFeed(100);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground text-lg">Loading notifications...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-3xl mx-auto px-6 py-12 text-center">
            <h2 className="font-heading text-2xl font-bold text-foreground mb-4">
              Sign in to view notifications
            </h2>
            <button onClick={() => setShowAuth(true)} className="btn-primary px-6 py-3">
              Sign In To Continue
            </button>
          </div>
        </main>
        <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-[72px]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">Notifications</h1>
              <p className="text-muted-foreground">
                {notifications.length} total, {unreadCount} unread
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Notifications are kept until you remove them.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  void markAllRead();
                }}
                disabled={unreadCount === 0}
                className="btn-secondary px-4 py-2 disabled:opacity-60"
              >
                <CheckCheck className="w-4 h-4 mr-2 inline" />
                Mark all as read
              </button>
              <button
                onClick={() => {
                  void clearAllNotifications();
                }}
                disabled={notifications.length === 0}
                className="btn-secondary px-4 py-2 disabled:opacity-60"
              >
                <Trash2 className="w-4 h-4 mr-2 inline" />
                Clear all
              </button>
            </div>
          </motion.div>

          {notifications.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center">
              <Bell className="w-10 h-10 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold text-foreground mb-2">No notifications yet</h2>
              <p className="text-muted-foreground">We will alert you here for friend and hangout updates.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification, index) => {
                const meta = getNotificationMeta(notification);
                const Icon = meta.icon;
                const timeLabel = formatDistanceToNow(new Date(notification.createdAt), {
                  addSuffix: true,
                });

                return (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`rounded-2xl border p-4 sm:p-5 ${
                      notification.isRead
                        ? "border-border bg-card"
                        : "border-primary/30 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">{notification.title}</h3>
                          {!notification.isRead && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                              New
                            </span>
                          )}
                        </div>

                        {notification.message && (
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {timeLabel}
                          </span>
                          <Link
                            to={meta.destination}
                            className="text-primary hover:underline"
                            onClick={() => {
                              if (!notification.isRead) {
                                void markRead(notification.id);
                              }
                            }}
                          >
                            View details
                          </Link>
                        </div>
                      </div>

                      {!notification.isRead && (
                        <button
                          onClick={() => {
                            void markRead(notification.id);
                          }}
                          className="btn-secondary px-3 py-2 text-xs"
                        >
                          <Check className="w-3.5 h-3.5 mr-1 inline" />
                          Mark read
                        </button>
                      )}

                      <button
                        onClick={() => {
                          void removeNotification(notification.id);
                        }}
                        className="btn-secondary px-3 py-2 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1 inline" />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Notifications;
