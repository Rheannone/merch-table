-- ============================================
-- Migration 034: Add debugging to trigger to see what's happening
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
  RAISE NOTICE 'TRIGGER START: user_id=%, email=%, full_name=%', NEW.id, NEW.email, NEW.full_name;
  
  -- Generate org name
  v_full_name := COALESCE(NEW.full_name, split_part(NEW.email, '@', 1));
  RAISE NOTICE 'Generated full_name: %', v_full_name;
  
  IF v_full_name IS NOT NULL AND length(trim(v_full_name)) > 0 THEN
    org_name := trim(v_full_name) || '''s Organization';
  ELSE
    org_name := 'My Organization';
  END IF;
  RAISE NOTICE 'Generated org_name: %', org_name;
  
  -- Generate base slug (inline, no function dependency)
  org_slug := lower(regexp_replace(
    regexp_replace(trim(v_full_name), '[^a-zA-Z0-9\s-]', '', 'g'),
    '\s+', '-', 'g'
  ));
  
  IF org_slug IS NULL OR length(org_slug) = 0 THEN
    org_slug := 'org';
  END IF;
  RAISE NOTICE 'Base slug: %', org_slug;
  
  -- Ensure unique slug
  final_slug := org_slug;
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE slug = final_slug) LOOP
    final_slug := org_slug || '-' || slug_counter;
    slug_counter := slug_counter + 1;
  END LOOP;
  RAISE NOTICE 'Final slug: %', final_slug;
  
  -- Create organization (with ON CONFLICT)
  RAISE NOTICE 'About to insert organization...';
  INSERT INTO public.organizations (id, name, slug, created_by, is_active, created_at, updated_at)
  VALUES (gen_random_uuid(), org_name, final_slug, NEW.id, true, NOW(), NOW())
  ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug
  RETURNING id INTO org_id;
  
  RAISE NOTICE 'Organization created with ID: %', org_id;
  
  IF org_id IS NULL THEN
    RAISE NOTICE 'ERROR: org_id is NULL after INSERT!';
    RETURN NEW;
  END IF;
  
  -- Add user as owner (NOW WITH ON CONFLICT)
  RAISE NOTICE 'About to insert organization_member...';
  INSERT INTO public.organization_members (organization_id, user_id, role, joined_at)
  VALUES (org_id, NEW.id, 'owner', NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RAISE NOTICE 'Organization member created';
  
  -- Create settings
  RAISE NOTICE 'About to insert organization_settings...';
  INSERT INTO public.organization_settings (organization_id, settings, created_at, updated_at)
  VALUES (org_id, '{}'::jsonb, NOW(), NOW())
  ON CONFLICT (organization_id) DO NOTHING;
  RAISE NOTICE 'Organization settings created';
  
  RAISE NOTICE 'TRIGGER COMPLETE: Successfully created org % for user %', org_id, NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
