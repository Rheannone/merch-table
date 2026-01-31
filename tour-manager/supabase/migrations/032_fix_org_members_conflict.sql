-- ============================================
-- Migration 032: Fix missing ON CONFLICT for organization_members
-- ============================================
-- Issue: auto_create_personal_organization trigger was failing with
-- "duplicate key value violates unique constraint organization_members_organization_id_user_id_key"
-- because the INSERT into organization_members was missing ON CONFLICT clause.
-- This caused entire auth transaction to rollback, removing user from auth.users.

-- Fix the trigger function to include ON CONFLICT
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
    org_name := trim(v_full_name) || '''s Organization';
  ELSE
    org_name := 'My Organization';
  END IF;
  
  -- Generate base slug (inline, no function dependency)
  org_slug := lower(regexp_replace(
    regexp_replace(trim(v_full_name), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  IF org_slug IS NULL OR length(org_slug) = 0 THEN
    org_slug := 'org';
  END IF;
  
  -- Ensure unique slug
  final_slug := org_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    final_slug := org_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  END LOOP;
  
  -- Create organization (with ON CONFLICT)
  INSERT INTO public.organizations (id, name, slug, created_by, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, final_slug, NEW.id, true, NOW(), NOW())
  ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
  RETURNING id INTO org_id;
  
  -- Add user as owner (NOW WITH ON CONFLICT - THIS IS THE FIX!)
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Create settings (already had ON CONFLICT)
  INSERT INTO public.organization_settings (organization_id, settings, created_at, updated_at)
  VALUES (org_id, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'auto_create_personal_organization failed for %: % (SQLSTATE: %)', 
    NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- No need to recreate the trigger, just updating the function is enough
-- The trigger on_user_created_create_org already exists and will use the new function definition
