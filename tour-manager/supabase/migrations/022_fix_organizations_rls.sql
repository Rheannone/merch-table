-- ============================================
-- FIX: Organizations RLS Policies
-- ============================================
-- The INSERT policy is too restrictive and the SELECT policy
-- can cause recursion issues. Let's fix both.

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners and admins can update organizations" ON public.organizations;
DROP POLICY IF EXISTS "Owners can delete organizations" ON public.organizations;

-- SELECT: Users can view organizations they are members of
-- Use a simpler approach that doesn't cause recursion
CREATE POLICY "org_select_policy"
  ON public.organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- INSERT: Any authenticated user can create an organization
-- They will automatically become the owner via the trigger
CREATE POLICY "org_insert_policy"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- UPDATE: Only owners and admins can update
CREATE POLICY "org_update_policy"
  ON public.organizations
  FOR UPDATE
  USING (
    id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
    )
  );

-- DELETE: Only owners can delete
CREATE POLICY "org_delete_policy"
  ON public.organizations
  FOR DELETE
  USING (
    id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
        AND om.role = 'owner'
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed organizations RLS policies - creation now allowed for all authenticated users';
END $$;
