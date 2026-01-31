-- ============================================
-- MIGRATION 031: Complete Auth & Organization Fix
-- ============================================
-- This is the COMPLETE fix for new user sign-in issues
-- Run this ONCE to fix everything

-- ============================================
-- 1. ENSURE EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid()

-- ============================================
-- 2. FIX GRANTS ON ALL TABLES
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT ALL ON public.organizations TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT ALL ON public.organization_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;
GRANT ALL ON public.organization_settings TO service_role;

-- ============================================
-- 3. FIX HANDLE_NEW_USER TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  v_full_name TEXT;
  v_avatar_url TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'name', 
    split_part(NEW.email, '@', 1)
  );
  v_avatar_url := COALESCE(
    NEW.raw_user_meta_data->>'avatar_url', 
    NEW.raw_user_meta_data->>'picture'
  );
  
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (NEW.id, NEW.email, v_full_name, v_avatar_url, NOW(), NOW())
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. FIX AUTO_CREATE_PERSONAL_ORGANIZATION TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION auto_create_personal_organization()
RETURNS TRIGGER
SECURITY DEFINER
AS $$
DECLARE
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  v_full_name TEXT;
  slug_counter INTEGER := 1;
  final_slug TEXT;
BEGIN
  -- Generate org name
  v_full_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1));
  
  IF v_full_name IS NOT NULL AND length(trim(v_full_name)) > 0 THEN
    org_name := trim(v_full_name) || '''s Merch';
  ELSE
    org_name := split_part(NEW.email, '@', 1) || '''s Merch';
  END IF;
  
  -- Generate unique slug (simplified - no function call)
  org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
  org_slug := trim(both '-' from org_slug);
  
  -- Handle duplicates
  final_slug := org_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    slug_counter := slug_counter + 1;
    final_slug := org_slug || '-' || slug_counter;
  END LOOP;
  
  -- Create organization
  INSERT INTO public.organizations (id, name, slug, created_by, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, final_slug, NEW.id, true, NOW(), NOW())
  RETURNING id INTO org_id;
  
  -- Add user as owner
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW());
  
  -- Create settings
  INSERT INTO public.organization_settings (organization_id, settings, created_at, updated_at)
  VALUES (org_id, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_personal_organization failed for %: %', NEW.email, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_user_created_create_org ON public.users;
CREATE TRIGGER on_user_created_create_org
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_personal_organization();

-- ============================================
-- 5. FIX RLS POLICIES
-- ============================================

-- Users can see their own memberships
DROP POLICY IF EXISTS "users_see_own_memberships" ON public.organization_members;
DROP POLICY IF EXISTS "authenticated_can_view_own_memberships" ON public.organization_members;
CREATE POLICY "users_see_own_memberships" ON public.organization_members
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can see orgs they belong to
DROP POLICY IF EXISTS "users_see_member_orgs" ON public.organizations;
DROP POLICY IF EXISTS "authenticated_can_view_member_orgs" ON public.organizations;
CREATE POLICY "users_see_member_orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (
      SELECT organization_id 
      FROM public.organization_members 
      WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 6. FIX EXISTING USERS WITHOUT ORGS
-- ============================================
DO $$
DECLARE
  user_rec RECORD;
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  slug_counter INTEGER;
  final_slug TEXT;
  fixed INTEGER := 0;
BEGIN
  FOR user_rec IN 
    SELECT u.id, u.email, u.full_name
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om WHERE om.user_id = u.id
    )
  LOOP
    -- Generate org name
    org_name := COALESCE(user_rec.full_name, split_part(user_rec.email, '@', 1)) || '''s Merch';
    
    -- Generate slug
    org_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9]+', '-', 'g'));
    org_slug := trim(both '-' from org_slug);
    
    -- Handle duplicates
    slug_counter := 1;
    final_slug := org_slug;
    WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
      slug_counter := slug_counter + 1;
      final_slug := org_slug || '-' || slug_counter;
    END LOOP;
    
    -- Create org
    INSERT INTO public.organizations (id, name, slug, created_by, is_active)
    VALUES (gen_random_uuid(), org_name, final_slug, user_rec.id, true)
    RETURNING id INTO org_id;
    
    -- Add membership
    INSERT INTO public.organization_members (organization_id, user_id, role)
    VALUES (org_id, user_rec.id, 'owner')
    ON CONFLICT (organization_id, user_id) DO NOTHING;
    
    -- Create settings
    INSERT INTO public.organization_settings (organization_id, settings)
    VALUES (org_id, '{}'::jsonb)
    ON CONFLICT (organization_id) DO NOTHING;
    
    fixed := fixed + 1;
  END LOOP;
  
  RAISE NOTICE 'Fixed % users without organizations', fixed;
END $$;

-- ============================================
-- DONE
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 031 COMPLETE
  ============================================
  
  This migration fixed:
  ✅ All GRANT permissions
  ✅ UUID generation (uses gen_random_uuid)
  ✅ Trigger functions with proper error handling
  ✅ RLS policies without recursion
  ✅ Existing users without organizations
  
  Test with a NEW Google account now.
  ============================================
  ';
END $$;
