# Your OAuth Setup - Specific Configuration

**Date:** November 30, 2025  
**Supabase Project ID:** `mipwzegeiynxajuvyecj`  
**Google Client ID:** `254642597803-9qhuat0729b10a9683i8mt6astgmo9jh.apps.googleusercontent.com`

---

## What You Need to Configure

### 1. Google Cloud Console OAuth Settings

**Go to:** https://console.cloud.google.com/apis/credentials

**Find your OAuth 2.0 Client ID** (ends in `...9jh.apps.googleusercontent.com`)

#### A. Authorized JavaScript Origins

Add these exact URLs:

```
http://localhost:3000
http://127.0.0.1:3000
https://mipwzegeiynxajuvyecj.supabase.co
```

**Add your production domain when ready:**

```
https://your-production-domain.com
https://www.your-production-domain.com
```

#### B. Authorized Redirect URIs

Add these exact URLs:

```
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://mipwzegeiynxajuvyecj.supabase.co/auth/v1/callback
```

**Add your production domain when ready:**

```
https://your-production-domain.com/auth/callback
https://www.your-production-domain.com/auth/callback
```

**⚠️ Important Notes:**

- You need BOTH `/auth/callback` (your app) AND `/auth/v1/callback` (Supabase)
- Include both `localhost:3000` and `127.0.0.1:3000` for local dev
- Changes can take 5 minutes to propagate

---

### 2. Supabase Dashboard Settings

**Go to:** https://supabase.com/dashboard/project/mipwzegeiynxajuvyecj

#### A. URL Configuration

Navigate to: **Authentication → URL Configuration**

**Site URL:**

```
http://localhost:3000
```

(Update to production domain when deploying)

**Redirect URLs (add all, one per line):**

```
http://localhost:3000/**
http://127.0.0.1:3000/**
```

**When you deploy to production, add:**

```
https://your-production-domain.com/**
https://www.your-production-domain.com/**
https://your-vercel-app.vercel.app/**
```

#### B. Google Provider Configuration

Navigate to: **Authentication → Providers → Google**

1. Toggle **Enable** ON
2. **Client ID (for OAuth):** `254642597803-9qhuat0729b10a9683i8mt6astgmo9jh.apps.googleusercontent.com`
3. **Client Secret (for OAuth):** (Get from Google Cloud Console)
4. Click **Save**

**To get your Client Secret:**

1. Go to Google Cloud Console → Credentials
2. Click on your OAuth 2.0 Client ID
3. Copy the **Client secret** value
4. Paste into Supabase

---

### 3. DNS Setup (Optional - Custom Auth Domain)

If you want users to see `auth.yourDomain.com` instead of `mipwzegeiynxajuvyecj.supabase.co`:

#### Step 1: Create DNS CNAME Record

In your DNS provider (Cloudflare, Namecheap, etc.):

```
Type:  CNAME
Name:  auth
Value: mipwzegeiynxajuvyecj.supabase.co
TTL:   Auto (or 3600)
```

This creates: `auth.yourDomain.com` → `mipwzegeiynxajuvyecj.supabase.co`

#### Step 2: Add Custom Domain in Supabase

Navigate to: **Project Settings → Custom Domains**

1. Click **Add custom domain**
2. Enter: `auth.yourDomain.com`
3. Wait for verification (24-48 hours)

#### Step 3: Update Google OAuth

Once custom domain is verified, add to Google Cloud Console:

**Authorized JavaScript Origins:**

```
https://auth.yourDomain.com
```

**Authorized Redirect URIs:**

```
https://auth.yourDomain.com/auth/v1/callback
```

---

## Testing Your Setup

### Test 1: Local Development

```bash
# Start your dev server
npm run dev

# Open browser to:
http://localhost:3000/auth/signin

# Click "Sign in with Google"
# Should redirect to Google OAuth
# After consent, should redirect back to localhost:3000/auth/callback
# Should show session and redirect to /app
```

**Expected console output:**

```
📝 Checking for session after OAuth redirect...
✅ Session found!
User: your@email.com
Provider token: ✅ Present
Provider refresh token: ✅ Present
```

### Test 2: Production

```bash
# Deploy to your hosting platform
# Make sure environment variables are set

# Open browser to:
https://your-domain.com/auth/signin

# Sign in should work without any manual configuration
```

---

## Current Status Checklist

Use this to track what's configured:

### Google Cloud Console

- [ ] Authorized JavaScript origins include `localhost:3000`
- [ ] Authorized JavaScript origins include `mipwzegeiynxajuvyecj.supabase.co`
- [ ] Authorized JavaScript origins include production domain (when ready)
- [ ] Authorized redirect URIs include `localhost:3000/auth/callback`
- [ ] Authorized redirect URIs include `mipwzegeiynxajuvyecj.supabase.co/auth/v1/callback`
- [ ] Authorized redirect URIs include production domain `/auth/callback` (when ready)
- [ ] OAuth consent screen configured with app name
- [ ] App published (or test users added if in testing mode)

### Supabase Dashboard

- [ ] Google provider enabled
- [ ] Google Client ID configured
- [ ] Google Client Secret configured
- [ ] Site URL set to `localhost:3000` (or production domain)
- [ ] Redirect URLs include `localhost:3000/**`
- [ ] Redirect URLs include production domain `/**` (when ready)

### DNS (Optional)

- [ ] CNAME record created: `auth` → `mipwzegeiynxajuvyecj.supabase.co`
- [ ] Custom domain added in Supabase dashboard
- [ ] Custom domain verified (can take 24-48 hours)
- [ ] Google OAuth updated with custom domain URLs

### Environment Variables

- [ ] `.env.local` exists with all required variables
- [ ] Production environment variables set in hosting platform
- [ ] No `.env.local` committed to git (should be in `.gitignore`)

---

## Quick Commands

```bash
# Test if environment variables are loaded
npm run dev
# Should start without errors

# Check what's in your .env.local (safe values only)
grep "NEXT_PUBLIC" .env.local

# Deploy to Vercel (if using Vercel)
vercel --prod
```

---

## What Happens After Configuration

### Current Flow (Unprofessional - Shows Supabase URL)

```
User → https://mipwzegeiynxajuvyecj.supabase.co/auth/v1/authorize
     → Google OAuth
     → https://mipwzegeiynxajuvyecj.supabase.co/auth/v1/callback
     → https://yourDomain.com/auth/callback
     → Success!
```

### With Custom Domain (Professional)

```
User → https://auth.yourDomain.com/auth/v1/authorize
     → Google OAuth
     → https://auth.yourDomain.com/auth/v1/callback
     → https://yourDomain.com/auth/callback
     → Success!
```

Users only see your branded domain! 🎉

---

## Production Domains to Consider

What's your production domain? Common options:

1. **Custom domain:** `roaddog.app`, `tourmanager.io`, etc.
2. **Vercel default:** `your-app.vercel.app`
3. **Subdomain:** `app.yourDomain.com`

Once you tell me your production domain, I can give you the exact configuration values!

---

## Next Steps

1. **Configure Google OAuth** using the exact URLs above
2. **Configure Supabase** using the exact settings above
3. **Test locally** - should work immediately
4. **Tell me your production domain** - I'll give you the exact production URLs
5. **Deploy** - OAuth will work in prod without manual changes
6. **Optional:** Set up custom auth domain for professional URLs

Ready to start? Let me know your production domain and I'll give you the complete configuration!
