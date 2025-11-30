# Multi-Organization Migration - Quick Reference

## 📦 Migration Files (Run in This Order)

### Phase 1: Foundation (Non-Breaking)

```
013_add_organizations.sql
014_org_access_helpers.sql
```

**Safe to run**: Existing app continues working normally

---

### Phase 2: Data Migration (Transforms Data)

```
015_migrate_existing_users_to_orgs.sql
016_migrate_products_to_orgs.sql
017_migrate_sales_to_orgs.sql
018_migrate_closeouts_emails_to_orgs.sql
```

**Changes**: Removes `user_id` columns, adds `organization_id`

---

### Phase 3: Security Update (Required)

```
019_update_rls_policies_for_orgs.sql
```

**Changes**: All RLS policies now use organization membership

---

### Testing

```
TEST_multi_org_migrations.sql
```

**Purpose**: Validate everything worked correctly

---

## 🚀 Quick Start

### Option A: Run All at Once

Copy and paste all migrations in order into Supabase SQL Editor, then run.

### Option B: Run One-by-One

Run each migration file individually, checking the output after each.

### Option C: Use Supabase CLI

```bash
# If using local development
supabase migration up
```

---

## ✅ Success Checklist

After running all migrations, verify:

- [ ] All 7 migration files executed without errors
- [ ] Test script shows "ALL TESTS PASSED"
- [ ] Each user has at least one organization
- [ ] All products have `organization_id` (not `user_id`)
- [ ] All sales have `organization_id` (not `user_id`)
- [ ] RLS policies are active on all tables
- [ ] New user signup auto-creates organization

---

## 🔢 Expected Counts

After migration, you should see:

```sql
-- Organizations = Number of users (everyone gets personal org)
SELECT COUNT(*) FROM organizations;

-- Memberships = Number of users (each is owner of personal org)
SELECT COUNT(*) FROM organization_members;

-- Products unchanged (just assigned to orgs now)
SELECT COUNT(*) FROM products;

-- Sales unchanged (just assigned to orgs now)
SELECT COUNT(*) FROM sales;
```

---

## ⚡ Estimated Time

| Migration | Time                  | Notes                          |
| --------- | --------------------- | ------------------------------ |
| 013       | < 1 sec               | Create tables                  |
| 014       | < 1 sec               | Create functions               |
| 015       | ~1 sec per user       | Migrate users                  |
| 016       | ~0.01 sec per product | Migrate products               |
| 017       | ~0.01 sec per sale    | Migrate sales                  |
| 018       | ~0.01 sec per record  | Migrate close-outs/emails      |
| 019       | < 1 sec               | Update policies                |
| **Total** | **~30 seconds**       | For 1000 products + 1000 sales |

_Times are estimates for small datasets_

---

## 🔄 Migration Flow

```
BEFORE:
users → products (via user_id)
users → sales (via user_id)
users → user_settings

AFTER:
users → organization_members → organizations
organizations → products (via organization_id)
organizations → sales (via organization_id)
organizations → organization_settings
users → user_settings (kept for personal prefs)
```

---

## 📝 Key SQL Queries

### View Your Organizations

```sql
SELECT * FROM get_user_organizations();
```

### Check User's Role in Org

```sql
SELECT get_user_org_role('<org-id>');
```

### Products by Organization

```sql
SELECT
  o.name,
  p.name as product,
  u.email as created_by
FROM products p
JOIN organizations o ON o.id = p.organization_id
LEFT JOIN users u ON u.id = p.created_by
ORDER BY o.name, p.name;
```

### Team Sales Performance

```sql
SELECT
  o.name as organization,
  u.email as seller,
  COUNT(s.id) as sales_count,
  SUM(s.total) as revenue
FROM sales s
JOIN organizations o ON o.id = s.organization_id
LEFT JOIN users u ON u.id = s.created_by
GROUP BY o.id, o.name, u.email
ORDER BY revenue DESC;
```

---

## 🎯 What Changed

### Removed

- ❌ `user_id` column from: products, sales, close_outs, email_signups
- ❌ Old RLS policies based on `auth.uid() = user_id`

### Added

- ✅ `organizations` table
- ✅ `organization_members` table (many-to-many)
- ✅ `organization_settings` table
- ✅ `organization_id` column on all data tables
- ✅ `created_by` / `collected_by` for audit trails
- ✅ Helper functions for permission checking
- ✅ New RLS policies based on organization membership

### Unchanged

- ✅ `users` table (still exists, same structure)
- ✅ `user_settings` table (kept for personal preferences)
- ✅ Data content (all products, sales preserved)
- ✅ Timestamps (original created_at preserved)

---

## 🚨 Critical Notes

1. **Backup First**: Always backup before running migrations
2. **Run in Order**: Migrations depend on each other
3. **Check Logs**: Each migration prints detailed output
4. **Test Script**: Run TEST file after all migrations
5. **No Downtime**: Migrations are designed to be non-blocking

---

## 📞 Support

If you encounter issues:

1. Check migration output for error messages
2. Run the TEST script to identify which step failed
3. Review the detailed README: `README_MULTI_ORG_MIGRATION.md`
4. Check Supabase logs in dashboard
5. Restore from backup if needed

---

**Ready to migrate? Run the files in order and watch the magic happen!** ✨
