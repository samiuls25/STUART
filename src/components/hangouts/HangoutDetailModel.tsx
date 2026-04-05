import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Calendar, Users, Check, HelpCircle, Sparkles, MessageCircle, Trash2 } from "lucide-react";
import { Hangout, TimeRange, getFriendById, getActivityType } from "../../data/friends";
import { format, parseISO } from "date-fns";
import AvailabilityHeatmap from "../availability/AvailabilityHeatmap";
import ConfirmDeleteHangoutDialog from "./ConfirmDeleteHangoutDialog";
import { scoreAvailabilitySlots } from "../../lib/hangoutFinalization";

interface HangoutDetailModalProps {
  hangout: Hangout | null;
  isOpen: boolean;
  onClose: () => void;
  onRespond?: (hangout: Hangout, response: "yes" | "no" | "maybe") => void;
  onSubmitAvailability?: (hangout: Hangout, availability: TimeRange[]) => void;
  onApplySuggestedTime?: (
    hangout: Hangout,
    suggestedTime: { date: string; startTime: string; endTime: string }
  ) => Promise<void> | void;
  onDeleteHangout?: (hangout: Hangout) => void;
  initialShowAvailability?: boolean;
  currentUserId?: string;
}

const HangoutDetailModal = ({
  hangout,
  isOpen,
  onClose,
  onRespond,
  onSubmitAvailability,
  onApplySuggestedTime,
  onDeleteHangout,
  initialShowAvailability,
  currentUserId,
}: HangoutDetailModalProps) => {
  if (!hangout) return null;

  const [showAvailabilityEditor, setShowAvailabilityEditor] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [applyingSuggestedTime, setApplyingSuggestedTime] = useState(false);
  const [availabilitySlots, setAvailabilitySlots] = useState<Record<string, number>>({});

  const viewerId = currentUserId || "current-user";

  const activityType = getActivityType(hangout.activityType);
  const creator = getFriendById(hangout.createdBy);
  const currentUserResponse = hangout.responses.find((r) => r.friendId === viewerId);
  const visibleResponses = hangout.isPublic
    ? hangout.responses.filter((response) => response.status !== "no")
    : hangout.responses;
  const isCreator = hangout.createdBy === viewerId;
  const timeRange = hangout.confirmedTime || hangout.proposedTimeRange;
  const canRespond = !!currentUserResponse;
  const canShareAvailability = !!currentUserResponse && currentUserResponse.status !== "no";

  const toggleAvailabilitySlot = (key: string) => {
    setAvailabilitySlots((prev) => {
      const current = prev[key] || 0;
      return { ...prev, [key]: current === 0 ? 1 : 0 };
    });
  };

  const selectedAvailabilityCount = Object.values(availabilitySlots).filter((value) => value > 0).length;

  const toNextHour = (time: string) => {
    const [hoursRaw, minutesRaw] = time.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const nextHours = (hours + 1) % 24;
    return `${String(nextHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const parseAvailabilitySlots = (): TimeRange[] => {
    return Object.entries(availabilitySlots)
      .filter(([, value]) => value > 0)
      .map(([slotKey]) => {
        const date = slotKey.slice(0, 10);
        const time = slotKey.slice(11);
        return {
          start: `${date}T${time}:00`,
          end: `${date}T${toNextHour(time)}:00`,
          preference: "available",
        };
      });
  };

  const toSlotKey = (slot: TimeRange): string | null => {
    if (!slot.start) return null;
    try {
      const dt = parseISO(slot.start);
      return `${format(dt, "yyyy-MM-dd")}-${format(dt, "HH:mm")}`;
    } catch {
      return null;
    }
  };

  const buildSlotMapFromRanges = (ranges: TimeRange[] | undefined): Record<string, number> => {
    if (!ranges) return {};
    const next: Record<string, number> = {};
    ranges.forEach((slot) => {
      const key = toSlotKey(slot);
      if (key) next[key] = 1;
    });
    return next;
  };

  useEffect(() => {
    setAvailabilitySlots(buildSlotMapFromRanges(currentUserResponse?.availabilitySubmitted));
  }, [hangout.id, currentUserResponse?.availabilitySubmitted]);

  useEffect(() => {
    setShowAvailabilityEditor(!!initialShowAvailability);
  }, [hangout.id, initialShowAvailability]);

  const friendAvailabilityForEditor = useMemo(() => {
    const map: Record<string, string[]> = {};
    hangout.responses
      .filter((response) => response.friendId !== viewerId && response.status !== "no")
      .forEach((response) => {
        if (!response.availabilitySubmitted?.length) return;
        const friend = getFriendById(response.friendId);
        const friendName = friend?.name || "Unknown";
        const keys = response.availabilitySubmitted
          .map((slot) => toSlotKey(slot))
          .filter((slot): slot is string => !!slot);
        if (keys.length > 0) map[friendName] = keys;
      });
    return map;
  }, [hangout.responses, viewerId]);

  const submittedFriendAvailability = useMemo(() => {
    const map: Record<string, string[]> = {};
    hangout.responses.forEach((response) => {
      if (response.status === "no") return;
      if (!response.availabilitySubmitted?.length) return;
      const friend = getFriendById(response.friendId);
      const friendName = friend?.name || "Unknown";
      const keys = response.availabilitySubmitted
        .map((slot) => toSlotKey(slot))
        .filter((slot): slot is string => !!slot);
      if (keys.length > 0) map[friendName] = keys;
    });
    return map;
  }, [hangout.responses]);

  const submittedAggregateSlots = useMemo(() => {
    const aggregate: Record<string, number> = {};
    Object.values(submittedFriendAvailability).forEach((keys) => {
      keys.forEach((key) => {
        aggregate[key] = Math.min((aggregate[key] || 0) + 1, 3);
      });
    });
    return aggregate;
  }, [submittedFriendAvailability]);

  const rankedAvailabilitySuggestions = useMemo(() => {
    return scoreAvailabilitySlots(
      hangout.responses.map((response) => ({
        friendId: response.friendId,
        status: response.status,
        availabilitySubmitted: response.availabilitySubmitted,
      }))
    );
  }, [hangout.responses]);

  const bestAvailabilitySuggestion = rankedAvailabilitySuggestions[0] || null;
  const isSuggestedSlotAlreadyApplied = Boolean(
    bestAvailabilitySuggestion
    && timeRange.date === bestAvailabilitySuggestion.date
    && timeRange.startTime === bestAvailabilitySuggestion.startTime
    && timeRange.endTime === bestAvailabilitySuggestion.endTime
  );

  const formatSuggestedSlot = (date: string, startTime: string, endTime: string) => {
    try {
      const dateLabel = format(parseISO(`${date}T${startTime}:00`), "EEE, MMM d");
      return `${dateLabel} • ${startTime} - ${endTime}`;
    } catch {
      return `${date} • ${startTime} - ${endTime}`;
    }
  };

  const handleApplySuggestedTime = async () => {
    if (!bestAvailabilitySuggestion || !onApplySuggestedTime) {
      return;
    }

    setApplyingSuggestedTime(true);
    try {
      await onApplySuggestedTime(hangout, {
        date: bestAvailabilitySuggestion.date,
        startTime: bestAvailabilitySuggestion.startTime,
        endTime: bestAvailabilitySuggestion.endTime,
      });
    } finally {
      setApplyingSuggestedTime(false);
    }
  };

  const statusConfig = {
    suggested: { label: "New Invite", color: "bg-primary/10 text-primary" },
    pending: { label: "Awaiting Responses", color: "bg-amber-500/10 text-amber-600" },
    confirmed: { label: "Confirmed", color: "bg-green-500/10 text-green-600" },
    completed: { label: "Completed", color: "bg-muted text-muted-foreground" },
    cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive" },
  };

  const responseStatusConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    yes: { label: "Going", icon: <Check className="w-3.5 h-3.5" />, color: "text-green-600" },
    no: { label: "Not going", icon: <X className="w-3.5 h-3.5" />, color: "text-destructive" },
    maybe: { label: "Maybe", icon: <HelpCircle className="w-3.5 h-3.5" />, color: "text-amber-500" },
    invited: { label: "Invited", icon: <MessageCircle className="w-3.5 h-3.5" />, color: "text-muted-foreground" },
    "pending-availability": { label: "Sharing availability", icon: <Clock className="w-3.5 h-3.5" />, color: "text-primary" },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-lg max-h-[85vh] bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${activityType?.color || "bg-muted"}`}>
                  {activityType?.icon || "📅"}
                </div>
                <div>
                  <h2 className="font-heading text-xl font-bold text-foreground">{hangout.title}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusConfig[hangout.status].color}`}>
                    {statusConfig[hangout.status].label}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Description */}
              {hangout.description && (
                <p className="text-sm text-muted-foreground">{hangout.description}</p>
              )}

              {/* Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground font-medium">
                    {format(new Date(timeRange.date), "EEEE, MMMM d, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">
                    {timeRange.startTime} – {timeRange.endTime}
                  </span>
                </div>
                {hangout.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="text-foreground">
                      {hangout.location.name}
                      {hangout.location.address && ` • ${hangout.location.address}`}
                      {hangout.location.isFlexible && (
                        <span className="text-xs ml-1 text-primary">(flexible)</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-foreground">
                    {isCreator ? "Created by you" : `Created by ${creator?.name || "Unknown"}`}
                  </span>
                </div>
              </div>

              {/* Highlighted friends */}
              {hangout.highlightedFriends.length > 0 && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-sm font-medium text-primary mb-2">
                    <Sparkles className="w-4 h-4" />
                    Priority Invites
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {hangout.highlightedFriends.map((id) => {
                      const friend = getFriendById(id);
                      return (
                        <span key={id} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {friend?.name || "Unknown"}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* All Responses */}
              <div>
                <h4 className="font-heading font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Responses ({visibleResponses.length})
                </h4>
                <div className="space-y-2">
                  {visibleResponses.map((response) => {
                    const friend = getFriendById(response.friendId);
                    const config = responseStatusConfig[response.status];
                    return (
                      <div key={response.friendId} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                            <span className="font-heading text-sm font-bold text-primary">
                              {friend?.name.charAt(0) || "?"}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-foreground">{friend?.name || "Unknown"}</span>
                        </div>
                        <span className={`flex items-center gap-1.5 text-xs font-medium ${config.color}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Availability submissions */}
              {hangout.responses.some((r) => r.availabilitySubmitted?.length) && (
                <div>
                  <h4 className="font-heading font-semibold text-foreground mb-3">Submitted Availability</h4>
                  <div className="rounded-xl border border-border p-3 bg-muted/20">
                    <AvailabilityHeatmap
                      startDate={timeRange.date}
                      numDays={7}
                      selectedSlots={submittedAggregateSlots}
                      onToggleSlot={() => {}}
                      friendAvailability={submittedFriendAvailability}
                      readOnly
                    />
                  </div>
                </div>
              )}

              {isCreator && bestAvailabilitySuggestion && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                  <h4 className="font-heading font-semibold text-foreground mb-1">Suggested Best Time</h4>
                  <p className="text-sm text-primary font-medium">
                    {formatSuggestedSlot(
                      bestAvailabilitySuggestion.date,
                      bestAvailabilitySuggestion.startTime,
                      bestAvailabilitySuggestion.endTime
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {bestAvailabilitySuggestion.votes} vote{bestAvailabilitySuggestion.votes !== 1 ? "s" : ""}
                    {` `}({bestAvailabilitySuggestion.preferredVotes} preferred)
                  </p>

                  <button
                    onClick={handleApplySuggestedTime}
                    disabled={applyingSuggestedTime || isSuggestedSlotAlreadyApplied}
                    className="mt-3 btn-primary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSuggestedSlotAlreadyApplied
                      ? "Suggested Time Already Applied"
                      : applyingSuggestedTime
                        ? "Applying..."
                        : "Apply Suggested Time"}
                  </button>

                  {rankedAvailabilitySuggestions.length > 1 && (
                    <div className="mt-3 pt-3 border-t border-primary/15">
                      <p className="text-xs text-muted-foreground mb-2">Other strong options</p>
                      <div className="space-y-1.5">
                        {rankedAvailabilitySuggestions.slice(1, 3).map((slot) => (
                          <div key={slot.key} className="text-xs text-foreground/80">
                            {formatSuggestedSlot(slot.date, slot.startTime, slot.endTime)}
                            {` `}
                            <span className="text-muted-foreground">({slot.votes} votes)</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {canShareAvailability && (
                <div className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-heading font-semibold text-foreground">Share Your Availability</h4>
                    <button
                      onClick={() => setShowAvailabilityEditor((prev) => !prev)}
                      className="text-sm text-primary hover:underline"
                    >
                      {showAvailabilityEditor ? "Hide" : "Add slots"}
                    </button>
                  </div>

                  {showAvailabilityEditor && (
                    <div className="space-y-3">
                      <AvailabilityHeatmap
                        startDate={timeRange.date}
                        numDays={7}
                        selectedSlots={availabilitySlots}
                        onToggleSlot={toggleAvailabilitySlot}
                        friendAvailability={friendAvailabilityForEditor}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{selectedAvailabilityCount} slot{selectedAvailabilityCount !== 1 ? "s" : ""} selected</span>
                        <button
                          onClick={() => onSubmitAvailability?.(hangout, parseAvailabilitySlots())}
                          disabled={selectedAvailabilityCount === 0}
                          className="btn-primary px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Submit Availability
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isCreator && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-heading font-semibold text-foreground">Danger Zone</h4>
                      <p className="text-xs text-muted-foreground mt-1">Deleting removes this hangout and all submitted responses/availability.</p>
                    </div>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors text-sm font-medium"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Hangout
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer - respond actions */}
            {canRespond && (
              <div className="p-6 border-t border-border flex items-center gap-2">
                <button
                  onClick={() => onRespond?.(hangout, "yes")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${
                    currentUserResponse?.status === "yes"
                      ? "bg-green-500/20 text-green-700"
                      : "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                  }`}
                >
                  <Check className="w-4 h-4" /> I'm in!
                </button>
                <button
                  onClick={() => onRespond?.(hangout, "maybe")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${
                    currentUserResponse?.status === "maybe"
                      ? "bg-amber-500/20 text-amber-700"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <HelpCircle className="w-4 h-4" /> Maybe
                </button>
                <button
                  onClick={() => onRespond?.(hangout, "no")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium transition-colors ${
                    currentUserResponse?.status === "no"
                      ? "bg-destructive/20 text-destructive"
                      : "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  }`}
                >
                  <X className="w-4 h-4" /> No
                </button>
              </div>
            )}
          </motion.div>
          </div>

          {isCreator && (
            <ConfirmDeleteHangoutDialog
              open={showDeleteConfirm}
              onOpenChange={setShowDeleteConfirm}
              hangoutTitle={hangout.title}
              onConfirm={() => onDeleteHangout?.(hangout)}
            />
          )}
        </>
      )}
    </AnimatePresence>
  );
};

export default HangoutDetailModal;
