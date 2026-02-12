import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Clock, Calendar, Users, Check, HelpCircle, Sparkles, MessageCircle } from "lucide-react";
import { Hangout, getFriendById, getActivityType } from "../../data/friends";
import { format } from "date-fns";

interface HangoutDetailModalProps {
  hangout: Hangout | null;
  isOpen: boolean;
  onClose: () => void;
  onRespond?: (hangout: Hangout, response: "yes" | "no" | "maybe") => void;
}

const HangoutDetailModal = ({ hangout, isOpen, onClose, onRespond }: HangoutDetailModalProps) => {
  if (!hangout) return null;

  const activityType = getActivityType(hangout.activityType);
  const creator = getFriendById(hangout.createdBy);
  const currentUserResponse = hangout.responses.find((r) => r.friendId === "current-user");
  const isCreator = hangout.createdBy === "current-user";
  const timeRange = hangout.confirmedTime || hangout.proposedTimeRange;

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
                  Responses ({hangout.responses.length})
                </h4>
                <div className="space-y-2">
                  {hangout.responses.map((response) => {
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
                  <div className="space-y-2">
                    {hangout.responses
                      .filter((r) => r.availabilitySubmitted?.length)
                      .map((response) => {
                        const friend = getFriendById(response.friendId);
                        return (
                          <div key={response.friendId} className="p-3 rounded-xl bg-muted/30">
                            <p className="text-sm font-medium text-foreground mb-1">{friend?.name}</p>
                            <div className="flex flex-wrap gap-2">
                              {response.availabilitySubmitted?.map((slot, idx) => (
                                <span key={idx} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                  {slot.start} – {slot.end} ({slot.preference})
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            {/* Footer - respond actions */}
            {currentUserResponse?.status === "invited" && (
              <div className="p-6 border-t border-border flex items-center gap-2">
                <button
                  onClick={() => onRespond?.(hangout, "yes")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium transition-colors"
                >
                  <Check className="w-4 h-4" /> I'm in!
                </button>
                <button
                  onClick={() => onRespond?.(hangout, "maybe")}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 font-medium transition-colors"
                >
                  <HelpCircle className="w-4 h-4" /> Maybe
                </button>
                <button
                  onClick={() => onRespond?.(hangout, "no")}
                  className="p-2.5 rounded-xl hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HangoutDetailModal;
