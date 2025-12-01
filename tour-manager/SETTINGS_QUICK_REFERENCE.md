# Settings System - Quick Reference Card

## 🎯 Quick Overview

**App is running at:** http://localhost:3000

**Open DevTools:** `Cmd+Option+I` (Mac) or `F12` (Windows/Linux)

---

## 📊 Settings Architecture

### Two Types of Settings

| Type                      | Scope                 | Stored In                     | Who Can Edit     |
| ------------------------- | --------------------- | ----------------------------- | ---------------- |
| **Organization Settings** | Shared by all members | `organization_settings` table | Admin/Owner only |
| **User Settings**         | Personal preferences  | `user_settings` table         | Everyone         |

### Organization Settings Include:

- ✅ Payment methods & QR codes
- ✅ Product categories
- ✅ Currency & exchange rate
- ✅ Email signup settings
- ✅ Close-out settings
- ✅ Show Tip Jar toggle

### User Settings Include:

- ✅ Theme preference

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    ONLINE LOAD FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. loadOrganizationSettings()  →  Supabase                │
│     ↓                                                       │
│  2. loadSettingsFromSupabase()  →  Supabase                │
│     ↓                                                       │
│  3. Auto-cache to IndexedDB  (via saveSettings())          │
│     ↓                                                       │
│  4. Apply to UI state                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   OFFLINE LOAD FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. getSettings(userId)  →  IndexedDB                      │
│     ↓                                                       │
│  2. Apply to UI state                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    ONLINE SAVE FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. saveOrganizationSettings()  →  Supabase (admin only)   │
│     ↓                                                       │
│  2. saveSettingsToSupabase()  →  Supabase (always OK)     │
│     ↓                                                       │
│  3. saveSettingsToIndexedDB()  →  IndexedDB (cache)       │
│     ↓                                                       │
│  4. saveCurrencySettings()  →  localStorage (helpers)     │
│     ↓                                                       │
│  5. Toast: "Settings saved successfully!"                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   OFFLINE SAVE FLOW                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. saveSettingsToIndexedDB()  →  IndexedDB only          │
│     ↓                                                       │
│  2. Toast: "Settings cached. Will sync when online."      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  AUTO-SYNC ON NETWORK RETURN                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Network comes back online                              │
│     ↓                                                       │
│  2. handleOnline() event triggers                          │
│     ↓                                                       │
│  3. getSettings(userId)  →  IndexedDB                      │
│     ↓                                                       │
│  4. saveSettingsToSupabase()  →  Supabase                 │
│     ↓                                                       │
│  5. Log: "✅ Offline settings synced to Supabase"         │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Quick Test Checklist

### Test 1: Online Load

1. Navigate to Settings
2. Console should show:
   ```
   📥 Loading settings from Supabase...
   ✅ Organization settings loaded
   ✅ User settings loaded
   ✅ Loaded settings from Supabase and cached to IndexedDB
   ```

### Test 2: Offline Load

1. DevTools → Network → Check "Offline"
2. Reload page → Go to Settings
3. Console should show:
   ```
   📴 Offline - loading settings from cache...
   📱 Settings loaded from IndexedDB (offline)
   ```

### Test 3: Unsaved Changes

1. Make any change (toggle, text, etc.)
2. Orange sticky bar should appear at top
3. Shows "Unsaved changes" + "Save Settings" button

### Test 4: Online Save

1. Make a change → Click "Save Settings"
2. Console should show:
   ```
   ✅ Organization settings saved
   ✅ User settings saved
   ✅ Cached settings to IndexedDB
   ```
3. Toast: "Settings saved successfully!"

### Test 5: Offline Save

1. DevTools → Network → "Offline"
2. Make change → Click "Save Settings"
3. Toast: "Settings cached locally. Will sync when online."

### Test 6: Auto-Sync

1. With offline changes, turn off "Offline"
2. Wait a few seconds
3. Console should show:
   ```
   📶 Network connection restored - triggering sync...
   ✅ Offline settings synced to Supabase
   ```

---

## 🔍 Key Files to Know

| File                           | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `/src/components/Settings.tsx` | Main UI component, save logic                 |
| `/src/lib/supabase/data.ts`    | Load/save functions for Supabase              |
| `/src/lib/db.ts`               | IndexedDB cache functions                     |
| `/src/lib/sync/strategies.ts`  | Settings sync strategy (unused - direct sync) |
| `/src/app/(app)/app/page.tsx`  | Auto-sync on network return                   |

---

## 🐛 Debug Console Commands

```javascript
// Check sync queue status (settings should NOT be here)
syncService.getStats();

// Check IndexedDB cache
// DevTools → Application → IndexedDB → tourManager → settings

// Check Supabase data
// Supabase Dashboard → Tables:
//   - user_settings (personal theme)
//   - organization_settings (shared settings)

// Check localStorage currency cache
localStorage.getItem("currencySettings");
```

---

## ⚡ Important Notes

1. **Settings use DIRECT sync** (not queue-based)

   - Immediate save to Supabase
   - Not queued in `syncService`
   - Different from sales/products/close-outs

2. **Three storage locations:**

   - **Supabase** - Source of truth
   - **IndexedDB** - Offline cache
   - **localStorage** - Currency helper cache only

3. **Permissions matter:**

   - Org settings = Admin/Owner only
   - User settings = Everyone

4. **Migration auto-happens:**
   - If Supabase empty but IndexedDB has data
   - Automatically migrates on load
   - One-time per user

---

## 🎨 What Each Setting Does

### Payment Options

- Enable/disable payment methods
- Custom display names
- Transaction fees (for credit card)
- QR codes (for Venmo, etc.)
- Show/hide tip jar

### Currency Display

- Choose display currency (USD, CAD, EUR, etc.)
- Set exchange rate
- Affects display only (stored as USD)
- Cached to localStorage for helpers

### Product Categories

- Define category names
- Reorder categories (affects POS display)
- Add/remove categories

### Theme

- Personal preference (user-specific)
- Applies immediately
- Doesn't affect other org members

---

## 📈 Console Log Guide

| Log Message                                       | Meaning                 |
| ------------------------------------------------- | ----------------------- |
| `📥 Loading settings from Supabase...`            | Starting online load    |
| `📴 Offline - loading settings from cache...`     | Starting offline load   |
| `✅ Organization settings loaded`                 | Org settings retrieved  |
| `✅ User settings loaded`                         | User settings retrieved |
| `✅ Cached settings to IndexedDB`                 | IndexedDB cache updated |
| `Settings saved successfully!`                    | Online save complete    |
| `Settings cached locally. Will sync when online.` | Offline save complete   |
| `📶 Network connection restored`                  | Network came back       |
| `✅ Offline settings synced to Supabase`          | Auto-sync complete      |

---

## 🚦 Success Criteria

✅ All settings load online  
✅ All settings load offline from cache  
✅ Changes detected (sticky bar appears)  
✅ Online save → Supabase + IndexedDB  
✅ Offline save → IndexedDB only  
✅ Auto-sync when network returns  
✅ No console errors  
✅ Toast notifications show correctly  
✅ Settings persist after reload  
✅ Permissions work (admin vs member)

---

**Ready to test?** Open http://localhost:3000 and follow the test guide! 🚀
