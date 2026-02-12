
import React from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Badge } from "../../data/badges";

interface BadgeCardProps {
  badge: Badge;
  compact?: boolean;
}

const BadgeCard = ({ badge, compact = false }: BadgeCardProps) => {
  const categoryColors = {
    social: "from-pink-500/20 to-rose-500/20 border-pink-500/30",
    explorer: "from-teal-500/20 to-cyan-500/20 border-teal-500/30",
    vibe: "from-amber-500/20 to-orange-500/20 border-amber-500/30",
    special: "from-purple-500/20 to-indigo-500/20 border-purple-500/30",
  };

  const progressColors = {
    social: "bg-pink-500",
    explorer: "bg-teal-500",
    vibe: "bg-amber-500",
    special: "bg-purple-500",
  };

  if (compact) {
    return (
      <motion.div
        whileHover={{ scale: 1.05 }}
        className={`relative flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${categoryColors[badge.category]} border backdrop-blur-sm ${!badge.unlocked ? "opacity-50" : ""}`}
      >
        <span className="text-lg">{badge.icon}</span>
        <span className="text-xs font-medium text-foreground">{badge.name}</span>
        {!badge.unlocked && <Lock className="w-3 h-3 text-muted-foreground" />}
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`relative p-4 rounded-2xl bg-gradient-to-br ${categoryColors[badge.category]} border backdrop-blur-sm ${!badge.unlocked ? "opacity-60" : ""}`}
    >
      {/* Badge Icon */}
      <div className="flex items-start justify-between mb-3">
        <div className="text-4xl">{badge.icon}</div>
        {!badge.unlocked && (
          <div className="p-1.5 rounded-full bg-muted">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        {badge.unlocked && badge.level > 0 && (
          <div className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
            Lvl {badge.level}
          </div>
        )}
      </div>

      {/* Badge Info */}
      <h3 className="font-semibold text-foreground mb-1">{badge.name}</h3>
      <p className="text-xs text-muted-foreground mb-3">{badge.description}</p>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Level {badge.level}/{badge.maxLevel}</span>
          <span>{badge.progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${badge.progress}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`h-full rounded-full ${progressColors[badge.category]}`}
          />
        </div>
        {!badge.unlocked && (
          <p className="text-[10px] text-muted-foreground mt-2">
            {Math.ceil((100 - badge.progress) / 20)} more outings to unlock
          </p>
        )}
      </div>

      {/* Unlocked Date */}
      {badge.unlocked && badge.unlockedAt && (
        <p className="text-[10px] text-muted-foreground mt-2">
          Unlocked {badge.unlockedAt}
        </p>
      )}
    </motion.div>
  );
};

export default BadgeCard;
