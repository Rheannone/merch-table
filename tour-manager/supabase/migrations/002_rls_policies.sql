-- Migration 2: Row Level Security (RLS) Policies
-- This ensures users can only access their own data
-- Run this AFTER migration 001

-- Enable Row Level Security on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sheets ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (on signup)
CREATE POLICY "Users can insert their own profile"
  ON public.users
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- PRODUCTS TABLE POLICIES
-- ============================================

-- Users can view their own products
CREATE POLICY "Users can view their own products"
  ON public.products
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own products
CREATE POLICY "Users can insert their own products"
  ON public.products
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own products
CREATE POLICY "Users can update their own products"
  ON public.products
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own products
CREATE POLICY "Users can delete their own products"
  ON public.products
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- SALES TABLE POLICIES
-- ============================================

-- Users can view their own sales
CREATE POLICY "Users can view their own sales"
  ON public.sales
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sales
CREATE POLICY "Users can insert their own sales"
  ON public.sales
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sales
CREATE POLICY "Users can update their own sales"
  ON public.sales
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sales
CREATE POLICY "Users can delete their own sales"
  ON public.sales
  FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- USER_SHEETS TABLE POLICIES
-- ============================================

-- Users can view their own sheet config
CREATE POLICY "Users can view their own sheet config"
  ON public.user_sheets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own sheet config
CREATE POLICY "Users can insert their own sheet config"
  ON public.user_sheets
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sheet config
CREATE POLICY "Users can update their own sheet config"
  ON public.user_sheets
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sheet config
CREATE POLICY "Users can delete their own sheet config"
  ON public.user_sheets
  FOR DELETE
  USING (auth.uid() = user_id);

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 2 completed successfully! Row Level Security enabled.';
  RAISE NOTICE 'Your data is now secure - users can only access their own records!';
END $$;
