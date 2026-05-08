import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Check, X, Bell, UserCheck, Link2, Copy, Trash2, Loader2 } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import AuthModal from "../components/auth/AuthModal";
import FriendCard from "../components/friends/FriendCard";
import FriendProfileModal from "../components/friends/FriendProfileModal";
import {
  getFriends,
  getPendingRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  sendFriendRequest,
  fetchActiveFriendInviteToken,
  rotateFriendInviteLink,
  revokeActiveFriendInviteLinks,
} from "../lib/friends";
import type { Friend } from "../lib/friends";
import { useAuth } from "../lib/AuthContext";
import { toast } from "../hooks/use-toast";
import { Input } from "../components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { trackAnalytics } from "../lib/analytics";

const Friends = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [friendsTab, setFriendsTab] = useState<"friends" | "requests">("friends");
  const [showAuth, setShowAuth] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [removingFriend, setRemovingFriend] = useState(false);
  const [inviteLinkToken, setInviteLinkToken] = useState<string | null>(null);
  const [inviteLinkLoading, setInviteLinkLoading] = useState(false);
  const [inviteLinkBusy, setInviteLinkBusy] = useState(false);
  const pendingFriendsPageTrackRef = useRef(true);

  const refreshFriends = () => {
    return Promise.all([getFriends(), getPendingRequests()]).then(([friendsData, requestsData]) => {
      setFriends(friendsData);
      setPendingRequests(requestsData);
    });
  };

  useEffect(() => {
    const state = location.state as { openRequestsTab?: boolean } | null | undefined;
    if (state?.openRequestsTab) {
      setFriendsTab("requests");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!user?.id) {
      setInviteLinkToken(null);
      return;
    }

    let cancelled = false;
    setInviteLinkLoading(true);

    fetchActiveFriendInviteToken()
      .then((token) => {
        if (!cancelled) setInviteLinkToken(token);
      })
      .finally(() => {
        if (!cancelled) setInviteLinkLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    refreshFriends()
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    pendingFriendsPageTrackRef.current = true;
  }, [user?.id]);

  useEffect(() => {
    if (loading) return;

    if (!pendingFriendsPageTrackRef.current) return;
    pendingFriendsPageTrackRef.current = false;

    if (!user) {
      trackAnalytics("friends_page_view", { authenticated: false });
      return;
    }

    trackAnalytics("friends_page_view", {
      authenticated: true,
      friend_count: friends.length,
      pending_count: pendingRequests.length,
    });
  }, [loading, user, friends.length, pendingRequests.length]);

  const handleViewProfile = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowProfileModal(true);
  };

  const handleRequestRemoveFriend = (friend: Friend) => {
    setFriendToRemove(friend);
  };

  const handleConfirmRemoveFriend = async () => {
    if (!friendToRemove) return;

    setRemovingFriend(true);
    const success = await removeFriend(friendToRemove.id);

    if (success) {
      if (selectedFriend?.id === friendToRemove.id) {
        setShowProfileModal(false);
        setSelectedFriend(null);
      }
      await refreshFriends();
      toast({ title: `${friendToRemove.name} was removed from your friends.` });
      setFriendToRemove(null);
    } else {
      toast({ title: "Failed to remove friend", variant: "destructive" });
    }

    setRemovingFriend(false);
  };

  const handleAcceptRequest = async (friendId: string) => {
    const success = await acceptFriendRequest(friendId);
    if (success) {
      await refreshFriends();
      toast({ title: "Friend request accepted!" });
      trackAnalytics("friend_request_accepted", { surface: "friends_requests_tab" });
    } else {
      toast({ title: "Failed to accept request", variant: "destructive" });
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    const success = await rejectFriendRequest(friendId);
    if (success) {
      setPendingRequests(pendingRequests.filter((r) => r.id !== friendId));
      toast({ title: "Friend request rejected" });
    } else {
      toast({ title: "Failed to reject request", variant: "destructive" });
    }
  };

  const handleSendRequest = async () => {
    if (!friendEmail.trim()) return;
    
    const success = await sendFriendRequest(friendEmail);
    if (success) {
      setFriendEmail("");
      setShowAddFriend(false);
      toast({ title: "Friend request sent!" });
      trackAnalytics("friend_request_sent", { surface: "email_lookup" });
    } else {
      toast({ 
        title: "Couldn't send request", 
        description: "Make sure the email is correct and the user has signed up",
        variant: "destructive" 
      });
    }
  };

  const inviteUrlForToken = (token: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/invite/friend/${token}`;

  const tryCopyInviteUrl = async (token: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(inviteUrlForToken(token));
      return true;
    } catch {
      return false;
    }
  };

  const handleCopyInviteLink = async () => {
    if (!inviteLinkToken) return;
    const url = inviteUrlForToken(inviteLinkToken);
    const copied = await tryCopyInviteUrl(inviteLinkToken);
    if (copied) {
      trackAnalytics("friend_invite_link_copied", {});
      toast({ title: "Copied invite link" });
    }
    else
      toast({
        title: "Could not copy automatically",
        description: url,
        variant: "destructive",
      });
  };

  const handleCreateInviteLink = async () => {
    setInviteLinkBusy(true);
    try {
      const token = await rotateFriendInviteLink();
      setInviteLinkToken(token);
      trackAnalytics("friend_invite_link_rotated", {});
      const copied = await tryCopyInviteUrl(token);
      if (copied) {
        toast({
          title: "Invite link copied",
          description: "Paste it anywhere to share. Recipients sign in, then confirm.",
        });
      } else {
        toast({
          title: "Invite link ready",
          description: "Copy it from the box below, we couldn't access your clipboard.",
        });
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      const hint =
        msg.toLowerCase().includes("function") || msg.toLowerCase().includes("does not exist")
          ? " Run docs/db/friend_invite_links.sql in Supabase."
          : "";
      toast({
        title: "Could not create invite link",
        description: `${msg || "Please try again."}${hint}`,
        variant: "destructive",
      });
    } finally {
      setInviteLinkBusy(false);
    }
  };

  const handleRevokeInviteLink = async () => {
    setInviteLinkBusy(true);
    try {
      await revokeActiveFriendInviteLinks();
      setInviteLinkToken(null);
      toast({ title: "Invite link revoked" });
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      toast({
        title: "Could not revoke link",
        description: msg || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInviteLinkBusy(false);
    }
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && friend.status === "online");
    return matchesSearch && matchesFilter;
  });

  const pendingRequestsData = pendingRequests;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />

        <main className="pt-[72px]">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <UserCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="font-heading text-3xl font-bold text-foreground mb-3">Friends</h1>
            <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
              Sign in to manage friends, accept requests, and grow your circle.
            </p>
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
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="font-heading text-3xl font-bold text-foreground mb-2">
              Friends
            </h1>
            <p className="text-muted-foreground">
              Manage your friends and connections
            </p>
          </motion.div>

          <Tabs value={friendsTab} onValueChange={(v) => setFriendsTab(v as "friends" | "requests")} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Friends ({friends.length})
              </TabsTrigger>
              <TabsTrigger value="requests" className="flex items-center gap-2 relative">
                <Bell className="w-4 h-4" />
                Requests
                {pendingRequestsData.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {pendingRequestsData.length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Friends Tab */}
            <TabsContent value="friends" className="space-y-6">
              <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Link2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="font-heading text-base font-semibold text-foreground">Your invite link</h2>
                    <p className="text-xs text-muted-foreground mt-1">
                      Share outside STUART: they sign in, then confirm sending you a friend request. Revoke anytime.
                    </p>
                  </div>
                </div>

                {inviteLinkLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading link status…
                  </div>
                ) : inviteLinkToken ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 font-mono text-xs text-foreground break-all">
                      {`${typeof window !== "undefined" ? window.location.origin : ""}/invite/friend/${inviteLinkToken}`}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleCopyInviteLink()}
                        disabled={inviteLinkBusy}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
                      >
                        <Copy className="w-4 h-4" />
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCreateInviteLink()}
                        disabled={inviteLinkBusy}
                        className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50"
                      >
                        New link
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRevokeInviteLink()}
                        disabled={inviteLinkBusy}
                        className="inline-flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Revoke
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleCreateInviteLink()}
                    disabled={inviteLinkBusy}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95 disabled:opacity-50"
                  >
                    {inviteLinkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                    Create invite link
                  </button>
                )}
              </div>

              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search friends..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex gap-2">
                  {(["all", "online"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                        filter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Friends List */}
              <div className="space-y-3">
                {filteredFriends.length > 0 ? (
                  filteredFriends.map((friend, index) => (
                    <motion.div
                      key={friend.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <FriendCard
                        friend={friend}
                        onViewProfile={handleViewProfile}
                        onRemove={handleRequestRemoveFriend}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No friends found</p>
                  </div>
                )}
              </div>

              {/* Add Friend Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  if (user) {
                    setShowAddFriend(true);
                  } else {
                    setShowAuth(true);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Add New Friend</span>
              </motion.button>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              {pendingRequestsData.length > 0 ? (
                pendingRequestsData.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="font-heading text-lg font-bold text-primary">
                        {request.name?.charAt(0) ?? "?"}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-foreground">{request.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.email}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12">
                  <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending friend requests</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <FriendProfileModal
        friend={selectedFriend}
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onRemove={handleRequestRemoveFriend}
      />

      <AlertDialog
        open={Boolean(friendToRemove)}
        onOpenChange={(open) => {
          if (!open && !removingFriend) {
            setFriendToRemove(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogTitle className="text-destructive">Remove Friend?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to remove this friend?
          </AlertDialogDescription>
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-foreground">
            <strong>{friendToRemove?.name || "This friend"}</strong> will be removed from your friends list.
          </div>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={removingFriend}>Keep Friend</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                void handleConfirmRemoveFriend();
              }}
              disabled={removingFriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingFriend ? "Removing..." : "Remove Friend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && user && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddFriend(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-md bg-card rounded-2xl shadow-2xl pointer-events-auto p-6"
              >
                <h2 className="text-xl font-heading font-bold text-foreground mb-4">
                  Add Friend
                </h2>
                <Input
                  type="email"
                  placeholder="Enter friend's email"
                  value={friendEmail}
                  onChange={(e) => setFriendEmail(e.target.value)}
                  className="mb-4"
                  disabled={!user}
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddFriend(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button onClick={handleSendRequest} className="btn-primary flex-1" disabled={!user}>
                    Send Request
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <AuthModal isOpen={showAuth} onClose={() => setShowAuth(false)} />
    </div>
  );
};

export default Friends;
