import React from "react";
import { motion } from "framer-motion";
import { Sun, Cloud, CloudRain, Snowflake, Wind } from "lucide-react";

interface WeatherIndicatorProps {
  className?: string;
}

// Mock weather data - would be from API in production
const mockWeather = {
  condition: "sunny" as const,
  temperature: 45,
  recommendation: "Great day for outdoor events!",
};

const weatherIcons = {
  sunny: Sun,
  cloudy: Cloud,
  rainy: CloudRain,
  snowy: Snowflake,
  windy: Wind,
};

const weatherColors = {
  sunny: "text-amber-500",
  cloudy: "text-slate-400",
  rainy: "text-blue-400",
  snowy: "text-cyan-300",
  windy: "text-teal-400",
};

const WeatherIndicator = ({ className = "" }: WeatherIndicatorProps) => {
  const WeatherIcon = weatherIcons[mockWeather.condition];
  const iconColor = weatherColors[mockWeather.condition];

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-3 px-4 py-2.5 bg-secondary/50 rounded-xl border border-border ${className}`}
    >
      <div className={`p-2 rounded-lg bg-background/50 ${iconColor}`}>
        <WeatherIcon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-foreground">
          {mockWeather.temperature}°F
        </p>
        <p className="text-xs text-muted-foreground">
          {mockWeather.recommendation}
        </p>
      </div>
    </motion.div>
  );
};

export default WeatherIndicator;
