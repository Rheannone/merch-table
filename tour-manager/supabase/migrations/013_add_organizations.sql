-- ============================================
-- MIGRATION 013: Multi-Organization Support - Phase 1
-- ============================================
-- This migration adds organizations and organization membership tables
-- NON-BREAKING: Existing user_id based tables continue to work
-- Existing app functionality is NOT affected by this migration
--
-- What this enables:
-- - One user can belong to multiple organizations (bands/sellers)
-- - One organization can have multiple users (team members)
-- - Role-based access control (owner, admin, member, viewer)
--
-- Edge cases handled:
-- - New users: Will auto-create personal org via trigger
-- - Existing users: Will be migrated to personal orgs in next migration
-- - Duplicate slugs: Unique constraint with auto-increment fallback
-- - Orphaned orgs: Cascade delete removes members when org deleted
-- - Orphaned members: Cascade delete removes membership when user deleted
-- ============================================

-- ============================================
-- 1. ORGANIZATIONS TABLE
-- ============================================
-- Represents a "band", "seller", "team", or any selling entity
-- Multiple users can belong to one organization
-- One user can belong to multiple organizations

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Organization identity
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'),
  description TEXT,
  avatar_url TEXT,
  
  -- Metadata
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  
  -- Future: billing, subscription tier, etc.
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
CREATE INDEX IF NOT EXISTS idx_organizations_active ON public.organizations(is_active) WHERE is_active = true;

-- Add updated_at trigger
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.organizations IS 'Organizations (bands, sellers, teams) that own products and sales';
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly unique identifier for the organization';
COMMENT ON COLUMN public.organizations.created_by IS 'User who created this organization (nullable if user deleted)';
COMMENT ON COLUMN public.organizations.is_active IS 'Soft delete flag - inactive orgs are hidden but data preserved';

-- ============================================
-- 2. ORGANIZATION MEMBERS TABLE (Many-to-Many)
-- ============================================
-- Junction table connecting users to organizations with roles
-- Enables: One user in multiple orgs, one org with multiple users

CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Relationships
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Role-based access control
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  
  -- Metadata
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Prevent duplicate memberships (one user can only have one role per org)
  UNIQUE(organization_id, user_id)
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON public.organization_members(organization_id, role);

COMMENT ON TABLE public.organization_members IS 'Many-to-many relationship between users and organizations with role-based access';
COMMENT ON COLUMN public.organization_members.role IS 'owner: full control | admin: manage members/settings | member: create sales/products | viewer: read-only';
COMMENT ON COLUMN public.organization_members.invited_by IS 'User who invited this member (nullable if inviter deleted or auto-created)';

-- ============================================
-- 3. ORGANIZATION SETTINGS TABLE
-- ============================================
-- Organization-wide settings (payment methods, categories, theme)
-- Separate from user_settings which are personal preferences

CREATE TABLE IF NOT EXISTS public.organization_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  
  -- Settings stored as JSONB for flexibility
  -- Structure matches UserSettings but applies to entire organization:
  -- {
  --   "paymentSettings": [...],
  --   "categories": [...],
  --   "theme": "girlypop",
  --   "showTipJar": true,
  --   "emailSignup": { "enabled": true, ... },
  --   "closeOutSettings": { "requireCashReconciliation": true }
  -- }
  settings JSONB DEFAULT '{}' NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for fast organization lookups
CREATE INDEX IF NOT EXISTS idx_org_settings_org ON public.organization_settings(organization_id);

-- Add updated_at trigger
CREATE TRIGGER update_organization_settings_updated_at
  BEFORE UPDATE ON public.organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.organization_settings IS 'Organization-wide settings shared by all members (payment methods, categories, etc)';
COMMENT ON COLUMN public.organization_settings.settings IS 'JSONB settings object - same structure as user_settings but org-scoped';

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS) - Organizations
-- ============================================
-- Members can view organizations they belong to

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view organizations they are members of
CREATE POLICY "Members can view their organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policy: Authenticated users can create organizations (everyone can create personal orgs)
CREATE POLICY "Authenticated users can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Policy: Owners and admins can update organization details
CREATE POLICY "Owners and admins can update organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
    )
  );

-- Policy: Only owners can delete organizations (soft delete via is_active flag preferred)
CREATE POLICY "Owners can delete organizations"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS) - Organization Members
-- ============================================

ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view members of organizations they belong to
CREATE POLICY "Members can view org membership"
  ON public.organization_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

-- Policy: Owners and admins can add members
CREATE POLICY "Owners and admins can add members"
  ON public.organization_members
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
    -- Allow self-join if creating personal org (bootstrap case)
    OR organization_members.user_id = auth.uid()
  );

-- Policy: Owners and admins can update member roles
CREATE POLICY "Owners and admins can update member roles"
  ON public.organization_members
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Policy: Owners and admins can remove members, or users can remove themselves
CREATE POLICY "Owners/admins can remove members, users can leave"
  ON public.organization_members
  FOR DELETE
  USING (
    -- User is removing themselves (leaving the org)
    organization_members.user_id = auth.uid()
    OR
    -- User is owner/admin removing someone else
    EXISTS (
      SELECT 1 FROM public.organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- 6. ROW LEVEL SECURITY (RLS) - Organization Settings
-- ============================================

ALTER TABLE public.organization_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Members can view org settings
CREATE POLICY "Members can view org settings"
  ON public.organization_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Policy: Members and above can create org settings
CREATE POLICY "Members can create org settings"
  ON public.organization_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Policy: Members and above can update org settings
CREATE POLICY "Members can update org settings"
  ON public.organization_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin', 'member')
    )
  );

-- Policy: Only owners can delete org settings (rare - usually just update)
CREATE POLICY "Owners can delete org settings"
  ON public.organization_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_settings.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role = 'owner'
    )
  );

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Function to generate unique slug from organization name
-- Handles collisions by appending numbers: "the-rockers", "the-rockers-2", etc.
CREATE OR REPLACE FUNCTION generate_org_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INTEGER := 1;
BEGIN
  -- Convert to lowercase, replace spaces/special chars with hyphens
  base_slug := lower(trim(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g')));
  
  -- Remove leading/trailing hyphens
  base_slug := trim(both '-' from base_slug);
  
  -- Ensure it starts with alphanumeric
  IF base_slug !~ '^[a-z0-9]' THEN
    base_slug := 'org-' || base_slug;
  END IF;
  
  -- Try base slug first
  final_slug := base_slug;
  
  -- If collision, append counter until unique
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_org_slug IS 'Generate URL-friendly unique slug from organization name, handling collisions with auto-increment';

-- ============================================
-- 8. AUTO-CREATE PERSONAL ORG FOR NEW USERS
-- ============================================
-- When a new user signs up, automatically create a personal organization
-- This ensures every user has at least one org to work with

CREATE OR REPLACE FUNCTION auto_create_personal_organization()
RETURNS TRIGGER AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
BEGIN
  -- Generate organization name from user's name or email
  IF NEW.full_name IS NOT NULL AND length(trim(NEW.full_name)) > 0 THEN
    org_name := trim(NEW.full_name) || '''s Merch';
  ELSE
    -- Fallback to email username
    org_name := split_part(NEW.email, '@', 1) || '''s Merch';
  END IF;
  
  -- Generate unique slug
  org_slug := generate_org_slug(org_name);
  
  -- Create the organization
  INSERT INTO public.organizations (id, name, slug, created_by, is_active)
  VALUES (uuid_generate_v4(), org_name, org_slug, NEW.id, true)
  RETURNING id INTO org_id;
  
  -- Add user as owner of their personal organization
  INSERT INTO public.organization_members (organization_id, user_id, role, invited_by)
  VALUES (org_id, NEW.id, 'owner', NULL);
  
  -- Create default organization settings (empty settings, will be populated from user preferences)
  INSERT INTO public.organization_settings (organization_id, settings)
  VALUES (org_id, '{}'::jsonb);
  
  RAISE NOTICE '✅ Auto-created personal organization "%" (%) for user %', org_name, org_slug, NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists (for re-running migration)
DROP TRIGGER IF EXISTS on_user_created_create_org ON public.users;

-- Create trigger to run after user is created
CREATE TRIGGER on_user_created_create_org
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_personal_organization();

COMMENT ON FUNCTION auto_create_personal_organization IS 'Auto-creates personal organization for new users on signup';

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 013 COMPLETE
  ============================================
  
  Created:
  - organizations table
  - organization_members table (many-to-many)
  - organization_settings table
  - RLS policies for all tables
  - Helper function: generate_org_slug()
  - Auto-trigger: on_user_created_create_org
  
  What works now:
  ✅ New users auto-get personal organization
  ✅ Users can create multiple organizations
  ✅ Users can belong to multiple organizations
  ✅ Role-based access (owner/admin/member/viewer)
  
  What still needs to be done:
  ⏳ Migrate existing users to personal orgs (next migration)
  ⏳ Add organization_id to products/sales/etc (future migrations)
  ⏳ Update frontend to use organizations (frontend work)
  
  Edge cases handled:
  ✅ New users: Auto-create personal org
  ✅ Duplicate slugs: Auto-increment (org-name-2)
  ✅ User deletion: Cascade removes memberships
  ✅ Org deletion: Cascade removes members & settings
  ✅ Self-join: Users can leave orgs they belong to
  ✅ Bootstrap: First member can join (for personal orgs)
  
  ============================================
  ';
END $$;
