/** Persisted appearance: explicit light/dark only (matches existing Settings behavior). */

export type ThemePreference = "dark" | "light";

export function initializeDocumentTheme(): void {
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.documentElement.classList.add("dark");
    return;
  }

  if (savedTheme === "light") {
    document.documentElement.classList.remove("dark");
    return;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export function getDocumentTheme(): ThemePreference {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function setTheme(preference: ThemePreference): void {
  if (preference === "dark") {
    document.documentElement.classList.add("dark");
    localStorage.setItem("theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");
  }
}

export function toggleTheme(): ThemePreference {
  const next = getDocumentTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}
