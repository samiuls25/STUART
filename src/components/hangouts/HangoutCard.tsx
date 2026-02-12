import React from "react";
import { motion } from "framer-motion";
import { MapPin, Clock, Users, Check, X, HelpCircle, ChevronRight } from "lucide-react";
import { Hangout, getFriendById, getActivityType } from "../../data/friends";
import { format } from "date-fns";

interface HangoutCardProps {
  hangout: Hangout;
  onRespond?: (hangout: Hangout, response: "yes" | "no" | "maybe") => void;
  onViewDetails?: (hangout: Hangout) => void;
  variant?: "suggested" | "pending" | "confirmed";
}

const HangoutCard = ({ hangout, onRespond, onViewDetails, variant = "suggested" }: HangoutCardProps) => {
  const activityType = getActivityType(hangout.activityType);
  const creator = getFriendById(hangout.createdBy);
  
  const yesResponses = hangout.responses.filter((r) => r.status === "yes").length;
  const pendingResponses = hangout.responses.filter(
    (r) => r.status === "invited" || r.status === "pending-availability"
  ).length;

  const currentUserResponse = hangout.responses.find((r) => r.friendId === "current-user");
  const isCreator = hangout.createdBy === "current-user";

  const formatTimeRange = () => {
    const timeRange = hangout.confirmedTime || hangout.proposedTimeRange;
    const date = format(new Date(timeRange.date), "EEE, MMM d");
    return `${date} • ${timeRange.startTime} - ${timeRange.endTime}`;
  };

  const statusBadge = {
    suggested: { label: "New Invite", className: "bg-primary/10 text-primary" },
    pending: { label: "Awaiting Responses", className: "bg-amber-500/10 text-amber-600" },
    confirmed: { label: "Confirmed!", className: "bg-green-500/10 text-green-600" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      className="bg-card rounded-2xl border border-border hover:border-primary/30 transition-all overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Activity Icon */}
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${activityType?.color || "bg-muted"}`}>
              {activityType?.icon || "📅"}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-heading font-semibold text-foreground truncate">
                  {hangout.title}
                </h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[variant].className}`}>
                  {statusBadge[variant].label}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mt-0.5">
                {isCreator ? "Created by you" : `From ${creator?.name || "Unknown"}`}
              </p>
            </div>
          </div>

          <button
            onClick={() => onViewDetails?.(hangout)}
            className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Description */}
        {hangout.description && (
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
            {hangout.description}
          </p>
        )}
      </div>

      {/* Details */}
      <div className="px-4 pb-3 space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>{formatTimeRange()}</span>
        </div>

        {hangout.location && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <span>
              {hangout.location.name}
              {hangout.location.isFlexible && (
                <span className="text-xs ml-1 text-primary">(flexible)</span>
              )}
            </span>
          </div>
        )}

        {/* Attendee Summary */}
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-green-600">
              <Check className="w-3.5 h-3.5" />
              {yesResponses} going
            </span>
            {pendingResponses > 0 && (
              <span className="flex items-center gap-1 text-muted-foreground">
                <HelpCircle className="w-3.5 h-3.5" />
                {pendingResponses} pending
              </span>
            )}
          </div>
        </div>

        {/* Attendee Avatars */}
        <div className="flex items-center gap-1 pt-1">
          {hangout.responses.slice(0, 5).map((response, idx) => {
            const friend = getFriendById(response.friendId);
            const statusBorder = {
              yes: "ring-2 ring-green-500",
              no: "ring-2 ring-destructive opacity-50",
              maybe: "ring-2 ring-amber-500",
              invited: "ring-2 ring-muted",
              "pending-availability": "ring-2 ring-primary/50",
            };
            
            return (
              <div
                key={response.friendId}
                className={`w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-xs font-bold text-primary ${statusBorder[response.status]} ${idx > 0 ? "-ml-2" : ""}`}
                style={{ zIndex: 5 - idx }}
                title={`${friend?.name || "Unknown"} - ${response.status}`}
              >
                {friend?.name.charAt(0) || "?"}
              </div>
            );
          })}
          {hangout.responses.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground -ml-2">
              +{hangout.responses.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Actions - Only for suggested hangouts where user hasn't responded */}
      {variant === "suggested" && currentUserResponse?.status === "invited" && (
        <div className="p-4 pt-2 border-t border-border flex items-center gap-2">
          <button
            onClick={() => onRespond?.(hangout, "yes")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 text-green-600 hover:bg-green-500/20 font-medium transition-colors"
          >
            <Check className="w-4 h-4" />
            I'm in!
          </button>
          <button
            onClick={() => onRespond?.(hangout, "maybe")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-muted/80 font-medium transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            Maybe
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
  );
};

export default HangoutCard;
