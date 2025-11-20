-- Migration: Add missing product fields
-- Adds description, showTextOnButton, sizes, and currencyPrices to products table

-- Add description field
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add showTextOnButton field (default true to match app behavior)
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS show_text_on_button BOOLEAN DEFAULT true;

-- Add sizes field (array of size options like ['S', 'M', 'L'])
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sizes JSONB DEFAULT '[]';

-- Add currencyPrices field (price overrides per currency)
-- Format: {"CAD": 30, "EUR": 25}
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS currency_prices JSONB DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN public.products.description IS 'Product description shown in POS';
COMMENT ON COLUMN public.products.show_text_on_button IS 'Whether to show product name on POS button (default: true)';
COMMENT ON COLUMN public.products.sizes IS 'Available sizes as JSON array, e.g., ["S", "M", "L", "XL"]';
COMMENT ON COLUMN public.products.currency_prices IS 'Currency-specific price overrides as JSON object, e.g., {"CAD": 30, "EUR": 25}';
