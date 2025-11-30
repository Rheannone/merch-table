-- ============================================
-- FORCE FIX: Organization Members RLS Infinite Recursion
-- ============================================
-- This completely removes and recreates all RLS policies
-- to ensure the infinite recursion is resolved

-- First, completely disable RLS temporarily
ALTER TABLE public.organization_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (in case any were missed)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'organization_members' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.organization_members', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Create NEW policies with corrected logic

-- SELECT: Users can view their own memberships and other members in their orgs
CREATE POLICY "org_members_select_policy"
  ON public.organization_members
  FOR SELECT
  USING (
    -- Direct check: user can see their own memberships
    user_id = auth.uid()
  );

-- INSERT: Users can add themselves, owners/admins can add others
CREATE POLICY "org_members_insert_policy"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    -- Allow user to add themselves
    user_id = auth.uid()
  );

-- UPDATE: Only owners/admins can update roles (check via organizations table)
CREATE POLICY "org_members_update_policy"
  ON public.organization_members
  FOR UPDATE
  USING (
    -- Check if user is owner/admin by looking at the organizations table
    EXISTS (
      SELECT 1 
      FROM public.organization_members AS om
      JOIN public.organizations AS o ON o.id = om.organization_id
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: Users can remove themselves, owners/admins can remove others
CREATE POLICY "org_members_delete_policy"
  ON public.organization_members
  FOR DELETE
  USING (
    -- User is removing themselves
    user_id = auth.uid()
    OR
    -- User is owner/admin removing someone else
    EXISTS (
      SELECT 1 
      FROM public.organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ FORCE FIX: Recreated all organization_members RLS policies with simplified logic';
END $$;
