import React from "react"
import { motion } from "framer-motion";
import { moods } from "../../data/events";

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodChange: (mood: string | null) => void;
}

const MoodSelector = ({ selectedMood, onMoodChange }: MoodSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-3">
      {moods.map((mood, index) => (
        <motion.button
          key={mood.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onMoodChange(selectedMood === mood.id ? null : mood.id)}
          className={`group relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
            selectedMood === mood.id
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
              : "bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border"
          }`}
        >
          <span className="text-lg">{mood.icon}</span>
          <span>{mood.label}</span>
          
          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-foreground text-background text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
            {mood.description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-foreground" />
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default MoodSelector;
