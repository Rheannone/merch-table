import { Theme } from "@/types";

export const themes: Record<string, Theme> = {
  default: {
    id: "default",
    name: "Default Dark",
    description: "Road-ready, Safety Orange for bands on tour",
    emoji: "🧡",
    colors: {
      // Background colors - deep black
      background: "#111111", // Night - Deep black
      backgroundSecondary: "#181818", // Eerie black - Surface
      backgroundTertiary: "#1f1f1f", // Surface hover

      // Text colors
      foreground: "#f9f0e8", // Linen - warmer off-white
      foregroundSecondary: "#d4c5b8", // Lighter version of linen
      foregroundMuted: "#9a8a7a", // Muted warm gray

      // Accent colors - Safety Orange
      primary: "#ff6a00", // Pumpkin - Safety Orange brand color
      primaryHover: "#ff8533", // Pumpkin hover
      secondary: "#42106b", // Indigo purple
      secondaryHover: "#5a1a8f", // Indigo purple hover

      // Status colors
      success: "#00a832", // Bright green - better contrast on dark backgrounds
      successHover: "#00c93d", // Bright green hover
      error: "#ff4444", // Bright red - better visibility
      errorHover: "#ff6666", // Bright red hover
      warning: "#ffaa00", // Orange-yellow
      info: "#42106b", // Indigo

      // Border and dividers
      border: "#2a2a2a", // Subtle border
      borderHover: "#3a3a3a", // Border hover

      // Cart and checkout
      cartBackground: "#181818", // Surface
      cartBorder: "#2a2a2a", // Subtle border
    },
  },

  girlypop: {
    id: "girlypop",
    name: "Girlypop",
    description: "Cute, pink, and floral - a light and cheerful theme! 🌸",
    emoji: "💗",
    colors: {
      // Background colors - light pink theme
      background: "#fff0f6", // Very light pink
      backgroundSecondary: "#fce7f3", // pink-100
      backgroundTertiary: "#fbcfe8", // pink-200

      // Text colors
      foreground: "#831843", // pink-900 - dark pink for text
      foregroundSecondary: "#9f1239", // rose-800
      foregroundMuted: "#be185d", // pink-700

      // Accent colors - bright pinks
      primary: "#ec4899", // pink-500
      primaryHover: "#db2777", // pink-600
      secondary: "#f472b6", // pink-400
      secondaryHover: "#ec4899", // pink-500

      // Status colors
      success: "#86efac", // green-300 (light for pink theme)
      successHover: "#4ade80", // green-400
      error: "#fb7185", // rose-400 (lighter red for pink theme)
      errorHover: "#f43f5e", // rose-500
      warning: "#fde047", // yellow-300
      info: "#f9a8d4", // pink-300

      // Border and dividers
      border: "#f9a8d4", // pink-300
      borderHover: "#f472b6", // pink-400

      // Cart and checkout
      cartBackground: "#fdf2f8", // pink-50
      cartBorder: "#f9a8d4", // pink-300
    },
    patterns: {
      // Subtle flower pattern using CSS
      backgroundPattern: `
        radial-gradient(circle at 20% 80%, rgba(236, 72, 153, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(244, 114, 182, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(249, 168, 212, 0.03) 0%, transparent 30%)
      `.trim(),
    },
  },
};

export const defaultTheme = themes.default;

export function getTheme(themeId: string): Theme {
  return themes[themeId] || defaultTheme;
}

export function getAllThemes(): Theme[] {
  return Object.values(themes);
}

export function applyTheme(theme: Theme): void {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  // Apply color CSS variables
  root.style.setProperty("--color-background", theme.colors.background);
  root.style.setProperty(
    "--color-background-secondary",
    theme.colors.backgroundSecondary
  );
  root.style.setProperty(
    "--color-background-tertiary",
    theme.colors.backgroundTertiary
  );

  root.style.setProperty("--color-foreground", theme.colors.foreground);
  root.style.setProperty(
    "--color-foreground-secondary",
    theme.colors.foregroundSecondary
  );
  root.style.setProperty(
    "--color-foreground-muted",
    theme.colors.foregroundMuted
  );

  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-primary-hover", theme.colors.primaryHover);
  root.style.setProperty("--color-secondary", theme.colors.secondary);
  root.style.setProperty(
    "--color-secondary-hover",
    theme.colors.secondaryHover
  );

  root.style.setProperty("--color-success", theme.colors.success);
  root.style.setProperty("--color-success-hover", theme.colors.successHover);
  root.style.setProperty("--color-error", theme.colors.error);
  root.style.setProperty("--color-error-hover", theme.colors.errorHover);
  root.style.setProperty("--color-warning", theme.colors.warning);
  root.style.setProperty("--color-info", theme.colors.info);

  root.style.setProperty("--color-border", theme.colors.border);
  root.style.setProperty("--color-border-hover", theme.colors.borderHover);

  root.style.setProperty(
    "--color-cart-background",
    theme.colors.cartBackground
  );
  root.style.setProperty("--color-cart-border", theme.colors.cartBorder);

  // Apply background pattern if exists
  if (theme.patterns?.backgroundPattern) {
    root.style.setProperty(
      "--background-pattern",
      theme.patterns.backgroundPattern
    );
  } else {
    root.style.setProperty("--background-pattern", "none");
  }

  // Store theme ID in data attribute for CSS selectors
  root.setAttribute("data-theme", theme.id);
}
