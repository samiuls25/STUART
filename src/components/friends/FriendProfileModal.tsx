import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, Camera, Calendar, UserMinus, VolumeX, Volume2 } from "lucide-react";
import { Friend } from "../../data/friends";
import { badges as allBadges, memories } from "../../data/badges";
import BadgeCard from "../profile/BadgeCard";
import MemoryCard from "../profile/MemoryCard";

interface FriendProfileModalProps {
  friend: Friend | null;
  isOpen: boolean;
  onClose: () => void;
  onMute?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
}

const FriendProfileModal = ({ friend, isOpen, onClose, onMute, onBlock }: FriendProfileModalProps) => {
  if (!friend) return null;

  const friendBadges = friend.badges
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean);

  // Mock shared memories (in real app, filter by attendees)
  const sharedMemories = memories.slice(0, 2);

  const statusColors = {
    online: "bg-green-500",
    offline: "bg-muted-foreground/50",
    busy: "bg-amber-500",
  };

  const statusLabels = {
    online: "Online",
    offline: "Offline",
    busy: "Busy",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
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
              <h2 className="font-heading text-xl font-bold text-foreground">Friend Profile</h2>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                    {friend.avatar ? (
                      <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-2xl object-cover" />
                    ) : (
                      <span className="font-heading text-3xl font-bold text-primary">
                        {friend.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-card ${statusColors[friend.status]}`} />
                </div>

                <div className="flex-1">
                  <h3 className="font-heading text-xl font-bold text-foreground">{friend.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${statusColors[friend.status]}`} />
                    {statusLabels[friend.status]}
                  </p>

                  <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
                    <span>{friend.mutualFriends} mutual friends</span>
                    <span>•</span>
                    <span>{friend.hangoutsTogether} hangouts</span>
                  </div>
                </div>
              </div>

              {/* Badges */}
              {friendBadges.length > 0 && (
                <div>
                  <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Trophy className="w-4 h-4 text-primary" />
                    Badges
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {friendBadges.map((badge) => (
                      <BadgeCard key={badge!.id} badge={badge!} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Shared Memories */}
              {sharedMemories.length > 0 && (
                <div>
                  <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-primary" />
                    Shared Memories
                  </h4>
                  <div className="space-y-3">
                    {sharedMemories.map((memory) => (
                      <MemoryCard key={memory.id} memory={memory} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Upcoming Hangouts */}
              <div>
                <h4 className="font-heading font-semibold text-foreground flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  Upcoming Together
                </h4>
                <div className="bg-muted/50 rounded-xl p-4 text-center">
                  <p className="text-sm text-muted-foreground">No upcoming hangouts scheduled</p>
                  <button className="mt-2 text-sm text-primary hover:underline">
                    Create a hangout with {friend.name.split(" ")[0]}
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onMute?.(friend)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                >
                  {friend.isMuted ? (
                    <>
                      <Volume2 className="w-4 h-4" />
                      Unmute
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4" />
                      Mute
                    </>
                  )}
                </button>
                <button
                  onClick={() => onBlock?.(friend)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  Block
                </button>
              </div>

              <button className="btn-primary px-4 py-2">
                Invite to Hangout
              </button>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default FriendProfileModal;
