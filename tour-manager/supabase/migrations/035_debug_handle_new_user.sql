-- ============================================
-- Migration 035: Add debugging to handle_new_user trigger
-- ============================================
-- This is the ACTUAL problem - handle_new_user is failing to insert into public.users

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_full_name TEXT;
  user_avatar_url TEXT;
BEGIN
  RAISE NOTICE 'handle_new_user TRIGGER START: user_id=%, email=%', NEW.id, NEW.email;
  
  -- Extract full_name from raw_user_meta_data
  user_full_name := NEW.raw_user_meta_data->>'full_name';
  RAISE NOTICE 'Extracted full_name: %', user_full_name;
  
  -- Extract avatar_url from raw_user_meta_data
  user_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  RAISE NOTICE 'Extracted avatar_url: %', user_avatar_url;
  
  -- Insert into public.users
  RAISE NOTICE 'About to INSERT into public.users...';
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_avatar_url,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    updated_at = NOW();
  
  RAISE NOTICE 'handle_new_user COMPLETE: Successfully inserted user % into public.users', NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
