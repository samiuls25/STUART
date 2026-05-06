
import React, { useState } from "react";
import { motion } from "framer-motion";
import { Lock } from "lucide-react";
import type { Badge } from "../../data/badges";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

interface BadgeCardProps {
  badge: Badge;
  compact?: boolean;
}

const BadgeCard = ({ badge, compact = false }: BadgeCardProps) => {
  const [detailOpen, setDetailOpen] = useState(false);

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

  const openDetail = () => setDetailOpen(true);

  const detailBody = (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-left">
          <span className="text-2xl" aria-hidden>
            {badge.icon}
          </span>
          <span>{badge.name}</span>
          {badge.unlocked && badge.level > 0 ? (
            <span className="text-xs font-semibold text-primary ml-1">Level {badge.level}</span>
          ) : null}
        </DialogTitle>
        <DialogDescription className="text-left">{badge.description}</DialogDescription>
      </DialogHeader>

      {badge.contributorHint ? (
        <p className="text-sm text-muted-foreground">{badge.contributorHint}</p>
      ) : null}

      {badge.contributions && badge.contributions.length > 0 ? (
        <div className="rounded-xl border border-border bg-muted/30 px-3 py-2">
          <p className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
            What counts right now
          </p>
          <ul className="space-y-1.5 text-sm">
            {badge.contributions.map((row) => (
              <li key={row.label} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-muted-foreground mt-2">
            Totals refresh when you open Profile. We don&apos;t list every single event, just the rolled-up
            signals that feed each badge.
          </p>
        </div>
      ) : null}

      <div className="space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>
            Progress · Level {badge.level}/{badge.maxLevel}
          </span>
          <span>{badge.progress}%</span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${progressColors[badge.category]}`}
            style={{ width: `${badge.progress}%` }}
          />
        </div>
      </div>
    </>
  );

  if (compact) {
    return (
      <>
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={openDetail}
          className={`relative flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r ${categoryColors[badge.category]} border backdrop-blur-sm text-left ${!badge.unlocked ? "opacity-50" : ""}`}
        >
          <span className="text-lg shrink-0">{badge.icon}</span>
          <span className="flex flex-col min-w-0 items-start">
            <span className="text-xs font-medium text-foreground truncate max-w-[140px] sm:max-w-[180px]">
              {badge.name}
            </span>
            {badge.unlocked && badge.level > 0 ? (
              <span className="text-[10px] text-muted-foreground">Level {badge.level}</span>
            ) : (
              <span className="text-[10px] text-muted-foreground">Tap for details</span>
            )}
          </span>
          {!badge.unlocked && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
        </motion.button>

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-md">{detailBody}</DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <>
      <motion.button
        type="button"
        whileHover={{ y: -4 }}
        onClick={openDetail}
        className={`relative w-full text-left p-4 rounded-2xl bg-gradient-to-br ${categoryColors[badge.category]} border backdrop-blur-sm ${!badge.unlocked ? "opacity-60" : ""}`}
      >
        <div className="flex items-start justify-between mb-3 gap-2">
          <div className="text-4xl">{badge.icon}</div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            {!badge.unlocked ? (
              <div className="p-1.5 rounded-full bg-muted">
                <Lock className="w-4 h-4 text-muted-foreground" />
              </div>
            ) : badge.level > 0 ? (
              <div className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold">
                Lvl {badge.level}
              </div>
            ) : null}
          </div>
        </div>

        <h3 className="font-semibold text-foreground mb-1">{badge.name}</h3>
        <p className="text-xs text-muted-foreground mb-3">{badge.description}</p>

        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>
              Level {badge.level}/{badge.maxLevel}
            </span>
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
              Tap the card for what feeds this badge.
            </p>
          )}
        </div>

        {badge.unlocked && badge.unlockedAt && (
          <p className="text-[10px] text-muted-foreground mt-2">Unlocked {badge.unlockedAt}</p>
        )}
      </motion.button>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-md">{detailBody}</DialogContent>
      </Dialog>
    </>
  );
};

export default BadgeCard;
