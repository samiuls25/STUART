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
}: AvailabilityHeatmapProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<"select" | "deselect">("select");

  const baseDate = new Date(startDate);
  const days = Array.from({ length: numDays }, (_, i) => addDays(baseDate, i));

  const heatColors: Record<number, string> = {
    0: "bg-muted/30 hover:bg-muted/50",
    1: "bg-primary/20",
    2: "bg-primary/40",
    3: "bg-primary/70",
  };

  const handleMouseDown = (key: string) => {
    setIsDragging(true);
    const isSelected = (selectedSlots[key] || 0) > 0;
    setDragMode(isSelected ? "deselect" : "select");
    onToggleSlot(key);
  };

  const handleMouseEnter = (key: string) => {
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
    <div className="select-none" onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
      <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
        <span>Click & drag to select your availability</span>
        <div className="flex items-center gap-1 ml-auto">
          <div className="w-3 h-3 rounded-sm bg-muted/30 border border-border" />
          <span>Free</span>
          <div className="w-3 h-3 rounded-sm bg-primary/20 ml-2" />
          <span>Available</span>
          <div className="w-3 h-3 rounded-sm bg-primary/70 ml-2" />
          <span>Preferred</span>
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
            <>
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
                    className={`h-7 mx-0.5 rounded-sm cursor-pointer border border-border/30 transition-colors relative ${heatColors[level]}`}
                  >
                    {overlapCount > 0 && (
                      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-primary-foreground">
                        {overlapCount}
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </>
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
