import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sun, Cloud, CloudRain, Snowflake, Wind, Loader2 } from "lucide-react";

interface WeatherIndicatorProps {
  className?: string;
}

// Open-Meteo (free, no API key) - default NYC
const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";
const DEFAULT_LAT = 40.7128;
const DEFAULT_LON = -74.006;

type WeatherCondition = "sunny" | "cloudy" | "rainy" | "snowy" | "windy";

// Map WMO weather codes to our condition + recommendation
function weatherFromCode(code: number): { condition: WeatherCondition; recommendation: string } {
  if (code === 0) return { condition: "sunny", recommendation: "Great day for outdoor events!" };
  if (code >= 1 && code <= 3) return { condition: "cloudy", recommendation: "Good for indoor or outdoor—layer up." };
  if (code >= 45 && code <= 48) return { condition: "cloudy", recommendation: "Foggy—great for cozy indoor events." };
  if (code >= 51 && code <= 67) return { condition: "rainy", recommendation: "Rain expected—indoor events recommended." };
  if (code >= 71 && code <= 77) return { condition: "snowy", recommendation: "Snow—perfect for winter activities or indoor." };
  if (code >= 80 && code <= 82) return { condition: "rainy", recommendation: "Showers possible—have a backup indoor plan." };
  if (code >= 85 && code <= 86) return { condition: "snowy", recommendation: "Snow showers—dress warm or stay in." };
  if (code >= 95 && code <= 99) return { condition: "rainy", recommendation: "Storms possible—check before heading out." };
  return { condition: "cloudy", recommendation: "Check conditions before you go." };
}

async function fetchWeather(lat: number, lon: number): Promise<{ temp: number; condition: WeatherCondition; recommendation: string } | null> {
  const url = `${OPEN_METEO_BASE}?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data?.current;
    if (!current) return null;
    const { condition, recommendation } = weatherFromCode(current.weather_code ?? 0);
    return {
      temp: Math.round(current.temperature_2m ?? 0),
      condition,
      recommendation,
    };
  } catch {
    return null;
  }
}

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
  const [weather, setWeather] = useState<{
    temp: number;
    condition: WeatherCondition;
    recommendation: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const tryFetch = (lat: number, lon: number) =>
      fetchWeather(lat, lon).then((data) => {
        if (!cancelled && data) setWeather(data);
      });

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          tryFetch(pos.coords.latitude, pos.coords.longitude).finally(() => setLoading(false));
        },
        () => {
          tryFetch(DEFAULT_LAT, DEFAULT_LON).finally(() => setLoading(false));
        },
        { timeout: 3000 }
      );
    } else {
      tryFetch(DEFAULT_LAT, DEFAULT_LON).finally(() => setLoading(false));
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className={`flex items-center gap-3 px-4 py-2.5 bg-secondary/50 rounded-xl border border-border ${className}`}
      >
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading weather...</span>
      </motion.div>
    );
  }

  const display = weather ?? {
    temp: 45,
    condition: "cloudy" as WeatherCondition,
    recommendation: "Weather unavailable—enjoy the city!",
  };
  const WeatherIcon = weatherIcons[display.condition];
  const iconColor = weatherColors[display.condition];

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
        <p className="text-sm font-medium text-foreground">{display.temp}°F</p>
        <p className="text-xs text-muted-foreground">{display.recommendation}</p>
      </div>
    </motion.div>
  );
};

export default WeatherIndicator;
