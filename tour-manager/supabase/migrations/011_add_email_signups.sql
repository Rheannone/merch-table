-- Migration: Add email_signups table
-- Creates table for storing email signups collected at shows

-- Create email_signups table
CREATE TABLE IF NOT EXISTS public.email_signups (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  phone TEXT,
  source TEXT NOT NULL CHECK (source IN ('post-checkout', 'manual-entry')),
  sale_id TEXT, -- Reference to sale if collected post-checkout
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_signups_user_id ON public.email_signups(user_id);
CREATE INDEX IF NOT EXISTS idx_email_signups_timestamp ON public.email_signups(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_email_signups_email ON public.email_signups(email);

-- Enable Row Level Security
ALTER TABLE public.email_signups ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_signups
-- Policy 1: Users can view their own email signups
CREATE POLICY "Users can view their own email signups"
  ON public.email_signups
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own email signups
CREATE POLICY "Users can insert their own email signups"
  ON public.email_signups
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own email signups
CREATE POLICY "Users can update their own email signups"
  ON public.email_signups
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy 4: Users can delete their own email signups
CREATE POLICY "Users can delete their own email signups"
  ON public.email_signups
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comments for documentation
COMMENT ON TABLE public.email_signups IS 'Email addresses collected from customers at shows';
COMMENT ON COLUMN public.email_signups.source IS 'How the email was collected: post-checkout or manual-entry';
COMMENT ON COLUMN public.email_signups.sale_id IS 'Reference to the sale if collected via post-checkout prompt';
