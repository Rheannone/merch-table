# Settings System Testing Guide

## 🎯 Overview

This guide walks you through testing the complete settings system in your app, including:

- Loading settings (online & offline)
- Saving settings (online & offline)
- Syncing when network returns
- Organization vs User settings
- IndexedDB caching
- Unsaved changes detection

---

## 🔧 Setup

1. **Open the app**: http://localhost:3000
2. **Open DevTools**: Press `F12` or `Cmd+Option+I`
3. **Open Console tab**: This is where you'll see all the logging

---

## ✅ Test 1: Settings Load (Online)

### Steps:

1. Make sure you're signed in
2. Navigate to Settings page (gear icon ⚙️)
3. Watch the console

### Expected Console Output:

```
📥 Loading settings from Supabase...
✅ Organization settings loaded
✅ User settings loaded
✅ Loaded settings from Supabase and cached to IndexedDB
```

### What to Check:

- [ ] Payment methods appear correctly
- [ ] Categories are loaded
- [ ] Theme is applied
- [ ] Currency is set
- [ ] No errors in console

### What Happens Behind the Scenes:

1. `loadOrganizationSettings(orgId)` loads shared settings from Supabase
2. `loadSettingsFromSupabase()` loads personal settings from Supabase
3. Both are automatically cached to IndexedDB
4. UI state is updated

---

## ✅ Test 2: Settings Load (Offline)

### Steps:

1. Open DevTools → Network tab
2. Check "Offline" checkbox (top of Network tab)
3. Refresh the page (`Cmd+R`)
4. Navigate to Settings page

### Expected Console Output:

```
📴 Offline - loading settings from cache...
📱 Settings loaded from IndexedDB (offline)
```

### What to Check:

- [ ] Settings still load from cache
- [ ] No "Failed to load" errors
- [ ] UI shows cached values

### What Happens Behind the Scenes:

1. App detects `navigator.onLine === false`
2. Skips Supabase calls
3. Loads directly from IndexedDB using `getSettings()`

---

## ✅ Test 3: Unsaved Changes Detection

### Steps:

1. Go to Settings page (online)
2. Make ANY change (toggle a payment method, change theme, etc.)
3. Watch for the sticky bar at the top

### What to Check:

- [ ] Orange/yellow sticky bar appears at top
- [ ] Shows "Unsaved changes" message
- [ ] "Save Settings" button is visible
- [ ] Bar sticks to top when scrolling

### Behind the Scenes:

- `useEffect` hook watches all settings state
- Compares current values to `originalPaymentSettings`, `originalCategories`, etc.
- Sets `hasUnsavedChanges` to true when differences detected

---

## ✅ Test 4: Settings Save (Online)

### Steps:

1. Make a change (e.g., toggle "Show Tip Jar")
2. Click "Save Settings" in the sticky bar
3. Watch the console

### Expected Console Output:

```
✅ Organization settings saved
✅ User settings saved
✅ Cached settings to IndexedDB
Settings saved successfully!
```

### What to Check:

- [ ] Toast notification: "Settings saved successfully!"
- [ ] Sticky bar disappears
- [ ] Changes persist after page refresh

### Behind the Scenes:

1. Splits settings into ORG (shared) and USER (personal)
2. Calls `saveOrganizationSettings()` → Supabase `organization_settings` table
3. Calls `saveSettingsToSupabase()` → Supabase `user_settings` table
4. Caches both to IndexedDB via `saveSettingsToIndexedDB()`
5. Updates currency in localStorage for helper functions

---

## ✅ Test 5: Settings Save (Offline)

### Steps:

1. Turn on "Offline" mode in DevTools Network tab
2. Make a change (e.g., add a new category)
3. Click "Save Settings"

### Expected Console Output:

```
✅ Cached settings to IndexedDB
Settings cached locally. Will sync when online.
```

### What to Check:

- [ ] Toast notification: "Settings cached locally. Will sync when online."
- [ ] Settings saved to IndexedDB (not Supabase)
- [ ] Changes visible immediately in UI
- [ ] No errors about failed network requests

### Behind the Scenes:

1. Supabase calls fail gracefully (offline)
2. Settings saved only to IndexedDB
3. User sees appropriate feedback

---

## ✅ Test 6: Auto-Sync When Network Returns

### Steps:

1. With offline changes from Test 5
2. Turn OFF "Offline" mode in DevTools
3. Wait a few seconds
4. Watch the console

### Expected Console Output:

```
✅ Offline settings synced to Supabase
```

### What to Check:

- [ ] Settings automatically sync to Supabase
- [ ] No user interaction needed
- [ ] Logs confirm sync success

### Behind the Scenes:

1. `window.addEventListener('online', handleOnline)` triggers
2. Loads settings from IndexedDB
3. Calls `saveSettingsToSupabase()` to sync
4. Located in `/src/app/(app)/app/page.tsx` around line 251

---

## ✅ Test 7: Organization vs User Settings (Permissions)

### Test with ADMIN role:

1. Make sure you're an admin/owner of your organization
2. Change a payment method → Click Save
3. Should succeed ✅

### Test with MEMBER role (if you have a test member account):

1. Sign in as a regular member
2. Try to change a payment method → Click Save
3. Should show error: "You need admin or owner role to change organization settings"

### What to Check:

- [ ] Admins can change org settings
- [ ] Members cannot change org settings
- [ ] Everyone can change theme (user setting)

### Behind the Scenes:

```typescript
if (hasRole("admin")) {
  await saveOrganizationSettings(currentOrganization.id, orgSettings);
} else {
  // Show error
}
```

---

## ✅ Test 8: Migration (IndexedDB → Supabase)

### Steps:

1. Open DevTools → Application tab → IndexedDB → tourManager
2. Check if `settings` store has data
3. Clear Supabase settings (if you want to test migration):
   - Go to Supabase dashboard
   - Delete your row from `user_settings` table
4. Reload the page
5. Watch console

### Expected Console Output:

```
🔄 No settings row in Supabase, checking IndexedDB for migration...
📦 Found settings in IndexedDB, migrating to Supabase...
✅ Successfully migrated IndexedDB settings to Supabase
```

### What to Check:

- [ ] Settings auto-migrate from IndexedDB to Supabase
- [ ] No data loss
- [ ] Migration logged clearly

---

## ✅ Test 9: IndexedDB Cache After Save

### Steps:

1. Save settings (online)
2. Open DevTools → Application → IndexedDB → tourManager → settings
3. Inspect the data

### What to Check:

- [ ] Settings object contains all your settings
- [ ] Has `userId` field
- [ ] Contains both org and user settings combined
- [ ] Updated timestamp

### Verify Code:

Check `/src/components/Settings.tsx` around line 593:

```typescript
await saveSettingsToIndexedDB(user.id, {
  ...orgSettings,
  ...userSettings,
});
console.log("✅ Cached settings to IndexedDB");
```

---

## ✅ Test 10: Currency Settings Special Case

### Steps:

1. Change currency to CAD
2. Change exchange rate to 1.35
3. Save settings
4. Open DevTools → Application → Local Storage
5. Check for `currencySettings` key

### What to Check:

- [ ] Currency saved to Supabase (org settings)
- [ ] Currency cached to IndexedDB
- [ ] Currency ALSO saved to localStorage for helper functions
- [ ] Helper functions (`formatPrice`) work correctly

### Why localStorage?

Helper functions like `formatPrice()` need quick access without async calls.

---

## ✅ Test 11: QR Code Upload

### Steps:

1. Enable Venmo payment method
2. Upload a QR code image
3. Watch console for compression logs
4. Save settings
5. Reload page

### Expected Console Output:

```
✅ QR code compressed for venmo: 250 KB → 45 KB (12345 chars)
Saving venmo QR code: Base64 (12345 chars)
✅ Settings saved to Supabase
```

### What to Check:

- [ ] Image compressed automatically
- [ ] Stored as base64 in settings
- [ ] QR code persists after reload
- [ ] Shows preview in settings UI

---

## ✅ Test 12: Theme Changes

### Steps:

1. Change theme (e.g., from Default to Midnight)
2. Save settings
3. Reload page

### What to Check:

- [ ] Theme applies immediately
- [ ] Theme persists after reload
- [ ] Theme saved to `user_settings` (not `organization_settings`)
- [ ] Other users in org don't see your theme change

---

## 🐛 Known Issues to Watch For

### From SYNC_BUGS_ANALYSIS.md:

1. **Settings Not Cached on Save** (BUG #11)

   - Check if IndexedDB is updated after save
   - Should call `saveSettings()` after Supabase save

2. **Dual Sync?**
   - Settings should NOT go through sync queue
   - Direct save to Supabase via `saveSettingsToSupabase()`
   - Check if `syncService.syncSettings()` is being called

---

## 📊 Debugging Tips

### Check IndexedDB:

1. DevTools → Application → IndexedDB → tourManager
2. Stores to check:
   - `settings` - User/org settings cache
   - `products` - Product cache
   - `sales` - Sales cache

### Check Supabase:

1. Go to Supabase dashboard
2. Tables to check:
   - `user_settings` - Personal settings (theme)
   - `organization_settings` - Shared settings (payments, categories)

### Check Network:

1. DevTools → Network tab
2. Filter by "supabase"
3. Look for:
   - POST to `user_settings`
   - POST to `organization_settings`
   - Should see 200 status codes

### Check Sync Queue:

1. Console → Type: `syncService.getStats()`
2. Should show queue status
3. Settings should NOT be in queue (direct sync)

---

## 🎯 Success Criteria

Your settings system is working correctly if:

- ✅ Settings load online from Supabase
- ✅ Settings load offline from IndexedDB
- ✅ Settings save online to Supabase + IndexedDB
- ✅ Settings save offline to IndexedDB only
- ✅ Auto-sync when network returns
- ✅ Unsaved changes detection works
- ✅ Org settings require admin role
- ✅ User settings always allowed
- ✅ Migration from IndexedDB to Supabase works
- ✅ Currency cached to localStorage
- ✅ QR codes compress and persist
- ✅ No console errors

---

## 🚀 Next Steps

After testing settings, you can test:

1. **Products** - Similar flow (load, save, sync)
2. **Sales** - Queue-based sync with retry
3. **Close-outs** - High-priority sync
4. **Email Signups** - Multi-destination sync

Each follows the same pattern but with different strategies!

---

## 📞 Need Help?

If you see unexpected behavior:

1. Check the console logs (very verbose)
2. Check IndexedDB state
3. Check Supabase dashboard
4. Check Network tab for failed requests
5. Compare to expected behavior in this guide
