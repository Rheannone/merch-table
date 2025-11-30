# Google Sheets Removal - OAuth Verification Bypass

**Date:** November 20, 2025  
**Reason:** Avoid 4-6 week OAuth verification process by removing sensitive Google Sheets scopes

## What Changed

### 1. OAuth Scopes Simplified ✅

**File:** `src/lib/supabase/auth.ts`

- **Before:** `"openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file"`
- **After:** `"openid email profile"`
- **Impact:** No sensitive scopes = No OAuth verification required. Can publish immediately!

### 2. Sync Strategies Updated ✅

**File:** `src/lib/sync/strategies.ts`

- **Sales Strategy:** Removed `"sheets"` from destinations array (now Supabase only)
- **Products Strategy:** Removed `"sheets"` from destinations array (now Supabase only)
- **Close-outs Strategy:** Already Supabase-only ✓
- **Settings Strategy:** Already Supabase-only ✓
- **Email Signups Strategy:** Already Supabase-only ✓

### 3. Marketing Copy Updated ✅

**File:** `src/app/(marketing)/page.tsx`

- Removed all mentions of "Google Sheets"
- Updated to emphasize "secure cloud storage" instead
- Clarified that Google Sign-In only accesses email/profile (not Drive)
- Simplified privacy messaging

## What Didn't Change

### Google Sheets Code Preserved for Future

- All Sheets API routes still exist in `src/app/api/sheets/*`
- All helper functions still exist in `src/lib/googleSheets.ts`, `src/lib/userSheets.ts`
- `googleapis` package still installed
- **Why:** Ready to enable as premium export feature after OAuth verification

## Migration Impact

### Users

- **No impact** - All data already syncing to Supabase
- Existing users won't notice any difference
- New users get simpler, faster sign-in

### Development

- **Faster deploys** - No OAuth review delays
- **Same functionality** - Supabase handles all data needs
- **Future-proof** - Can add Sheets export later as paid feature

## Future: Google Sheets Export Feature

When ready to add Sheets export (post-verification):

1. **Request OAuth Verification:**

   - Submit verification request in Google Cloud Console
   - Provide demo video showing OAuth flow + Sheets export
   - Submit privacy policy URL
   - Wait 4-6 weeks for approval

2. **Enable Sheets Export:**

   - Update auth.ts scopes to include `spreadsheets` and `drive.file`
   - Update sync strategies to add `"sheets"` back to destinations
   - Add UI toggle in Settings for "Export to Google Sheets"
   - Market as premium feature to justify verification effort

3. **Required for Verification:**
   - Homepage on verified domain
   - Privacy policy with Google data disclosures
   - Domain verification via Google Search Console
   - Demo video (full OAuth flow + scope usage)
   - Limited Use Policy compliance

## Testing Checklist

- [ ] Sign in with Google (should only request email/profile)
- [ ] Create products - sync to Supabase ✓
- [ ] Record sales - sync to Supabase ✓
- [ ] Close out session - sync to Supabase ✓
- [ ] Update settings - sync to Supabase ✓
- [ ] Add email signups - sync to Supabase ✓
- [ ] Verify no errors about missing Sheets scopes
- [ ] Check that all data persists across sessions

## Verification Requirements Avoided

By removing Google Sheets scopes, we bypassed:

- ❌ 4-6 week OAuth verification review
- ❌ Demo video requirement
- ❌ Privacy policy review process
- ❌ Domain verification setup
- ❌ Limited Use Policy compliance audit

**Result:** Can publish to production immediately! 🚀
