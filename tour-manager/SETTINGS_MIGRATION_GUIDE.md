# User Settings Migration Strategy

## 🎯 How It Works

### **For Existing Users:**

```
User logs in
  ↓
useSupabaseSettings hook checks: "Do they have settings in Supabase?"
  ↓
NO → Load from localStorage/Sheets → Migrate to Supabase → Cache locally
YES → Load from Supabase → Cache locally for offline
```

### **For New Users:**

```
User signs up
  ↓
useSupabaseSettings creates default settings in Supabase
  ↓
User configures their POS → Saves to Supabase → Cached locally
```

---

## 📁 What We Created

### **1. Migration File: `004_user_settings.sql`**

Creates the `user_settings` table with:

- Payment methods (JSONB array)
- Categories (TEXT array)
- Tip jar toggle
- Currency settings
- Theme preference
- Email signup config
- Migration tracking

**Run this in Supabase SQL Editor!**

### **2. Settings Library: `src/lib/supabase/settings.ts`**

Functions:

- `getUserSettings(userId)` - Load from Supabase (with cache)
- `saveUserSettings(settings)` - Save to Supabase
- `migrateSettingsToSupabase(userId, legacySettings)` - One-time migration
- `updateSetting(userId, field, value)` - Update single field

### **3. React Hook: `src/hooks/useSupabaseSettings.ts`**

Auto-handles migration on first login:

```tsx
const { settings, loading, updateSettings } = useSupabaseSettings();

// In your component:
if (loading) return <Loading />;

// Use settings
<TipJarToggle enabled={settings?.show_tip_jar} />;

// Update settings
await updateSettings({ show_tip_jar: false });
```

---

## 🚀 Next Steps

### **Step 1: Run the Migration**

```bash
# In Supabase Dashboard → SQL Editor
# Paste contents of supabase/migrations/004_user_settings.sql
# Click "Run"
```

### **Step 2: Update Settings.tsx**

We need to modify your Settings component to:

1. Use `useSupabaseSettings()` hook
2. Load initial values from Supabase (not Sheets)
3. Save changes to Supabase (not Sheets)
4. Keep localStorage cache for offline

### **Step 3: Test Migration**

1. Sign in as existing user (with Sheet configured)
2. Component detects no Supabase settings
3. Auto-migrates from Sheets → Supabase
4. Future logins load from Supabase instantly

---

## 🔄 Data Flow

### **Before (Current):**

```
Settings.tsx loads
  ↓
Fetch from Google Sheets API (slow, requires network)
  ↓
Display settings
  ↓
User changes something
  ↓
Save to Google Sheets (slow, requires network)
```

### **After (With Supabase):**

```
Settings.tsx loads
  ↓
useSupabaseSettings hook loads from cache (instant!)
  ↓
Background: Sync with Supabase (fast Postgres query)
  ↓
Display settings
  ↓
User changes something
  ↓
Save to Supabase (fast)
  ↓
Update localStorage cache
```

---

## 💡 Key Benefits

**For Existing Users:**

- ✅ Nothing breaks - automatic migration
- ✅ Settings load instantly (cache)
- ✅ Offline still works (IndexedDB)
- ✅ Sheet still exists (can export later)

**For New Users:**

- ✅ No Sheet setup required
- ✅ Settings available immediately
- ✅ Cross-device sync (same settings on iPad + phone)
- ✅ Faster, more reliable

---

## 🧪 Testing the Migration

### **Scenario 1: Existing User with Sheet**

```typescript
localStorage.getItem("salesSheetId") // "1AbC123..."
localStorage.getItem("selectedTheme") // "sunset"

// First login after deploying:
→ Hook detects salesSheetId exists
→ Calls migrateSettingsToSupabase()
→ Copies theme, categories, etc. to Supabase
→ Sets migrated_from_sheets = true
→ Future logins load from Supabase
```

### **Scenario 2: New User (No Sheet)**

```typescript
localStorage.getItem("salesSheetId") // null
localStorage.getItem("selectedTheme") // null

// First login:
→ Hook creates default settings in Supabase
→ User configures POS
→ Saves directly to Supabase
```

### **Scenario 3: Offline User**

```typescript
// User configured settings while online
→ Settings cached in localStorage

// User goes offline
→ Settings.tsx loads from cache
→ User can still access settings
→ Changes queue until online
```

---

## 🎬 Ready to Implement?

Want me to:

1. **Run the migration in Supabase** (guide you through it)
2. **Update Settings.tsx** to use the new hook
3. **Test the migration** with your account

Which would you like to tackle first?
