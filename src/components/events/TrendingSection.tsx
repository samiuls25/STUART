import { motion } from "framer-motion";
import React from "react";
import { TrendingUp, Flame, Clock3, Sparkles } from "lucide-react";
import type { Event } from "../../data/events";

interface TrendingSectionProps {
  events: Event[];
  onEventClick: (event: Event) => void;
}

const TRENDING_LIST_SIZE = 10;

const isCurrentOrFutureEvent = (event: Event) => {
  if (event.happeningNow || event.isTonight) {
    return true;
  }

  if (!event.date) {
    return true;
  }

  const parsed = new Date(`${event.date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return true;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return parsed >= today;
};

const TrendingSection = ({ events, onEventClick }: TrendingSectionProps) => {
  const toScoreLabel = (score?: number) => {
    if (typeof score !== "number" || Number.isNaN(score) || score <= 0) {
      return "Recommended";
    }
    return `Score ${Math.round(score)}`;
  };

  const relevantEvents = events.filter(isCurrentOrFutureEvent);

  const rankedTrendingEvents = relevantEvents
    .filter((e) => e.isTrending)
    .sort((a, b) => (a.trendingRank || 99) - (b.trendingRank || 99))
    .slice(0, TRENDING_LIST_SIZE);

  const fallbackTrendingEvents = [...relevantEvents]
    .sort((a, b) => {
      const scoreA = (a.recommendationScore || 0) + (a.happeningNow ? 20 : 0) + (a.isTonight ? 8 : 0);
      const scoreB = (b.recommendationScore || 0) + (b.happeningNow ? 20 : 0) + (b.isTonight ? 8 : 0);
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      return (a.date || "").localeCompare(b.date || "");
    })
    .slice(0, TRENDING_LIST_SIZE);

  const hasRankedTrending = rankedTrendingEvents.length > 0;
  const trendingEvents = hasRankedTrending ? rankedTrendingEvents : fallbackTrendingEvents;

  if (trendingEvents.length === 0) return null;

  const getTrendSignals = (event: Event, listRank: number) => {
    const signals: Array<{ icon: React.ReactNode; label: string }> = [];

    if (event.happeningNow) {
      signals.push({
        icon: <Clock3 className="w-3 h-3" />,
        label: "Happening now",
      });
    } else if (event.isTonight) {
      signals.push({
        icon: <Clock3 className="w-3 h-3" />,
        label: "Tonight",
      });
    }

    if ((event.recommendationScore ?? 0) > 0) {
      signals.push({
        icon: <Sparkles className="w-3 h-3" />,
        label: toScoreLabel(event.recommendationScore),
      });
    }

    if (hasRankedTrending) {
      signals.push({
        icon: <TrendingUp className="w-3 h-3" />,
        label: `Rank #${listRank}`,
      });
    } else {
      signals.push({
        icon: <Sparkles className="w-3 h-3" />,
        label: "Fresh pick",
      });
    }

    return signals.slice(0, 2);
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-orange-500/10">
          <TrendingUp className="w-5 h-5 text-orange-500" />
        </div>
        <h2 className="font-heading text-lg font-semibold text-foreground">
          {hasRankedTrending ? "Trending Today" : "Popular Right Now"}
        </h2>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin">
        {trendingEvents.map((event, index) => (
          <motion.div
            key={event.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onEventClick(event)}
            className="flex-shrink-0 w-64 bg-card rounded-xl border border-border overflow-hidden cursor-pointer group hover:shadow-lg hover:border-primary/30 transition-all"
          >
            <div className="relative h-32 overflow-hidden">
              <img
                src={event.heroImage}
                alt={event.name}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
              
              {/* Rank Badge */}
              <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-orange-500 text-white text-xs font-bold rounded-full">
                <Flame className="w-3 h-3" />
                #{index + 1}
              </div>
              
              {/* Trend Signals */}
              <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 text-[11px] text-white/95">
                {getTrendSignals(event, index + 1).map((signal, signalIndex) => (
                  <span
                    key={`${event.id}-signal-${signalIndex}`}
                    className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 backdrop-blur-sm"
                  >
                    {signal.icon}
                    {signal.label}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="p-3">
              <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                {event.name}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                {event.date} • {event.venue}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSection;
