-- ============================================
-- FIX: Organizations INSERT RLS Policy (Take 2)
-- ============================================
-- Need to:
-- 1. Fix INSERT policy to allow created_by = auth.uid()
-- 2. Add trigger to auto-add creator as owner

-- Drop and recreate INSERT policy
DROP POLICY IF EXISTS "org_insert_policy" ON public.organizations;

CREATE POLICY "org_insert_policy"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    created_by = auth.uid()
  );

-- ============================================
-- Add trigger to auto-add creator as owner
-- ============================================

CREATE OR REPLACE FUNCTION add_creator_as_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Add the creator as owner in organization_members
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (NEW.id, NEW.created_by, 'owner', NULL);
  
  RAISE NOTICE '✅ Added creator as owner of organization: %', NEW.name;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS on_organization_created_add_owner ON public.organizations;

-- Create trigger
CREATE TRIGGER on_organization_created_add_owner
  AFTER INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION add_creator_as_owner();

DO $$
BEGIN
  RAISE NOTICE '✅ Fixed organizations INSERT policy and added auto-owner trigger';
END $$;
