-- Enable RLS on users table
-- This was missing from the previous migration

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Verify policies exist (they should from migration 006)
-- If not, recreate them

-- Drop and recreate policies to be safe
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Users can view all profiles (for features like @mentions, sharing, etc.)
CREATE POLICY "Users can view all profiles"
  ON public.users
  FOR SELECT
  USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow the trigger function to insert (bypass RLS for auth trigger)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ RLS enabled on users table with proper policies!';
  RAISE NOTICE '🔒 Users can view all profiles but only update their own';
END $$;
