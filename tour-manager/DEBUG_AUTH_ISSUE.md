# 🔍 Debugging "Database error saving new user" Issue

## ✅ What I Found

### The Problem

When a new user signs in with Google OAuth, two triggers run in sequence:

1. `handle_new_user()` - Creates user in `public.users`
2. `auto_create_personal_organization()` - Creates personal organization

The error "Database error saving new user" happens because:

- **Missing GRANT permissions** on `public.users` table for `authenticated` and `service_role`
- **No error handling** in triggers (any failure blocks the entire auth flow)
- **No ON CONFLICT** handling (if user already exists, insert fails)

## 🔧 The Fix

I created **Migration 029** which:

- ✅ Adds proper GRANT permissions on `public.users` table
- ✅ Adds error handling to both triggers (won't block auth)
- ✅ Adds ON CONFLICT handling for duplicate users
- ✅ Adds detailed logging (NOTICE/WARNING messages)
- ✅ Uses SECURITY DEFINER with explicit search_path for security

**File created:** `supabase/migrations/029_fix_users_grants_and_trigger.sql`

## 📋 Steps to Apply the Fix

### Step 1: Check Your Supabase Logs (Do This FIRST)

Before applying the fix, let's see the actual error:

1. **Go to Supabase Dashboard:**
   - URL: https://supabase.com/dashboard
   - Project: `mipwzegeiynxajuvyecj` (your project ID from YOUR_OAUTH_SETUP.md)

2. **Navigate to Auth Logs:**

   ```
   Dashboard → Logs → Auth Logs
   ```

   OR

   ```
   Dashboard → Authentication → Logs
   ```

3. **Look for recent failed sign-in attempts:**
   - Filter by: "Last hour" or "Last 24 hours"
   - Look for: Red error messages or "Failed" status
   - Click on the failed event to see details

4. **What to look for:**

   ```
   Error: permission denied for table users
   Error: duplicate key value violates unique constraint
   Error: insert or update on table "users" violates foreign key constraint
   Error: new row violates row-level security policy
   ```

5. **Share the error with me** (or take a screenshot) so I can confirm the diagnosis

---

### Step 2: Check Current Database State

Run these queries in Supabase SQL Editor to see what's missing:

```sql
-- Check if triggers exist
SELECT
  trigger_name,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name IN ('on_auth_user_created', 'on_user_created_create_org');

-- Check grants on users table
SELECT
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY grantee, privilege_type;

-- Check RLS policies on users table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

**Expected Results:**

- ✅ Both triggers should exist
- ⚠️ `users` table may be missing grants for `authenticated` or `service_role`
- ✅ RLS policy "Service role can insert users" should exist

---

### Step 3: Apply the Migration

Once you've confirmed the issue, apply the fix:

#### Option A: Supabase Dashboard (Recommended)

1. Go to: **SQL Editor** in Supabase Dashboard
2. Click **New query**
3. Copy the entire contents of `supabase/migrations/029_fix_users_grants_and_trigger.sql`
4. Paste into the SQL editor
5. Click **Run**
6. Check the output for success messages (green checkmarks)

#### Option B: Supabase CLI (if you have it installed)

```bash
cd /Users/croissant/Desktop/tour-manager/tour-manager
supabase db push
```

---

### Step 4: Test with a New User

After applying the fix:

1. **Have a NEW Google account sign in** (or use incognito mode)
2. **Watch the Supabase logs** (Dashboard → Logs → Auth Logs)
3. **Look for NOTICE messages** in Database logs:

   ```
   🔐 Creating user profile for: user@example.com
   ✅ User profile created successfully
   🏢 Creating personal organization for: user@example.com
   ✅ Organization created
   ```

4. **Verify in database:**

   ```sql
   -- Check the new user was created
   SELECT id, email, full_name, created_at
   FROM public.users
   ORDER BY created_at DESC
   LIMIT 5;

   -- Check their organization was created
   SELECT
     u.email,
     o.name as org_name,
     o.slug as org_slug,
     om.role
   FROM public.users u
   JOIN public.organization_members om ON om.user_id = u.id
   JOIN public.organizations o ON o.id = om.organization_id
   ORDER BY u.created_at DESC
   LIMIT 5;
   ```

---

## 🚨 If You're Still Seeing the Error

### Check These Common Issues:

1. **Google OAuth App Status:**
   - Go to Google Cloud Console → APIs & Services → OAuth consent screen
   - **Status:** Should be "In production" (not "Testing")
   - **User type:** Should be "External" to allow any Google account
2. **Google OAuth Scopes:**
   - Only requesting basic scopes: `openid email profile`
   - No sensitive scopes that require verification

3. **Supabase Redirect URLs:**
   - Dashboard → Authentication → URL Configuration
   - **Redirect URLs** should include:
     ```
     http://localhost:3000/**
     https://roaddog.app/**
     https://*.vercel.app/**
     ```

4. **Google OAuth Authorized Redirect URIs:**
   - Google Cloud Console → Credentials → OAuth 2.0 Client IDs
   - Should include:
     ```
     https://mipwzegeiynxajuvyecj.supabase.co/auth/v1/callback
     https://roaddog.app/auth/callback
     http://localhost:3000/auth/callback
     ```

---

## 📊 Understanding the Logs

### What Success Looks Like:

**Auth Logs:**

```
✅ Sign in with provider: google
✅ User authenticated: user@example.com
✅ Session created
✅ Redirect to: https://roaddog.app/auth/callback
```

**Database Logs (Functions):**

```
NOTICE: 🔐 Creating user profile for: user@example.com (ID: abc-123...)
NOTICE: ✅ User profile created successfully for: user@example.com
NOTICE: 🏢 Creating personal organization for: user@example.com (Name: John's Merch)
NOTICE:   ✅ Organization created: johns-merch (ID: xyz-789...)
NOTICE:   ✅ User added as owner of organization
NOTICE:   ✅ Organization settings created
```

### What Failure Looks Like:

**Auth Logs:**

```
❌ Sign in failed
❌ Error: Database error saving new user
```

**Database Logs:**

```
ERROR: permission denied for table users
WARNING: ❌ Failed to create user profile for user@example.com: permission denied
```

---

## 🎯 Next Steps

1. **Check your Supabase Auth Logs** (Step 1 above)
2. **Share the error message** you see (if any)
3. **Run the diagnostic queries** (Step 2) and share results
4. **Apply migration 029** (Step 3)
5. **Test with a new user** (Step 4)

Let me know what you find in the logs and I can provide more targeted help! 🚀
