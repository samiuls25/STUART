import React from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";

interface AvailabilityHeatmapProps {
  startDate: string; // ISO date
  numDays?: number;
  timeSlots?: string[];
  selectedSlots: Record<string, number>; // "date-time" -> heat level 0-3
  onToggleSlot: (key: string) => void;
  friendAvailability?: Record<string, string[]>; // friendName -> slot keys
  readOnly?: boolean;
}

const DEFAULT_TIME_SLOTS = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00",
];

const AvailabilityHeatmap = ({
  startDate,
  numDays = 7,
  timeSlots = DEFAULT_TIME_SLOTS,
  selectedSlots,
  onToggleSlot,
  friendAvailability,
  readOnly = false,
}: AvailabilityHeatmapProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");

  const baseDate = new Date(startDate);
  const days = Array.from({ length: numDays }, (_, i) => addDays(baseDate, i));

  const heatColors: Record<number, string> = {
    0: "bg-sky-100/50 hover:bg-sky-200/60 dark:bg-slate-800/40 dark:hover:bg-slate-700/55",
    1: "bg-emerald-200/80 border-emerald-300/70 dark:bg-emerald-800/50 dark:border-emerald-700/60",
    2: "bg-teal-300/85 border-teal-400/70 dark:bg-teal-700/60 dark:border-teal-600/70",
    3: "bg-cyan-500/85 border-cyan-600/80 dark:bg-cyan-500/80 dark:border-cyan-400/80",
  };

  const handleMouseDown = (key: string) => {
    if (readOnly) return;
    setIsDragging(true);
    const isSelected = (selectedSlots[key] || 0) > 0;
    setDragMode(isSelected ? "deselect" : "select");
    onToggleSlot(key);
  };

  const handleMouseEnter = (key: string) => {
    if (readOnly) return;
    if (!isDragging) return;
    const current = selectedSlots[key] || 0;
    if (dragMode === "select" && current === 0) onToggleSlot(key);
    if (dragMode === "deselect" && current > 0) onToggleSlot(key);
  };

  const handleMouseUp = () => setIsDragging(false);

  // Count friend overlaps per slot
  const getOverlapCount = (key: string): number => {
    if (!friendAvailability) return 0;
    return Object.values(friendAvailability).filter((slots) => slots.includes(key)).length;
  };

  return (
    <div className="select-none rounded-xl border border-border/60 bg-gradient-to-b from-background to-muted/20 p-3" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-muted-foreground">
        <span>{readOnly ? "Availability overview" : "Click & drag to select your availability"}</span>
        <div className="flex items-center gap-2 ml-auto rounded-full bg-background/80 px-2 py-1 border border-border/60">
          <div className="w-3 h-3 rounded-sm bg-sky-100/80 border border-sky-300/70 dark:bg-slate-700/60 dark:border-slate-600/80" />
          <span>Open</span>
          <div className="w-3 h-3 rounded-sm bg-emerald-200/80 border border-emerald-300/80 ml-1" />
          <span>Available</span>
          <div className="w-3 h-3 rounded-sm bg-cyan-500/85 border border-cyan-600/80 ml-1" />
          <span>Best</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-grid" style={{ gridTemplateColumns: `60px repeat(${numDays}, 1fr)` }}>
          {/* Header row - days */}
          <div className="h-10" />
          {days.map((day) => (
            <div key={day.toISOString()} className="h-10 flex flex-col items-center justify-center px-1 min-w-[48px]">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                {format(day, "EEE")}
              </span>
              <span className="text-xs font-semibold text-foreground">
                {format(day, "d")}
              </span>
            </div>
          ))}

          {/* Time slot rows */}
          {timeSlots.map((time) => (
            <React.Fragment key={`row-${time}`}>
              <div key={`label-${time}`} className="h-7 flex items-center justify-end pr-2">
                <span className="text-[10px] text-muted-foreground">{time}</span>
              </div>
              {days.map((day) => {
                const key = `${format(day, "yyyy-MM-dd")}-${time}`;
                const level = selectedSlots[key] || 0;
                const overlapCount = getOverlapCount(key);

                return (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.1 }}
                    onMouseDown={() => handleMouseDown(key)}
                    onMouseEnter={() => handleMouseEnter(key)}
                    className={`h-7 mx-0.5 rounded-md border transition-colors relative shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)] ${readOnly ? "cursor-default" : "cursor-pointer"} ${heatColors[level]}`}
                  >
                    {overlapCount > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-slate-900 dark:text-white drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]">
                        {overlapCount}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {friendAvailability && Object.keys(friendAvailability).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground mb-2">Friends' availability overlap:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(friendAvailability).map(([name, slots]) => (
              <span key={name} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                {name}: {slots.length} slots
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityHeatmap;
