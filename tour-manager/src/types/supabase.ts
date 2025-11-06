/**
 * Type definitions for Supabase database
 * These match the schema created in migrations
 */

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          price: number;
          quantity: number;
          image_url: string | null;
          category: string | null;
          sku: string | null;
          cost: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          price: number;
          quantity?: number;
          image_url?: string | null;
          category?: string | null;
          sku?: string | null;
          cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          price?: number;
          quantity?: number;
          image_url?: string | null;
          category?: string | null;
          sku?: string | null;
          cost?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          user_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total: number;
          payment_method: string;
          timestamp: string;
          location: string | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          product_id?: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          total: number;
          payment_method: string;
          timestamp?: string;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          unit_price?: number;
          total?: number;
          payment_method?: string;
          timestamp?: string;
          location?: string | null;
          notes?: string | null;
          created_at?: string;
        };
      };
      user_sheets: {
        Row: {
          id: string;
          user_id: string;
          sheet_id: string;
          sheet_name: string | null;
          last_sync: string | null;
          sync_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          sheet_id: string;
          sheet_name?: string | null;
          last_sync?: string | null;
          sync_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          sheet_id?: string;
          sheet_name?: string | null;
          last_sync?: string | null;
          sync_enabled?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Functions: {
      get_total_sales: {
        Args: { user_uuid: string };
        Returns: number;
      };
      get_sales_by_date_range: {
        Args: {
          user_uuid: string;
          start_date: string;
          end_date: string;
        };
        Returns: {
          date: string;
          total_sales: number;
          transaction_count: number;
        }[];
      };
      get_top_products: {
        Args: {
          user_uuid: string;
          limit_count?: number;
        };
        Returns: {
          product_name: string;
          total_quantity: number;
          total_revenue: number;
          transaction_count: number;
        }[];
      };
      get_low_stock_products: {
        Args: {
          user_uuid: string;
          threshold?: number;
        };
        Returns: {
          id: string;
          name: string;
          quantity: number;
          price: number;
        }[];
      };
    };
  };
}
