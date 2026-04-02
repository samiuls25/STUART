import { useEffect, useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Plus, Calendar, Clock, Users, ChevronRight, Sparkles, Filter, X } from "lucide-react";
import Navbar from "../components/layout/Navbar.tsx";
import HangoutCard from "../components/hangouts/HangoutCard";
import CreateHangoutModal from "../components/hangouts/CreateHangoutModal";
import HangoutDetailModal from "../components/hangouts/HangoutDetailModel.tsx";
import AuthModal from "../components/auth/AuthModal";
import { hangouts, Hangout, setFriendsDirectory, Friend, TimeRange } from "../data/friends.ts";
import { format, isAfter, isBefore, parseISO, startOfDay, addWeeks } from "date-fns";
import { Input } from "../components/ui/input.tsx";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../hooks/use-toast";
import { getFriends } from "../lib/friends";
import { supabase } from "../lib/supabase";
import {
  createHangout,
  deleteHangout,
  fetchHangoutsForCurrentUser,
  isHangoutsSetupError,
  respondToHangout,
  submitHangoutAvailability,
} from "../lib/hangouts";

const Hangouts = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [selectedHangout, setSelectedHangout] = useState<Hangout | null>(null);
  const [openAvailabilityEditor, setOpenAvailabilityEditor] = useState(false);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [hangoutsState, setHangoutsState] = useState<Hangout[]>(hangouts);
  const [loadingHangouts, setLoadingHangouts] = useState(true);
  const [schemaMissing, setSchemaMissing] = useState(false);

  const today = startOfDay(new Date());
  const currentUserId = user?.id;

  const loadHangouts = async () => {
    setLoadingHangouts(true);

    try {
      const [friendsData, fetchedHangouts] = await Promise.all([
        getFriends(),
        fetchHangoutsForCurrentUser(),
      ]);

      const nextDirectory: Friend[] = friendsData.map((friend) => ({
        id: friend.id,
        name: friend.name,
        email: friend.email,
        avatar_url: friend.avatar_url,
        status: friend.status,
        badges: friend.badges,
        mutualFriends: friend.mutualFriends,
        hangoutsTogether: friend.hangoutsTogether,
        isMuted: friend.isMuted,
        isBlocked: friend.isBlocked,
      }));

      const participantIds = new Set<string>();
      fetchedHangouts.forEach((hangout) => {
        participantIds.add(hangout.createdBy);
        hangout.responses.forEach((response) => participantIds.add(response.friendId));
      });

      const missingProfileIds = [...participantIds].filter(
        (id) => !!id && !nextDirectory.some((friend) => friend.id === id)
      );

      if (missingProfileIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url")
          .in("id", missingProfileIds);

        if (!profilesError && profiles) {
          profiles.forEach((profile) => {
            nextDirectory.push({
              id: profile.id,
              name: profile.name || profile.email || "Unknown",
              email: profile.email,
              avatar_url: profile.avatar_url,
              status: "offline",
              badges: [],
              mutualFriends: 0,
              hangoutsTogether: 0,
              isMuted: false,
              isBlocked: false,
            });
          });
        }
      }

      setFriendsDirectory(nextDirectory);
      setHangoutsState(fetchedHangouts);
      setSelectedHangout((prev) => {
        if (!prev) return prev;
        return fetchedHangouts.find((hangout) => hangout.id === prev.id) || null;
      });
      setSchemaMissing(false);
    } catch (error) {
      if (isHangoutsSetupError(error)) {
        setSchemaMissing(true);
        setHangoutsState(hangouts);
      } else {
        console.error("Failed to load hangouts", error);
        toast({
          title: "Could not load hangouts",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
      }
    } finally {
      setLoadingHangouts(false);
    }
  };

  useEffect(() => {
    if (!user) {
      setHangoutsState([]);
      setLoadingHangouts(false);
      setSchemaMissing(false);
      return;
    }

    loadHangouts();
  }, [user?.id]);

  const isInDateRange = (h: Hangout) => {
    if (!filterFrom && !filterTo) return true;
    const hangoutDate = parseISO(h.confirmedTime?.date || h.proposedTimeRange.date);
    if (filterFrom && isBefore(hangoutDate, parseISO(filterFrom))) return false;
    if (filterTo && isAfter(hangoutDate, parseISO(filterTo))) return false;
    return true;
  };

  const suggestedHangouts = hangoutsState.filter(
    (h) =>
      h.status === "suggested" &&
      !!currentUserId &&
      h.createdBy !== currentUserId &&
      h.responses.find((r) => r.friendId === currentUserId)?.status === "invited" &&
      isInDateRange(h)
  );

  const pendingHangouts = hangoutsState.filter(
    (h) =>
      (h.status === "pending" || h.status === "suggested") &&
      (!!currentUserId &&
        (h.createdBy === currentUserId ||
          h.responses.find((r) => r.friendId === currentUserId)?.status !== "invited")) &&
      isInDateRange(h)
  );

  const confirmedHangouts = hangoutsState.filter(
    (h) =>
      h.status === "confirmed" &&
      isAfter(parseISO(h.confirmedTime?.date || h.proposedTimeRange.date), today) &&
      isInDateRange(h)
  );

  const pastHangouts = hangoutsState.filter(
    (h) =>
      (h.status === "completed" ||
        (h.status === "confirmed" &&
          isBefore(parseISO(h.confirmedTime?.date || h.proposedTimeRange.date), today))) &&
      isInDateRange(h)
  );

  const handleRespond = async (hangout: Hangout, response: "yes" | "no" | "maybe") => {
    try {
      await respondToHangout(hangout.id, response);
      toast({
        title: "Response saved",
        description: `Your response to ${hangout.title} was updated.`,
      });
      await loadHangouts();
      setSelectedHangout(null);
    } catch (error) {
      if (isHangoutsSetupError(error)) {
        setSchemaMissing(true);
        toast({
          title: "Hangouts schema is not set up",
          description: "Run docs/db/hangouts_phase1.sql in Supabase first.",
          variant: "destructive",
        });
        return;
      }

      console.error("Failed to respond to hangout", error);
      toast({
        title: "Could not update response",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewDetails = (hangout: Hangout) => {
    setOpenAvailabilityEditor(false);
    setSelectedHangout(hangout);
  };

  const handleOpenAvailabilityEditor = (hangout: Hangout) => {
    setOpenAvailabilityEditor(true);
    setSelectedHangout(hangout);
  };

  const handleSubmitAvailability = async (hangout: Hangout, availability: TimeRange[]) => {
    try {
      await submitHangoutAvailability(hangout.id, availability);
      toast({
        title: "Availability shared",
        description: "Your preferred slots were submitted.",
      });
      await loadHangouts();
    } catch (error) {
      if (isHangoutsSetupError(error)) {
        setSchemaMissing(true);
        toast({
          title: "Hangouts schema is not set up",
          description: "Run docs/db/hangouts_phase1.sql in Supabase first.",
          variant: "destructive",
        });
        return;
      }

      console.error("Failed to submit availability", error);
      toast({
        title: "Could not submit availability",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteHangout = async (hangout: Hangout) => {
    try {
      await deleteHangout(hangout.id);
      toast({
        title: "Hangout deleted",
        description: `${hangout.title} was removed.`,
      });
      await loadHangouts();
      setSelectedHangout(null);
      setOpenAvailabilityEditor(false);
      setOpenAvailabilityEditor(false);
    } catch (error) {
      if (isHangoutsSetupError(error)) {
        setSchemaMissing(true);
        toast({
          title: "Hangouts schema is not set up",
          description: "Run docs/db/hangouts_phase1.sql in Supabase first.",
          variant: "destructive",
        });
        return;
      }

      console.error("Failed to delete hangout", error);
      toast({
        title: "Could not delete hangout",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreate = async (hangout: Partial<Hangout> & { creatorAvailability?: TimeRange[] }) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to create a hangout.",
        variant: "destructive",
      });
      return;
    }

    if (!hangout.title || !hangout.activityType || !hangout.proposedTimeRange) {
      toast({
        title: "Missing hangout details",
        description: "Please complete title, activity type, and time before creating.",
        variant: "destructive",
      });
      return;
    }

    try {
      await createHangout({
        title: hangout.title,
        description: hangout.description,
        activityType: hangout.activityType,
        proposedTimeRange: hangout.proposedTimeRange,
        location: hangout.location,
        invitedFriends: hangout.invitedFriends || [],
        highlightedFriends: hangout.highlightedFriends || [],
        creatorAvailability: hangout.creatorAvailability,
      });

      toast({
        title: "Hangout created",
        description: "Your invites were sent.",
      });
      await loadHangouts();
    } catch (error) {
      if (isHangoutsSetupError(error)) {
        setSchemaMissing(true);
        toast({
          title: "Hangouts schema is not set up",
          description: "Run docs/db/hangouts_phase1.sql in Supabase first.",
          variant: "destructive",
        });
        return;
      }

      console.error("Failed to create hangout", error);
      toast({
        title: "Could not create hangout",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearFilters = () => {
    setFilterFrom("");
    setFilterTo("");
  };

  const setQuickFilter = (weeks: number) => {
    setFilterFrom(format(today, "yyyy-MM-dd"));
    setFilterTo(format(addWeeks(today, weeks), "yyyy-MM-dd"));
  };

  const hasActiveFilter = filterFrom || filterTo;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-[72px]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Users className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-3">Hangouts</h1>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Sign in to plan hangouts, invite friends, and track responses.
            </p>
            <button onClick={() => setShowAuthModal(true)} className="btn-primary px-6 py-3">
              Sign In To Continue
            </button>
          </div>
        </main>
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-[72px]">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div>
              <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
                Hangouts
              </h1>
              <p className="text-muted-foreground">
                Plan casual meetups with friends
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={`p-3 rounded-xl border transition-all ${
                  hasActiveFilter
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground hover:border-primary/30"
                }`}
              >
                <Filter className="w-5 h-5" />
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCreateModal(true)}
                className="btn-primary px-5 py-3 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Hangout</span>
              </motion.button>
            </div>
          </motion.div>

          {/* Date Filter */}
          {showDateFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">Filter by date range</span>
                {hasActiveFilter && (
                  <button onClick={clearFilters} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <X className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">From</label>
                  <Input type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">To</label>
                  <Input type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                </div>
              </div>
              <div className="flex gap-2">
                {[
                  { label: "Next 2 weeks", weeks: 2 },
                  { label: "Next 4 weeks", weeks: 4 },
                  { label: "Next 8 weeks", weeks: 8 },
                ].map((q) => (
                  <button
                    key={q.weeks}
                    onClick={() => setQuickFilter(q.weeks)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {schemaMissing && (
            <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-700">
              Hangouts backend is not initialized yet. Run docs/db/hangouts_phase1.sql in Supabase, then refresh this page.
            </div>
          )}

          {loadingHangouts && (
            <div className="mb-6 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
              Loading hangouts...
            </div>
          )}

          {/* Suggested Hangouts */}
          {suggestedHangouts.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-10"
            >
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-primary" />
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  Suggested Hangouts
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
                  {suggestedHangouts.length} new
                </span>
              </div>
              <div className="space-y-4">
                {suggestedHangouts.map((hangout, index) => (
                  <motion.div key={hangout.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <HangoutCard
                      hangout={hangout}
                      variant="suggested"
                      onRespond={handleRespond}
                      onViewDetails={handleViewDetails}
                      onOpenAvailability={handleOpenAvailabilityEditor}
                      onDeleteHangout={handleDeleteHangout}
                      currentUserId={currentUserId}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Pending Events */}
          {pendingHangouts.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-amber-500" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Pending Events</h2>
              </div>
              <div className="space-y-4">
                {pendingHangouts.map((hangout, index) => (
                  <motion.div key={hangout.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <HangoutCard
                      hangout={hangout}
                      variant="pending"
                      onRespond={handleRespond}
                      onViewDetails={handleViewDetails}
                      onOpenAvailability={handleOpenAvailabilityEditor}
                      onDeleteHangout={handleDeleteHangout}
                      currentUserId={currentUserId}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Confirmed Plans */}
          {confirmedHangouts.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-green-500" />
                <h2 className="font-heading text-lg font-semibold text-foreground">Confirmed Plans</h2>
              </div>
              <div className="space-y-4">
                {confirmedHangouts.map((hangout, index) => (
                  <motion.div key={hangout.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}>
                    <HangoutCard
                      hangout={hangout}
                      variant="confirmed"
                      onRespond={handleRespond}
                      onViewDetails={handleViewDetails}
                      onOpenAvailability={handleOpenAvailabilityEditor}
                      onDeleteHangout={handleDeleteHangout}
                      currentUserId={currentUserId}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Empty State */}
          {suggestedHangouts.length === 0 && pendingHangouts.length === 0 && confirmedHangouts.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                <Users className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-heading text-xl font-semibold text-foreground mb-2">
                {hasActiveFilter ? "No hangouts in this timeframe" : "No hangouts yet"}
              </h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                {hasActiveFilter
                  ? "Try adjusting your date filter or create a new hangout."
                  : "Start planning casual meetups with your friends. Create a hangout and invite people you'd like to spend time with."}
              </p>
              {hasActiveFilter ? (
                <button onClick={clearFilters} className="btn-primary px-6 py-3">Clear Filters</button>
              ) : (
                <button onClick={() => setShowCreateModal(true)} className="btn-primary px-6 py-3">Create Your First Hangout</button>
              )}
            </motion.div>
          )}

          {/* Past Hangouts */}
          {pastHangouts.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 pt-8 border-t border-border">
              <button
                onClick={() => {}}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <span>View {pastHangouts.length} past hangout{pastHangouts.length !== 1 ? "s" : ""}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </div>
      </main>

      <CreateHangoutModal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} onCreate={handleCreate} />
      <HangoutDetailModal
        hangout={selectedHangout}
        isOpen={!!selectedHangout}
        onClose={() => {
          setSelectedHangout(null);
          setOpenAvailabilityEditor(false);
        }}
        onRespond={handleRespond}
        onSubmitAvailability={handleSubmitAvailability}
        onDeleteHangout={handleDeleteHangout}
        initialShowAvailability={openAvailabilityEditor}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default Hangouts;
