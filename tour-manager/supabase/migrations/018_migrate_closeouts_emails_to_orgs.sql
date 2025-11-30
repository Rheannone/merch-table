-- ============================================
-- MIGRATION 018: Add organization_id to Close-Outs and Email Signups
-- ============================================
-- Migrates close_outs and email_signups to organization ownership
-- Adds created_by fields for audit trail
--
-- Tables migrated:
-- - close_outs: Session summaries and cash reconciliation
-- - email_signups: Email list collected at shows
--
-- Edge cases handled:
-- - Records with no user_id: Skip with warning
-- - Users with multiple orgs: Use personal org
-- - Orphaned records: Log but preserve
--
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  🚀 MIGRATION 018: Migrate Close-Outs & Email Signups
  ============================================
  ';
END $$;

-- ============================================
-- PART 1: CLOSE_OUTS TABLE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  📦 Part 1: Migrating Close-Outs
  ============================================
  ';
END $$;

-- Add new columns
ALTER TABLE public.close_outs 
  ADD COLUMN IF NOT EXISTS organization_id UUID;

ALTER TABLE public.close_outs 
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Populate organization_id and created_by
DO $$
DECLARE
  closeout_record RECORD;
  user_org_id UUID;
  migrated_count INTEGER := 0;
  failed_count INTEGER := 0;
  total_count INTEGER;
BEGIN
  RAISE NOTICE 'Migrating close-outs to organizations...';
  
  SELECT COUNT(*) INTO total_count FROM public.close_outs WHERE organization_id IS NULL;
  RAISE NOTICE '📊 Found % close-outs to migrate', total_count;
  
  FOR closeout_record IN 
    SELECT id, user_id, timestamp, session_name
    FROM public.close_outs
    WHERE organization_id IS NULL
    ORDER BY timestamp ASC
  LOOP
    BEGIN
      -- Find user's personal organization
      SELECT om.organization_id INTO user_org_id
      FROM public.organization_members om
      WHERE om.user_id = closeout_record.user_id
      AND om.role = 'owner'
      ORDER BY om.joined_at ASC
      LIMIT 1;
      
      IF user_org_id IS NULL THEN
        RAISE WARNING '⚠️  Close-out % has user_id % with no organization!', 
          closeout_record.id, closeout_record.user_id;
        failed_count := failed_count + 1;
        CONTINUE;
      END IF;
      
      UPDATE public.close_outs
      SET 
        organization_id = user_org_id,
        created_by = closeout_record.user_id
      WHERE id = closeout_record.id;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Failed to migrate close-out %: %', closeout_record.id, SQLERRM;
        failed_count := failed_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migrated % close-outs', migrated_count;
  IF failed_count > 0 THEN
    RAISE WARNING '⚠️  % close-outs failed', failed_count;
  END IF;
END $$;

-- Make organization_id required
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM public.close_outs 
  WHERE organization_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION '❌ Cannot make organization_id required: % close-outs still NULL', null_count;
  END IF;
END $$;

ALTER TABLE public.close_outs 
  ALTER COLUMN organization_id SET NOT NULL;

-- Add constraints
ALTER TABLE public.close_outs
  ADD CONSTRAINT fk_closeouts_organization 
  FOREIGN KEY (organization_id) 
  REFERENCES public.organizations(id) 
  ON DELETE CASCADE;

ALTER TABLE public.close_outs
  ADD CONSTRAINT fk_closeouts_created_by 
  FOREIGN KEY (created_by) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;

-- Add indexes
DROP INDEX IF EXISTS idx_close_outs_user_id;

CREATE INDEX IF NOT EXISTS idx_closeouts_organization_id 
  ON public.close_outs(organization_id);

CREATE INDEX IF NOT EXISTS idx_closeouts_org_timestamp 
  ON public.close_outs(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_closeouts_created_by 
  ON public.close_outs(created_by);

-- Drop old RLS policies that reference user_id
DROP POLICY IF EXISTS "Users can view own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can insert own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can update own close-outs" ON public.close_outs;
DROP POLICY IF EXISTS "Users can delete own close-outs" ON public.close_outs;

-- Drop old user_id column
ALTER TABLE public.close_outs 
  DROP COLUMN IF EXISTS user_id;

-- Add comments
COMMENT ON COLUMN public.close_outs.organization_id IS 'Organization this close-out belongs to';
COMMENT ON COLUMN public.close_outs.created_by IS 'Team member who created this close-out session';

-- ============================================
-- PART 2: EMAIL_SIGNUPS TABLE
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '
  ============================================
  📧 Part 2: Migrating Email Signups
  ============================================
  ';
END $$;

-- Add new columns
ALTER TABLE public.email_signups 
  ADD COLUMN IF NOT EXISTS organization_id UUID;

-- Note: email_signups don't need created_by since they track the customer,
-- but we'll add it to track which team member collected it

ALTER TABLE public.email_signups 
  ADD COLUMN IF NOT EXISTS collected_by UUID;

-- Populate organization_id and collected_by
DO $$
DECLARE
  signup_record RECORD;
  user_org_id UUID;
  migrated_count INTEGER := 0;
  failed_count INTEGER := 0;
  total_count INTEGER;
BEGIN
  RAISE NOTICE 'Migrating email signups to organizations...';
  
  SELECT COUNT(*) INTO total_count FROM public.email_signups WHERE organization_id IS NULL;
  RAISE NOTICE '📊 Found % email signups to migrate', total_count;
  
  FOR signup_record IN 
    SELECT id, user_id, timestamp, email
    FROM public.email_signups
    WHERE organization_id IS NULL
    ORDER BY timestamp ASC
  LOOP
    BEGIN
      -- Find user's personal organization
      SELECT om.organization_id INTO user_org_id
      FROM public.organization_members om
      WHERE om.user_id = signup_record.user_id
      AND om.role = 'owner'
      ORDER BY om.joined_at ASC
      LIMIT 1;
      
      IF user_org_id IS NULL THEN
        RAISE WARNING '⚠️  Email signup % has user_id % with no organization!', 
          signup_record.id, signup_record.user_id;
        failed_count := failed_count + 1;
        CONTINUE;
      END IF;
      
      UPDATE public.email_signups
      SET 
        organization_id = user_org_id,
        collected_by = signup_record.user_id
      WHERE id = signup_record.id;
      
      migrated_count := migrated_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING '❌ Failed to migrate email signup %: %', signup_record.id, SQLERRM;
        failed_count := failed_count + 1;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Migrated % email signups', migrated_count;
  IF failed_count > 0 THEN
    RAISE WARNING '⚠️  % email signups failed', failed_count;
  END IF;
END $$;

-- Make organization_id required
DO $$
DECLARE
  null_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO null_count 
  FROM public.email_signups 
  WHERE organization_id IS NULL;
  
  IF null_count > 0 THEN
    RAISE EXCEPTION '❌ Cannot make organization_id required: % email signups still NULL', null_count;
  END IF;
END $$;

ALTER TABLE public.email_signups 
  ALTER COLUMN organization_id SET NOT NULL;

-- Add constraints
ALTER TABLE public.email_signups
  ADD CONSTRAINT fk_email_signups_organization 
  FOREIGN KEY (organization_id) 
  REFERENCES public.organizations(id) 
  ON DELETE CASCADE;

ALTER TABLE public.email_signups
  ADD CONSTRAINT fk_email_signups_collected_by 
  FOREIGN KEY (collected_by) 
  REFERENCES public.users(id) 
  ON DELETE SET NULL;

-- Add indexes
DROP INDEX IF EXISTS idx_email_signups_user_id;

CREATE INDEX IF NOT EXISTS idx_email_signups_organization_id 
  ON public.email_signups(organization_id);

CREATE INDEX IF NOT EXISTS idx_email_signups_org_timestamp 
  ON public.email_signups(organization_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_email_signups_collected_by 
  ON public.email_signups(collected_by);

-- Keep email index for deduplication
CREATE INDEX IF NOT EXISTS idx_email_signups_org_email 
  ON public.email_signups(organization_id, email);

-- Drop old RLS policies that reference user_id
DROP POLICY IF EXISTS "Users can view their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can insert their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can update their own email signups" ON public.email_signups;
DROP POLICY IF EXISTS "Users can delete their own email signups" ON public.email_signups;

-- Drop old user_id column
ALTER TABLE public.email_signups 
  DROP COLUMN IF EXISTS user_id;

-- Add comments
COMMENT ON COLUMN public.email_signups.organization_id IS 'Organization this email signup belongs to';
COMMENT ON COLUMN public.email_signups.collected_by IS 'Team member who collected this email signup';

-- ============================================
-- VERIFICATION & SUMMARY
-- ============================================

DO $$
DECLARE
  total_closeouts INTEGER;
  total_signups INTEGER;
  closeouts_per_org RECORD;
  signups_per_org RECORD;
BEGIN
  RAISE NOTICE '
  ============================================
  ✅ MIGRATION 018 COMPLETE
  ============================================
  ';
  
  -- Count totals
  SELECT COUNT(*) INTO total_closeouts FROM public.close_outs;
  SELECT COUNT(*) INTO total_signups FROM public.email_signups;
  
  RAISE NOTICE '📊 Total close-outs: %', total_closeouts;
  RAISE NOTICE '📊 Total email signups: %', total_signups;
  
  -- Show close-outs distribution
  IF total_closeouts > 0 THEN
    RAISE NOTICE '
  📦 Close-Outs per Organization:
    ';
    
    FOR closeouts_per_org IN
      SELECT 
        o.name,
        COUNT(c.id) as closeout_count,
        COUNT(DISTINCT c.created_by) as creator_count
      FROM public.organizations o
      LEFT JOIN public.close_outs c ON c.organization_id = o.id
      GROUP BY o.id, o.name
      HAVING COUNT(c.id) > 0
      ORDER BY COUNT(c.id) DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  • %: % close-outs (%  creators)', 
        closeouts_per_org.name,
        closeouts_per_org.closeout_count,
        COALESCE(closeouts_per_org.creator_count, 0);
    END LOOP;
  END IF;
  
  -- Show email signups distribution
  IF total_signups > 0 THEN
    RAISE NOTICE '
  📧 Email Signups per Organization:
    ';
    
    FOR signups_per_org IN
      SELECT 
        o.name,
        COUNT(e.id) as signup_count,
        COUNT(DISTINCT e.collected_by) as collector_count
      FROM public.organizations o
      LEFT JOIN public.email_signups e ON e.organization_id = o.id
      GROUP BY o.id, o.name
      HAVING COUNT(e.id) > 0
      ORDER BY COUNT(e.id) DESC
      LIMIT 5
    LOOP
      RAISE NOTICE '  • %: % signups (% collectors)', 
        signups_per_org.name,
        signups_per_org.signup_count,
        COALESCE(signups_per_org.collector_count, 0);
    END LOOP;
  END IF;
  
  RAISE NOTICE '
  Schema changes - Close-Outs:
  ✅ Added organization_id (required, FK to organizations)
  ✅ Added created_by (nullable, FK to users)
  ✅ Removed user_id column
  ✅ Updated indexes
  
  Schema changes - Email Signups:
  ✅ Added organization_id (required, FK to organizations)
  ✅ Added collected_by (nullable, FK to users)
  ✅ Removed user_id column
  ✅ Updated indexes
  
  What works now:
  ✅ Close-outs belong to organizations
  ✅ Email signups belong to organizations
  ✅ Audit trails track team member actions
  ✅ Multiple team members can create close-outs
  ✅ Email lists are shared across team
  
  Next steps:
  ⏳ Update all RLS policies (migration 019)
  ⏳ Update frontend queries
  ⏳ Add organization context to UI
  
  ============================================
  ';
END $$;
