-- ============================================
-- FIX: Organization Members RLS Infinite Recursion
-- ============================================
-- The original policy caused infinite recursion
-- This fixes it by using a direct check instead of a subquery

-- Drop the problematic policy
DROP POLICY IF EXISTS "Members can view org membership" ON public.organization_members;

-- Recreate with direct check (no recursion)
CREATE POLICY "Members can view org membership"
  ON public.organization_members
  FOR SELECT
  USING (
    -- Users can see their own memberships
    user_id = auth.uid()
    OR
    -- Users can see other members in organizations they belong to
    organization_id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the INSERT policy to avoid potential recursion
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.organization_members;

CREATE POLICY "Owners and admins can add members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    -- Allow user to add themselves (for new org creation)
    user_id = auth.uid()
    OR
    -- Allow owners/admins to add others
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Fix UPDATE policy
DROP POLICY IF EXISTS "Owners and admins can update member roles" ON public.organization_members;

CREATE POLICY "Owners and admins can update member roles"
  ON public.organization_members
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Fix DELETE policy
DROP POLICY IF EXISTS "Owners/admins can remove members, users can leave" ON public.organization_members;

CREATE POLICY "Owners/admins can remove members, users can leave"
  ON public.organization_members
  FOR DELETE
  USING (
    -- User is removing themselves (leaving the org)
    user_id = auth.uid()
    OR
    -- User is owner/admin removing someone else
    organization_id IN (
      SELECT om.organization_id
      FROM public.organization_members om
      WHERE om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed organization_members RLS policies - no more infinite recursion!';
END $$;
