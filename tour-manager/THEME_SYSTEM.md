# Theme System Implementation Guide

## ✅ Completed Implementation

I've successfully added a comprehensive theme system to your Tour Manager POS app! Here's what's been implemented:

### 🎨 Two Themes Available

1. **Default Dark Theme** 🌙

   - The original dark zinc/slate color scheme you're currently using
   - Perfect for tours and low-light environments
   - All existing colors captured and preserved

2. **Girlypop Theme** 💗
   - Cute, pink, and floral light theme
   - Soft pink backgrounds (#fff0f6, #fce7f3, #fbcfe8)
   - Pink accent colors (#ec4899, #f472b6)
   - Light, cheerful vibe with subtle flower patterns
   - Perfect for a fun, feminine aesthetic

### 📂 Files Created/Modified

#### New Files:

- `src/lib/themes.ts` - Theme configuration and utilities
- `src/components/ThemeProvider.tsx` - React context for theme management
- `THEME_SYSTEM.md` - This documentation file

#### Modified Files:

- `src/types/index.ts` - Added Theme and POSSettings types
- `src/app/globals.css` - Added CSS custom properties for theming
- `src/app/layout.tsx` - Integrated ThemeProvider
- `src/components/Settings.tsx` - Added Theme selection UI
- `src/app/api/sheets/settings/save/route.ts` - Saves theme to Google Sheets (Column H)
- `src/app/api/sheets/settings/load/route.ts` - Loads theme from Google Sheets

### 🎯 How It Works

1. **Theme Selection**

   - Users can select a theme in Settings → Theme section
   - Changes apply immediately (live preview)
   - Theme must be saved via "Save Settings" button
   - Theme choice is stored in Google Sheets (POS Settings sheet, Column H)

2. **Theme Persistence**

   - When user logs in, the app loads their theme from Google Sheets
   - Theme is applied globally via CSS custom properties
   - Theme persists across sessions and devices (via Google Sheets)

3. **CSS Variable System**
   The theme system uses CSS custom properties that can be referenced anywhere:

   ```css
   /* Background colors */
   --color-background
   --color-background-secondary
   --color-background-tertiary

   /* Text colors */
   --color-foreground
   --color-foreground-secondary
   --color-foreground-muted

   /* Accent colors */
   --color-primary
   --color-primary-hover
   --color-secondary
   --color-secondary-hover

   /* Status colors */
   --color-success / --color-success-hover
   --color-error / --color-error-hover
   --color-warning
   --color-info

   /* Borders */
   --color-border
   --color-border-hover

   /* Cart */
   --color-cart-background
   --color-cart-border
   ```

4. **Theme Data Attribute**
   The `<html>` element gets a `data-theme` attribute for theme-specific CSS:
   ```css
   [data-theme="girlypop"] button:hover {
     transform: scale(1.02);
   }
   ```

### 🚀 How to Use

1. **Testing the Themes**

   ```bash
   # Run your app
   npm run dev
   ```

2. **Select a Theme**

   - Navigate to Settings (⚙️ Settings tab)
   - Scroll to the 🎨 Theme section
   - Click on either "Default Dark" or "Girlypop"
   - See the preview immediately!
   - Click "💾 Save Settings" to make it permanent

3. **Add More Themes**
   Edit `src/lib/themes.ts` and add a new theme object:
   ```typescript
   ocean: {
     id: "ocean",
     name: "Ocean Blue",
     description: "Cool ocean vibes 🌊",
     emoji: "🌊",
     colors: {
       background: "#0c1e2e",
       backgroundSecondary: "#1a3a52",
       // ... etc
     }
   }
   ```

### 📝 Migration Notes for Components

The theme system is **fully functional** for the Settings page and will work globally. However, many components still use hardcoded Tailwind classes like `bg-zinc-900`, `text-zinc-400`, etc.

**Current State:**

- ✅ Theme infrastructure: Complete
- ✅ Theme selection UI: Complete
- ✅ Theme persistence (Google Sheets): Complete
- ✅ CSS variables: Complete
- ⚠️ Component migration: Partial (Settings page fully themed)

**To make other components theme-aware**, you can:

#### Option 1: Use CSS Variables in Tailwind

Replace hardcoded colors with CSS variable references:

**Before:**

```tsx
<div className="bg-zinc-900 text-white border-zinc-700">
```

**After:**

```tsx
<div style={{
  backgroundColor: 'var(--color-background)',
  color: 'var(--color-foreground)',
  borderColor: 'var(--color-border)'
}}>
```

#### Option 2: Use Theme-Aware Utility Classes

Use the utility classes defined in `globals.css`:

```tsx
<div className="bg-theme text-theme border-theme">
```

#### Option 3: Gradual Migration

Keep existing components as-is and only update new features or when you touch a component for other reasons.

### 🎨 Customizing Themes

Each theme has these customizable properties:

```typescript
{
  id: string;              // Unique identifier
  name: string;            // Display name
  description: string;     // Description text
  emoji: string;           // Emoji icon
  colors: {
    // All color properties
  },
  patterns?: {
    backgroundPattern?: string;  // CSS background pattern
  }
}
```

### 📊 Google Sheets Structure

The POS Settings sheet now has these columns:

- A-E: Payment settings
- F: (Empty spacer)
- G: Categories
- H: **Theme** (new!) - stores the selected theme ID

### 🐛 Troubleshooting

**Theme not persisting?**

- Make sure you clicked "Save Settings" after selecting a theme
- Check that the Google Sheets API is working
- Verify the POS Settings sheet exists in your spreadsheet

**Colors not changing?**

- Some components use hardcoded Tailwind classes and need migration
- Check browser console for errors
- Try hard refresh (Cmd+Shift+R on Mac)

**Want to reset to default?**

- Go to Settings → Theme
- Select "Default Dark"
- Click "Save Settings"

### 🎉 Next Steps

**To add your own theme:**

1. Open `src/lib/themes.ts`
2. Add a new theme object to the `themes` record
3. Define all required color properties
4. Optional: Add custom background patterns
5. Save and test!

**Example - Adding a "Sunset" theme:**

```typescript
sunset: {
  id: "sunset",
  name: "Sunset Vibes",
  description: "Warm oranges and purples 🌅",
  emoji: "🌅",
  colors: {
    background: "#1a0f1f",
    backgroundSecondary: "#2d1b3d",
    backgroundTertiary: "#4a2d5c",
    foreground: "#ffeaa7",
    foregroundSecondary: "#fdcb6e",
    foregroundMuted: "#e17055",
    primary: "#fd79a8",
    primaryHover: "#e84393",
    secondary: "#a29bfe",
    secondaryHover: "#6c5ce7",
    success: "#55efc4",
    successHover: "#00b894",
    error: "#ff7675",
    errorHover: "#d63031",
    warning: "#ffeaa7",
    info: "#74b9ff",
    border: "#6c5ce7",
    borderHover: "#a29bfe",
    cartBackground: "#2d1b3d",
    cartBorder: "#4a2d5c",
  },
  patterns: {
    backgroundPattern: `
      radial-gradient(circle at 80% 20%, rgba(253, 121, 168, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 20% 80%, rgba(162, 155, 254, 0.1) 0%, transparent 50%)
    `.trim(),
  },
}
```

Enjoy your new themed POS system! 🎨✨
