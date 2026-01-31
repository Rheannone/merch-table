-- ============================================
-- Migration 036: Fix trigger to handle both INSERT and UPDATE
-- ============================================
-- ROOT CAUSE: The trigger was only on INSERT, but when users retry signing in,
-- Supabase UPDATES the auth.users record instead of inserting. So the trigger never fired!

-- Drop the old INSERT-only trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create new trigger that fires on BOTH INSERT and UPDATE
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- This ensures that even if a user tries to sign in multiple times,
-- they'll eventually get synced to public.users and get their organization created
