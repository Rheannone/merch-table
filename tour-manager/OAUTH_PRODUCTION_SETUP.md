# OAuth Production Setup Guide

**Date:** November 30, 2025  
**Goal:** Configure Google OAuth, Supabase Auth, and DNS to work in dev, staging, and production without manual URL swapping and without showing Supabase URLs to users.

## Current Architecture Analysis

### Your Current Setup

**Auth Flow:**

```
User clicks "Sign in with Google"
  ↓
Supabase Auth redirects to: https://YOUR-PROJECT.supabase.co/auth/v1/authorize
  ↓
Google OAuth consent screen
  ↓
Google redirects to: https://YOUR-PROJECT.supabase.co/auth/v1/callback
  ↓
Supabase redirects to: https://your-domain.com/auth/callback
  ↓
Your app processes session and redirects to: /app
```

**Problem:** Users see `supabase.co` URLs during OAuth flow (unprofessional)

### Code Analysis

**Redirect Configuration:**

- File: `src/lib/supabase/auth.ts`
- Current: `redirectTo: ${window.location.origin}/auth/callback`
- This is **correct** - it dynamically uses your domain

**Callback Handler:**

- File: `src/app/auth/callback/page.tsx`
- Handles PKCE code exchange automatically
- Checks for session and provider tokens
- Redirects to `/app` on success

## Solution: Multi-Environment Setup

### Option A: Simple (No Custom Domain)

**Pros:** Easy setup, works immediately  
**Cons:** Users see Supabase URLs during OAuth  
**Use for:** MVP, beta testing, quick launch

### Option B: Custom Auth Domain (Recommended)

**Pros:** Professional URLs, branded experience  
**Cons:** Requires DNS setup  
**Use for:** Production, paying customers

---

## Configuration Steps

### Step 1: Get Your Current Supabase Details

You need these values (check your `.env.local` or Vercel dashboard):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # Keep this secret!
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx  # Keep this secret!
```

**To find your Supabase Project ID:**

- Supabase Dashboard → Settings → General
- Look for "Reference ID" (e.g., `abcdefghijklmnop`)
- Your URL is: `https://abcdefghijklmnop.supabase.co`

---

### Step 2: Configure Google Cloud Console

**Navigate to:** [Google Cloud Console](https://console.cloud.google.com)

**A. Find/Create OAuth Credentials**

1. Select your project (or create one)
2. Go to: **APIs & Services → Credentials**
3. Find your OAuth 2.0 Client ID (or create new)
4. Click to edit

**B. Add Authorized JavaScript Origins**

```
http://localhost:3000
https://roaddog.app
https://www.roaddog.app
https://xxxxx.supabase.co
```

Replace `roaddog.app` with your actual production domain.  
Replace `xxxxx` with your Supabase project ID.

**C. Add Authorized Redirect URIs**

```
http://localhost:3000/auth/callback
https://roaddog.app/auth/callback
https://www.roaddog.app/auth/callback
https://xxxxx.supabase.co/auth/v1/callback
```

**Important:** You need BOTH:

- Your app's callback: `/auth/callback` (handled by your Next.js app)
- Supabase's callback: `/auth/v1/callback` (handled by Supabase Auth)

**D. OAuth Consent Screen**

- Go to: **APIs & Services → OAuth consent screen**
- Update **Application name:** "Road Dog" (or your brand name)
- Update **Application logo:** Upload your logo (optional)
- Update **Authorized domains:**
  - `roaddog.app` (your domain)
  - `supabase.co` (if not using custom domain)

---

### Step 3: Configure Supabase Dashboard

**Navigate to:** [Supabase Dashboard](https://supabase.com/dashboard)

**A. URL Configuration**

Go to: **Authentication → URL Configuration**

**Site URL:**

```
https://roaddog.app
```

(Or use `https://your-vercel-app.vercel.app` if not using custom domain yet)

**Redirect URLs (Add all of these, one per line):**

```
http://localhost:3000/**
http://127.0.0.1:3000/**
https://roaddog.app/**
https://www.roaddog.app/**
https://your-vercel-app.vercel.app/**
```

The `/**` wildcard allows any path under that domain.

**B. Google OAuth Provider**

Go to: **Authentication → Providers → Google**

1. **Enable** the provider
2. **Client ID:** Paste from Google Cloud Console
3. **Client Secret:** Paste from Google Cloud Console
4. Click **Save**

**C. Email Auth Settings (Optional)**

Go to: **Authentication → Providers → Email**

- **Confirm email:** Toggle based on your needs
- For beta/testing: Can disable email confirmation
- For production: Enable for security

---

### Step 4: DNS Setup (Optional but Recommended)

If you want users to see `auth.roaddog.app` instead of `supabase.co`:

**A. Create DNS Record**

In your DNS provider (Cloudflare, Namecheap, etc.):

```
Type:  CNAME
Name:  auth
Value: xxxxx.supabase.co
TTL:   Auto or 3600
```

This creates: `auth.roaddog.app` → `xxxxx.supabase.co`

**B. Configure Custom Domain in Supabase**

Go to: **Project Settings → Custom Domains**

1. Click **Add custom domain**
2. Enter: `auth.roaddog.app`
3. Wait for verification (can take 24-48 hours)
4. Once verified, Supabase will provision SSL certificate

**C. Update Auth Flow**

After custom domain is active, update your auth configuration:

File: `src/lib/supabase/auth.ts`

```typescript
async signInWithGoogle() {
  const { data, error } = await this.supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      scopes: "openid email profile",
      // Force use of custom domain (optional)
      // queryParams: {
      //   hd: 'roaddog.app' // Google Workspace domain restriction
      // }
    },
  });
  // ...
}
```

**D. Update Google OAuth Redirect**

Add to Google Cloud Console Authorized Redirect URIs:

```
https://auth.roaddog.app/auth/v1/callback
```

**New OAuth Flow (with custom domain):**

```
User clicks "Sign in with Google"
  ↓
Redirects to: https://auth.roaddog.app/auth/v1/authorize
  ↓
Google OAuth consent
  ↓
Redirects to: https://auth.roaddog.app/auth/v1/callback
  ↓
Redirects to: https://roaddog.app/auth/callback
  ↓
Your app → /app
```

Now users only see `roaddog.app` URLs! 🎉

---

## Environment Variables Setup

### Local Development (`.env.local`)

Create/update this file in your project root:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...

# Google OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx

# Optional: For Resend email
RESEND_API_KEY=re_xxxxx
```

### Production (Vercel/Netlify/etc.)

Add the same environment variables in your hosting platform:

**Vercel:**

1. Go to: Project Settings → Environment Variables
2. Add all variables from `.env.local`
3. Set scope: Production, Preview, Development (or just Production)

**Important:** Never commit `.env.local` to git!

---

## Testing Checklist

### Test Locally (Development)

1. ✅ Start dev server: `npm run dev`
2. ✅ Go to: `http://localhost:3000/auth/signin`
3. ✅ Click "Sign in with Google"
4. ✅ Should redirect to Google OAuth
5. ✅ After consent, should redirect to `http://localhost:3000/auth/callback`
6. ✅ Should process session and redirect to `/app`
7. ✅ Check browser console for provider token logs

**Expected Console Output:**

```
📝 Checking for session after OAuth redirect...
✅ Session found!
User: you@example.com
Provider token: ✅ Present
Provider refresh token: ✅ Present
```

### Test Production (Staging/Prod)

1. ✅ Deploy to Vercel/hosting
2. ✅ Go to: `https://your-domain.com/auth/signin`
3. ✅ Click "Sign in with Google"
4. ✅ Should work without any manual URL changes
5. ✅ Verify redirect flow works
6. ✅ Check that session persists after refresh

---

## Common Issues & Solutions

### Issue: "Redirect URI mismatch" error

**Cause:** Google OAuth redirect URI not configured properly

**Solution:**

1. Check exact URL in error message
2. Add that exact URL to Google Cloud Console → Authorized Redirect URIs
3. Make sure it includes `/auth/v1/callback` for Supabase
4. Wait 5 minutes for Google to propagate changes

### Issue: "Access blocked: Authorization Error"

**Cause:** OAuth consent screen not configured or in testing mode

**Solution:**

1. Google Cloud Console → OAuth consent screen
2. If in "Testing" mode, add test users OR publish the app
3. To publish: Click "PUBLISH APP" button
4. Note: Google may require verification for certain scopes

### Issue: Session found but no provider_token

**Cause:** Scopes not properly configured in Supabase

**Solution:**

1. Supabase Dashboard → Authentication → Providers → Google
2. Verify Client ID and Secret are correct
3. Try signing out completely and signing back in
4. Provider tokens only provided on fresh OAuth consent

### Issue: Works locally but not in production

**Cause:** Environment variables not set in production

**Solution:**

1. Check Vercel/hosting environment variables
2. Verify all variables are set (especially `NEXT_PUBLIC_*`)
3. Redeploy after adding variables

### Issue: CORS errors in production

**Cause:** Supabase redirect URLs not configured

**Solution:**

1. Supabase Dashboard → Authentication → URL Configuration
2. Add your production domain to redirect URLs
3. Use `/**` wildcard for all paths

---

## Security Best Practices

### ✅ DO:

- Use HTTPS in production
- Keep `SUPABASE_SERVICE_ROLE_KEY` secret (never expose to client)
- Keep `GOOGLE_CLIENT_SECRET` secret (server-side only)
- Use environment variables, never hardcode
- Enable email verification in production
- Use custom domain for professional appearance
- Regularly rotate secrets

### ❌ DON'T:

- Commit `.env.local` to git
- Use the same Google OAuth client for dev and prod (create separate ones)
- Expose service role key to client-side code
- Allow unlimited redirect URLs (use specific domains)
- Skip OAuth consent screen configuration

---

## Quick Reference

### URLs You Need to Configure

| Service        | Setting            | Value                                                                                                                        |
| -------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Google OAuth   | JavaScript Origins | `http://localhost:3000`<br>`https://roaddog.app`<br>`https://xxxxx.supabase.co`                                              |
| Google OAuth   | Redirect URIs      | `http://localhost:3000/auth/callback`<br>`https://roaddog.app/auth/callback`<br>`https://xxxxx.supabase.co/auth/v1/callback` |
| Supabase       | Site URL           | `https://roaddog.app`                                                                                                        |
| Supabase       | Redirect URLs      | `http://localhost:3000/**`<br>`https://roaddog.app/**`                                                                       |
| DNS (Optional) | CNAME              | `auth.roaddog.app` → `xxxxx.supabase.co`                                                                                     |

### Files You May Need to Update

- `src/lib/supabase/auth.ts` - OAuth scopes and redirect logic
- `.env.local` - Local environment variables (never commit!)
- Vercel/hosting dashboard - Production environment variables

---

## Next Steps

1. **Get your values** - Find Supabase URL, project ID, Google OAuth credentials
2. **Configure Google** - Add all redirect URIs and origins
3. **Configure Supabase** - Set site URL and redirect URLs
4. **Test locally** - Verify OAuth flow works
5. **Deploy to production** - Add env vars and test
6. **Optional: Custom domain** - Set up `auth.roaddog.app` for professional URLs

---

## Need Help?

**Check these resources:**

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Google OAuth Setup](https://developers.google.com/identity/protocols/oauth2)
- [Supabase Custom Domains](https://supabase.com/docs/guides/platform/custom-domains)

**Common commands:**

```bash
# Check environment variables are loaded
npm run dev  # Should show no errors about missing env vars

# View Supabase logs (for debugging)
# In Supabase Dashboard → Logs → Auth Logs

# Test OAuth flow manually
curl https://xxxxx.supabase.co/auth/v1/authorize?provider=google
```

---

Ready to configure? Let me know your current domain and Supabase project ID, and I can give you the exact configuration values!
