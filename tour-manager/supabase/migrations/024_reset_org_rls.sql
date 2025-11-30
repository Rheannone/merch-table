-- ============================================
-- DIAGNOSTIC: Check current RLS policies
-- ============================================

-- Show all policies on organizations table
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== Current policies on organizations table ===';
  FOR pol IN 
    SELECT 
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Policy: % | Command: % | Roles: %', pol.policyname, pol.cmd, pol.roles;
    RAISE NOTICE '  USING: %', pol.qual;
    RAISE NOTICE '  WITH CHECK: %', pol.with_check;
  END LOOP;
END $$;

-- Now let's COMPLETELY RESET the organizations RLS
-- Drop ALL policies
DO $$ 
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== Dropping all existing policies ===';
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    RAISE NOTICE 'Dropped: %', pol.policyname;
  END LOOP;
END $$;

-- Recreate policies from scratch with the simplest possible rules
-- SELECT: Can see orgs where you are a member
CREATE POLICY "organizations_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Can create orgs where you are the creator
CREATE POLICY "organizations_insert"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
  );

-- UPDATE: Can update orgs where you are owner/admin
CREATE POLICY "organizations_update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- DELETE: Can delete orgs where you are owner
CREATE POLICY "organizations_delete"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT organization_id
      FROM public.organization_members
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- Show new policies
DO $$
DECLARE
  pol RECORD;
BEGIN
  RAISE NOTICE '=== New policies created ===';
  FOR pol IN 
    SELECT policyname, cmd
    FROM pg_policies 
    WHERE tablename = 'organizations' 
    AND schemaname = 'public'
  LOOP
    RAISE NOTICE 'Created: % (%)', pol.policyname, pol.cmd;
  END LOOP;
  
  RAISE NOTICE '✅ Reset all organizations RLS policies';
END $$;
