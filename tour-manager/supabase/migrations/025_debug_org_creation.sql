-- ============================================
-- DEBUG: Test organization creation manually
-- ============================================

-- First, let's see what user is trying to create the org
DO $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  
  RAISE NOTICE 'Current user ID: %', current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE 'ERROR: No authenticated user! This is the problem!';
  ELSE
    RAISE NOTICE 'User is authenticated, proceeding with test insert...';
    
    -- Try to insert a test organization
    BEGIN
      INSERT INTO public.organizations (name, description, created_by)
      VALUES ('Test Org', 'Testing RLS', current_user_id);
      
      RAISE NOTICE '✅ SUCCESS: Test organization created!';
      
      -- Clean up
      DELETE FROM public.organizations WHERE name = 'Test Org' AND created_by = current_user_id;
      RAISE NOTICE 'Test org cleaned up';
      
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'ERROR inserting: % %', SQLERRM, SQLSTATE;
    END;
  END IF;
END $$;

-- Let's also check if RLS is even enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE tablename = 'organizations'
  AND schemaname = 'public';

-- And show all current policies
SELECT 
  policyname,
  cmd as "Command",
  roles as "Roles",
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies
WHERE tablename = 'organizations'
  AND schemaname = 'public';
