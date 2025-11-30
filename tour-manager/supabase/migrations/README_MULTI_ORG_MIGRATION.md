# Multi-Organization Migration Guide

## 🎯 Overview

This guide walks you through migrating your Road Dog (formerly Merch Table) database from single-user to multi-organization architecture.

**What this enables:**

- One user can belong to multiple organizations (bands/sellers)
- Multiple users can collaborate in the same organization
- Role-based permissions (owner, admin, member, viewer)
- Audit trails (track who created/updated what)
- Shared email lists and inventory across teams

---

## 📋 Prerequisites

1. **Backup your database** (just in case!)
2. Access to your Supabase SQL Editor
3. No users actively using the app during migration (recommended)

---

## 🚀 Migration Steps

### Step 1: Run Migrations in Order

Open your Supabase SQL Editor and run these files **in numerical order**:

```sql
-- 1. Create organization tables and auto-trigger for new users
supabase/migrations/013_add_organizations.sql

-- 2. Add helper functions for permission checking
supabase/migrations/014_org_access_helpers.sql

-- 3. Migrate existing users to personal organizations
supabase/migrations/015_migrate_existing_users_to_orgs.sql

-- 4. Migrate products to organizations
supabase/migrations/016_migrate_products_to_orgs.sql

-- 5. Migrate sales to organizations
supabase/migrations/017_migrate_sales_to_orgs.sql

-- 6. Migrate close-outs and email signups to organizations
supabase/migrations/018_migrate_closeouts_emails_to_orgs.sql

-- 7. Update all RLS policies for organization-based access
supabase/migrations/019_update_rls_policies_for_orgs.sql
```

### Step 2: Verify Migration

Run the test script to verify everything worked:

```sql
supabase/migrations/TEST_multi_org_migrations.sql
```

You should see:

- ✅ All tests passed
- ✅ Statistics showing your migrated data
- ✅ No errors or warnings

---

## 🧪 Test the Migration

### Test 1: Check Organizations

```sql
-- View all organizations
SELECT
  o.name,
  o.slug,
  COUNT(om.user_id) as member_count
FROM organizations o
LEFT JOIN organization_members om ON om.organization_id = o.id
GROUP BY o.id, o.name, o.slug;
```

**Expected:** Each existing user has a personal organization

### Test 2: Check Memberships

```sql
-- View all memberships
SELECT
  u.email,
  o.name as org_name,
  om.role
FROM organization_members om
JOIN users u ON u.id = om.user_id
JOIN organizations o ON o.id = om.organization_id
ORDER BY u.email, o.name;
```

**Expected:** All users are "owner" of their personal org

### Test 3: Check Data Migration

```sql
-- Products per organization
SELECT
  o.name as organization,
  COUNT(p.id) as product_count
FROM organizations o
LEFT JOIN products p ON p.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(p.id) > 0;

-- Sales per organization
SELECT
  o.name as organization,
  COUNT(s.id) as sale_count,
  SUM(s.total) as total_revenue
FROM organizations o
LEFT JOIN sales s ON s.organization_id = o.id
GROUP BY o.id, o.name
HAVING COUNT(s.id) > 0;
```

**Expected:** All your existing products and sales are assigned to the correct personal orgs

### Test 4: Test RLS (Row Level Security)

Create a new test user via Supabase Auth, then run:

```sql
-- This should create an organization automatically
SELECT * FROM organizations WHERE created_by = '<new-user-id>';

-- Check they're a member
SELECT * FROM organization_members WHERE user_id = '<new-user-id>';

-- Check they have settings
SELECT * FROM organization_settings WHERE organization_id = '<new-org-id>';
```

**Expected:** New user auto-gets personal organization

---

## 🔄 Rollback (If Needed)

If something goes wrong, you can rollback by:

1. **Restore from backup** (safest option)
2. Or run these in reverse:

```sql
-- Drop new tables
DROP TABLE IF EXISTS organization_settings CASCADE;
DROP TABLE IF EXISTS organization_members CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- Note: This won't restore user_id columns
-- You'll need to restore from backup for full rollback
```

---

## 📊 Database Schema Changes

### New Tables

**organizations**

- `id` (UUID, PK)
- `name` (TEXT) - "Jane's Merch", "The Rockers"
- `slug` (TEXT, unique) - "janes-merch", "the-rockers"
- `created_by` (UUID → users)
- `is_active` (BOOLEAN) - soft delete flag

**organization_members**

- `organization_id` (UUID → organizations)
- `user_id` (UUID → users)
- `role` (TEXT) - 'owner', 'admin', 'member', 'viewer'
- `joined_at` (TIMESTAMP)

**organization_settings**

- `organization_id` (UUID → organizations)
- `settings` (JSONB) - payment methods, categories, theme, etc.

### Modified Tables

**products, sales, close_outs, email_signups:**

- ❌ Removed: `user_id`
- ✅ Added: `organization_id` (required)
- ✅ Added: `created_by` (nullable) - for audit trail

---

## 🔒 Permission Model

| Role       | View | Create | Update Own | Update Any | Delete | Manage Team |
| ---------- | ---- | ------ | ---------- | ---------- | ------ | ----------- |
| **Viewer** | ✅   | ❌     | ❌         | ❌         | ❌     | ❌          |
| **Member** | ✅   | ✅     | ✅         | ❌         | ❌     | ❌          |
| **Admin**  | ✅   | ✅     | ✅         | ✅         | ✅     | ✅          |
| **Owner**  | ✅   | ✅     | ✅         | ✅         | ✅     | ✅          |

---

## ⚠️ Important Notes

### Existing Users

- All existing users automatically get a personal organization
- They're set as "owner" of their personal org
- Their user_settings are copied to organization_settings
- All their data (products, sales) is migrated to their personal org

### New Users

- Automatically get a personal organization on signup
- Named "{Name}'s Merch" or "{Email}'s Merch"
- Start as "owner" of their personal org
- Empty organization settings (will populate from defaults)

### Data Isolation

- Users can ONLY see data from organizations they belong to
- RLS policies enforce this at the database level
- No way to access other organizations' data without membership

### Collaboration

- Organization owners/admins can invite other users
- Invited users can have different roles
- All members see the same products, sales, email list
- Audit trails track who created/updated each record

---

## 🐛 Troubleshooting

### "Migration failed on step X"

- Check the error message in SQL editor
- Verify previous migrations completed successfully
- Check migration logs in the migration file output

### "Some users have no organization"

- Re-run migration 015
- Check the logs for which users failed
- Manually create orgs for those users if needed

### "Products still have user_id column"

- Migration 016 may have failed
- Check for errors in migration logs
- Ensure migration 015 completed first

### "RLS policies not working"

- Verify migration 019 completed
- Check `pg_policies` table for policy count
- Test with different user accounts

---

## 📞 Next Steps

After successful migration:

1. ✅ **Test in Supabase Dashboard**

   - Create a test user
   - Verify organization auto-creation
   - Check data isolation

2. ✅ **Update Frontend Code**

   - Add TypeScript types for organizations
   - Create OrganizationContext
   - Update all queries to use organization_id
   - Add organization switcher UI

3. ✅ **Deploy to Production**
   - Run migrations on production database
   - Monitor for any issues
   - Notify users about new collaboration features

---

## 📚 Additional Resources

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RBAC](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- Migration files: `supabase/migrations/013-019`
- Test script: `supabase/migrations/TEST_multi_org_migrations.sql`

---

## ✨ What You Can Do Now

After migration, your database supports:

- ✅ **Multi-band musicians** - One person in multiple bands
- ✅ **Team selling** - Multiple people selling from same inventory
- ✅ **Role-based access** - Viewers, members, admins, owners
- ✅ **Audit trails** - Track who made each sale
- ✅ **Shared data** - Email lists, inventory shared across team
- ✅ **Data isolation** - Organizations can't see each other's data

Ready to build the frontend! 🚀
