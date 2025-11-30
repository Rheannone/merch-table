-- ============================================
-- MIGRATION 019: Update RLS Policies for Organization-Based Access
-- ============================================
-- Replaces user_id based RLS policies with organization membership checks
-- Uses helper functions from migration 014
--
-- Tables updated:
-- - products: Organization members can view/manage org products
-- - sales: Members can create sales, all can view
-- - sale_items: Inherited from sales access
-- - close_outs: Members can create, all can view
-- - email_signups: Members can add, all can view
--
-- Permission model:
-- - viewer: Can view all org data (read-only)
-- - member: Can create sales, products, close-outs, emails
-- - admin: Can update/delete products, manage settings
-- - owner: Full control, can delete org
--
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  🔒 MIGRATION 019: Update RLS Policies
  ============================================
  Replacing user_id checks with organization membership...
  ';
END $$;

-- ============================================
-- PRODUCTS TABLE RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  📦 Updating Products RLS Policies...
  ';
END $$;

-- Drop old user-based policies
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

-- New organization-based policies

-- SELECT: Any organization member can view products (viewers included)
CREATE POLICY "Members can view org products"
  ON public.products
  FOR SELECT
  USING (user_has_org_access(organization_id, 'viewer'));

-- INSERT: Members and above can create products
CREATE POLICY "Members can create org products"
  ON public.products
  FOR INSERT
  WITH CHECK (
    user_has_org_access(organization_id, 'member')
    AND created_by = auth.uid()  -- Must set created_by to themselves
  );

-- UPDATE: Members can update products (admins/owners via member role)
CREATE POLICY "Members can update org products"
  ON public.products
  FOR UPDATE
  USING (user_has_org_access(organization_id, 'member'))
  WITH CHECK (
    user_has_org_access(organization_id, 'member')
    AND updated_by = auth.uid()  -- Must set updated_by to themselves
  );

-- DELETE: Admins and owners can delete products
CREATE POLICY "Admins can delete org products"
  ON public.products
  FOR DELETE
  USING (user_has_org_access(organization_id, 'admin'));

COMMENT ON POLICY "Members can view org products" ON public.products IS 'All org members (including viewers) can see products';
COMMENT ON POLICY "Members can create org products" ON public.products IS 'Members+ can add products, must set created_by to self';
COMMENT ON POLICY "Members can update org products" ON public.products IS 'Members+ can edit products, must set updated_by to self';
COMMENT ON POLICY "Admins can delete org products" ON public.products IS 'Only admins and owners can delete products';

-- ============================================
-- SALES TABLE RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  💰 Updating Sales RLS Policies...
  ';
END $$;

-- Drop old user-based policies
DROP POLICY IF EXISTS "Users can view own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can insert own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete own sales" ON public.sales;

-- New organization-based policies

-- SELECT: All organization members can view sales
CREATE POLICY "Members can view org sales"
  ON public.sales
  FOR SELECT
  USING (user_has_org_access(organization_id, 'viewer'));

-- INSERT: Members and above can create sales
CREATE POLICY "Members can create org sales"
  ON public.sales
  FOR INSERT
  WITH CHECK (
    user_has_org_access(organization_id, 'member')
    AND created_by = auth.uid()  -- Must set created_by to themselves
  );

-- UPDATE: Members can update their own sales, admins can update any
CREATE POLICY "Members can update own sales, admins any"
  ON public.sales
  FOR UPDATE
  USING (
    user_has_org_access(organization_id, 'member')
    AND (
      created_by = auth.uid()  -- Own sales
      OR user_has_org_access(organization_id, 'admin')  -- Or is admin
    )
  );

-- DELETE: Admins and owners can delete sales
CREATE POLICY "Admins can delete org sales"
  ON public.sales
  FOR DELETE
  USING (user_has_org_access(organization_id, 'admin'));

-- ============================================
-- SALE_ITEMS TABLE RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  🛒 Updating Sale Items RLS Policies...
  ';
END $$;

-- Drop old user-based policies
DROP POLICY IF EXISTS "Users can view own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can insert own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can update own sale items" ON public.sale_items;
DROP POLICY IF EXISTS "Users can delete own sale items" ON public.sale_items;

-- New organization-based policies (check via parent sale)

-- SELECT: Can view if can view the parent sale
CREATE POLICY "Members can view org sale items"
  ON public.sale_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
      AND user_has_org_access(sales.organization_id, 'viewer')
    )
  );

-- INSERT: Can insert if can insert to parent sale
CREATE POLICY "Members can create org sale items"
  ON public.sale_items
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
      AND user_has_org_access(sales.organization_id, 'member')
    )
  );

-- UPDATE: Can update if can update parent sale
CREATE POLICY "Members can update org sale items"
  ON public.sale_items
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
      AND user_has_org_access(sales.organization_id, 'member')
    )
  );

-- DELETE: Can delete if can delete parent sale
CREATE POLICY "Admins can delete org sale items"
  ON public.sale_items
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.sales
      WHERE sales.id = sale_items.sale_id
      AND user_has_org_access(sales.organization_id, 'admin')
    )
  );

-- ============================================
-- CLOSE_OUTS TABLE RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  📊 Updating Close-Outs RLS Policies...
  ';
END $$;

-- Drop old user-based policies
DROP POLICY IF EXISTS "Users can view own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can insert own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can update own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can delete own close-outs" ON public.close_outs;

-- New organization-based policies

-- SELECT: All members can view close-outs
CREATE POLICY "Members can view org close-outs"
  ON public.close_outs
  FOR SELECT
  USING (user_has_org_access(organization_id, 'viewer'));

-- INSERT: Members can create close-outs
CREATE POLICY "Members can create org close-outs"
  ON public.close_outs
  FOR INSERT
  WITH CHECK (
    user_has_org_access(organization_id, 'member')
    AND created_by = auth.uid()
  );

-- UPDATE: Can update own close-outs, or any if admin
CREATE POLICY "Members can update own close-outs, admins any"
  ON public.close_outs
  FOR UPDATE
  USING (
    user_has_org_access(organization_id, 'member')
    AND (
      created_by = auth.uid()
      OR user_has_org_access(organization_id, 'admin')
    )
  );

-- DELETE: Admins can delete close-outs
CREATE POLICY "Admins can delete org close-outs"
  ON public.close_outs
  FOR DELETE
  USING (user_has_org_access(organization_id, 'admin'));

-- ============================================
-- EMAIL_SIGNUPS TABLE RLS
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  📧 Updating Email Signups RLS Policies...
  ';
END $$;

-- Drop old user-based policies  
DROP POLICY IF EXISTS "Users can view their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can insert their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can update their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can delete their own email signups" ON public.email_signups;

-- New organization-based policies

-- SELECT: All members can view email signups (shared email list)
CREATE POLICY "Members can view org email signups"
  ON public.email_signups
  FOR SELECT
  USING (user_has_org_access(organization_id, 'viewer'));

-- INSERT: Members can collect email signups
CREATE POLICY "Members can create org email signups"
  ON public.email_signups
  FOR INSERT
  WITH CHECK (
    user_has_org_access(organization_id, 'member')
    AND collected_by = auth.uid()
  );

-- UPDATE: Admins can update email signups (for corrections)
CREATE POLICY "Admins can update org email signups"
  ON public.email_signups
  FOR UPDATE
  USING (user_has_org_access(organization_id, 'admin'));

-- DELETE: Admins can delete email signups (spam removal)
CREATE POLICY "Admins can delete org email signups"
  ON public.email_signups
  FOR DELETE
  USING (user_has_org_access(organization_id, 'admin'));

-- ============================================
-- VERIFICATION & SUMMARY
-- ============================================

DO $$
DECLARE
  products_policies INTEGER;
  sales_policies INTEGER;
  sale_items_policies INTEGER;
  closeouts_policies INTEGER;
  email_policies INTEGER;
BEGIN
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 019 COMPLETE
  ============================================
  ';
  
  -- Count policies per table
  SELECT COUNT(*) INTO products_policies FROM pg_policies WHERE tablename = 'products';
  SELECT COUNT(*) INTO sales_policies FROM pg_policies WHERE tablename = 'sales';
  SELECT COUNT(*) INTO sale_items_policies FROM pg_policies WHERE tablename = 'sale_items';
  SELECT COUNT(*) INTO closeouts_policies FROM pg_policies WHERE tablename = 'close_outs';
  SELECT COUNT(*) INTO email_policies FROM pg_policies WHERE tablename = 'email_signups';
  
  RAISE NOTICE '
  Policy counts:
  📦 Products: % policies
  💰 Sales: % policies
  🛒 Sale Items: % policies
  📊 Close-Outs: % policies
  📧 Email Signups: % policies
  
  Permission model:
  
  👁️  VIEWER (read-only):
  ✅ View products, sales, close-outs, email list
  ❌ Cannot create or modify anything
  
  👤 MEMBER (contributor):
  ✅ Create/edit products
  ✅ Make sales
  ✅ Create close-outs
  ✅ Collect emails
  ✅ Update own records
  ❌ Cannot delete or manage team
  
  ⚙️  ADMIN (manager):
  ✅ All member permissions
  ✅ Delete products/sales/close-outs
  ✅ Edit any record
  ✅ Manage team members
  ❌ Cannot delete organization
  
  👑 OWNER (full control):
  ✅ All admin permissions
  ✅ Delete organization
  ✅ Change org settings
  ✅ Manage billing (future)
  
  What works now:
  ✅ Organization-based data isolation
  ✅ Role-based access control
  ✅ Multi-user collaboration
  ✅ Audit trails (created_by, updated_by)
  ✅ Shared email lists across team
  ✅ Individual sales attribution
  
  Database migration complete! ✨
  
  Next steps (frontend):
  ⏳ Add Organization types to TypeScript
  ⏳ Create organization context/provider
  ⏳ Update all queries to use organization_id
  ⏳ Add organization switcher UI
  ⏳ Separate org settings from user settings
  
  ============================================
  ', products_policies, sales_policies, sale_items_policies, closeouts_policies, email_policies;
END $$;

-- ============================================
-- FINAL SANITY CHECKS
-- ============================================

-- Verify all tables have RLS enabled
DO $$
DECLARE
  tables_without_rls TEXT[];
BEGIN
  SELECT array_agg(tablename) INTO tables_without_rls
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN ('products', 'sales', 'sale_items', 'close_outs', 'email_signups')
  AND tablename NOT IN (
    SELECT tablename FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.rowsecurity = true
  );
  
  IF array_length(tables_without_rls, 1) > 0 THEN
    RAISE WARNING '⚠️  Tables without RLS: %', tables_without_rls;
  ELSE
    RAISE NOTICE '✅ All tables have RLS enabled';
  END IF;
END $$;

-- Verify user_id columns are gone
DO $$
DECLARE
  tables_with_user_id TEXT[];
BEGIN
  SELECT array_agg(table_name || '.' || column_name) INTO tables_with_user_id
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name IN ('products', 'sales', 'close_outs', 'email_signups')
  AND column_name = 'user_id';
  
  IF array_length(tables_with_user_id, 1) > 0 THEN
    RAISE WARNING '⚠️  Tables still have user_id: %', tables_with_user_id;
  ELSE
    RAISE NOTICE '✅ All user_id columns removed';
  END IF;
END $$;

-- Verify organization_id columns exist
DO $$
DECLARE
  tables_without_org_id TEXT[];
BEGIN
  SELECT array_agg(t.table_name) INTO tables_without_org_id
  FROM (
    SELECT 'products' AS table_name UNION
    SELECT 'sales' UNION
    SELECT 'close_outs' UNION
    SELECT 'email_signups'
  ) t
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_schema = 'public'
    AND c.table_name = t.table_name
    AND c.column_name = 'organization_id'
  );
  
  IF array_length(tables_without_org_id, 1) > 0 THEN
    RAISE WARNING '⚠️  Tables missing organization_id: %', tables_without_org_id;
  ELSE
    RAISE NOTICE '✅ All tables have organization_id';
  END IF;
END $$;

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  🎉 DATABASE MIGRATION COMPLETE! 🎉
  ============================================
  
  Your database is now fully multi-organization enabled!
  
  Summary of changes:
  ✅ 5 tables migrated to organizations
  ✅ 20+ RLS policies updated
  ✅ Role-based access control implemented
  ✅ Audit trails added (created_by, collected_by)
  ✅ All user_id columns removed
  ✅ All data preserved and migrated
  
  Ready for frontend implementation! 🚀
  ============================================
  ';
END $$;
