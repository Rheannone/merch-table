-- ============================================
-- DIAGNOSTIC: Check Auth Setup (Returns Results)
-- ============================================
-- This version returns data you can see in the Results tab

-- 1. CHECK TRIGGERS
SELECT 
  '1. TRIGGERS' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created'
        AND event_object_table = 'users'
        AND event_object_schema = 'auth'
    ) THEN '✅ on_auth_user_created EXISTS'
    ELSE '❌ on_auth_user_created MISSING - WILL CAUSE SIGN-IN TO FAIL'
  END as status

UNION ALL

SELECT 
  '1. TRIGGERS' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.triggers
      WHERE trigger_name = 'on_user_created_create_org'
        AND event_object_table = 'users'
        AND event_object_schema = 'public'
    ) THEN '✅ on_user_created_create_org EXISTS'
    ELSE '⚠️ on_user_created_create_org MISSING - ORG CREATION WILL FAIL'
  END as status

UNION ALL

-- 2. CHECK FUNCTIONS
SELECT 
  '2. FUNCTIONS' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'handle_new_user' 
        AND pronamespace = 'public'::regnamespace
    ) THEN '✅ handle_new_user() EXISTS'
    ELSE '❌ handle_new_user() MISSING'
  END as status

UNION ALL

SELECT 
  '2. FUNCTIONS' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'auto_create_personal_organization' 
        AND pronamespace = 'public'::regnamespace
    ) THEN '✅ auto_create_personal_organization() EXISTS'
    ELSE '❌ auto_create_personal_organization() MISSING'
  END as status

UNION ALL

-- 3. CHECK GRANTS ON USERS TABLE
SELECT 
  '3. GRANTS on public.users' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND grantee = 'authenticated'
        AND privilege_type = 'INSERT'
    ) THEN '✅ authenticated has INSERT grant'
    ELSE '❌ authenticated MISSING INSERT - THIS IS LIKELY THE PROBLEM!'
  END as status

UNION ALL

SELECT 
  '3. GRANTS on public.users' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.role_table_grants
      WHERE table_schema = 'public'
        AND table_name = 'users'
        AND grantee = 'service_role'
    ) THEN '✅ service_role has grants'
    ELSE '⚠️ service_role MISSING grants'
  END as status

UNION ALL

-- 4. CHECK RLS POLICIES
SELECT 
  '4. RLS POLICIES on public.users' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND rowsecurity = true
    ) THEN '✅ RLS is ENABLED'
    ELSE '⚠️ RLS is DISABLED'
  END as status

UNION ALL

SELECT 
  '4. RLS POLICIES on public.users' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'users'
        AND cmd = 'INSERT'
    ) THEN '✅ INSERT policy EXISTS'
    ELSE '❌ No INSERT policy - WILL BLOCK INSERTS!'
  END as status

UNION ALL

-- 5. CHECK ORGANIZATIONS
SELECT 
  '5. ORGANIZATIONS SETUP' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'organizations'
    ) THEN '✅ organizations table EXISTS'
    ELSE '❌ organizations table MISSING'
  END as status

UNION ALL

SELECT 
  '5. ORGANIZATIONS SETUP' as check_category,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename = 'organization_members'
    ) THEN '✅ organization_members table EXISTS'
    ELSE '❌ organization_members table MISSING'
  END as status

ORDER BY check_category, status;
