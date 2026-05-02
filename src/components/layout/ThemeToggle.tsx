import React, { useCallback, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { getDocumentTheme, setTheme } from "../../lib/themePreference";

const ThemeToggle = () => {
  const [isDark, setIsDark] = useState(() => getDocumentTheme() === "dark");

  const handleToggle = useCallback(() => {
    const next = !isDark;
    setIsDark(next);
    setTheme(next ? "dark" : "light");
  }, [isDark]);

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
      className="p-2 rounded-lg border border-border/60 bg-background/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
    >
      {isDark ? (
        <Sun className="w-5 h-5" aria-hidden />
      ) : (
        <Moon className="w-5 h-5" aria-hidden />
      )}
    </button>
  );
};

export default ThemeToggle;
