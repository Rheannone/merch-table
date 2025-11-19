import { Sale, CloseOut } from "@/types";
import { getSales, getLastCloseOut, saveCloseOut } from "./db";

/**
 * Calculate session statistics from sales data
 * @param sales All sales to include in calculation
 * @returns Summary statistics for the session
 */
export function calculateSessionStats(sales: Sale[]) {
  if (sales.length === 0) {
    return {
      salesCount: 0,
      totalRevenue: 0,
      actualRevenue: 0,
      discountsGiven: 0,
      tipsReceived: 0,
      paymentBreakdown: {},
      productsSold: [],
      expectedCash: 0,
    };
  }

  const salesCount = sales.length;
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
  const actualRevenue = sales.reduce((sum, sale) => sum + sale.actualAmount, 0);
  const discountsGiven = sales.reduce(
    (sum, sale) => sum + (sale.discount || 0),
    0
  );
  const tipsReceived = sales.reduce(
    (sum, sale) => sum + (sale.tipAmount || 0),
    0
  );

  // Payment method breakdown
  const paymentBreakdown: {
    [method: string]: { count: number; amount: number };
  } = {};

  for (const sale of sales) {
    const method = sale.paymentMethod;
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, amount: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].amount += sale.actualAmount;
  }

  // Product breakdown - aggregate by product
  const productMap = new Map<
    string,
    {
      productId: string;
      productName: string;
      quantitySold: number;
      revenue: number;
      sizes: { [size: string]: number };
    }
  >();

  for (const sale of sales) {
    for (const item of sale.items) {
      const key = item.productId;

      if (!productMap.has(key)) {
        productMap.set(key, {
          productId: item.productId,
          productName: item.productName,
          quantitySold: 0,
          revenue: 0,
          sizes: {},
        });
      }

      const product = productMap.get(key)!;
      product.quantitySold += item.quantity;
      product.revenue += item.price * item.quantity;

      // Track sizes if available
      if (item.size) {
        product.sizes[item.size] =
          (product.sizes[item.size] || 0) + item.quantity;
      } else {
        product.sizes["default"] =
          (product.sizes["default"] || 0) + item.quantity;
      }
    }
  }

  const productsSold = Array.from(productMap.values()).sort(
    (a, b) => b.revenue - a.revenue // Sort by revenue desc
  );

  // Calculate expected cash (cash sales only)
  const expectedCash = sales
    .filter((sale) => sale.paymentMethod.toLowerCase() === "cash")
    .reduce((sum, sale) => sum + sale.actualAmount, 0);

  return {
    salesCount,
    totalRevenue,
    actualRevenue,
    discountsGiven,
    tipsReceived,
    paymentBreakdown,
    productsSold,
    expectedCash,
  };
}

/**
 * Get sales that belong to the current session (since last close-out)
 */
export async function getCurrentSessionSales(): Promise<Sale[]> {
  const allSales = await getSales();
  const lastCloseOut = await getLastCloseOut();

  if (!lastCloseOut) {
    // No previous close-out, return all sales
    return allSales;
  }

  // Return sales that happened after the last close-out
  const lastCloseOutTime = new Date(lastCloseOut.timestamp);
  const currentSales = allSales.filter((sale) => {
    const saleTime = new Date(sale.timestamp);
    return saleTime > lastCloseOutTime;
  });

  return currentSales;
}

/**
 * Get current session statistics
 */
export async function getCurrentSessionStats() {
  const currentSales = await getCurrentSessionSales();
  const stats = calculateSessionStats(currentSales);

  return {
    ...stats,
    saleIds: currentSales.map((sale) => sale.id),
    salesPeriod:
      currentSales.length > 0
        ? {
            startDate: currentSales[currentSales.length - 1]?.timestamp, // Oldest sale
            endDate: currentSales[0]?.timestamp, // Newest sale
          }
        : null,
  };
}

/**
 * Create a new close-out from current session
 */
export async function createCloseOut(metadata: {
  sessionName?: string;
  location?: string;
  eventDate?: string;
  notes?: string;
  actualCash?: number;
}): Promise<CloseOut> {
  const currentSales = await getCurrentSessionSales();
  const stats = calculateSessionStats(currentSales);

  const now = new Date().toISOString();
  const closeOut: CloseOut = {
    id: `closeout-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: now,
    createdAt: now,

    // Metadata
    sessionName: metadata.sessionName,
    location: metadata.location,
    eventDate: metadata.eventDate || now,
    notes: metadata.notes,

    // Calculated stats
    salesCount: stats.salesCount,
    totalRevenue: stats.totalRevenue,
    actualRevenue: stats.actualRevenue,
    discountsGiven: stats.discountsGiven,
    tipsReceived: stats.tipsReceived,
    paymentBreakdown: stats.paymentBreakdown,
    productsSold: stats.productsSold,

    // Cash reconciliation
    expectedCash: stats.expectedCash,
    actualCash: metadata.actualCash,
    cashDifference:
      metadata.actualCash !== undefined
        ? metadata.actualCash - stats.expectedCash
        : undefined,

    // Links
    saleIds: currentSales.map((sale) => sale.id),

    // Sync status
    syncedToSupabase: false,
  };

  // Save to IndexedDB
  await saveCloseOut(closeOut);

  return closeOut;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get a friendly session duration string
 */
export function getSessionDuration(
  startDate?: string,
  endDate?: string
): string {
  if (!startDate || !endDate) return "No sales yet";

  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
  } else {
    return "Less than 1 hour";
  }
}
