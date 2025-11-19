-- Add user settings table for storing app preferences

CREATE TABLE IF NOT EXISTS public.user_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  
  -- Settings stored as JSONB for flexibility
  -- Example structure:
  -- {
  --   "theme": "system",
  --   "currency": { "primary": "USD", "secondary": "EUR", "showSecondary": true },
  --   "paymentMethods": [...],
  --   "emailSignup": { "enabled": true, "message": "..." },
  --   "requireCashReconciliation": false,
  --   etc.
  -- }
  settings JSONB DEFAULT '{}' NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Add updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ user_settings table created!';
  RAISE NOTICE '📝 Settings are stored as flexible JSONB';
END $$;
