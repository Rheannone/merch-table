/**
 * Shopify Integration
 *
 * One-way product import from Shopify stores to your POS.
 * Maps Shopify products/variants to your Product schema.
 */

import type { Product } from "@/types";

// Shopify API types (simplified)
interface ShopifyVariant {
  id: number;
  title: string;
  price: string;
  inventory_quantity: number;
  sku?: string;
}

interface ShopifyImage {
  src: string;
  alt?: string;
}

interface ShopifyProduct {
  id: number;
  title: string;
  body_html?: string;
  product_type?: string;
  variants: ShopifyVariant[];
  images: ShopifyImage[];
  status: string;
}

interface ShopifyProductsResponse {
  products: ShopifyProduct[];
}

export interface ShopifyImportResult {
  success: boolean;
  products?: Product[];
  error?: string;
  count?: number;
}

/**
 * Validate Shopify store URL format
 */
export function validateShopifyUrl(url: string): boolean {
  // Accept formats:
  // - mystore.myshopify.com
  // - https://mystore.myshopify.com
  // - admin.shopify.com/store/mystore
  const patterns = [
    /^[a-z0-9-]+\.myshopify\.com$/i,
    /^https?:\/\/[a-z0-9-]+\.myshopify\.com\/?$/i,
    /^https?:\/\/admin\.shopify\.com\/store\/([a-z0-9-]+)\/?$/i,
  ];

  return patterns.some((pattern) => pattern.test(url));
}

/**
 * Extract store name from various Shopify URL formats
 */
export function extractStoreName(url: string): string {
  // Remove protocol
  let cleanUrl = url.replace(/^https?:\/\//, "");

  // Handle admin URL format
  const adminMatch = cleanUrl.match(
    /admin\.shopify\.com\/store\/([a-z0-9-]+)/i
  );
  if (adminMatch) {
    return adminMatch[1];
  }

  // Handle myshopify.com format
  const storeMatch = cleanUrl.match(/^([a-z0-9-]+)\.myshopify\.com/i);
  if (storeMatch) {
    return storeMatch[1];
  }

  // Return as-is if no match (will fail validation)
  return cleanUrl.split(".")[0];
}

/**
 * Get full Shopify admin API URL
 */
export function getShopifyApiUrl(storeUrl: string): string {
  const storeName = extractStoreName(storeUrl);
  return `https://${storeName}.myshopify.com/admin/api/2024-01`;
}

/**
 * Map Shopify product to your Product schema
 */
function mapShopifyProductToLocal(shopifyProduct: ShopifyProduct): Product {
  const variants = shopifyProduct.variants;
  const hasMultipleSizes = variants.length > 1;

  // Extract sizes from variant titles
  // Shopify variants are often like "Small", "Medium", "Large" or "Default Title"
  const sizes = hasMultipleSizes
    ? variants.map((v) => v.title).filter((title) => title !== "Default Title")
    : undefined;

  // Build inventory map from variants
  const inventory: { [key: string]: number } = {};
  if (hasMultipleSizes && sizes) {
    variants.forEach((variant) => {
      if (variant.title !== "Default Title") {
        inventory[variant.title] = variant.inventory_quantity;
      }
    });
  } else {
    // Single variant product
    inventory["default"] = variants[0]?.inventory_quantity || 0;
  }

  // Use first variant's price as base price (USD assumed)
  const basePrice = parseFloat(variants[0]?.price || "0");

  // Get first image
  const imageUrl = shopifyProduct.images[0]?.src || "";

  // Clean up HTML description
  const description = shopifyProduct.body_html
    ? shopifyProduct.body_html.replace(/<[^>]*>/g, "").trim()
    : undefined;

  return {
    id: `shopify-${shopifyProduct.id}`,
    name: shopifyProduct.title,
    price: basePrice,
    category: shopifyProduct.product_type || "Uncategorized",
    description: description ? description.substring(0, 200) : undefined, // Limit length
    imageUrl: imageUrl,
    sizes: sizes,
    inventory: inventory,
    showTextOnButton: true,
  };
}

/**
 * Fetch products from Shopify using Admin API
 *
 * @param storeUrl - Store URL (e.g., "mystore.myshopify.com")
 * @param accessToken - Admin API access token
 * @param limit - Max products to fetch (default 250, Shopify max)
 */
export async function importProductsFromShopify(
  storeUrl: string,
  accessToken: string,
  limit: number = 250
): Promise<ShopifyImportResult> {
  try {
    // Validate inputs
    if (!storeUrl || !accessToken) {
      return {
        success: false,
        error: "Store URL and Access Token are required",
      };
    }

    if (!validateShopifyUrl(storeUrl)) {
      return {
        success: false,
        error: "Invalid Shopify store URL format",
      };
    }

    // Build API URL
    const apiUrl = getShopifyApiUrl(storeUrl);
    const endpoint = `${apiUrl}/products.json?limit=${limit}&status=active`;

    console.log("🛍️ Fetching products from Shopify:", endpoint);

    // Fetch products
    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Shopify API error:", response.status, errorText);

      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid access token. Please check your credentials.",
        };
      }

      if (response.status === 404) {
        return {
          success: false,
          error: "Store not found. Please check your store URL.",
        };
      }

      return {
        success: false,
        error: `Shopify API error: ${response.status} ${response.statusText}`,
      };
    }

    const data: ShopifyProductsResponse = await response.json();

    if (!data.products || data.products.length === 0) {
      return {
        success: false,
        error: "No active products found in your Shopify store",
      };
    }

    // Map products
    const mappedProducts = data.products.map(mapShopifyProductToLocal);

    console.log(
      `✅ Successfully imported ${mappedProducts.length} products from Shopify`
    );

    return {
      success: true,
      products: mappedProducts,
      count: mappedProducts.length,
    };
  } catch (error) {
    console.error("Error importing from Shopify:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to connect to Shopify. Please check your connection.",
    };
  }
}

/**
 * Test Shopify connection without importing products
 */
export async function testShopifyConnection(
  storeUrl: string,
  accessToken: string
): Promise<{ success: boolean; error?: string; productCount?: number }> {
  try {
    if (!storeUrl || !accessToken) {
      return {
        success: false,
        error: "Store URL and Access Token are required",
      };
    }

    if (!validateShopifyUrl(storeUrl)) {
      return {
        success: false,
        error: "Invalid Shopify store URL format",
      };
    }

    const apiUrl = getShopifyApiUrl(storeUrl);
    const endpoint = `${apiUrl}/products/count.json?status=active`;

    const response = await fetch(endpoint, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return {
          success: false,
          error: "Invalid access token",
        };
      }
      return {
        success: false,
        error: `Connection failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      productCount: data.count || 0,
    };
  } catch (error) {
    return {
      success: false,
      error: "Network error. Please check your connection.",
    };
  }
}
