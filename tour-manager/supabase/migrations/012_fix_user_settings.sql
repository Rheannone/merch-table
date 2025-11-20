-- Fix user_settings table - add missing settings column

-- Add settings column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.user_settings ADD COLUMN settings JSONB DEFAULT '{}' NOT NULL;
    RAISE NOTICE '✅ Added settings column to user_settings table';
  ELSE
    RAISE NOTICE 'ℹ️ settings column already exists';
  END IF;
END $$;
