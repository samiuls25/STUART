import { useState, useEffect } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Heart,
  Navigation,
  Users,
  Car,
  Tag,
  Star,
  ThumbsUp,
  ThumbsDown,
  DollarSign,
  Info,
} from "lucide-react";
import type { Event } from "../../data/events";
import { toast } from "../../hooks/use-toast";
import { saveEvent, unsaveEvent, getSavedEventIds } from "../../lib/SavedEvents";
import { useAuth } from "../../lib/AuthContext";
import { getCurrentUserHangoutMembership, joinPublicHangout, leavePublicHangout } from "../../lib/hangouts";
import { getFriends, type Friend } from "../../lib/friends";
import { createNotificationsBatch } from "../../lib/notifications";
import { fetchGroupsForCurrentUser, groupMemberIds, type UserGroup } from "../../lib/groups";
import CreateGroupModal from "../groups/CreateGroupModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

interface EventDetailModalProps {
  event: Event | null;
  onClose: () => void;
  initialSuggestOpen?: boolean;
}

const EventDetailModal = ({ event, onClose, initialSuggestOpen = false }: EventDetailModalProps) => {
  const { user } = useAuth();
  const [isSaved, setIsSaved] = useState(false);
  const [hangoutMembershipState, setHangoutMembershipState] = useState<"checking" | "joined" | "not-joined">("not-joined");
  const [joiningHangout, setJoiningHangout] = useState(false);
  const [leavingHangout, setLeavingHangout] = useState(false);
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [loadingSuggestTargets, setLoadingSuggestTargets] = useState(false);
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const [suggestGroups, setSuggestGroups] = useState<UserGroup[]>([]);
  const [suggestFriends, setSuggestFriends] = useState<Friend[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);

  const toScoreLabel = (score?: number) => {
    if (typeof score !== "number" || Number.isNaN(score) || score <= 0) {
      return "Recommended";
    }
    return `Score ${Math.round(score)}`;
  };

  useEffect(() => {
    if (user && event && event.isSaveable !== false) {
      getSavedEventIds().then((savedIds) => {
        setIsSaved(savedIds.includes(event.id));
      });
    } else {
      setIsSaved(false);
    }
  }, [user, event]);

  const resolvedHangoutId =
    event?.hangoutId
    || (event?.source === "hangout" && event.id.startsWith("hangout:")
      ? event.id.slice("hangout:".length)
      : null);

  const isHangoutEvent = Boolean(event && event.source === "hangout" && resolvedHangoutId);

  useEffect(() => {
    if (!event || !isHangoutEvent || !resolvedHangoutId) {
      setHangoutMembershipState("not-joined");
      return;
    }

    if (!user) {
      setHangoutMembershipState(event.isJoinedByCurrentUser ? "joined" : "not-joined");
      return;
    }

    if (event.isJoinedByCurrentUser) {
      setHangoutMembershipState("joined");
      return;
    }

    let isMounted = true;
    setHangoutMembershipState("checking");

    getCurrentUserHangoutMembership(resolvedHangoutId)
      .then((membership) => {
        if (!isMounted) return;
        setHangoutMembershipState(membership.joined ? "joined" : "not-joined");
      })
      .catch(() => {
        if (!isMounted) return;
        setHangoutMembershipState("not-joined");
      });

    return () => {
      isMounted = false;
    };
  }, [event?.id, event?.isJoinedByCurrentUser, isHangoutEvent, resolvedHangoutId, user?.id]);

  useEffect(() => {
    if (!showSuggestModal || !user) return;

    let mounted = true;
    setLoadingSuggestTargets(true);

    Promise.all([fetchGroupsForCurrentUser(), getFriends()])
      .then(([groups, friends]) => {
        if (!mounted) return;
        setSuggestGroups(groups);
        setSuggestFriends(friends.filter((friend) => !friend.isBlocked));
        if (groups.length > 0) {
          setSelectedGroupIds([]);
          setSelectedFriendIds([]);
        } else {
          setSelectedGroupIds([]);
          setSelectedFriendIds([]);
        }
      })
      .catch((error) => {
        console.error("Unable to load suggestion targets", error);
        if (!mounted) return;
        setSuggestGroups([]);
        setSuggestFriends([]);
      })
      .finally(() => {
        if (mounted) setLoadingSuggestTargets(false);
      });

    return () => {
      mounted = false;
    };
  }, [showSuggestModal, user]);

  if (!event) return null;

  const handleSave = async () => {
    if (event.isSaveable === false) {
      toast({
        title: "Save not available",
        description: "Public hangouts are discoverable but not saved as ticketed events.",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to save events",
        variant: "destructive",
      });
      return;
    }

    const success = isSaved ? await unsaveEvent(event.id) : await saveEvent(event.id);
    
    if (success) {
      setIsSaved(!isSaved);
      toast({
        title: isSaved ? "Removed from saved" : "Event saved!",
        description: isSaved ? "Event removed from your saved list" : "You can find this in your Saved events",
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to update saved events",
        variant: "destructive",
      });
    }
  };

  const handleSuggestToGroup = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to suggest events.",
        variant: "destructive",
      });
      return;
    }

    setShowSuggestModal(true);
  };

  useEffect(() => {
    if (!event || !initialSuggestOpen || isHangoutEvent) return;

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to suggest events.",
        variant: "destructive",
      });
      return;
    }

    setShowSuggestModal(true);
  }, [event?.id, initialSuggestOpen, isHangoutEvent, user]);

  const handleSendSuggestion = async () => {
    if (!user || !event) return;

    const recipientIds = suggestGroups.length > 0
      ? [...new Set(
          selectedGroupIds.flatMap((groupId) => {
            const group = suggestGroups.find((candidate) => candidate.id === groupId);
            return group ? groupMemberIds(group, user.id) : [];
          })
        )]
      : [...new Set(selectedFriendIds.filter((id) => id !== user.id))];

    if (recipientIds.length === 0) {
      toast({
        title: suggestGroups.length > 0 ? "Select at least one group" : "Select at least one friend",
        description: "Choose who should receive this suggestion.",
        variant: "destructive",
      });
      return;
    }

    setSendingSuggestion(true);
    try {
      const senderName =
        (user as { user_metadata?: { full_name?: string } }).user_metadata?.full_name
        || user.email
        || "A friend";

      await createNotificationsBatch({
        recipientUserIds: recipientIds,
        type: "friend_activity",
        title: "Event suggestion",
        message: `${senderName} suggested \"${event.name}\".`,
        entityType: "event",
        entityId: event.id,
        metadata: {
          eventId: event.id,
          eventName: event.name,
          venue: event.venue,
          date: event.date,
          time: event.time,
          ticketUrl: event.ticketUrl,
        },
      });

      toast({
        title: "Suggestion sent",
        description: `Sent to ${recipientIds.length} friend${recipientIds.length !== 1 ? "s" : ""}.`,
      });
      setShowSuggestModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send event suggestion.";
      toast({
        title: "Could not send suggestion",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingSuggestion(false);
    }
  };

  const handleFeedback = (type: string) => {
    toast({
      title: "Thanks for your feedback!",
      description: "This helps us improve your recommendations",
    });
  };

  const handleOpenHangouts = () => {
    window.location.href = "/hangouts";
  };

  const handleJoinHangout = async () => {
    if (!event || !resolvedHangoutId) return;

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to join this hangout.",
        variant: "destructive",
      });
      return;
    }

    setJoiningHangout(true);
    try {
      await joinPublicHangout(resolvedHangoutId);
      setHangoutMembershipState("joined");
      toast({
        title: "Joined hangout",
        description: "You are now part of this hangout.",
      });
    } catch (error) {
      const message = (error as { message?: string })?.message || "Could not join hangout right now.";
      const lowerMessage = message.toLowerCase();

      toast({
        title: "Could not join hangout",
        description:
          lowerMessage.includes("permission")
            ? "Phase C RLS policy for self-join may not be enabled yet."
            : message,
        variant: "destructive",
      });
    } finally {
      setJoiningHangout(false);
    }
  };

  const handleLeaveHangout = async () => {
    if (!event || !resolvedHangoutId) return;

    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to leave this hangout.",
        variant: "destructive",
      });
      return;
    }

    setLeavingHangout(true);
    try {
      await leavePublicHangout(resolvedHangoutId);
      setHangoutMembershipState("not-joined");
      toast({
        title: "Left hangout",
        description: "You have been removed from this hangout.",
      });
    } catch (error) {
      const message = (error as { message?: string })?.message || "Could not leave hangout right now.";
      toast({
        title: "Could not leave hangout",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLeavingHangout(false);
    }
  };

  return (
    <AnimatePresence>
      {event && (
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
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="w-full max-w-2xl max-h-[85vh] pointer-events-auto"
            >
              <div className="bg-card rounded-2xl shadow-elevated overflow-hidden flex flex-col max-h-[85vh]">
                {/* Hero Image */}
                <div className="relative h-56 flex-shrink-0 overflow-hidden">
                  <img src={event.heroImage} alt={event.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />

                  <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-muted transition-colors">
                    <X className="w-5 h-5 text-foreground" />
                  </button>

                  <div className="absolute top-4 left-4 flex gap-2">
                    {event.isSaveable !== false && (
                      <button onClick={handleSave} className={`p-2 rounded-full backdrop-blur-sm transition-colors ${isSaved ? 'bg-primary text-primary-foreground' : 'bg-background/80 hover:bg-primary/20'}`}>
                        <Heart className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
                      </button>
                    )}
                  </div>

                  <div className="absolute bottom-4 left-6 flex items-center gap-2">
                    {event.sourceLabel && (
                      <span className="px-2 py-1 bg-background/80 backdrop-blur-sm text-xs rounded-full text-foreground border border-border">
                        {event.sourceLabel}
                      </span>
                    )}
                    <span className="genre-tag active">{event.genre}</span>
                    {event.tags?.slice(0, 2).map((tag) => (
                      <span key={tag} className="px-2 py-1 bg-background/80 backdrop-blur-sm text-xs rounded-full text-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5 overflow-y-auto flex-1">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-foreground mb-2">{event.name}</h2>
                    {event.description && <p className="text-muted-foreground text-sm">{event.description}</p>}
                    {event.organizerName && (
                      <p className="text-xs text-muted-foreground mt-2">Organized by {event.organizerName}</p>
                    )}
                  </div>

                  {/* Recommendation Badge */}
                  {event.isRecommended && event.recommendationReasons && event.recommendationReasons.length > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Star className="w-4 h-4 text-primary fill-primary" />
                        <span className="text-sm font-medium text-primary">{toScoreLabel(event.recommendationScore)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Info className="w-3 h-3" /> Recommended because:
                      </p>
                      <ul className="space-y-1">
                        {event.recommendationReasons.map((reason, i) => (
                          <li key={i} className="text-xs text-foreground flex items-center gap-2">
                            <span className="w-1 h-1 rounded-full bg-primary" /> {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Calendar className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Date</p>
                        <p className="font-medium text-foreground text-sm">{event.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                      <Clock className="w-5 h-5 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">Time</p>
                        <p className="font-medium text-foreground text-sm">{event.time}</p>
                      </div>
                    </div>
                    {event.distance && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <Navigation className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Distance</p>
                          <p className="font-medium text-foreground text-sm">{event.distance} mi away</p>
                        </div>
                      </div>
                    )}
                    {event.travelTime && (
                      <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                        <Car className="w-5 h-5 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Travel Time</p>
                          <p className="font-medium text-foreground text-sm">~{event.travelTime} min</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Venue */}
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-xl">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">{event.venue}</p>
                      <p className="text-sm text-muted-foreground">{event.neighborhood}, New York, NY</p>
                    </div>
                  </div>

                  {/* Feedback */}
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <span className="text-xs text-muted-foreground">Help improve recommendations:</span>
                    <button onClick={() => handleFeedback('more')} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-green-500/10 hover:text-green-500 transition-colors">
                      <ThumbsUp className="w-3 h-3" /> More
                    </button>
                    <button onClick={() => handleFeedback('less')} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs hover:bg-red-500/10 hover:text-red-500 transition-colors">
                      <ThumbsDown className="w-3 h-3" /> Less
                    </button>
                  </div>
                </div>

                {/* CTA Footer */}
                <div className="p-4 border-t border-border bg-muted/30 flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Starting from</p>
                    <p className={`text-xl font-bold ${event.priceLevel === 'free' ? 'text-green-500' : 'text-primary'}`}>
                      {event.priceLevel === 'free' ? 'Free' : event.price}
                    </p>
                  </div>
                  {isHangoutEvent ? (
                    hangoutMembershipState === "joined" ? (
                      <button
                        onClick={handleLeaveHangout}
                        disabled={leavingHangout}
                        className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Users className="w-4 h-4" /> {leavingHangout ? "Leaving..." : "Leave Hangout"}
                      </button>
                    ) : null
                  ) : (
                    <button onClick={handleSuggestToGroup} className="btn-secondary flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4" /> Suggest to Group
                    </button>
                  )}
                  {event.ticketUrl ? (
                    <a href={event.ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2">
                      Get Tickets <ExternalLink className="w-4 h-4" />
                    </a>
                  ) : isHangoutEvent ? (
                    hangoutMembershipState === "joined" ? (
                      <button onClick={handleOpenHangouts} className="btn-primary flex items-center gap-2">
                        Open Hangouts
                      </button>
                    ) : (
                      <button
                        onClick={handleJoinHangout}
                        disabled={joiningHangout || leavingHangout || hangoutMembershipState === "checking"}
                        className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {joiningHangout
                          ? "Joining..."
                          : hangoutMembershipState === "checking"
                            ? "Checking..."
                            : "Join Hangout"}
                      </button>
                    )
                  ) : (
                    <a href="/hangouts" className="btn-primary flex items-center gap-2">
                      Open Hangouts
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </div>

          <Dialog open={showSuggestModal} onOpenChange={setShowSuggestModal}>
            <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Suggest This Event</DialogTitle>
                <DialogDescription>
                  {suggestGroups.length > 0
                    ? "Share with one or more of your saved groups."
                    : "No groups yet. Suggest directly to friends, or create a group first."}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Create group
                  </button>
                </div>

                <div className="rounded-lg border border-border divide-y divide-border/60 max-h-72 overflow-y-auto">
                  {loadingSuggestTargets ? (
                    <div className="p-3 text-sm text-muted-foreground">Loading suggestions...</div>
                  ) : suggestGroups.length > 0 ? (
                    suggestGroups.map((group) => {
                      const selected = selectedGroupIds.includes(group.id);
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            setSelectedGroupIds((prev) =>
                              prev.includes(group.id) ? prev.filter((id) => id !== group.id) : [...prev, group.id]
                            );
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors ${selected ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm text-foreground">{group.name}</p>
                          <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                        </button>
                      );
                    })
                  ) : suggestFriends.length > 0 ? (
                    suggestFriends.map((friend) => {
                      const selected = selectedFriendIds.includes(friend.id);
                      return (
                        <button
                          key={friend.id}
                          type="button"
                          onClick={() => {
                            setSelectedFriendIds((prev) =>
                              prev.includes(friend.id) ? prev.filter((id) => id !== friend.id) : [...prev, friend.id]
                            );
                          }}
                          className={`w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors ${selected ? "bg-primary/5" : ""}`}
                        >
                          <p className="text-sm text-foreground">{friend.name}</p>
                          <p className="text-xs text-muted-foreground">{friend.email || "Friend"}</p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground">No friends available to suggest to yet.</div>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSuggestModal(false)} disabled={sendingSuggestion}>
                  Cancel
                </Button>
                <Button onClick={handleSendSuggestion} disabled={sendingSuggestion || loadingSuggestTargets}>
                  {sendingSuggestion ? "Sending..." : "Send Suggestion"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <CreateGroupModal
            isOpen={showCreateGroupModal}
            onClose={() => setShowCreateGroupModal(false)}
            onSaved={(group) => {
              setSuggestGroups((prev) => {
                const withoutOld = prev.filter((candidate) => candidate.id !== group.id);
                return [...withoutOld, group].sort((a, b) => a.name.localeCompare(b.name));
              });
              setSelectedGroupIds((prev) => (prev.includes(group.id) ? prev : [...prev, group.id]));
              setShowCreateGroupModal(false);
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default EventDetailModal;
