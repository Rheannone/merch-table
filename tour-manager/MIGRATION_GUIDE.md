# Multi-Organization Migration Guide

## 🎯 Overview

This guide walks you through migrating Road Dog from single-user to multi-organization architecture. **All existing data will be preserved** - existing users will automatically get personal organizations.

## ⚠️ Pre-Migration Checklist

**CRITICAL - Do these BEFORE running migrations:**

1. **Backup your data** (Supabase Dashboard → Database → Backups)
2. **Test in a development/staging environment first** (recommended)
3. **Verify you have database access** (Supabase Dashboard → SQL Editor)
4. **Confirm you're on the correct project** (check project URL)
5. **Note current user count** (for verification after migration)

## 📊 What This Migration Does

### Phase 1: Foundation (Migrations 013-014)

- Creates `organizations` table
- Creates `organization_members` junction table (many-to-many)
- Creates `organization_settings` table (org-wide preferences)
- Adds RLS helper functions for permission checks
- **Result**: New tables exist, old app still works

### Phase 2: Data Migration (Migrations 015-019)

- **015**: Auto-creates personal org for each existing user (e.g., "John's Merch")
- **016**: Migrates products to organizations (adds `organization_id`, `created_by`, `updated_by`)
- **017**: Migrates sales to organizations (adds `organization_id`, `created_by`)
- **018**: Migrates close-outs and email signups (adds `organization_id`, `created_by`/`collected_by`)
- **019**: Updates ALL RLS policies to use organization-based permissions
- **Result**: All data belongs to organizations, multi-org ready

## 🚀 Migration Steps

### Step 1: Open Supabase SQL Editor

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**

### Step 2: Run Migrations in Order

**IMPORTANT**: Run these ONE AT A TIME, in order. Wait for each to complete successfully before running the next.

#### Migration 013: Add Organizations Tables

```sql
-- Copy/paste contents of: supabase/migrations/013_add_organizations.sql
-- Expected: ~425 lines, creates 3 tables, 1 trigger, RLS policies
-- Runtime: ~2-5 seconds
```

**Verify:**

```sql
SELECT COUNT(*) FROM organizations;  -- Should be 0
SELECT COUNT(*) FROM organization_members;  -- Should be 0
```

#### Migration 014: Add Helper Functions

```sql
-- Copy/paste contents of: supabase/migrations/014_org_access_helpers.sql
-- Expected: ~284 lines, creates 5 helper functions
-- Runtime: ~1-2 seconds
```

**Verify:**

```sql
SELECT proname FROM pg_proc WHERE proname LIKE '%org%';
-- Should show: user_has_org_access, get_user_org_role, user_is_org_owner, etc.
```

#### Migration 015: Migrate Existing Users

```sql
-- Copy/paste contents of: supabase/migrations/015_migrate_existing_users_to_orgs.sql
-- Expected: ~195 lines, creates org for EACH user
-- Runtime: ~1-10 seconds (depends on user count)
```

**Verify:**

```sql
SELECT COUNT(*) FROM organizations;  -- Should equal your user count
SELECT COUNT(*) FROM organization_members;  -- Should equal your user count
SELECT name, slug FROM organizations LIMIT 5;  -- Check org names look correct
```

**⚠️ CHECKPOINT**: If counts don't match or org names look wrong, STOP and investigate before continuing.

#### Migration 016: Migrate Products

```sql
-- Copy/paste contents of: supabase/migrations/016_migrate_products_to_orgs.sql
-- Expected: ~278 lines, adds organization_id to products
-- Runtime: ~2-15 seconds (depends on product count)
```

**Verify:**

```sql
SELECT COUNT(*) FROM products WHERE organization_id IS NOT NULL;  -- Should equal total products
SELECT COUNT(*) FROM products WHERE organization_id IS NULL;  -- Should be 0
```

#### Migration 017: Migrate Sales

```sql
-- Copy/paste contents of: supabase/migrations/017_migrate_sales_to_orgs.sql
-- Expected: ~241 lines, adds organization_id to sales
-- Runtime: ~2-30 seconds (depends on sales count)
```

**Verify:**

```sql
SELECT COUNT(*) FROM sales WHERE organization_id IS NOT NULL;  -- Should equal total sales
SELECT COUNT(*) FROM sales WHERE organization_id IS NULL;  -- Should be 0
```

#### Migration 018: Migrate Close-outs & Email Signups

```sql
-- Copy/paste contents of: supabase/migrations/018_migrate_closeouts_emails_to_orgs.sql
-- Expected: ~324 lines, updates close_outs and email_signups
-- Runtime: ~2-20 seconds
```

**Verify:**

```sql
SELECT COUNT(*) FROM close_outs WHERE organization_id IS NOT NULL;
SELECT COUNT(*) FROM email_signups WHERE organization_id IS NOT NULL;
```

#### Migration 019: Update RLS Policies

```sql
-- Copy/paste contents of: supabase/migrations/019_update_rls_policies_for_orgs.sql
-- Expected: ~528 lines, replaces ALL RLS policies
-- Runtime: ~3-10 seconds
```

**Verify:**

```sql
SELECT schemaname, tablename, policyname
FROM pg_policies
WHERE tablename IN ('products', 'sales', 'close_outs', 'email_signups')
ORDER BY tablename, policyname;
-- Should show new organization-based policies
```

### Step 3: Run Comprehensive Test Script

```sql
-- Copy/paste contents of: supabase/migrations/TEST_multi_org_migrations.sql
-- Expected: Runs 50+ validation checks
-- Runtime: ~5-15 seconds
```

**Expected Output:**

```
✅ TEST 1: Organizations table exists
✅ TEST 2: Organization members table exists
...
✅ TEST 50: All RLS policies verified
🎉 ALL TESTS PASSED - Migration successful!
```

**If ANY test fails**: Check the error message, review the migration guide's troubleshooting section.

## ✅ Post-Migration Verification

### 1. Check Data Integrity

```sql
-- Verify all users have organizations
SELECT
  u.email,
  o.name as org_name,
  om.role
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
LEFT JOIN organizations o ON o.id = om.organization_id
ORDER BY u.email;

-- Should show EVERY user with an org
```

### 2. Test Frontend

1. **Clear browser cache** (important!)
2. **Sign in as a test user**
3. **Verify app loads** (should see org name in header)
4. **Create a test product** (should save successfully)
5. **Check organization switcher** (if you have multiple orgs)
6. **Visit `/app/organizations`** (should show your orgs)

### 3. Test Multi-Org Features

**Create a second org:**

1. Go to `/app/organizations`
2. Click "Create New Organization"
3. Name it (e.g., "Test Band")
4. Switch to it using the dropdown in header
5. Create a product
6. Switch back to personal org
7. Verify product from Test Band is NOT visible (data isolation working!)

## 🔄 Rollback Instructions

**If something goes wrong:**

### Option 1: Restore from Backup (Safest)

1. Go to Supabase Dashboard → Database → Backups
2. Select backup from before migration
3. Click "Restore"

### Option 2: Manual Rollback (Advanced)

```sql
-- WARNING: This will DELETE all migration changes

-- Drop new tables
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Drop helper functions
DROP FUNCTION IF EXISTS user_has_org_access CASCADE;
DROP FUNCTION IF EXISTS get_user_org_role CASCADE;
DROP FUNCTION IF EXISTS user_is_org_owner CASCADE;
DROP FUNCTION IF EXISTS user_is_org_admin_or_above CASCADE;
DROP FUNCTION IF EXISTS get_user_organizations CASCADE;

-- Restore old RLS policies (you'll need to recreate them manually)
-- See migrations 002_rls_policies.sql for original policies
```

## 🐛 Troubleshooting

### Issue: "organization_id cannot be null" errors

**Cause**: Migration 015 didn't run properly or didn't create orgs for all users.

**Fix:**

```sql
-- Check which users don't have orgs
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN organization_members om ON om.user_id = u.id
WHERE om.id IS NULL;

-- Manually create org for missing users (replace values):
INSERT INTO organizations (name, slug, created_by)
VALUES ('User Name Merch', 'user-name-merch', 'USER_ID_HERE')
RETURNING id;

-- Then add them as owner (use org id from above):
INSERT INTO organization_members (organization_id, user_id, role)
VALUES ('ORG_ID_HERE', 'USER_ID_HERE', 'owner');
```

### Issue: RLS policies deny access after migration

**Cause**: User not properly added to organization_members.

**Fix:**

```sql
-- Check user's org memberships
SELECT om.*, o.name
FROM organization_members om
JOIN organizations o ON o.id = om.organization_id
WHERE om.user_id = 'USER_ID_HERE';

-- If missing, add them:
INSERT INTO organization_members (organization_id, user_id, role)
SELECT o.id, 'USER_ID_HERE', 'owner'
FROM organizations o
WHERE o.created_by = 'USER_ID_HERE';
```

### Issue: Frontend shows "Loading organization..." forever

**Cause**: OrganizationContext can't load user's orgs.

**Fix:**

1. Check browser console for errors
2. Verify RLS policies allow user to read their org memberships:

```sql
SELECT * FROM organization_members WHERE user_id = auth.uid();
```

3. Clear browser cache and localStorage
4. Sign out and sign in again

### Issue: Migration takes too long (>60 seconds)

**Cause**: Large dataset causing timeouts.

**Solution**: Run migrations in smaller batches:

```sql
-- Example for migration 016 (products)
-- Instead of migrating all at once, do in batches:

UPDATE products
SET organization_id = (
  SELECT om.organization_id
  FROM organization_members om
  WHERE om.user_id = products.user_id
  AND om.role = 'owner'
  LIMIT 1
)
WHERE id IN (
  SELECT id FROM products
  WHERE organization_id IS NULL
  LIMIT 1000  -- Adjust batch size
);

-- Repeat until all products migrated
```

## 📞 Support

**If you encounter issues:**

1. **Check the test script output** - it will pinpoint the exact problem
2. **Review the error message** - SQL errors are usually descriptive
3. **Check Supabase logs** - Dashboard → Logs → Database
4. **Verify data counts** - Use the verification queries above
5. **Restore from backup** - If in doubt, rollback and investigate

## 🎉 Success Criteria

**Migration is successful when:**

✅ All 7 migrations run without errors
✅ TEST script shows "ALL TESTS PASSED"
✅ Every user has exactly 1 personal organization
✅ All products/sales/close-outs have `organization_id`
✅ Frontend loads and shows organization name
✅ Can create products/sales in current org
✅ Data is isolated between organizations
✅ Can switch between organizations (if multiple)

## 📝 Migration Stats

**What to expect:**

- **Total migrations**: 7 files
- **Total SQL lines**: ~2,275 lines
- **Estimated time**: 1-5 minutes (depending on data size)
- **Downtime required**: No (non-breaking changes)
- **Data loss risk**: Zero (all data preserved and migrated)

## 🔒 Security Notes

**Post-migration, users can:**

- ✅ Only see data for organizations they belong to
- ✅ Create/edit data in orgs where they're members
- ✅ Delete data in orgs where they're admins/owners
- ✅ Manage members in orgs where they're admins/owners
- ✅ Delete orgs where they're the owner

**RLS ensures:**

- ❌ Users CANNOT see other organizations' data
- ❌ Users CANNOT join organizations without invitation
- ❌ Viewers CANNOT edit data
- ❌ Members CANNOT delete data
- ❌ Non-owners CANNOT delete organizations

## 🚀 Next Steps After Migration

1. **Test thoroughly** - Try all features as different roles
2. **Invite team members** - Use the organizations page
3. **Create shared organizations** - For bands/teams
4. **Configure org settings** - Payment methods, categories
5. **Monitor for issues** - Check error logs for a few days

---

**Ready to migrate?** Start with Step 1 and work through systematically. Good luck! 🎸
