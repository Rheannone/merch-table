-- ============================================
-- NUCLEAR OPTION: Simplify RLS completely
-- ============================================

-- Temporarily disable RLS to test
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "organizations_select" ON public.organizations;
DROP POLICY IF EXISTS "organizations_insert" ON public.organizations;
DROP POLICY IF EXISTS "organizations_update" ON public.organizations;
DROP POLICY IF EXISTS "organizations_delete" ON public.organizations;

-- Re-enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create the SIMPLEST possible INSERT policy - just allow authenticated users
CREATE POLICY "allow_authenticated_insert"
  ON public.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Allow everything for now

-- Create simple SELECT policy
CREATE POLICY "allow_authenticated_select"
  ON public.organizations
  FOR SELECT
  TO authenticated
  USING (true);  -- Allow everything for now

-- Create simple UPDATE policy
CREATE POLICY "allow_authenticated_update"
  ON public.organizations
  FOR UPDATE
  TO authenticated
  USING (true);  -- Allow everything for now

-- Create simple DELETE policy
CREATE POLICY "allow_authenticated_delete"
  ON public.organizations
  FOR DELETE
  TO authenticated
  USING (true);  -- Allow everything for now

DO $$
BEGIN
  RAISE NOTICE '✅ Created ultra-permissive policies for testing - ALL authenticated users can do ANYTHING';
  RAISE NOTICE '⚠️  WARNING: These policies are NOT secure - only for debugging!';
END $$;
