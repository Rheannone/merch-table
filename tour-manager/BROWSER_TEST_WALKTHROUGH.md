# Browser Testing Instructions - Step by Step

## 🚀 Getting Started

1. **Your app is running at:** http://localhost:3000
2. **Open it in your browser**
3. **Sign in** if you're not already

---

## 🛠️ Open DevTools

**Mac:** `Cmd + Option + I`  
**Windows/Linux:** `F12`

You should see a panel at the bottom or side with tabs like:

- Elements
- Console ← **We'll use this the most**
- Network
- Application

---

## Test 1: Watch Settings Load (Online)

### Steps:

1. **Click the Console tab** in DevTools
2. **Clear the console** (click the 🚫 icon or press `Cmd+K`)
3. **Navigate to Settings** (click the gear icon ⚙️ in your app)

### What You Should See in Console:

```
📥 Loading settings from Supabase...
✅ Organization settings loaded
✅ User settings loaded
✅ Loaded settings from Supabase and cached to IndexedDB
```

### Screenshot Guide:

```
┌─────────────────────────────────────────┐
│  🔧 Settings Page                       │
├─────────────────────────────────────────┤
│                                         │
│  Payment Options  ▼                     │
│  Currency Display ▼                     │
│  Product Categories ▼                   │
│  Theme ▼                                │
│                                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  DevTools Console (bottom of screen)    │
├─────────────────────────────────────────┤
│ > 📥 Loading settings from Supabase...  │
│ > ✅ Organization settings loaded        │
│ > ✅ User settings loaded                │
│ > ✅ Loaded settings from Supabase...    │
└─────────────────────────────────────────┘
```

### ✅ Success Criteria:

- [ ] No red error messages in console
- [ ] All green checkmark (✅) messages appear
- [ ] Payment methods show up in UI
- [ ] Theme is applied correctly

---

## Test 2: Make a Change (Unsaved Changes Detection)

### Steps:

1. **Stay on Settings page**
2. **Find "Show Tip Jar"** checkbox
3. **Toggle it** (click to enable/disable)

### What You Should See:

A **sticky bar** appears at the TOP of the page:

```
┌─────────────────────────────────────────────────────┐
│  ⚠️ Unsaved changes    [Save Settings] button      │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────┐
│  🔧 Settings Page                       │
│                                         │
│  ✓ Show Tip Jar  ← You just toggled this
│                                         │
└─────────────────────────────────────────┘
```

### ✅ Success Criteria:

- [ ] Sticky bar appears immediately when you toggle
- [ ] Bar sticks to top even when you scroll down
- [ ] "Save Settings" button is visible and clickable

---

## Test 3: Save Settings (Online)

### Steps:

1. **With the change from Test 2**
2. **Click "Save Settings"** in the sticky bar
3. **Watch the console** for logs
4. **Watch for a toast notification** (green popup)

### What You Should See in Console:

```
✅ Organization settings saved
✅ User settings saved
✅ Cached settings to IndexedDB
```

### What You Should See in UI:

A **green toast notification** at the bottom:

```
┌─────────────────────────────────┐
│  ✅ Settings saved successfully! │
└─────────────────────────────────┘
```

### What Disappears:

The **sticky bar at top** should disappear!

### ✅ Success Criteria:

- [ ] Console shows all green checkmarks
- [ ] Toast notification appears
- [ ] Sticky bar disappears
- [ ] No red errors

---

## Test 4: Verify Settings Persist

### Steps:

1. **After saving in Test 3**
2. **Refresh the page** (`Cmd+R` or `F5`)
3. **Navigate back to Settings**
4. **Check if your change is still there**

### What You Should See:

Your change (e.g., Tip Jar toggle) should be in the **same state** as when you saved it.

### ✅ Success Criteria:

- [ ] Changes persist after reload
- [ ] No "unsaved changes" bar appears (settings match saved state)

---

## Test 5: Go Offline (Simulate Network Loss)

### Steps:

1. **In DevTools, click the "Network" tab**
2. **Find the "Throttling" dropdown** (says "No throttling" or "Online")
3. **Select "Offline"**

```
┌─────────────────────────────────────────┐
│  Network Tab                            │
├─────────────────────────────────────────┤
│  Throttling: [Offline ▼]  ← Click here  │
│                                         │
│  Name     Status    Type    Size        │
│  (empty - no network requests)          │
└─────────────────────────────────────────┘
```

### What You Should See:

- Network tab shows no requests going through
- App still works!

---

## Test 6: Load Settings Offline

### Steps:

1. **Still offline from Test 5**
2. **Refresh the page** (`Cmd+R`)
3. **Navigate to Settings**
4. **Watch the console**

### What You Should See in Console:

```
📴 Offline - loading settings from cache...
📱 Settings loaded from IndexedDB (offline)
```

### What You Should See in UI:

- Settings still appear!
- All your saved settings are there
- No errors about "failed to load"

### ✅ Success Criteria:

- [ ] Settings load from cache
- [ ] No network errors
- [ ] UI fully functional

---

## Test 7: Make Changes Offline

### Steps:

1. **Still offline**
2. **Make a change** (e.g., add a new category)
   - Scroll to "Product Categories"
   - Type "Test Category"
   - Click "Add"
3. **Click "Save Settings"**
4. **Watch the toast notification**

### What You Should See:

Toast notification should say:

```
┌─────────────────────────────────────────────────────┐
│  ✅ Settings cached locally. Will sync when online. │
└─────────────────────────────────────────────────────┘
```

### What You Should See in Console:

```
✅ Cached settings to IndexedDB
Settings cached locally. Will sync when online.
```

### ✅ Success Criteria:

- [ ] Toast shows "Will sync when online" message
- [ ] Change is visible in UI
- [ ] No errors in console

---

## Test 8: Go Back Online (Auto-Sync)

### Steps:

1. **With offline changes from Test 7**
2. **In DevTools Network tab**
3. **Change "Offline" back to "Online"** or "No throttling"
4. **Wait 3-5 seconds**
5. **Watch the console carefully**

### What You Should See in Console:

```
📶 Network connection restored - triggering sync...
✅ Offline settings synced to Supabase
```

### What Happens:

Your offline changes automatically sync to the server!

### ✅ Success Criteria:

- [ ] Auto-sync happens without clicking anything
- [ ] Console confirms sync success
- [ ] No errors

---

## Test 9: Verify Sync Worked

### Steps:

1. **After auto-sync from Test 8**
2. **Go back to Network tab**
3. **Select "Offline" again**
4. **Clear IndexedDB:**
   - DevTools → Application tab
   - IndexedDB → tourManager → settings
   - Right-click → Delete
5. **Go back online**
6. **Refresh page**
7. **Navigate to Settings**

### What You Should See:

Your changes (including the offline ones) are still there!
This proves they synced to Supabase.

### ✅ Success Criteria:

- [ ] Settings load from Supabase
- [ ] Offline changes are present
- [ ] Sync completed successfully

---

## Test 10: Check IndexedDB (Advanced)

### Steps:

1. **In DevTools, click "Application" tab**
2. **Expand "IndexedDB" in left sidebar**
3. **Expand "tourManager"**
4. **Click "settings"**

### What You Should See:

A table showing your cached settings:

```
┌──────────────────────────────────────────┐
│  Key (userId)       Value                │
├──────────────────────────────────────────┤
│  abc123...         { userId: "abc123",   │
│                      paymentSettings: [...│
│                      categories: [...],   │
│                      theme: "default",    │
│                      ... }                │
└──────────────────────────────────────────┘
```

### ✅ Success Criteria:

- [ ] Settings object is visible
- [ ] Contains your current settings
- [ ] Has a userId field

---

## Test 11: Test Permissions (If You Have Multiple Accounts)

### As ADMIN/OWNER:

1. **Sign in as admin**
2. **Change payment settings**
3. **Save** → Should succeed ✅

### As MEMBER (if you have a test account):

1. **Sign in as regular member**
2. **Try to change payment settings**
3. **Save** → Should show error:
   ```
   ❌ You need admin or owner role to change organization settings
   ```

### ✅ Success Criteria:

- [ ] Admins can change org settings
- [ ] Members get error for org settings
- [ ] Everyone can change theme

---

## Test 12: Theme Changes (User Settings)

### Steps:

1. **Scroll to "Theme" section**
2. **Select a different theme** (e.g., "Midnight")
3. **Click "Save Settings"**

### What You Should See:

- Theme changes immediately (colors change)
- Settings saved successfully
- Theme persists after reload

### Key Point:

Theme is a **USER setting** (not org setting), so:

- Everyone can change their own theme
- Other users don't see your theme choice

### ✅ Success Criteria:

- [ ] Theme applies immediately
- [ ] Theme persists after reload
- [ ] Saved to `user_settings` table (not `organization_settings`)

---

## 🐛 Troubleshooting

### If settings don't load:

1. Check console for errors (red text)
2. Check Network tab - are requests failing?
3. Check you're signed in
4. Check Supabase connection

### If settings don't save:

1. Check console for errors
2. Check if you're admin (for org settings)
3. Check Network tab for failed requests
4. Try clearing cache and reload

### If offline mode doesn't work:

1. Make sure you saved settings online first
2. Check IndexedDB has cached data
3. Check console for errors

### Common Error Messages:

- `Not authenticated` → Sign in again
- `You need admin or owner role` → Ask admin to give you permission
- `No organization selected` → Select an organization first

---

## 📊 What Success Looks Like

After all tests, you should have:

✅ Settings load online from Supabase  
✅ Settings load offline from cache  
✅ Unsaved changes bar appears when editing  
✅ Settings save online → Supabase + cache  
✅ Settings save offline → cache only  
✅ Auto-sync when network returns  
✅ Theme changes work  
✅ Permissions work correctly  
✅ No console errors  
✅ Toast notifications appear  
✅ Changes persist after reload

---

## 🎉 Next Steps

Once settings work perfectly, you can test:

1. **Products** - Similar flow
2. **Sales** - Queue-based sync
3. **Close-outs** - High priority sync
4. **Email Signups** - Multi-destination sync

Each follows a similar pattern!

---

## 📞 Need Help?

If something doesn't work as expected:

1. **Copy the error from console**
2. **Note which test step failed**
3. **Check the Network tab** for failed requests
4. **Check IndexedDB** for cached data
5. **Check Supabase dashboard** for saved data

The console logs are VERY verbose on purpose - use them to debug!

---

**Ready?** Open http://localhost:3000 and start testing! 🚀
