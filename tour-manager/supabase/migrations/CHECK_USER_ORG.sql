-- Check if the user has an organization now

SELECT 
  u.id,
  u.email,
  u.full_name,
  COUNT(om.id) as org_count,
  STRING_AGG(o.name, ', ') as org_names
FROM public.users u
LEFT JOIN public.organization_members om ON om.user_id = u.id
LEFT JOIN public.organizations o ON o.id = om.organization_id
WHERE u.id = '92fd1866-e1b4-4f61-a787-a0ffa22c0bc7'
GROUP BY u.id, u.email, u.full_name;
