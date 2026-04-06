import { useState, useEffect } from "react";
import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Check,
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
  DollarSign,
  Info,
} from "lucide-react";
import type { Event } from "../../data/events";
import { toast } from "../../hooks/use-toast";
import { saveEvent, unsaveEvent, getSavedEventIds } from "../../lib/SavedEvents";
import { useAuth } from "../../lib/AuthContext";
import { createHangout, getCurrentUserHangoutMembership, joinPublicHangout, leavePublicHangout, type CreateHangoutInput } from "../../lib/hangouts";
import { getFriends, type Friend } from "../../lib/friends";
import { fetchGroupsForCurrentUser, groupMemberIds, type UserGroup } from "../../lib/groups";
import { parseEventDate } from "../../lib/eventFilters";
import CreateGroupModal from "../groups/CreateGroupModal";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";

const pad2 = (value: number) => String(value).padStart(2, "0");

const toDateInputValue = (date: Date) => {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const toStartTime = (rawTime: string) => {
  const normalized = rawTime.trim();

  if (/^\d{1,2}:\d{2}$/.test(normalized)) {
    return normalized;
  }

  const match = normalized.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2] || "0");
    const meridiem = match[3].toUpperCase();

    if (meridiem === "PM" && hours !== 12) hours += 12;
    if (meridiem === "AM" && hours === 12) hours = 0;

    return `${pad2(hours)}:${pad2(minutes)}`;
  }

  return "19:00";
};

const plusTwoHours = (startTime: string) => {
  const [rawHours, rawMinutes] = startTime.split(":");
  const hours = Number(rawHours);
  const minutes = Number(rawMinutes);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return "21:00";

  const totalMinutes = hours * 60 + minutes + 120;
  const endHours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const endMinutes = totalMinutes % 60;
  return `${pad2(endHours)}:${pad2(endMinutes)}`;
};

const mapEventToHangoutType = (event: Event): CreateHangoutInput["activityType"] => {
  const segment = event.segment.toLowerCase();
  const genre = event.genre.toLowerCase();
  const tags = (event.tags || []).map((tag) => tag.toLowerCase());

  if (segment.includes("sports") || tags.includes("sports") || tags.includes("fitness")) return "active";
  if (segment.includes("arts") || tags.includes("art") || genre.includes("theater")) return "creative";
  if (tags.includes("outdoor") || tags.includes("park") || tags.includes("hike")) return "outdoor";
  if (genre.includes("electronic") || tags.includes("nightlife") || tags.includes("club")) return "late-night";
  if (segment.includes("music") || tags.includes("concert")) return "social";

  return "chill";
};

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

  const collectSelectedRecipientIds = () => {
    if (!user) return [];

    const fromGroups = selectedGroupIds.flatMap((groupId) => {
      const group = suggestGroups.find((candidate) => candidate.id === groupId);
      return group ? groupMemberIds(group, user.id) : [];
    });

    const fromFriends = selectedFriendIds.filter((id) => id !== user.id);

    return [...new Set([...fromGroups, ...fromFriends])];
  };

  const selectedRecipientCount = collectSelectedRecipientIds().length;

  const handleSendSuggestion = async () => {
    if (!user || !event) return;

    const recipientIds = collectSelectedRecipientIds();

    if (recipientIds.length === 0) {
      toast({
        title: "Select at least one friend or group",
        description: "Pick who should be invited to this event hangout.",
        variant: "destructive",
      });
      return;
    }

    setSendingSuggestion(true);
    try {
      const parsedDate = parseEventDate(event.date);
      const date = parsedDate ? toDateInputValue(parsedDate) : toDateInputValue(new Date());
      const startTime = toStartTime(event.time);
      const endTime = plusTwoHours(startTime);

      const hangoutTitle = `${event.name} Hangout`;
      const ticketLine = event.ticketUrl ? `\nTickets: ${event.ticketUrl}` : "";

      await createHangout({
        title: hangoutTitle,
        description: `Event plan based on \"${event.name}\".${ticketLine}`,
        activityType: mapEventToHangoutType(event),
        isPublic: false,
        proposedTimeRange: {
          date,
          startTime,
          endTime,
        },
        location: {
          name: event.venue,
          address: event.neighborhood ? `${event.neighborhood}, New York, NY` : undefined,
          isFlexible: false,
        },
        invitedFriends: recipientIds,
        highlightedFriends: [],
      });

      toast({
        title: "Hangout invite sent",
        description: `Created a hangout and invited ${recipientIds.length} friend${recipientIds.length !== 1 ? "s" : ""}.`,
      });
      setShowSuggestModal(false);
      setSelectedGroupIds([]);
      setSelectedFriendIds([]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create hangout invite.";
      toast({
        title: "Could not create hangout",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSendingSuggestion(false);
    }
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
                  Create a real hangout invite from this event. You can select groups and individual friends together.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{selectedRecipientCount} invitee{selectedRecipientCount !== 1 ? "s" : ""} selected</p>
                    <p className="text-xs text-muted-foreground">This will create a hangout event and send invites.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupModal(true)}
                    className="text-xs px-2.5 py-1.5 rounded-full border border-border bg-background hover:bg-muted transition-colors"
                  >
                    Create group
                  </button>
                </div>

                {loadingSuggestTargets ? (
                  <div className="rounded-lg border border-border p-3 text-sm text-muted-foreground">Loading suggestions...</div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Groups</p>
                      {suggestGroups.length > 0 ? (
                        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                          {suggestGroups.map((group) => {
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
                                className={`w-full px-3 py-2.5 rounded-lg text-left border transition-all ${
                                  selected
                                    ? "border-primary bg-primary/15 shadow-sm"
                                    : "border-border hover:border-primary/35 hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{group.name}</p>
                                    <p className="text-xs text-muted-foreground">{group.members.length} members</p>
                                  </div>
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent"}`}>
                                    <Check className="w-3 h-3" />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                          No groups yet. You can still invite individual friends below.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Individual Friends</p>
                      {suggestFriends.length > 0 ? (
                        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                          {suggestFriends.map((friend) => {
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
                                className={`w-full px-3 py-2.5 rounded-lg text-left border transition-all ${
                                  selected
                                    ? "border-primary bg-primary/15 shadow-sm"
                                    : "border-border hover:border-primary/35 hover:bg-muted/40"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-medium text-foreground">
                                      {friend.avatar_url ? (
                                        <img src={friend.avatar_url} alt={friend.name} className="w-full h-full object-cover" />
                                      ) : (
                                        friend.name.charAt(0)
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium text-foreground truncate">{friend.name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{friend.email || "Friend"}</p>
                                    </div>
                                  </div>
                                  <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${selected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/40 text-transparent"}`}>
                                    <Check className="w-3 h-3" />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border p-3 text-xs text-muted-foreground">
                          No friends available to invite yet.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowSuggestModal(false)} disabled={sendingSuggestion}>
                  Cancel
                </Button>
                <Button onClick={handleSendSuggestion} disabled={sendingSuggestion || loadingSuggestTargets}>
                  {sendingSuggestion ? "Creating..." : "Create Hangout Invite"}
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
