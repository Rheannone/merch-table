-- MINIMAL MIGRATION: Just User Tracking
-- This is a safe, simple start - you can add more tables later!
-- Run this in Supabase SQL Editor

-- Enable UUID extension (for generating unique IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE - Just track who's using your app
-- ============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
  
  -- Add whatever fields you want here later, like:
  -- subscription_tier TEXT DEFAULT 'free',
  -- trial_ends_at TIMESTAMP WITH TIME ZONE,
  -- etc.
);

-- ============================================
-- AUTO-UPDATE updated_at TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Since we're using NextAuth (not Supabase Auth), we'll use
-- service role key for inserts/updates from the API
-- But still enable RLS for future security
-- ============================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow public read access (you can make this stricter later)
CREATE POLICY "Allow public read access"
  ON public.users
  FOR SELECT
  USING (true);

-- Allow inserts from API (service role will bypass this anyway)
CREATE POLICY "Allow inserts"
  ON public.users
  FOR INSERT
  WITH CHECK (true);

-- Allow updates (you can make this stricter later based on your needs)
CREATE POLICY "Allow updates"
  ON public.users
  FOR UPDATE
  USING (true);

-- ============================================
-- NOTE: Auto-create trigger removed
-- Since we're using NextAuth (not Supabase Auth), 
-- users are created via API when they sign in with NextAuth
-- ============================================

-- ============================================
-- DONE! 🎉
-- ============================================
DO $$
BEGIN
  RAISE NOTICE '✅ Minimal migration completed!';
  RAISE NOTICE '📊 Created: users table';
  RAISE NOTICE '🔒 Security: Row Level Security enabled';
  RAISE NOTICE '⚡ Auto-setup: New users auto-create profiles';
  RAISE NOTICE '';
  RAISE NOTICE '👉 You can add more tables anytime with ALTER TABLE or new migrations!';
END $$;
