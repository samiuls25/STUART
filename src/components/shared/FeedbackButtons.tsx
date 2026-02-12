import React from "react";
import { motion } from "framer-motion";
import { ThumbsUp, ThumbsDown, DollarSign, MapPin, X } from "lucide-react";

interface FeedbackButtonsProps {
  onFeedback: (type: string) => void;
  className?: string;
}

const FeedbackButtons = ({ onFeedback, className = "" }: FeedbackButtonsProps) => {
  const feedbackOptions = [
    { id: "more", label: "More like this", icon: ThumbsUp, color: "hover:bg-green-500/10 hover:text-green-500" },
    { id: "not-interested", label: "Not interested", icon: ThumbsDown, color: "hover:bg-red-500/10 hover:text-red-500" },
    { id: "too-expensive", label: "Too expensive", icon: DollarSign, color: "hover:bg-amber-500/10 hover:text-amber-500" },
    { id: "too-far", label: "Too far", icon: MapPin, color: "hover:bg-blue-500/10 hover:text-blue-500" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-muted/50 rounded-xl p-3 ${className}`}
    >
      <p className="text-xs text-muted-foreground mb-2 text-center">
        Help us improve your recommendations
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {feedbackOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => onFeedback(option.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border border-border transition-colors ${option.color}`}
          >
            <option.icon className="w-3 h-3" />
            {option.label}
          </button>
        ))}
      </div>
    </motion.div>
  );
};

export default FeedbackButtons;
