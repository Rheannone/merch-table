# 🎨 Theme System - Quick Start

## What Was Added

Your Tour Manager POS app now has a **complete theme system** with two themes:

### 🌙 Default Dark Theme

The original dark theme (zinc/slate colors) - perfect for tours and low-light environments.

### 💗 Girlypop Theme

A cute, pink, floral light theme with:

- Soft pink backgrounds
- Pink accent colors
- Light, cheerful aesthetic
- Subtle flower patterns

## How to Use

1. **Run your app:**

   ```bash
   npm run dev
   ```

2. **Select a theme:**

   - Go to ⚙️ **Settings** tab
   - Scroll to the 🎨 **Theme** section
   - Click on a theme card to preview it
   - Click **💾 Save Settings** to make it permanent

3. **Theme persists!**
   - Your selection is saved to Google Sheets
   - The theme will load automatically when you log in
   - Works across all your devices

## Adding New Themes

Edit `src/lib/themes.ts` and add your theme:

```typescript
myTheme: {
  id: "myTheme",
  name: "My Cool Theme",
  description: "Description here",
  emoji: "🌟",
  colors: {
    background: "#hexcolor",
    // ... (see existing themes for all required properties)
  }
}
```

## Files Modified

- ✅ Added `src/lib/themes.ts` - Theme definitions
- ✅ Added `src/components/ThemeProvider.tsx` - Theme context
- ✅ Updated `src/app/globals.css` - CSS variables
- ✅ Updated `src/components/Settings.tsx` - Theme UI
- ✅ Updated `src/app/layout.tsx` - Integrated ThemeProvider
- ✅ Updated API routes - Save/load theme from Google Sheets
- ✅ Updated `src/types/index.ts` - Theme types

## Google Sheets

Themes are stored in the **POS Settings** sheet:

- Column H stores the selected theme ID
- Automatically syncs when you save settings

## Documentation

See **THEME_SYSTEM.md** for complete documentation including:

- Detailed implementation guide
- How to customize themes
- Component migration strategies
- Troubleshooting tips

---

**Enjoy your themed POS system! 🎉**
