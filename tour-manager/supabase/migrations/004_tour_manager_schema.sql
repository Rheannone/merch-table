-- Migration: Tour Manager Schema Update
-- Add close-outs table and update existing schema to match current app structure

-- Drop existing tables in correct order (to handle foreign key dependencies)
DROP TABLE IF EXISTS public.sale_items CASCADE;
DROP TABLE IF EXISTS public.sales CASCADE;
DROP TABLE IF EXISTS public.close_outs CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;

-- Create products table first (since other tables reference it)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY, -- matches app format
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  category TEXT,
  inventory JSONB DEFAULT '{}', -- {"S": 10, "M": 5, "L": 2} format
  sku TEXT,
  cost NUMERIC(10, 2) CHECK (cost >= 0),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create sales table matching current app structure
CREATE TABLE IF NOT EXISTS public.sales (
  id TEXT PRIMARY KEY, -- matches app format: sale-{timestamp}
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
  actual_amount NUMERIC(10, 2) NOT NULL CHECK (actual_amount >= 0),
  discount NUMERIC(10, 2) DEFAULT 0 CHECK (discount >= 0),
  tip_amount NUMERIC(10, 2) DEFAULT 0 CHECK (tip_amount >= 0),
  payment_method TEXT NOT NULL,
  is_hookup BOOLEAN DEFAULT false,
  synced BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create sale_items table (since sales can have multiple items)
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id TEXT REFERENCES public.sales(id) ON DELETE CASCADE NOT NULL,
  product_id TEXT NOT NULL, -- matches app product IDs (no FK constraint for flexibility)
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  size TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create close_outs table
CREATE TABLE IF NOT EXISTS public.close_outs (
  id TEXT PRIMARY KEY, -- matches app format: closeout-{timestamp}
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Editable metadata
  session_name TEXT,
  location TEXT,
  event_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Calculated summary metrics
  sales_count INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  actual_revenue NUMERIC(10, 2) NOT NULL DEFAULT 0,
  discounts_given NUMERIC(10, 2) NOT NULL DEFAULT 0,
  tips_received NUMERIC(10, 2) NOT NULL DEFAULT 0,
  
  -- Payment breakdown (JSON format)
  payment_breakdown JSONB DEFAULT '{}',
  
  -- Products sold (JSON format)
  products_sold JSONB DEFAULT '[]',
  
  -- Cash reconciliation
  expected_cash NUMERIC(10, 2),
  actual_cash NUMERIC(10, 2),
  cash_difference NUMERIC(10, 2),
  
  -- Sale IDs included in this close-out
  sale_ids TEXT[] DEFAULT '{}',
  
  -- Sync tracking
  synced_to_supabase BOOLEAN DEFAULT true, -- since it's being created in Supabase
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_sales_user_id ON public.sales(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON public.sales(timestamp);
CREATE INDEX IF NOT EXISTS idx_sales_synced ON public.sales(synced);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_products_user_id ON public.products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);

CREATE INDEX IF NOT EXISTS idx_close_outs_user_id ON public.close_outs(user_id);
CREATE INDEX IF NOT EXISTS idx_close_outs_timestamp ON public.close_outs(timestamp);

-- Add updated_at triggers for new tables
CREATE TRIGGER update_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_close_outs_updated_at
  BEFORE UPDATE ON public.close_outs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Tour Manager schema update completed! Sales, products, and close-outs tables ready.';
END $$;