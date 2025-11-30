-- ============================================
-- FIX: Remove anon role grants, ensure authenticated has access
-- ============================================

-- Revoke ALL privileges from anon role on organizations
REVOKE ALL ON public.organizations FROM anon;

-- Grant specific privileges to authenticated role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;

-- Also ensure anon doesn't have access to organization_members
REVOKE ALL ON public.organization_members FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;

-- And organization_settings
REVOKE ALL ON public.organization_settings FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_settings TO authenticated;

-- Show what we have now
DO $$
DECLARE
  rec RECORD;
BEGIN
  RAISE NOTICE '=== Grants on organizations table ===';
  FOR rec IN 
    SELECT grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_name = 'organizations'
      AND table_schema = 'public'
    ORDER BY grantee, privilege_type
  LOOP
    RAISE NOTICE '% -> %', rec.grantee, rec.privilege_type;
  END LOOP;
  
  RAISE NOTICE '✅ Fixed grants - removed anon, ensured authenticated has access';
END $$;
