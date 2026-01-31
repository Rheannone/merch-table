-- ============================================
-- Migration 033: Manually create org for test user and remove EXCEPTION handler to see real error
-- ============================================

-- First, create organization for the stuck test user
DO $$
DECLARE
  v_user_id UUID := '6f3229ad-860e-4661-93b7-8d521312bd70';
  v_org_id UUID;
  v_user_email TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user info
  SELECT email, full_name INTO v_user_email, v_user_name
  FROM public.users WHERE id = v_user_id;
  
  IF v_user_email IS NOT NULL THEN
    -- Create org
    INSERT INTO public.organizations (id, name, slug, created_by, is_active, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      COALESCE(v_user_name, split_part(v_user_email, '@', 1)) || '''s Organization',
      'hirerheannone-test',
      v_user_id,
      true,
      NOW(),
      NOW()
    )
    RETURNING id INTO v_org_id;
    
    -- Add membership
    INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
    VALUES (v_org_id, v_user_id, 'owner', NOW());
    
    -- Add settings
    INSERT INTO public.organization_settings (organization_id, settings, created_at, updated_at)
    VALUES (v_org_id, '{}'::jsonb, NOW(), NOW());
    
    RAISE NOTICE 'Created organization % for user %', v_org_id, v_user_email;
  END IF;
END $$;

-- Now update the trigger to REMOVE the EXCEPTION handler so we see the real error
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
  
  -- Add user as owner (NOW WITH ON CONFLICT)
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- Create settings
  INSERT INTO public.organization_settings (organization_id, settings, created_at, updated_at)
  VALUES (org_id, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id) DO NOTHING;
  
  RETURN NEW;
  
-- REMOVED EXCEPTION HANDLER - Let it fail loudly so we see the real error!
END;
$$ LANGUAGE plpgsql;
