-- ============================================
-- MIGRATION 014: Organization Access Helper Functions
-- ============================================
-- Provides utility functions for checking organization membership
-- and role-based permissions. These are used by RLS policies.
--
-- Functions created:
-- - user_has_org_access(): Check if user belongs to org with min role
-- - get_user_org_role(): Get user's role in an organization
-- - user_is_org_owner(): Quick check if user owns an org
-- - user_is_org_admin_or_above(): Quick check for admin+ permissions
--
-- Used by: All RLS policies in future migrations (products, sales, etc.)
-- ============================================

-- ============================================
-- 1. PRIMARY ACCESS FUNCTION
-- ============================================
-- Check if authenticated user has access to an organization
-- with at least the specified minimum role

CREATE OR REPLACE FUNCTION user_has_org_access(
  org_id UUID,
  min_role TEXT DEFAULT 'viewer'
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Get current authenticated user's role in the organization
  SELECT role INTO user_role
  FROM public.organization_members
  WHERE organization_id = org_id
  AND user_id = auth.uid();
  
  -- If user is not a member, return false
  IF user_role IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user's role meets minimum requirement
  -- Role hierarchy: owner > admin > member > viewer
  RETURN CASE min_role
    WHEN 'owner' THEN user_role = 'owner'
    WHEN 'admin' THEN user_role IN ('owner', 'admin')
    WHEN 'member' THEN user_role IN ('owner', 'admin', 'member')
    WHEN 'viewer' THEN user_role IN ('owner', 'admin', 'member', 'viewer')
    ELSE false  -- Invalid min_role
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_has_org_access IS 'Check if authenticated user has access to organization with minimum role. Returns false if user not authenticated or not a member.';

-- ============================================
-- 2. GET USER ROLE IN ORG
-- ============================================
-- Returns the user's role in an organization, or NULL if not a member

CREATE OR REPLACE FUNCTION get_user_org_role(org_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_org_role IS 'Get authenticated user''s role in organization. Returns NULL if not a member.';

-- ============================================
-- 3. QUICK ROLE CHECK FUNCTIONS
-- ============================================
-- Convenience functions for common permission checks

-- Check if user is owner of an organization
CREATE OR REPLACE FUNCTION user_is_org_owner(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role = 'owner'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_is_org_owner IS 'Quick check if user is owner of organization';

-- Check if user is admin or owner (admin+)
CREATE OR REPLACE FUNCTION user_is_org_admin_or_above(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_is_org_admin_or_above IS 'Quick check if user has admin or owner role in organization';

-- Check if user is at least a member (can create content)
CREATE OR REPLACE FUNCTION user_is_org_member_or_above(org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin', 'member')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION user_is_org_member_or_above IS 'Quick check if user has member, admin, or owner role';

-- ============================================
-- 4. USER'S ORGANIZATIONS QUERY FUNCTION
-- ============================================
-- Get all organizations the current user belongs to with their roles
-- Useful for dropdown menus, organization switchers, etc.

CREATE OR REPLACE FUNCTION get_user_organizations()
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  organization_slug TEXT,
  organization_avatar_url TEXT,
  user_role TEXT,
  joined_at TIMESTAMPTZ,
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.name,
    o.slug,
    o.avatar_url,
    om.role,
    om.joined_at,
    o.is_active
  FROM public.organizations o
  INNER JOIN public.organization_members om ON om.organization_id = o.id
  WHERE om.user_id = auth.uid()
  AND o.is_active = true
  ORDER BY om.joined_at ASC;  -- Oldest first (personal org will be first)
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_user_organizations IS 'Get all active organizations the authenticated user belongs to, with their roles';

-- ============================================
-- 5. ORGANIZATION MEMBER COUNT FUNCTION
-- ============================================
-- Count how many members an organization has
-- Useful for showing team size, enforcing limits, etc.

CREATE OR REPLACE FUNCTION get_org_member_count(org_id UUID)
RETURNS INTEGER AS $$
BEGIN
  -- Only return count if user has access to the org
  IF NOT user_has_org_access(org_id, 'viewer') THEN
    RETURN NULL;
  END IF;
  
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM public.organization_members
    WHERE organization_id = org_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION get_org_member_count IS 'Get member count for organization (only if user has access)';

-- ============================================
-- 6. VALIDATE ORGANIZATION ACCESS (throws error)
-- ============================================
-- Use this in functions/triggers to enforce access control
-- Throws descriptive error if user doesn't have access

CREATE OR REPLACE FUNCTION validate_org_access(
  org_id UUID,
  min_role TEXT DEFAULT 'viewer'
)
RETURNS VOID AS $$
BEGIN
  IF NOT user_has_org_access(org_id, min_role) THEN
    RAISE EXCEPTION 'Access denied: You need % role or above for this organization', min_role
      USING HINT = 'Check your organization membership and role';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION validate_org_access IS 'Validate user has access with minimum role, throws error if not. Use in functions/triggers.';

-- ============================================
-- 7. PERFORMANCE INDEXES
-- ============================================
-- Add indexes to support fast function execution
-- (Most already created in 013 migration, but adding here for completeness)

-- Composite index for role-based lookups (already exists, but ensuring)
CREATE INDEX IF NOT EXISTS idx_org_members_user_org_role 
  ON public.organization_members(user_id, organization_id, role);

-- Index for checking specific role memberships
CREATE INDEX IF NOT EXISTS idx_org_members_org_role 
  ON public.organization_members(organization_id, role)
  WHERE role IN ('owner', 'admin');

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 014 COMPLETE
  ============================================
  
  Created helper functions:
  ✅ user_has_org_access(org_id, min_role)
  ✅ get_user_org_role(org_id)
  ✅ user_is_org_owner(org_id)
  ✅ user_is_org_admin_or_above(org_id)
  ✅ user_is_org_member_or_above(org_id)
  ✅ get_user_organizations()
  ✅ get_org_member_count(org_id)
  ✅ validate_org_access(org_id, min_role)
  
  Performance optimizations:
  ✅ Functions marked STABLE for query optimization
  ✅ SECURITY DEFINER for consistent execution context
  ✅ Composite indexes for fast role lookups
  
  Usage examples:
  
  -- In RLS policies:
  CREATE POLICY "Members can view products" ON products
    FOR SELECT USING (user_has_org_access(organization_id, ''viewer''));
  
  -- Get user orgs:
  SELECT * FROM get_user_organizations();
  
  -- Check specific role:
  SELECT user_is_org_admin_or_above(''<org-id>'');
  
  -- In functions (throws error if no access):
  PERFORM validate_org_access(org_id, ''admin'');
  
  Ready for: Adding organization_id to data tables
  ============================================
  ';
END $$;
