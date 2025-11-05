"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import { Theme } from "@/types";
import { getTheme, applyTheme } from "@/lib/themes";

interface ThemeContextType {
  currentTheme: Theme;
  setTheme: (themeId: string) => void;
  themeId: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: string;
}

export default function ThemeProvider({
  children,
  initialTheme = "default",
}: ThemeProviderProps) {
  // Initialize theme from localStorage on client-side
  const [themeId, setThemeId] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("selectedTheme");
      // One-time migration: update "foldingtable" theme to "default"
      if (savedTheme === "foldingtable") {
        localStorage.setItem("selectedTheme", "default");
        return "default";
      }
      return savedTheme || initialTheme;
    }
    return initialTheme;
  });

  // Use useMemo to compute theme based on themeId
  const currentTheme = useMemo(() => getTheme(themeId), [themeId]);

  // Apply theme on mount and whenever it changes
  useEffect(() => {
    applyTheme(currentTheme);
  }, [currentTheme]);

  const handleSetTheme = (newThemeId: string) => {
    setThemeId(newThemeId);
    // Store in localStorage for persistence across sessions
    localStorage.setItem("selectedTheme", newThemeId);
  };

  return (
    <ThemeContext.Provider
      value={{
        currentTheme,
        setTheme: handleSetTheme,
        themeId,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
