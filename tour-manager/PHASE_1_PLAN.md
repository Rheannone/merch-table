# Phase 1: Settings Migration Plan

## 🎯 Goal

Move POS settings to Supabase without breaking existing flows or changing UX.

## 📋 Tasks

### Task 1: Define Default Settings Constant ✅

**File:** `src/lib/defaultSettings.ts` (NEW)
**What:** Extract defaults from `/api/sheets/settings/load/route.ts` into shared constant
**Why:** Both Sheet API and Supabase need same defaults

```typescript
export const DEFAULT_PAYMENT_SETTINGS = [
  { paymentType: "cash", enabled: true, displayName: "Cash" },
  { paymentType: "venmo", enabled: true, displayName: "Venmo" },
  // ... etc
];

export const DEFAULT_CATEGORIES = ["Apparel", "Merch", "Music"];
```

### Task 2: Fix useSupabaseSettings Hook 🔧

**File:** `src/hooks/useSupabaseSettings.ts`
**Changes:**

1. Check Supabase FIRST (not localStorage)
2. Only check localStorage if Supabase returns null
3. Multi-device fix: Same user ID = same settings everywhere

**Flow:**

```
User logs in
  ↓
Query Supabase: SELECT * FROM user_settings WHERE user_id = ?
  ↓
Found? → Load from Supabase ✅
  ↓
Not found? → Check localStorage for sheet ID
  ↓
Has sheet? → Migrate from Sheet → Save to Supabase
  ↓
No sheet? → Create defaults in Supabase
```

### Task 3: Create Settings in initializeApp() 🆕

**File:** `src/app/(app)/app/page.tsx`
**What:** When new user detected, create Supabase settings row
**Where:** After Sheet initialization, before loading products

```typescript
// In initializeApp() after creating/finding sheet:
if (!hasExistingSupabaseSettings) {
  await createDefaultUserSettings(userId);
}
```

### Task 4: Run Migration in Supabase ⚡

**What:** Execute `004_user_settings.sql`
**Where:** Supabase Dashboard → SQL Editor
**Time:** 30 seconds

### Task 5: Update Settings.tsx 🔧

**File:** `src/components/Settings.tsx`
**Changes:**

1. Add `useSupabaseSettings()` hook
2. Load initial values from Supabase (not Sheet)
3. Save changes to Supabase
4. Keep Sheet saving for backward compatibility (optional flag)
5. Update localStorage cache after Supabase save

**Before:**

```typescript
const loadSettings = async () => {
  const response = await fetch("/api/sheets/settings/load", {
    body: JSON.stringify({ spreadsheetId }),
  });
  // ...
};
```

**After:**

```typescript
const { settings, loading, updateSettings } = useSupabaseSettings();

// On mount: settings auto-loaded from Supabase
// On change: updateSettings({ payment_methods: [...] })
```

### Task 6: Test Everything 🧪

**Scenarios:**

1. Existing user on same device → Settings migrate from Sheet
2. Existing user on new device → Settings load from Supabase
3. Brand new user → Default settings created
4. Offline mode → Settings load from cache
5. Settings change → Saves to Supabase + updates cache

---

## 🚫 What We're NOT Changing (Phase 2)

- Products/sales still use IndexedDB + Sheets
- App initialization flow unchanged
- No "Start a Tour" button yet
- No multi-user invites yet
- No empty states yet

---

## ⏱️ Time Estimate

- Task 1: 15 min
- Task 2: 30 min
- Task 3: 30 min
- Task 4: 5 min
- Task 5: 2-3 hours
- Task 6: 30 min

**Total: 4-5 hours**

---

## 🎁 Benefits

✅ Settings load instantly (no Sheet API call)
✅ Multi-device support (same settings everywhere)
✅ Offline support (IndexedDB cache)
✅ No breaking changes for existing users
✅ Foundation for Phase 2 features

---

## 🔮 Phase 2 Preview (Future Work)

We'll create a separate roadmap doc for:

- Tour/show concept and data model
- Empty state UX ("Start a Tour" button)
- Multi-user team invites
- Products/sales in Supabase
- Optional Sheets (toggle on/off)

Want to discuss Phase 2 planning, or should we start Phase 1 now?
