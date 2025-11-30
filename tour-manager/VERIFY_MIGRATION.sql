-- ============================================
-- Quick Migration Verification
-- ============================================
-- Run this to check your migration results

-- 1. Check how many organizations were created
SELECT 
  'Organizations' as table_name,
  COUNT(*) as count
FROM public.organizations;

-- 2. Check organization members
SELECT 
  o.name as organization,
  u.email as user_email,
  om.role,
  om.joined_at
FROM public.organization_members om
JOIN public.organizations o ON o.id = om.organization_id
JOIN auth.users u ON u.id = om.user_id
ORDER BY o.name, om.role;

-- 3. Check products migration
SELECT 
  'Products with organization_id' as metric,
  COUNT(*) as count
FROM public.products
WHERE organization_id IS NOT NULL;

-- 4. Check sales migration
SELECT 
  'Sales with organization_id' as metric,
  COUNT(*) as count
FROM public.sales
WHERE organization_id IS NOT NULL;

-- 5. Check close-outs migration
SELECT 
  'Close-outs with organization_id' as metric,
  COUNT(*) as count
FROM public.close_outs
WHERE organization_id IS NOT NULL;

-- 6. Check email signups migration
SELECT 
  'Email signups with organization_id' as metric,
  COUNT(*) as count
FROM public.email_signups
WHERE organization_id IS NOT NULL;

-- 7. Check RLS policies
SELECT 
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('products', 'sales', 'sale_items', 'close_outs', 'email_signups', 'organizations', 'organization_members')
GROUP BY schemaname, tablename
ORDER BY tablename;

-- 8. Summary
SELECT 
  'SUMMARY' as section,
  (SELECT COUNT(*) FROM organizations) as total_orgs,
  (SELECT COUNT(*) FROM organization_members) as total_memberships,
  (SELECT COUNT(*) FROM products WHERE organization_id IS NOT NULL) as products_migrated,
  (SELECT COUNT(*) FROM sales WHERE organization_id IS NOT NULL) as sales_migrated,
  (SELECT COUNT(*) FROM close_outs WHERE organization_id IS NOT NULL) as closeouts_migrated,
  (SELECT COUNT(*) FROM email_signups WHERE organization_id IS NOT NULL) as emails_migrated;
