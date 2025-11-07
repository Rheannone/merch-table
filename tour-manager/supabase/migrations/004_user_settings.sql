-- Migration 4: User Settings Table
-- Stores POS configuration per user (replaces Google Sheets settings)

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE PRIMARY KEY,
  
  -- Payment methods with QR codes (JSONB array)
  -- Structure: [{ paymentType, enabled, displayName, transactionFee?, qrCodeUrl? }]
  payment_methods JSONB DEFAULT '[]'::jsonb,
  
  -- Product categories (TEXT array)
  categories TEXT[] DEFAULT ARRAY['Apparel', 'Merch', 'Music'],
  
  -- Tip jar settings
  show_tip_jar BOOLEAN DEFAULT true,
  
  -- Currency settings
  currency TEXT DEFAULT 'USD',
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
  
  -- Theme preference
  theme_id TEXT DEFAULT 'default',
  
  -- Google Sheets association
  current_sheet_id TEXT,
  current_sheet_name TEXT,
  
  -- Email signup modal settings (JSONB object)
  -- Structure: { enabled, promptMessage, collectName, collectPhone, autoDismissSeconds }
  email_signup_enabled BOOLEAN DEFAULT false,
  email_signup_prompt_message TEXT DEFAULT 'Want to join our email list?',
  email_signup_collect_name BOOLEAN DEFAULT false,
  email_signup_collect_phone BOOLEAN DEFAULT false,
  email_signup_auto_dismiss_seconds INTEGER DEFAULT 10,
  
  -- Migration tracking
  migrated_from_sheets BOOLEAN DEFAULT false,
  migrated_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- Updated_at trigger
CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own settings
CREATE POLICY "Users can view their own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON public.user_settings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON public.user_settings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
  ON public.user_settings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 4 completed! User settings table created.';
END $$;
