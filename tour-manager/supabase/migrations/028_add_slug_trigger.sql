-- ============================================
-- FIX: Add trigger to auto-generate organization slug
-- ============================================

-- Create trigger function to auto-generate slug before insert
CREATE OR REPLACE FUNCTION auto_generate_org_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if not provided
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug := generate_org_slug(NEW.name);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS before_insert_organizations_slug ON public.organizations;

-- Create trigger
CREATE TRIGGER before_insert_organizations_slug
  BEFORE INSERT ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_org_slug();

DO $$
BEGIN
  RAISE NOTICE '✅ Added trigger to auto-generate organization slugs';
END $$;
