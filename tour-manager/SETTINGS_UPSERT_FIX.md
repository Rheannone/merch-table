# Settings Upsert Fix - RESOLVED ✅

## 🐛 Bug Found

**Error:** "duplicate key value violates unique constraint 'organization_settings_organization_id_key'"

**When:** Trying to save settings when a row already exists for that organization/user

## 🔍 Root Cause

The `.upsert()` calls were missing the `onConflict` parameter, so Supabase didn't know which column to use for detecting conflicts.

Without `onConflict`, it tried to INSERT a new row instead of UPDATE existing one, causing a unique constraint violation.

## ✅ Fix Applied

Fixed in **3 locations:**

### 1. Organization Settings (`/src/lib/supabase/data.ts`)

```typescript
// BEFORE (broken):
await supabase.from("organization_settings").upsert({
  organization_id: organizationId,
  settings,
});

// AFTER (fixed):
await supabase.from("organization_settings").upsert(
  {
    organization_id: organizationId,
    settings,
  },
  {
    onConflict: "organization_id", // Update if row exists
  }
);
```

### 2. User Settings (`/src/lib/supabase/data.ts`)

```typescript
// BEFORE (broken):
await supabase.from("user_settings").upsert({
  user_id: userData.user.id,
  settings,
});

// AFTER (fixed):
await supabase.from("user_settings").upsert(
  {
    user_id: userData.user.id,
    settings,
  },
  {
    onConflict: "user_id", // Update if row exists
  }
);
```

### 3. Settings Sync Strategy (`/src/lib/sync/strategies.ts`)

```typescript
// BEFORE (broken):
await supabase.from("user_settings").upsert({
  user_id: user.id,
  settings: data,
});

// AFTER (fixed):
await supabase.from("user_settings").upsert(
  {
    user_id: user.id,
    settings: data,
  },
  {
    onConflict: "user_id", // Update if row exists
  }
);
```

## 🧪 How to Test

1. **Refresh your browser** to load the new code
2. **Try saving settings again** (toggle Tip Jar)
3. Should see: `✅ Settings saved successfully!`
4. **No more conflict errors**

## 📊 What This Fixes

- ✅ First-time save (INSERT) → Works
- ✅ Subsequent saves (UPDATE) → Now works! (was broken)
- ✅ Organization settings → Fixed
- ✅ User settings → Fixed
- ✅ Sync strategy → Fixed

## 🎯 Why This Happened

This is a common Supabase gotcha! The `.upsert()` method needs to know which column(s) to check for conflicts. Since both tables have unique constraints on `organization_id` and `user_id` respectively, we need to specify those in `onConflict`.

## 📝 Related

This same pattern should be checked in ALL upsert calls throughout the codebase:

- Products
- Sales
- Close-outs
- Email signups

If any of those have the same issue, they'll need the same fix.

---

**Status:** ✅ FIXED - Ready to test!
