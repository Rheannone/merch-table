-- ============================================
-- DIAGNOSTIC: Check Auth Setup Before Applying Fix
-- ============================================
-- Run this in Supabase SQL Editor to diagnose the issue
-- Copy the output and share it to get targeted help

DO $$
DECLARE
  trigger_count INTEGER;
  grant_count INTEGER;
  policy_count INTEGER;
  rec RECORD;
BEGIN
  RAISE NOTICE '
  ============================================
  🔍 DIAGNOSTIC REPORT: Auth Setup
  ============================================
  ';
  
  -- ============================================
  -- 1. CHECK TRIGGERS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '1️⃣ CHECKING TRIGGERS:';
  RAISE NOTICE '--------------------';
  
  -- Check on_auth_user_created trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ on_auth_user_created EXISTS (auth.users → public.users)';
  ELSE
    RAISE NOTICE '❌ on_auth_user_created MISSING! (This will cause sign-in to fail)';
  END IF;
  
  -- Check on_user_created_create_org trigger
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_user_created_create_org'
    AND event_object_table = 'users'
    AND event_object_schema = 'public';
  
  IF trigger_count > 0 THEN
    RAISE NOTICE '✅ on_user_created_create_org EXISTS (creates organization)';
  ELSE
    RAISE NOTICE '⚠️  on_user_created_create_org MISSING (org creation will fail)';
  END IF;
  
  -- ============================================
  -- 2. CHECK FUNCTIONS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '2️⃣ CHECKING FUNCTIONS:';
  RAISE NOTICE '--------------------';
  
  -- Check handle_new_user function
  PERFORM 1 FROM pg_proc 
  WHERE proname = 'handle_new_user' 
    AND pronamespace = 'public'::regnamespace;
  
  IF FOUND THEN
    RAISE NOTICE '✅ handle_new_user() function EXISTS';
  ELSE
    RAISE NOTICE '❌ handle_new_user() function MISSING!';
  END IF;
  
  -- Check auto_create_personal_organization function
  PERFORM 1 FROM pg_proc 
  WHERE proname = 'auto_create_personal_organization' 
    AND pronamespace = 'public'::regnamespace;
  
  IF FOUND THEN
    RAISE NOTICE '✅ auto_create_personal_organization() function EXISTS';
  ELSE
    RAISE NOTICE '❌ auto_create_personal_organization() function MISSING!';
  END IF;
  
  -- ============================================
  -- 3. CHECK GRANTS ON USERS TABLE
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '3️⃣ CHECKING GRANTS ON public.users:';
  RAISE NOTICE '------------------------------------';
  
  -- Check authenticated role
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND grantee = 'authenticated'
    AND privilege_type = 'INSERT';
  
  IF grant_count > 0 THEN
    RAISE NOTICE '✅ authenticated role has INSERT on public.users';
  ELSE
    RAISE NOTICE '❌ authenticated role MISSING INSERT grant (likely the issue!)';
  END IF;
  
  -- Check service_role
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND grantee = 'service_role';
  
  IF grant_count > 0 THEN
    RAISE NOTICE '✅ service_role has grants on public.users';
  ELSE
    RAISE NOTICE '⚠️  service_role MISSING grants (triggers may fail)';
  END IF;
  
  -- Show all grants
  RAISE NOTICE '';
  RAISE NOTICE 'Current grants on public.users:';
  FOR rec IN (
    SELECT DISTINCT grantee
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
      AND table_name = 'users'
    ORDER BY grantee
  ) LOOP
    RAISE NOTICE '  - % has access', rec.grantee;
  END LOOP;
  
  -- ============================================
  -- 4. CHECK RLS POLICIES
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '4️⃣ CHECKING RLS POLICIES ON public.users:';
  RAISE NOTICE '----------------------------------------';
  
  -- Check if RLS is enabled
  PERFORM 1 FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = 'users' 
    AND rowsecurity = true;
  
  IF FOUND THEN
    RAISE NOTICE '✅ RLS is ENABLED on public.users';
  ELSE
    RAISE NOTICE '⚠️  RLS is DISABLED on public.users';
  END IF;
  
  -- Check for insert policy
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'users'
    AND cmd = 'INSERT';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ INSERT policy exists on public.users (count: %)', policy_count;
  ELSE
    RAISE NOTICE '❌ No INSERT policy on public.users (will block inserts!)';
  END IF;
  
  -- Show all policies
  RAISE NOTICE '';
  RAISE NOTICE 'Current RLS policies on public.users:';
  FOR rec IN (
    SELECT policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'users'
    ORDER BY policyname
  ) LOOP
    RAISE NOTICE '  - %: %', rec.policyname, rec.cmd;
  END LOOP;
  
  -- ============================================
  -- 5. CHECK ORGANIZATIONS SETUP
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '5️⃣ CHECKING ORGANIZATIONS SETUP:';
  RAISE NOTICE '-------------------------------';
  
  -- Check if organizations table exists
  PERFORM 1 FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = 'organizations';
  
  IF FOUND THEN
    RAISE NOTICE '✅ organizations table EXISTS';
    
    -- Count organizations
    EXECUTE 'SELECT COUNT(*) FROM public.organizations' INTO grant_count;
    RAISE NOTICE '  - Total organizations: %', grant_count;
  ELSE
    RAISE NOTICE '❌ organizations table MISSING!';
  END IF;
  
  -- Check if organization_members table exists
  PERFORM 1 FROM pg_tables 
  WHERE schemaname = 'public' 
    AND tablename = 'organization_members';
  
  IF FOUND THEN
    RAISE NOTICE '✅ organization_members table EXISTS';
    
    -- Count members
    EXECUTE 'SELECT COUNT(*) FROM public.organization_members' INTO grant_count;
    RAISE NOTICE '  - Total memberships: %', grant_count;
  ELSE
    RAISE NOTICE '❌ organization_members table MISSING!';
  END IF;
  
  -- ============================================
  -- 6. CHECK RECENT USERS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '6️⃣ RECENT USERS:';
  RAISE NOTICE '---------------';
  
  -- Count users
  EXECUTE 'SELECT COUNT(*) FROM public.users' INTO grant_count;
  RAISE NOTICE 'Total users: %', grant_count;
  
  -- Show recent users
  IF grant_count > 0 THEN
    RAISE NOTICE '';
    RAISE NOTICE 'Most recent users:';
    FOR rec IN (
      SELECT email, created_at
      FROM public.users
      ORDER BY created_at DESC
      LIMIT 3
    ) LOOP
      RAISE NOTICE '  - % (created: %)', rec.email, rec.created_at::date;
    END LOOP;
  ELSE
    RAISE NOTICE 'No users in database yet';
  END IF;
  
  -- ============================================
  -- FINAL DIAGNOSIS
  -- ============================================
  RAISE NOTICE '';
  RAISE NOTICE '
  ============================================
  📋 DIAGNOSIS SUMMARY
  ============================================
  ';
  
  -- Determine the likely issue
  SELECT COUNT(*) INTO grant_count
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public'
    AND table_name = 'users'
    AND grantee IN ('authenticated', 'service_role')
    AND privilege_type = 'INSERT';
  
  IF grant_count < 2 THEN
    RAISE NOTICE '🐛 LIKELY ISSUE: Missing GRANT permissions on public.users';
    RAISE NOTICE '';
    RAISE NOTICE 'The "Database error saving new user" error is likely caused by';
    RAISE NOTICE 'missing INSERT grants on the public.users table.';
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIX: Run migration 029_fix_users_grants_and_trigger.sql';
  ELSE
    RAISE NOTICE '🤔 Grants look OK. The issue might be:';
    RAISE NOTICE '  - RLS policy blocking inserts';
    RAISE NOTICE '  - Trigger function error';
    RAISE NOTICE '  - Organization creation failure';
    RAISE NOTICE '';
    RAISE NOTICE '✅ FIX: Run migration 029 for improved error handling';
  END IF;
  
  RAISE NOTICE '
  ============================================
  ';
  
END $$;
