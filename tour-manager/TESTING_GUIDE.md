# 🧪 Testing Guide for Settings Fixes

## Quick Test Checklist

### ✅ Test 1: showTipJar Persistence (5 min)

**What this tests**: Fix #1 - showTipJar now saves to Google Sheets

**Steps**:

1. Sign in to your app
2. Go to Settings → Expand "Payment Options"
3. Find "Show Tip Jar" toggle
4. **Turn it OFF** (should be ON by default)
5. Click "Save Settings"
6. ✅ Should see "Settings saved successfully!"
7. **Reload the page** (hard refresh)
8. Go back to Settings → Payment Options
9. ✅ Verify "Show Tip Jar" is still **OFF**

**Verify in Google Sheet**:

1. Open your Google Sheet
2. Go to "POS Settings" tab
3. Look at Column F, Row 2
4. ✅ Should say "No"
5. Change toggle back to ON
6. Save Settings
7. ✅ Column F, Row 2 should now say "Yes"

**Expected Console Logs**:

```
Saving settings...
Settings saved successfully
```

**What to look for**:

- No errors in console
- Toggle state persists across reloads
- Google Sheet shows "Yes" or "No" in Column F

---

### ✅ Test 2: Migration with Real Settings (15 min)

**What this tests**: Fix #2 - Migration loads FROM Google Sheets

**Prerequisites**:

1. ⚠️ Run migration 004 in Supabase Dashboard first!
2. Have a user with custom settings in Google Sheet

**Setup (Simulate First Migration)**:

```sql
-- In Supabase SQL Editor:
DELETE FROM user_settings WHERE user_id = 'YOUR_USER_ID';
```

**Steps**:

1. Clear browser cache and localStorage
2. Sign in
3. **Watch browser console** (this is important!)
4. ✅ Should see these logs in order:
   ```
   🔄 No Supabase settings found, checking for legacy data...
   📦 Found legacy settings (has Sheet ID), migrating...
   📥 Loading settings from Google Sheets for migration...
   ✅ Loaded settings from Sheet: {paymentSettings: [...], categories: [...], ...}
   ✅ Migration complete with user's actual settings from Sheet!
   ```
5. Go to Settings page
6. ✅ Verify all your custom settings are there (not defaults!)

**Verify in Supabase**:

1. Open Supabase Dashboard
2. Go to Table Editor → user_settings
3. Find your user's row
4. ✅ Check payment_methods - should match your Google Sheet
5. ✅ Check categories - should match your custom categories
6. ✅ Check theme_id - should match your selected theme
7. ✅ Check show_tip_jar - should match Column F in Sheet
8. ✅ Check migrated_from_sheets - should be `true`

**What to look for**:

- Console shows "Loading settings from Google Sheets for migration"
- NOT "migrating with defaults"
- Supabase row contains YOUR settings (not defaults)
- All 13 settings match between Sheet and Supabase

---

### ✅ Test 3: New User Flow (10 min)

**What this tests**: New users get proper defaults

**Prerequisites**:

- Migration 004 run in Supabase
- Fresh Google account (or clear localStorage)

**Steps**:

1. Sign in with new Google account
2. Wait for Sheet creation (automatic)
3. ✅ Should see "Google Sheets created successfully!"
4. Check console logs:
   ```
   🆕 New user detected (no Sheet ID, no Supabase settings)
   🆕 Creating default settings for new user...
   ✅ Default settings created in Supabase
   ```
5. Go to Settings page
6. ✅ Verify default settings:
   - Payment Methods: Cash, Venmo, Credit (disabled), Other, Custom 1-3 (disabled)
   - Categories: Apparel, Merch, Music
   - Show Tip Jar: ON (checked)
   - Theme: Default
   - Currency: USD, rate 1.0
   - Email Signup: All disabled

**Verify in Supabase**:

1. Check user_settings table
2. ✅ Row exists for new user
3. ✅ migrated_from_sheets = `false` (new user, not migrated)
4. ✅ All fields have default values

**What to look for**:

- No migration logs (this is a new user)
- Settings created after Sheet creation
- Defaults match defaultSettings.ts

---

## 🔍 Advanced Testing

### Test 4: Multi-Device Sync (Future)

**Note**: This requires Settings.tsx to use the hook (Task #3)

**Steps**:

1. Sign in on Device A (e.g., laptop)
2. Change a setting (e.g., add a category "Stickers")
3. Save settings
4. Sign in on Device B (e.g., iPad)
5. ✅ Should see "Stickers" category immediately

---

### Test 5: Offline Handling

**What this tests**: Migration gracefully handles offline scenarios

**Steps**:

1. Sign in while online
2. Delete Supabase settings row (simulate first login)
3. **Go offline** (disable network)
4. Reload page
5. ✅ Should fallback gracefully
6. Check console:
   ```
   ⚠️ Failed to load from Sheet, migrating with defaults
   ```
7. Go back online
8. Reload page
9. ✅ Should load settings from Supabase

---

## 🐛 What to Report

### If Test 1 Fails (showTipJar):

- Screenshot of Settings page (toggle state)
- Screenshot of Google Sheet (Column F value)
- Console errors
- Does it save but not load? Or not save at all?

### If Test 2 Fails (Migration):

- Full console logs from page load
- Screenshot of Supabase user_settings row
- Screenshot of Google Sheet POS Settings tab
- What settings were wrong? (all? specific ones?)

### If Test 3 Fails (New User):

- Console logs from sign-in
- Screenshot of Settings page
- Supabase user_settings row
- Did Sheet get created?

---

## ✅ Success Criteria

All tests must pass before deploying:

- [ ] Test 1: showTipJar persists across reloads
- [ ] Test 1: Google Sheet Column F updates correctly
- [ ] Test 2: Existing user migration loads FROM Sheet
- [ ] Test 2: Supabase contains custom values (not defaults)
- [ ] Test 2: All 13 settings match between Sheet and Supabase
- [ ] Test 3: New user gets defaults
- [ ] Test 3: No migration logs for new users
- [ ] No errors in console for any test
- [ ] No errors in Supabase logs

---

## 🚀 After Testing

Once all tests pass:

1. ✅ Mark Test #4 as complete in todo list
2. Consider Task #3: Update Settings.tsx to use hook (optional)
3. Deploy to production
4. Monitor production logs for migration activity
5. Spot-check a few real users' Supabase settings

---

## 📞 Help

If you encounter issues:

1. Check browser console for error messages
2. Check Supabase logs (Dashboard → Logs → API)
3. Check Google Sheets API quota (shouldn't be an issue but possible)
4. Share console logs + screenshots in issue report

**Common Issues**:

**"Failed to load from Sheet"**

- Check Google OAuth token still valid
- Check Sheet still exists
- Check Sheet has "POS Settings" tab

**"Settings not migrating"**

- Check Supabase migration 004 was run
- Check RLS policies allow user to insert
- Check user email matches between NextAuth and Supabase

**"Settings show defaults instead of custom"**

- Check Google Sheet has data in POS Settings tab
- Check console shows "Loaded settings from Sheet"
- Check Supabase row after migration

---

Good luck with testing! 🎉
