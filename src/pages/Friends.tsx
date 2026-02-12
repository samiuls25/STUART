import { useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Check, X, Bell, Filter, UserCheck } from "lucide-react";
import Navbar from "../components/layout/Navbar";
import FriendCard from "../components/friends/FriendCard";
import FriendProfileModal from "../components/friends/FriendProfileModal";
import { friends, friendRequests, Friend } from "../data/friends.ts";
import { Input } from "../components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";

const Friends = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "online" | "muted">("all");

  const filteredFriends = friends.filter((friend) => {
    const matchesSearch = friend.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "online" && friend.status === "online") ||
      (filter === "muted" && friend.isMuted);
    return matchesSearch && matchesFilter && !friend.isBlocked;
  });

  const pendingRequests = friendRequests.filter((r) => r.status === "pending");

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
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                    {pendingRequests.length}
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
                className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 text-muted-foreground hover:text-primary transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Add New Friend</span>
              </motion.button>
            </TabsContent>

            {/* Requests Tab */}
            <TabsContent value="requests" className="space-y-4">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((request, index) => (
                  <motion.div
                    key={request.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                      <span className="font-heading text-lg font-bold text-primary">
                        {request.from.name.charAt(0)}
                      </span>
                    </div>

                    <div className="flex-1">
                      <p className="font-medium text-foreground">{request.from.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.from.mutualFriends} mutual friends • Sent {request.sentAt}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                        <Check className="w-5 h-5" />
                      </button>
                      <button className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors">
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
    </div>
  );
};

export default Friends;
