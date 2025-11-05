# Dynamic Theming System

## Overview

MERCH TABLE uses a fully dynamic theming system that allows for easy theme switching and future customization. All colors are defined through CSS variables and theme utility classes, not hardcoded hex values.

## How It Works

### 1. Theme Definitions (`src/lib/themes.ts`)

- Each theme is a JavaScript object with color values
- Current themes: `foldingtable` (default), `default`, `girlypop`
- Colors are mapped to semantic names (primary, secondary, success, etc.)

### 2. CSS Variables (`src/app/globals.css`)

- Theme colors are converted to CSS custom properties (`--color-primary`, etc.)
- Variables update automatically when theme changes
- Organized into categories:
  - **Background**: `--color-background`, `--color-background-secondary`, etc.
  - **Foreground/Text**: `--color-foreground`, `--color-foreground-secondary`, etc.
  - **Accent Colors**: `--color-primary`, `--color-secondary`, `--color-success`, etc.
  - **Borders**: `--color-border`, `--color-border-hover`

### 3. Utility Classes

Instead of using arbitrary hex values like `text-[#111111]`, we use semantic classes:

#### Background Colors

- `.bg-theme` - Main background
- `.bg-theme-secondary` - Surface/card backgrounds
- `.bg-theme-tertiary` - Hover states
- `.bg-primary` - Primary action color (Safety Orange in MERCH TABLE)
- `.bg-secondary` - Secondary action color (Indigo purple in MERCH TABLE)
- `.bg-success` - Success states (Bright green)
- `.bg-error` - Error states (Bright red)

#### Text Colors

- `.text-theme` - Main text color
- `.text-theme-secondary` - Secondary/muted text
- `.text-primary` - Primary accent text
- `.text-success`, `.text-error`, `.text-warning`, `.text-info` - Status text

#### Special Text Colors (for contrast)

- `.text-on-primary` - Text on orange buttons (currently black `#111111`)
- `.text-on-secondary` - Text on purple buttons (currently Linen `#f9f0e8`)
- `.text-on-success` - Text on green buttons (currently black `#111111`)
- `.text-on-dark` - Text on dark backgrounds (currently Linen)
- `.text-accent-light` - Accent text on dark backgrounds (light purple `#b565f2`)

#### Borders

- `.border-theme` - Standard borders
- `.border-primary` - Primary color borders
- `.border-secondary` - Secondary color borders
- `.border-accent-light` - Light accent borders

## MERCH TABLE Theme Colors

### Current Color Palette

- **Night** `#111111` - Deep black backgrounds
- **Pumpkin** `#ff6a00` - Safety Orange (primary brand color)
- **Indigo** `#42106b` - Dark purple (secondary actions)
- **Linen** `#f9f0e8` - Warm off-white (main text)
- **Cal Poly Green** `#00a832` - Bright green (success states)
- **Barn Red** `#ff4444` - Bright red (errors)
- **Light Purple** `#b565f2` - For labels on dark backgrounds

### Contrast Rules

- **Orange buttons** → Black text (`.text-on-primary`)
- **Purple buttons** → Linen text (`.text-on-secondary`)
- **Green buttons** → Black text (`.text-on-success`)
- **Dark backgrounds** → Linen text (`.text-on-dark` or `.text-theme`)
- **Labels on dark** → Light purple (`.text-accent-light`)

## Adding New Themes

### Step 1: Define Theme in `themes.ts`

```typescript
export const themes: Record<string, Theme> = {
  mytheme: {
    id: "mytheme",
    name: "My Custom Theme",
    description: "A cool new theme",
    emoji: "🎨",
    colors: {
      background: "#000000",
      primary: "#ff0000",
      foreground: "#ffffff",
      // ... define all required colors
    },
  },
};
```

### Step 2: Update CSS Variables (automatic)

The `ThemeProvider` component automatically applies theme colors to CSS variables when the theme changes. No manual CSS updates needed!

### Step 3: Test Contrast

Make sure your theme passes WCAG contrast guidelines:

- Light text on dark backgrounds: 4.5:1 minimum
- Dark text on light backgrounds: 4.5:1 minimum
- Test orange buttons, purple buttons, and labels

### Step 4: Adjust `.text-on-*` classes if needed

If your theme uses different button colors, you may need to adjust the contrast classes in `globals.css`:

```css
.text-on-primary {
  color: ; /* Choose contrasting color for your primary button */
}
```

## User Color Customization (Future)

To allow users to pick custom colors:

1. **Add Color Picker UI** in Settings component
2. **Store Custom Colors** in localStorage/Google Sheets
3. **Create Dynamic Theme** on the fly:

```typescript
const userTheme: Theme = {
  id: "custom",
  name: "My Custom Colors",
  colors: {
    primary: userSelectedPrimaryColor,
    secondary: userSelectedSecondaryColor,
    // ... etc
  },
};
```

4. **Apply to CSS Variables** via `ThemeProvider`
5. **Validate Contrast** automatically and warn user if insufficient

## Benefits of This System

✅ **Easy Theme Switching** - Change one variable, update entire app
✅ **Future-Proof** - Adding themes doesn't require component edits
✅ **User Customization Ready** - Foundation for user color pickers
✅ **Maintainable** - Semantic class names instead of scattered hex values
✅ **Accessible** - Centralized contrast control through `.text-on-*` classes
✅ **DRY Principle** - Define once, use everywhere

## Example Component Usage

### Before (Hardcoded)

```tsx
<button className="bg-[#ff6a00] text-[#111111] hover:bg-[#ff8533]">
  Click Me
</button>
```

### After (Dynamic)

```tsx
<button className="bg-primary text-on-primary hover:bg-primary">
  Click Me
</button>
```

The button now automatically adapts to any theme you select! 🎨
