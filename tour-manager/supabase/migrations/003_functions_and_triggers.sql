-- Migration 3: Helper functions and views
-- Run this AFTER migration 002

-- ============================================
-- FUNCTION: Get user's total sales
-- ============================================
CREATE OR REPLACE FUNCTION get_total_sales(user_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM(total), 0)
  FROM public.sales
  WHERE user_id = user_uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get user's sales for date range
-- ============================================
CREATE OR REPLACE FUNCTION get_sales_by_date_range(
  user_uuid UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  date DATE,
  total_sales NUMERIC,
  transaction_count BIGINT
) AS $$
  SELECT
    DATE(timestamp) as date,
    SUM(total) as total_sales,
    COUNT(*) as transaction_count
  FROM public.sales
  WHERE user_id = user_uuid
    AND timestamp >= start_date
    AND timestamp <= end_date
  GROUP BY DATE(timestamp)
  ORDER BY date DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get top selling products
-- ============================================
CREATE OR REPLACE FUNCTION get_top_products(
  user_uuid UUID,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_name TEXT,
  total_quantity BIGINT,
  total_revenue NUMERIC,
  transaction_count BIGINT
) AS $$
  SELECT
    s.product_name,
    SUM(s.quantity) as total_quantity,
    SUM(s.total) as total_revenue,
    COUNT(*) as transaction_count
  FROM public.sales s
  WHERE s.user_id = user_uuid
  GROUP BY s.product_name
  ORDER BY total_revenue DESC
  LIMIT limit_count;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get low stock products
-- ============================================
CREATE OR REPLACE FUNCTION get_low_stock_products(
  user_uuid UUID,
  threshold INTEGER DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  quantity INTEGER,
  price NUMERIC
) AS $$
  SELECT id, name, quantity, price
  FROM public.products
  WHERE user_id = user_uuid
    AND quantity <= threshold
    AND quantity >= 0
  ORDER BY quantity ASC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update product quantity after sale
-- ============================================
CREATE OR REPLACE FUNCTION update_product_quantity_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrease product quantity when a sale is recorded
  IF NEW.product_id IS NOT NULL THEN
    UPDATE public.products
    SET quantity = quantity - NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-update product quantity on sale
-- ============================================
CREATE TRIGGER on_sale_update_product_quantity
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION update_product_quantity_on_sale();

-- ============================================
-- FUNCTION: Create user profile on signup
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGER: Auto-create user profile on auth signup
-- ============================================
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Migration 3 completed successfully!';
  RAISE NOTICE 'Helper functions and triggers are now active.';
  RAISE NOTICE 'Product quantities will automatically decrease when sales are recorded.';
END $$;
