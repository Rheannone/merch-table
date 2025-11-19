-- Add trigger to auto-create user profile when signing in with Supabase Auth
-- This fixes the "Database error saving new user" issue

-- ============================================
-- AUTO-CREATE USER PROFILE ON SIGN UP
-- ============================================
-- This function runs automatically when a new user signs up via Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop the trigger if it exists (in case we're re-running this migration)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- UPDATE RLS POLICIES FOR SUPABASE AUTH
-- ============================================
-- Now that we're using Supabase Auth instead of NextAuth,
-- we need to update the RLS policies to use auth.uid()

-- Drop old policies
DROP POLICY IF EXISTS "Allow public read access" ON public.users;
DROP POLICY IF EXISTS "Allow inserts" ON public.users;
DROP POLICY IF EXISTS "Allow updates" ON public.users;

-- Drop new policies if they exist (in case we're re-running)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Service role can insert users" ON public.users;

-- Create new policies that use auth.uid() from Supabase Auth
CREATE POLICY "Users can view all profiles"
  ON public.users
  FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Allow the trigger function to insert (it runs with SECURITY DEFINER so bypasses RLS, but let's be explicit)
CREATE POLICY "Service role can insert users"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- DONE! 🎉
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Supabase Auth integration completed!';
  RAISE NOTICE '🔐 Auto-create trigger: Users auto-created in public.users when signing in';
  RAISE NOTICE '🔒 RLS policies: Updated to use auth.uid() from Supabase Auth';
  RAISE NOTICE '';
  RAISE NOTICE '👉 Try signing in with Google OAuth now!';
END $$;
