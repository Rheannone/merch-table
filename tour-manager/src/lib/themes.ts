import { Theme } from "@/types";

export const themes: Record<string, Theme> = {
  default: {
    id: "default",
    name: "Default Dark",
    description: "The original dark theme for your tour merch POS",
    emoji: "🌙",
    colors: {
      // Background colors - dark theme
      background: "#18181b", // zinc-900
      backgroundSecondary: "#27272a", // zinc-800
      backgroundTertiary: "#3f3f46", // zinc-700

      // Text colors
      foreground: "#fafafa", // zinc-50 / white
      foregroundSecondary: "#e4e4e7", // zinc-200
      foregroundMuted: "#a1a1aa", // zinc-400

      // Accent colors
      primary: "#dc2626", // red-600 (matches current branding)
      primaryHover: "#b91c1c", // red-700
      secondary: "#3b82f6", // blue-600
      secondaryHover: "#2563eb", // blue-700

      // Status colors
      success: "#16a34a", // green-600
      successHover: "#15803d", // green-700
      error: "#dc2626", // red-600
      errorHover: "#b91c1c", // red-700
      warning: "#f59e0b", // amber-500
      info: "#3b82f6", // blue-600

      // Border and dividers
      border: "#52525b", // zinc-600
      borderHover: "#71717a", // zinc-500

      // Cart and checkout
      cartBackground: "#27272a", // zinc-800
      cartBorder: "#3f3f46", // zinc-700
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
