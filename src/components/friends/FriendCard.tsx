import React from "react";
import { motion } from "framer-motion";
import { UserMinus, VolumeX, Volume2, MessageCircle, MoreHorizontal } from "lucide-react";
import { Friend } from "../../lib/friends";
import { badgeDefinitions as allBadges } from "../../data/badges";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

interface FriendCardProps {
  friend: Friend;
  onViewProfile?: (friend: Friend) => void;
  onMute?: (friend: Friend) => void;
  onBlock?: (friend: Friend) => void;
  compact?: boolean;
}

const FriendCard = ({ friend, onViewProfile, onMute, onBlock, compact = false }: FriendCardProps) => {
  const statusColors = {
    online: "bg-green-500",
    offline: "bg-muted-foreground/50",
    busy: "bg-amber-500",
  };

  // Safely handle badges - Supabase friends don't have badges array
  const friendBadges = (friend.badges ?? [])
    .map((id) => allBadges.find((b) => b.id === id))
    .filter(Boolean)
    .slice(0, 3);

  // Safely handle status - Supabase friends don't have online/offline status
  const friendStatus = (friend.status as string) in statusColors 
    ? friend.status as "online" | "offline" | "busy"
    : "offline";

  if (compact) {
    return (
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => onViewProfile?.(friend)}
        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all w-full text-left"
      >
        <div className="relative">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            {friend.avatar ? (
              <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="font-heading font-bold text-primary">
                {friend.name.charAt(0)}
              </span>
            )}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${statusColors[friendStatus]}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground truncate">{friend.name}</p>
          <div className="flex gap-1">
            {friendBadges.map((badge) => (
              <span key={badge!.id} className="text-xs" title={badge!.name}>
                {badge!.icon}
              </span>
            ))}
          </div>
        </div>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border hover:border-primary/30 transition-all group"
    >
      {/* Avatar */}
      <button
        onClick={() => onViewProfile?.(friend)}
        className="relative flex-shrink-0"
      >
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          {friend.avatar ? (
            <img src={friend.avatar} alt={friend.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            <span className="font-heading text-xl font-bold text-primary">
              {friend.name.charAt(0)}
            </span>
          )}
        </div>
        <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card ${statusColors[friendStatus]}`} />
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onViewProfile?.(friend)}
            className="font-heading font-semibold text-foreground hover:text-primary transition-colors"
          >
            {friend.name}
          </button>
          {friend.isMuted && (
            <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </div>
        
        {/* Badges */}
        <div className="flex items-center gap-1.5 mt-1">
          {friendBadges.map((badge) => (
            <span
              key={badge!.id}
              className="text-sm"
              title={badge!.name}
            >
              {badge!.icon}
            </span>
          ))}
        </div>

        {/* Stats - only show if available */}
        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
          {friend.mutualFriends !== undefined && (
            <>
              <span>{friend.mutualFriends} mutual friends</span>
              <span>•</span>
            </>
          )}
          {friend.hangoutsTogether !== undefined && (
            <span>{friend.hangoutsTogether} hangouts together</span>
          )}
          {friend.email && friend.mutualFriends === undefined && (
            <span>{friend.email}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Message"
        >
          <MessageCircle className="w-4 h-4" />
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onViewProfile?.(friend)}>
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMute?.(friend)}>
              {friend.isMuted ? (
                <>
                  <Volume2 className="w-4 h-4 mr-2" />
                  Unmute
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 mr-2" />
                  Mute
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onBlock?.(friend)}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Block
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
};

export default FriendCard;
