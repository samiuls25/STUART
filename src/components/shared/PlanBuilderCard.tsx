import React from "react";
import { motion } from "framer-motion";
import { Wand2, Utensils, MapPin, Clock, ArrowRight } from "lucide-react";

interface PlanBuilderCardProps {
  onBuildPlan: () => void;
}

const PlanBuilderCard = ({ onBuildPlan }: PlanBuilderCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 rounded-2xl border border-primary/20 p-6 mb-8"
    >
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-xl bg-primary/20">
          <Wand2 className="w-6 h-6 text-primary" />
        </div>
        
        <div className="flex-1">
          <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
            One-Click Plan Builder
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Let STUART create a complete itinerary for you — event, food & drinks nearby, and travel route.
          </p>
          
          {/* Sample Plan Preview */}
          <div className="bg-background/50 rounded-xl p-4 mb-4 border border-border/50">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Sample Plan</p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">1</div>
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Taylor Swift @ Madison Square Garden</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent-foreground">2</div>
                <Utensils className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">Pre-show dinner at Koreatown</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Clock className="w-4 h-4 ml-9" />
                <span>Estimated total: 5 hours</span>
              </div>
            </div>
          </div>
          
          <button
            onClick={onBuildPlan}
            className="btn-primary flex items-center gap-2"
          >
            Build me a plan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PlanBuilderCard;
