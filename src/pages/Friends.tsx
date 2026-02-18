import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, UserPlus, Check, X, Bell, Filter, UserCheck } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import FriendCard from "../components/friends/FriendCard";
import FriendProfileModal from "../components/friends/FriendProfileModal";
import { getFriends, getPendingRequests, acceptFriendRequest, rejectFriendRequest, sendFriendRequest } from "../lib/friends";
import { useAuth } from "../lib/AuthContext";
import { toast } from "../hooks/use-toast";
import { Input } from "../components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Friend } from "../lib/friends";

const Friends = () => {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendEmail, setFriendEmail] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "online" | "muted">("all");

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    Promise.all([getFriends(), getPendingRequests()])
      .then(([friendsData, requestsData]) => {
        setFriends(friendsData);
        setPendingRequests(requestsData);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const handleViewProfile = (friend: Friend) => {
    setSelectedFriend(friend);
    setShowProfileModal(true);
  };

  const handleMute = (friend: Friend) => {
    console.log("Toggle mute for:", friend.name);
  };

  const handleBlock = (friend: Friend) => {
    console.log("Block:", friend.name);
  };

  const handleAcceptRequest = async (friendId: string) => {
    const success = await acceptFriendRequest(friendId);
    if (success) {
      // Refresh data
      Promise.all([getFriends(), getPendingRequests()])
        .then(([friendsData, requestsData]) => {
          setFriends(friendsData);
          setPendingRequests(requestsData);
        });
      toast({ title: "Friend request accepted!" });
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
    } else {
      toast({ 
        title: "Couldn't send request", 
        description: "Make sure the email is correct and the user has signed up",
        variant: "destructive" 
      });
    }
  };

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && friend.status === "online") ||
      (filter === "muted" && friend.isMuted);
    return matchesSearch && matchesFilter && !friend.isBlocked;
  });

  const pendingRequestsData = pendingRequests; // Already filtered by getPendingRequests()

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

          <Tabs defaultValue="friends" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="friends" className="flex items-center gap-2">
                <UserCheck className="w-4 h-4" />
                Friends ({friends.filter((f) => !f.isBlocked).length})
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
                  {(["all", "online", "muted"] as const).map((f) => (
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
                        onMute={handleMute}
                        onBlock={handleBlock}
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
                onClick={() => setShowAddFriend(true)}
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
                        {request.name?.charAt(0) ?? "?"}  {/* Changed from request.from.name */}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-foreground">{request.name}</p>  {/* Changed from request.from.name */}
                      <p className="text-sm text-muted-foreground">
                        {request.email}  {/* Changed from request.from.mutualFriends */}
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
        onMute={handleMute}
        onBlock={handleBlock}
      />

      {/* Add Friend Modal */}
      <AnimatePresence>
        {showAddFriend && (
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
                />
                <div className="flex gap-2">
                  <button onClick={() => setShowAddFriend(false)} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button onClick={handleSendRequest} className="btn-primary flex-1">
                    Send Request
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Friends;
