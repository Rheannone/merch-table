# Auth System Cleanup & Configuration Plan

## Current Situation

**GOOD NEWS:** Your app is actually using **Supabase Auth exclusively**. The NextAuth code is leftover cruft that's no longer being used!

### What's Actually Happening

1. **Sign In**: Uses Supabase Auth via `/auth/signin` page (`useAuth()` from `AuthProvider`)
2. **Google OAuth**: Goes through Supabase Auth, gets `provider_token` and `provider_refresh_token`
3. **Google Sheets API**: Uses tokens from Supabase session (see `api-auth.ts`)
4. **NextAuth Route**: `/api/auth/[...nextauth]/route.ts` is NOT being called (confirmed by sign-in page)

### Why You Thought It Was Complex

- **NextAuth files still present** → confusing when reading code
- **Wrong imports** in some files (marketing page uses `next-auth/react`)
- **Unprofessional OAuth URL** → users see `supabase.co` during consent
- **Manual URL swapping** → no multi-environment redirect setup

## Cleanup Tasks

### 1. Fix Wrong Imports ✅ DO THIS

**Files to update:**

```bash
# src/app/(marketing)/page.tsx
- import { useSession } from "next-auth/react"
+ import { useSession } from "@/components/AuthProvider"

# src/app/api/feedback/route.ts
- import { authOptions } from "../auth/[...nextauth]/route"
+ Use Supabase auth instead (getUser())
```

### 2. Delete NextAuth Files ✅ DO THIS

**Safe to delete:**

- `src/app/api/auth/[...nextauth]/route.ts` (162 lines, unused)
- `src/types/next-auth.d.ts` (type definitions, unused)
- `src/components/SessionProvider.tsx` (wraps NextAuth provider, unused)

**Check first if used:**

- Search for any imports of these files before deletion

### 3. Remove NextAuth Package ✅ DO THIS

```bash
npm uninstall next-auth
```

### 4. Update Documentation Text

**Files with text mentions:**

- `src/app/privacy/page.tsx` - mentions "NextAuth.js security standards"
- `OAUTH_SETUP.md` - entire file is NextAuth-specific
- `SUPABASE_QUICK_TEST.md` - mentions NextAuth integration

**Actions:**

- Update privacy policy to say "Supabase Auth security standards"
- Archive `OAUTH_SETUP.md` or rewrite for Supabase
- Update test docs to remove NextAuth references

## Google OAuth Configuration

### Current Problem

**Your Supabase Auth scopes are WRONG:**

```typescript
// Current in src/lib/supabase/auth.ts
scope: "openid email profile"; // ❌ Missing Google Sheets!
```

**It SHOULD be:**

```typescript
scope: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file";
```

This is why the app works - users who signed in under the OLD NextAuth system still have valid tokens. But NEW users signing in through Supabase Auth won't have Sheets access!

### Fix Required: Update Supabase Auth Scopes

**File: `src/lib/supabase/auth.ts`**

```typescript
async signInWithGoogle() {
  const { data, error } = await this.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
      scopes: "openid email profile https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file", // ✅ ADD THIS
    },
  });
  // ... rest
}
```

### Google Cloud Console Setup

**Authorized JavaScript Origins:**

```
http://localhost:3000
https://your-production-domain.com
https://your-supabase-project.supabase.co
```

**Authorized Redirect URIs:**

```
http://localhost:3000/auth/callback
https://your-production-domain.com/auth/callback
https://your-supabase-project.supabase.co/auth/v1/callback
```

**Important:** You need **both** your app's callback AND Supabase's callback URL.

## Supabase Dashboard Configuration

### Site URL & Redirect URLs

**Supabase Dashboard → Authentication → URL Configuration:**

1. **Site URL:** `https://your-production-domain.com`
2. **Additional Redirect URLs (one per line):**
   ```
   http://localhost:3000/**
   https://your-production-domain.com/**
   ```

This allows BOTH dev and prod to work simultaneously - no more manual URL swapping!

### Custom Domain (Optional - Recommended)

**Benefits:**

- Users see `auth.roaddog.app` instead of `supabase.co`
- More professional OAuth consent screen
- Better brand consistency

**Setup Steps:**

1. Create DNS CNAME record: `auth.roaddog.app` → `your-project.supabase.co`
2. In Supabase Dashboard → Settings → Custom Domain
3. Add `auth.roaddog.app` and verify
4. Update Google OAuth redirect to use custom domain

**New OAuth flow:**

```
User clicks Sign In
↓
Redirects to: https://auth.roaddog.app/auth/v1/authorize?...
↓
Google consent screen
↓
Redirects back: https://auth.roaddog.app/auth/v1/callback
↓
Redirects to: https://roaddog.app/auth/callback
```

Much more professional!

## Environment Variables Required

### Local Development (.env.local)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# Supabase uses these automatically, no NEXTAUTH variables needed!
```

### Production (Vercel/etc)

Same variables as above. With the wildcard redirect URLs configured in Supabase, both environments will work without changes.

## Testing Plan

### After Cleanup

1. **Delete NextAuth files**
2. **Uninstall next-auth package**
3. **Update imports in marketing page**
4. **Update feedback API to use Supabase auth**
5. **Update Supabase Auth scopes** (CRITICAL!)
6. **Update Google Cloud OAuth settings**
7. **Update Supabase redirect URLs**

### Test in Development

1. Sign out completely
2. Clear browser cache/cookies
3. Sign in with Google
4. Check that you get Sheets API prompt
5. Try creating a new sheet (verify API access works)
6. Try migrating data from Sheets to Supabase

### Test in Production

1. Deploy changes
2. Sign out completely
3. Sign in with Google
4. Verify OAuth consent shows correct scopes
5. Test Sheets API functionality
6. Verify no manual URL changes needed

## Why This Is Actually Simpler

### Before (Your Perception)

- "Complex Supabase setup"
- "Manual URL swapping"
- "Unprofessional OAuth"
- "Mixed NextAuth/Supabase code"

### After Cleanup

- **One auth system**: Supabase Auth (that's it!)
- **One provider**: Google OAuth through Supabase
- **Auto refresh**: Handled by googleapis library
- **Multi-environment**: Wildcard redirects work for dev + prod
- **RLS integration**: Already built-in
- **Multi-org support**: Already working

### Compared to NextAuth

**NextAuth would require:**

- Separate auth server/routes
- Manual token refresh logic
- Separate database sync callbacks
- Can't use Supabase RLS with `auth.uid()`
- Extra complexity for multi-org

**Supabase Auth:**

- Built into Supabase (one less thing to manage)
- Automatic RLS integration
- Provider tokens stored in session
- Automatic refresh handling
- Native multi-org support

## Summary

You're 90% there! The auth system IS actually Supabase - you just have NextAuth leftovers making it look messy. The real issues are:

1. **Missing Google Sheets scopes** in Supabase Auth (CRITICAL FIX)
2. **Leftover NextAuth files** (easy cleanup)
3. **Missing wildcard redirects** in Supabase dashboard (5 minute fix)
4. **Optional:** Custom domain for professional OAuth URL

Once cleaned up, you'll have a simpler, more maintainable system than NextAuth ever was.

## Next Steps

Ready to execute this cleanup? I can:

1. Fix the imports in marketing page and feedback API
2. Delete the NextAuth files
3. Update the Supabase Auth scopes
4. Create updated documentation
5. Guide you through Google OAuth and Supabase dashboard settings

Just say the word!
