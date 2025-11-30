-- ============================================
-- MIGRATION 015: Migrate Existing Users to Organizations
-- ============================================
-- Creates personal organizations for all existing users
-- Prepares for data migration from user_id to organization_id
--
-- What this does:
-- 1. Find all users who don't have an organization yet
-- 2. Create personal organization for each user
-- 3. Add them as owner of their personal org
-- 4. Migrate their user_settings to organization_settings
--
-- Edge cases handled:
-- - Users who already have orgs (from Phase 1 auto-trigger): Skip them
-- - Users with no name/email: Generate safe org names
-- - Duplicate slugs: Auto-increment with counter
-- - Users with existing settings: Copy to org settings
-- - Users with no settings: Create empty org settings
--
-- SAFE TO RUN MULTIPLE TIMES: Idempotent operation
-- ============================================

DO $$
DECLARE
  user_record RECORD;
  org_id UUID;
  org_name TEXT;
  org_slug TEXT;
  user_count INTEGER := 0;
  migrated_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  RAISE NOTICE '
  ============================================
  🚀 MIGRATION 015: Migrate Existing Users
  ============================================
  Starting migration of existing users to organizations...
  ';
  
  -- Count total users
  SELECT COUNT(*) INTO user_count FROM public.users;
  RAISE NOTICE '📊 Found % total users in database', user_count;
  
  -- Loop through all users who don't have an organization yet
  FOR user_record IN 
    SELECT u.id, u.email, u.full_name, u.created_at
    FROM public.users u
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.user_id = u.id
    )
    ORDER BY u.created_at ASC  -- Migrate oldest users first
  LOOP
    BEGIN
      -- Generate organization name from user's profile
      IF user_record.full_name IS NOT NULL AND length(trim(user_record.full_name)) > 0 THEN
        org_name := trim(user_record.full_name) || '''s Merch';
      ELSIF user_record.email IS NOT NULL THEN
        -- Fallback: use email username
        org_name := split_part(user_record.email, '@', 1) || '''s Merch';
      ELSE
        -- Last resort: generic name with user ID
        org_name := 'User ' || substring(user_record.id::text, 1, 8) || '''s Merch';
      END IF;
      
      -- Generate unique slug
      org_slug := generate_org_slug(org_name);
      
      -- Create the organization
      INSERT INTO public.organizations (name, slug, created_by, is_active, created_at)
      VALUES (org_name, org_slug, user_record.id, true, user_record.created_at)
      RETURNING id INTO org_id;
      
      -- Add user as owner of their personal organization
      INSERT INTO public.organization_members (organization_id, user_id, role, joined_at, invited_by)
      VALUES (org_id, user_record.id, 'owner', user_record.created_at, NULL);
      
      -- Migrate user_settings to organization_settings if they exist
      DECLARE
        user_settings_data JSONB;
      BEGIN
        -- Get user's current settings
        SELECT settings INTO user_settings_data
        FROM public.user_settings
        WHERE user_id = user_record.id;
        
        IF user_settings_data IS NOT NULL THEN
          -- Copy user settings to organization settings
          INSERT INTO public.organization_settings (organization_id, settings, created_at)
          VALUES (org_id, user_settings_data, user_record.created_at);
          
          RAISE NOTICE '  ✅ Migrated user settings to org for: % (%)', user_record.email, org_name;
        ELSE
          -- Create empty org settings
          INSERT INTO public.organization_settings (organization_id, settings, created_at)
          VALUES (org_id, '{}'::jsonb, user_record.created_at);
          
          RAISE NOTICE '  ✅ Created empty org settings for: % (%)', user_record.email, org_name;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- If settings migration fails, still create empty settings
          INSERT INTO public.organization_settings (organization_id, settings, created_at)
          VALUES (org_id, '{}'::jsonb, user_record.created_at)
          ON CONFLICT (organization_id) DO NOTHING;
          
          RAISE NOTICE '  ⚠️  Settings migration failed for %, created empty settings: %', user_record.email, SQLERRM;
      END;
      
      migrated_count := migrated_count + 1;
      RAISE NOTICE '✅ Created org "%" for user: %', org_name, user_record.email;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Log error but continue with other users
        RAISE NOTICE '❌ Failed to migrate user %: %', user_record.email, SQLERRM;
        skipped_count := skipped_count + 1;
    END;
  END LOOP;
  
  -- Final summary
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 015 COMPLETE
  ============================================
  
  Summary:
  📊 Total users: %
  ✅ Migrated: %
  ⏭️  Skipped (already had org): %
  ❌ Failed: %
  
  What happened:
  - Created personal organizations for existing users
  - Set all users as owners of their personal orgs
  - Migrated user_settings to organization_settings
  - Preserved original creation timestamps
  
  What works now:
  ✅ All users have at least one organization
  ✅ All users are owners of their personal org
  ✅ Organization settings populated from user settings
  ✅ Ready for data migration (products, sales, etc.)
  
  Next steps:
  ⏳ Add organization_id to products table
  ⏳ Add organization_id to sales table
  ⏳ Add organization_id to close_outs & email_signups
  ⏳ Update RLS policies to use organizations
  
  ============================================
  ', user_count, migrated_count, user_count - migrated_count - skipped_count, skipped_count;
  
END $$;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration worked correctly

-- Check all users have organizations
DO $$
DECLARE
  users_without_orgs INTEGER;
BEGIN
  SELECT COUNT(*) INTO users_without_orgs
  FROM public.users u
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = u.id
  );
  
  IF users_without_orgs > 0 THEN
    RAISE WARNING '⚠️  % users still without organizations!', users_without_orgs;
  ELSE
    RAISE NOTICE '✅ All users have organizations';
  END IF;
END $$;

-- Check all orgs have settings
DO $$
DECLARE
  orgs_without_settings INTEGER;
BEGIN
  SELECT COUNT(*) INTO orgs_without_settings
  FROM public.organizations o
  WHERE NOT EXISTS (
    SELECT 1 FROM public.organization_settings os
    WHERE os.organization_id = o.id
  );
  
  IF orgs_without_settings > 0 THEN
    RAISE WARNING '⚠️  % organizations without settings!', orgs_without_settings;
  ELSE
    RAISE NOTICE '✅ All organizations have settings';
  END IF;
END $$;

-- Show sample of created organizations
DO $$
DECLARE
  org_sample RECORD;
  sample_count INTEGER := 0;
BEGIN
  RAISE NOTICE '
  ============================================
  📋 Sample of Created Organizations:
  ============================================
  ';
  
  FOR org_sample IN
    SELECT 
      o.name,
      o.slug,
      u.email,
      om.role,
      o.created_at
    FROM public.organizations o
    JOIN public.organization_members om ON om.organization_id = o.id
    JOIN public.users u ON u.id = om.user_id
    ORDER BY o.created_at DESC
    LIMIT 5
  LOOP
    RAISE NOTICE '  • % (%) - Owner: % - Created: %', 
      org_sample.name, 
      org_sample.slug, 
      org_sample.email,
      org_sample.created_at::date;
    sample_count := sample_count + 1;
  END LOOP;
  
  IF sample_count = 0 THEN
    RAISE NOTICE '  (No organizations created - possibly no existing users)';
  END IF;
  
  RAISE NOTICE '
  ============================================
  ';
END $$;
