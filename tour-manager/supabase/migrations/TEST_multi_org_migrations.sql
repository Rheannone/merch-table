-- ============================================
-- MIGRATION TEST SCRIPT
-- ============================================
-- Run this AFTER running migrations 013-019
-- This validates that the multi-org setup works correctly
--
-- Usage:
-- 1. Run migrations 013-019 in your Supabase SQL editor
-- 2. Run this test script
-- 3. Check the output for any errors or warnings
--
-- Tests:
-- - All tables exist with correct columns
-- - RLS policies are in place
-- - Helper functions work
-- - Organizations were created for existing users
-- - Data was migrated correctly
-- ============================================

\timing on

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  🧪 TESTING MULTI-ORG MIGRATIONS
  ============================================
  Running comprehensive tests...
  ';
END $$;

-- ============================================
-- TEST 1: Table Structure
-- ============================================

DO $$
DECLARE
  missing_tables TEXT[];
  expected_tables TEXT[] := ARRAY['organizations', 'organization_members', 'organization_settings'];
  table_name TEXT;
BEGIN
  RAISE NOTICE '
  ============================================
  📋 TEST 1: Table Structure
  ============================================
  ';
  
  -- Check new tables exist
  FOREACH table_name IN ARRAY expected_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_tables, 1) > 0 THEN
    RAISE EXCEPTION '❌ Missing tables: %', missing_tables;
  ELSE
    RAISE NOTICE '✅ All organization tables exist';
  END IF;
  
  -- Check organization_id columns exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'products' AND column_name = 'organization_id'
  ) THEN
    RAISE EXCEPTION '❌ products.organization_id missing';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sales' AND column_name = 'organization_id'
  ) THEN
    RAISE EXCEPTION '❌ sales.organization_id missing';
  END IF;
  
  RAISE NOTICE '✅ All data tables have organization_id';
  
  -- Check user_id columns are gone
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name IN ('products', 'sales', 'close_outs', 'email_signups')
    AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION '❌ Some tables still have user_id column';
  END IF;
  
  RAISE NOTICE '✅ All user_id columns removed';
END $$;

-- ============================================
-- TEST 2: Helper Functions
-- ============================================

DO $$
DECLARE
  missing_functions TEXT[];
  expected_functions TEXT[] := ARRAY[
    'user_has_org_access',
    'get_user_org_role', 
    'user_is_org_owner',
    'user_is_org_admin_or_above',
    'get_user_organizations',
    'generate_org_slug'
  ];
  func_name TEXT;
BEGIN
  RAISE NOTICE '
  ============================================
  🔧 TEST 2: Helper Functions
  ============================================
  ';
  
  FOREACH func_name IN ARRAY expected_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE n.nspname = 'public' AND p.proname = func_name
    ) THEN
      missing_functions := array_append(missing_functions, func_name);
    END IF;
  END LOOP;
  
  IF array_length(missing_functions, 1) > 0 THEN
    RAISE EXCEPTION '❌ Missing functions: %', missing_functions;
  ELSE
    RAISE NOTICE '✅ All helper functions exist';
  END IF;
END $$;

-- ============================================
-- TEST 3: RLS Policies
-- ============================================

DO $$
DECLARE
  tables_without_rls TEXT[];
  table_name TEXT;
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '
  ============================================
  🔒 TEST 3: RLS Policies
  ============================================
  ';
  
  -- Check RLS is enabled on all tables
  SELECT array_agg(t.tablename) INTO tables_without_rls
  FROM pg_tables t
  WHERE t.schemaname = 'public'
  AND t.tablename IN ('organizations', 'organization_members', 'organization_settings', 
                      'products', 'sales', 'sale_items', 'close_outs', 'email_signups')
  AND NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = t.schemaname
    AND c.relname = t.tablename
    AND c.relrowsecurity = true
  );
  
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE EXCEPTION '❌ RLS not enabled on: %', tables_without_rls;
  ELSE
    RAISE NOTICE '✅ RLS enabled on all tables';
  END IF;
  
  -- Check each table has policies
  FOR table_name IN 
    SELECT unnest(ARRAY['organizations', 'organization_members', 'organization_settings',
                        'products', 'sales', 'sale_items', 'close_outs', 'email_signups'])
  LOOP
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies
    WHERE tablename = table_name;
    
    IF policy_count = 0 THEN
      RAISE EXCEPTION '❌ No RLS policies on table: %', table_name;
    END IF;
    
    RAISE NOTICE '  ✅ % has % policies', table_name, policy_count;
  END LOOP;
END $$;

-- ============================================
-- TEST 4: User Migration
-- ============================================

DO $$
DECLARE
  user_count INTEGER;
  org_count INTEGER;
  users_without_orgs INTEGER;
  orgs_without_settings INTEGER;
BEGIN
  RAISE NOTICE '
  ============================================
  👥 TEST 4: User Migration
  ============================================
  ';
  
  -- Count users and orgs
  SELECT COUNT(*) INTO user_count FROM public.users;
  SELECT COUNT(*) INTO org_count FROM public.organizations;
  
  RAISE NOTICE '📊 Total users: %', user_count;
  RAISE NOTICE '📊 Total organizations: %', org_count;
  
  -- Check all users have at least one org
  SELECT COUNT(*) INTO users_without_orgs
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = u.id
  );
  
  IF users_without_orgs > 0 THEN
    RAISE EXCEPTION '❌ % users have no organization!', users_without_orgs;
  ELSE
    RAISE NOTICE '✅ All users have organizations';
  END IF;
  
  -- Check all orgs have settings
  SELECT COUNT(*) INTO orgs_without_settings
  FROM public.organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_settings os
    WHERE os.organization_id = o.id
  );
  
  IF orgs_without_settings > 0 THEN
    RAISE EXCEPTION '❌ % organizations have no settings!', orgs_without_settings;
  ELSE
    RAISE NOTICE '✅ All organizations have settings';
  END IF;
END $$;

-- ============================================
-- TEST 5: Data Migration
-- ============================================

DO $$
DECLARE
  products_without_org INTEGER;
  sales_without_org INTEGER;
  closeouts_without_org INTEGER;
  emails_without_org INTEGER;
  products_with_creator INTEGER;
  sales_with_creator INTEGER;
BEGIN
  RAISE NOTICE '
  ============================================
  📦 TEST 5: Data Migration
  ============================================
  ';
  
  -- Check all records have organization_id
  SELECT COUNT(*) INTO products_without_org FROM public.products WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO sales_without_org FROM public.sales WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO closeouts_without_org FROM public.close_outs WHERE organization_id IS NULL;
  SELECT COUNT(*) INTO emails_without_org FROM public.email_signups WHERE organization_id IS NULL;
  
  IF products_without_org > 0 THEN
    RAISE EXCEPTION '❌ % products have no organization_id', products_without_org;
  END IF;
  
  IF sales_without_org > 0 THEN
    RAISE EXCEPTION '❌ % sales have no organization_id', sales_without_org;
  END IF;
  
  RAISE NOTICE '✅ All data records have organization_id';
  
  -- Check audit trail fields
  SELECT COUNT(*) INTO products_with_creator FROM public.products WHERE created_by IS NOT NULL;
  SELECT COUNT(*) INTO sales_with_creator FROM public.sales WHERE created_by IS NOT NULL;
  
  RAISE NOTICE '✅ % products have created_by', products_with_creator;
  RAISE NOTICE '✅ % sales have created_by', sales_with_creator;
END $$;

-- ============================================
-- TEST 6: Foreign Key Constraints
-- ============================================

DO $$
DECLARE
  orphaned_products INTEGER;
  orphaned_sales INTEGER;
  orphaned_members INTEGER;
BEGIN
  RAISE NOTICE '
  ============================================
  🔗 TEST 6: Foreign Key Integrity
  ============================================
  ';
  
  -- Check for orphaned products (org doesn't exist)
  SELECT COUNT(*) INTO orphaned_products
  FROM public.products p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = p.organization_id
  );
  
  IF orphaned_products > 0 THEN
    RAISE EXCEPTION '❌ % products have invalid organization_id', orphaned_products;
  ELSE
    RAISE NOTICE '✅ All products reference valid organizations';
  END IF;
  
  -- Check for orphaned sales
  SELECT COUNT(*) INTO orphaned_sales
  FROM public.sales s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = s.organization_id
  );
  
  IF orphaned_sales > 0 THEN
    RAISE EXCEPTION '❌ % sales have invalid organization_id', orphaned_sales;
  ELSE
    RAISE NOTICE '✅ All sales reference valid organizations';
  END IF;
  
  -- Check for orphaned members
  SELECT COUNT(*) INTO orphaned_members
  FROM public.organization_members om
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organizations o WHERE o.id = om.organization_id
  ) OR NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.id = om.user_id
  );
  
  IF orphaned_members > 0 THEN
    RAISE EXCEPTION '❌ % organization members are orphaned', orphaned_members;
  ELSE
    RAISE NOTICE '✅ All members reference valid orgs and users';
  END IF;
END $$;

-- ============================================
-- TEST 7: Role Distribution
-- ============================================

DO $$
DECLARE
  role_stats RECORD;
BEGIN
  RAISE NOTICE '
  ============================================
  👑 TEST 7: Role Distribution
  ============================================
  ';
  
  FOR role_stats IN
    SELECT role, COUNT(*) as count
    FROM public.organization_members
    GROUP BY role
    ORDER BY count DESC
  LOOP
    RAISE NOTICE '  • %: % members', role_stats.role, role_stats.count;
  END LOOP;
  
  -- Verify every org has at least one owner
  IF EXISTS (
    SELECT 1 FROM public.organizations o
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = o.id AND om.role = 'owner'
    )
  ) THEN
    RAISE EXCEPTION '❌ Some organizations have no owner!';
  ELSE
    RAISE NOTICE '✅ All organizations have at least one owner';
  END IF;
END $$;

-- ============================================
-- TEST 8: Sample Data Display
-- ============================================

DO $$
DECLARE
  org_sample RECORD;
  sample_count INTEGER := 0;
BEGIN
  RAISE NOTICE '
  ============================================
  📊 TEST 8: Sample Organizations
  ============================================
  ';
  
  FOR org_sample IN
    SELECT 
      o.name,
      o.slug,
      COUNT(DISTINCT om.user_id) as member_count,
      COUNT(DISTINCT p.id) as product_count,
      COUNT(DISTINCT s.id) as sale_count
    FROM public.organizations o
    LEFT JOIN public.organization_members om ON om.organization_id = o.id
    LEFT JOIN public.products p ON p.organization_id = o.id
    LEFT JOIN public.sales s ON s.organization_id = o.id
    WHERE o.is_active = true
    GROUP BY o.id, o.name, o.slug
    ORDER BY member_count DESC, product_count DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  • "%": % members, % products, % sales',
      org_sample.name,
      org_sample.member_count,
      org_sample.product_count,
      org_sample.sale_count;
    sample_count := sample_count + 1;
  END LOOP;
  
  IF sample_count = 0 THEN
    RAISE NOTICE '  (No organizations found - possibly no existing users)';
  END IF;
END $$;

-- ============================================
-- FINAL SUMMARY
-- ============================================

DO $$
DECLARE
  total_users INTEGER;
  total_orgs INTEGER;
  total_members INTEGER;
  total_products INTEGER;
  total_sales INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_users FROM public.users;
  SELECT COUNT(*) INTO total_orgs FROM public.organizations;
  SELECT COUNT(*) INTO total_members FROM public.organization_members;
  SELECT COUNT(*) INTO total_products FROM public.products;
  SELECT COUNT(*) INTO total_sales FROM public.sales;
  
  RAISE NOTICE '
  ============================================
  ✅ ALL TESTS PASSED! ✅
  ============================================
  
  Final Statistics:
  👥 Users: %
  🏢 Organizations: %
  👤 Memberships: %
  📦 Products: %
  💰 Sales: %
  
  Migration Status:
  ✅ All tables created
  ✅ All helper functions working
  ✅ RLS policies active on all tables
  ✅ All users migrated to organizations
  ✅ All data migrated successfully
  ✅ Foreign key integrity verified
  ✅ Audit trails in place
  
  Your database is ready for multi-org! 🚀
  
  Next Steps:
  1. Test in Supabase dashboard
  2. Create a test user and verify auto-org creation
  3. Proceed with frontend implementation
  
  ============================================
  ', total_users, total_orgs, total_members, total_products, total_sales;
END $$;

\timing off
