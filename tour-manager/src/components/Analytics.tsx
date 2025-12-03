"use client";

import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  ChartBarIcon,
  ArrowPathIcon,
  ArrowDownTrayIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CalendarIcon,
  CreditCardIcon,
  Square3Stack3DIcon,
} from "@heroicons/react/24/outline";
import { ShoppingBagIcon } from "@heroicons/react/24/solid";
import { useOrganization } from "@/contexts/OrganizationContext";
import Toast, { ToastType } from "./Toast";
import {
  getQuickStats,
  getDailyRevenue,
  getProductPerformance,
  getPaymentBreakdown,
  getSizeDistribution,
  getProductsByDate,
  type QuickStats,
  type DailyRevenue,
  type ProductPerformance,
  type PaymentBreakdown,
  type SizeDistribution,
  type ProductSoldDetail,
} from "@/lib/analytics";

interface ToastState {
  message: string;
  type: ToastType;
}

type DateRange = "today" | "week" | "month" | "all" | "custom";

export default function Analytics() {
  const { currentOrganization } = useOrganization();

  // State
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Data state
  const [quickStats, setQuickStats] = useState<QuickStats | null>(null);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue[]>([]);
  const [productPerformance, setProductPerformance] = useState<
    ProductPerformance[]
  >([]);
  const [paymentBreakdown, setPaymentBreakdown] = useState<PaymentBreakdown[]>(
    []
  );
  const [sizeDistribution, setSizeDistribution] = useState<SizeDistribution[]>(
    []
  );

  // UI state
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [dateProducts, setDateProducts] = useState<{
    [date: string]: ProductSoldDetail[];
  }>({});
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(
    new Set()
  );

  // Calculate date range
  const getDateRange = useCallback((): { start?: string; end?: string } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case "today":
        return {
          start: today.toISOString(),
          end: new Date(
            today.getTime() + 24 * 60 * 60 * 1000 - 1
          ).toISOString(),
        };
      case "week": {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { start: weekAgo.toISOString() };
      }
      case "month": {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { start: monthAgo.toISOString() };
      }
      case "custom":
        return {
          start: customStartDate
            ? new Date(customStartDate).toISOString()
            : undefined,
          end: customEndDate
            ? new Date(customEndDate + "T23:59:59").toISOString()
            : undefined,
        };
      case "all":
      default:
        return {};
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch all data
  const fetchData = useCallback(async () => {
    if (!currentOrganization?.id) return;

    setLoading(true);
    try {
      const { start, end } = getDateRange();

      const [stats, revenue, products, payments, sizes] = await Promise.all([
        getQuickStats(currentOrganization.id, start, end),
        getDailyRevenue(currentOrganization.id, start, end),
        getProductPerformance(currentOrganization.id, start, end),
        getPaymentBreakdown(currentOrganization.id, start, end),
        getSizeDistribution(currentOrganization.id, start, end),
      ]);

      setQuickStats(stats);
      setDailyRevenue(revenue);
      setProductPerformance(products);
      setPaymentBreakdown(payments);
      setSizeDistribution(sizes);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Error fetching analytics data:", error);
      setToast({
        message: "Failed to load analytics data. Please try again.",
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [currentOrganization?.id, getDateRange]);

  // Load data on mount and when date range changes
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto-refresh when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchData();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [fetchData]);

  // Toggle product breakdown for a date
  const toggleProductBreakdown = async (date: string) => {
    if (expandedDates.has(date)) {
      const newExpanded = new Set(expandedDates);
      newExpanded.delete(date);
      setExpandedDates(newExpanded);
      return;
    }

    setExpandedDates(new Set(expandedDates).add(date));

    // Fetch products if not already loaded
    if (!dateProducts[date] && currentOrganization?.id) {
      setLoadingProducts(new Set(loadingProducts).add(date));
      try {
        const products = await getProductsByDate(currentOrganization.id, date);
        setDateProducts({ ...dateProducts, [date]: products });
      } catch (error) {
        console.error("Error fetching products for date:", error);
      } finally {
        const newLoadingProducts = new Set(loadingProducts);
        newLoadingProducts.delete(date);
        setLoadingProducts(newLoadingProducts);
      }
    }
  };

  // Export to CSV
  const exportToCSV = (data: unknown[], filename: string) => {
    if (data.length === 0) {
      setToast({ message: "No data to export", type: "error" });
      return;
    }

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvContent = [
      headers.join(","),
      ...data.map((row) =>
        headers
          .map((header) => {
            const value = (row as Record<string, unknown>)[header];
            // Handle objects by stringifying
            if (typeof value === "object" && value !== null) {
              return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
            }
            // Escape commas and quotes
            return `"${String(value).replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);

    setToast({ message: `Exported ${filename}`, type: "success" });
  };

  // Format time ago
  const getTimeAgo = () => {
    if (!lastUpdated) return "";
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `Updated ${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `Updated ${hours}h ago`;
  };

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-theme p-6 flex items-center justify-center">
        <p className="text-theme-muted">Please select an organization</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-theme flex items-center gap-3">
              <ChartBarIcon className="w-8 h-8 text-primary" />
              Analytics & Insights
            </h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-theme-muted">{getTimeAgo()}</span>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-2 rounded-lg bg-theme-secondary hover:bg-theme-tertiary disabled:opacity-50 transition-colors"
                title="Refresh data"
              >
                <ArrowPathIcon
                  className={`w-5 h-5 text-theme ${
                    loading ? "animate-spin" : ""
                  }`}
                />
              </button>
            </div>
          </div>
          <p className="text-theme-muted">
            Track your sales, revenue, and product performance
          </p>
        </div>

        {/* Date Range Selector */}
        <div className="mb-6 bg-theme-secondary rounded-lg p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CalendarIcon className="w-5 h-5 text-theme-muted" />
            <div className="flex flex-wrap gap-2">
              {(["today", "week", "month", "all"] as DateRange[]).map(
                (range) => (
                  <button
                    key={range}
                    onClick={() => setDateRange(range)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      dateRange === range
                        ? "bg-primary text-on-primary"
                        : "bg-theme hover:bg-theme-tertiary text-theme"
                    }`}
                  >
                    {range === "today" && "Today"}
                    {range === "week" && "This Week"}
                    {range === "month" && "This Month"}
                    {range === "all" && "All Time"}
                  </button>
                )
              )}
              <button
                onClick={() => setDateRange("custom")}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  dateRange === "custom"
                    ? "bg-primary text-on-primary"
                    : "bg-theme hover:bg-theme-tertiary text-theme"
                }`}
              >
                Custom Range
              </button>
            </div>

            {dateRange === "custom" && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-theme border border-theme text-theme"
                />
                <span className="text-theme-muted">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-theme border border-theme text-theme"
                />
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        {quickStats && (
          <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-success">
                ${quickStats.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Total Sales</p>
              <p className="text-2xl font-bold text-blue-400">
                {quickStats.numberOfSales}
              </p>
            </div>
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Average Sale</p>
              <p className="text-2xl font-bold text-theme">
                ${quickStats.averageSale.toFixed(2)}
              </p>
            </div>
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Top Product</p>
              <p
                className="text-lg font-bold text-theme truncate"
                title={quickStats.topProduct}
              >
                {quickStats.topProduct}
              </p>
            </div>
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Top Size</p>
              <p className="text-2xl font-bold text-yellow-400">
                {quickStats.topSize}
              </p>
            </div>
            <div className="bg-theme-secondary rounded-lg p-4 border border-theme">
              <p className="text-sm text-theme-muted mb-1">Inventory Value</p>
              <p className="text-2xl font-bold text-orange-400">
                ${quickStats.inventoryValue.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        {/* Daily Revenue Table */}
        <div className="mb-8 bg-theme-secondary rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-theme flex items-center gap-2">
              <CalendarIcon className="w-6 h-6" />
              Daily Revenue
            </h2>
            <button
              onClick={() => exportToCSV(dailyRevenue, "daily-revenue.csv")}
              className="flex items-center gap-2 px-3 py-2 bg-theme hover:bg-theme-tertiary rounded-lg text-sm font-medium text-theme transition-colors"
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Export CSV
            </button>
          </div>

          {dailyRevenue.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-theme">
                    <th className="px-4 py-3 text-sm font-semibold text-theme-secondary">
                      Date
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-theme-secondary text-center">
                      Sales
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-theme-secondary text-right">
                      Revenue
                    </th>
                    <th className="px-4 py-3 text-sm font-semibold text-theme-secondary text-right">
                      Tips
                    </th>
                    {Object.keys(dailyRevenue[0]?.paymentBreakdown || {}).map(
                      (method) => (
                        <th
                          key={method}
                          className="px-4 py-3 text-sm font-semibold text-theme-secondary text-right"
                        >
                          {method}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {dailyRevenue.map((day) => {
                    const isExpanded = expandedDates.has(day.date);
                    const isLoadingProducts = loadingProducts.has(day.date);
                    const products = dateProducts[day.date];

                    return (
                      <Fragment key={day.date}>
                        <tr className="border-b border-theme/50 hover:bg-theme-tertiary/30 transition-colors">
                          <td className="px-4 py-3 text-sm text-theme font-medium">
                            {day.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-theme-secondary text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-900/30 text-blue-300">
                              {day.numberOfSales}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-success font-semibold text-right">
                            ${day.revenue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 font-semibold text-right">
                            {day.tips > 0 ? `$${day.tips.toFixed(2)}` : "-"}
                          </td>
                          {Object.keys(
                            dailyRevenue[0]?.paymentBreakdown || {}
                          ).map((method) => {
                            const amount = day.paymentBreakdown[method] || 0;
                            return (
                              <td
                                key={method}
                                className="px-4 py-3 text-sm text-theme-secondary text-right"
                              >
                                {amount > 0 ? `$${amount.toFixed(2)}` : "-"}
                              </td>
                            );
                          })}
                        </tr>
                        {/* Product breakdown row */}
                        <tr>
                          <td
                            colSpan={100}
                            className="px-4 py-0 bg-theme-tertiary/20"
                          >
                            <button
                              onClick={() => toggleProductBreakdown(day.date)}
                              className="w-full py-3 flex items-center justify-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors"
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUpIcon className="w-4 h-4" />
                                  Hide Products
                                </>
                              ) : (
                                <>
                                  <ChevronDownIcon className="w-4 h-4" />
                                  Show Products
                                </>
                              )}
                            </button>

                            {isExpanded && (
                              <div className="pb-4 px-4">
                                {isLoadingProducts ? (
                                  <div className="text-center py-4">
                                    <ArrowPathIcon className="w-6 h-6 text-theme-muted mx-auto mb-2 animate-spin" />
                                    <p className="text-sm text-theme-muted">
                                      Loading products...
                                    </p>
                                  </div>
                                ) : products && products.length > 0 ? (
                                  <div className="bg-theme rounded-lg p-4 border border-theme">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                      {products.map((product, idx) => (
                                        <div
                                          key={idx}
                                          className="bg-theme-secondary rounded-lg p-3 border border-theme/50"
                                        >
                                          <p className="text-xs text-theme-muted mb-1">
                                            {product.productName}{" "}
                                            {product.size !== "One Size" &&
                                              `(${product.size})`}
                                          </p>
                                          <p className="text-lg font-bold text-theme">
                                            {product.quantity}
                                            <span className="text-xs text-theme-muted ml-1">
                                              × ${product.price.toFixed(2)}
                                            </span>
                                          </p>
                                          <p className="text-sm text-success font-semibold">
                                            ${product.subtotal.toFixed(2)}
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="text-center py-4 text-sm text-theme-muted">
                                    No product data available
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-theme-muted">
              No sales data for this period
            </div>
          )}
        </div>

        {/* Product Performance & Additional Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Product Performance */}
          <div className="bg-theme-secondary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-theme flex items-center gap-2">
                <ShoppingBagIcon className="w-6 h-6" />
                Top Products
              </h2>
              <button
                onClick={() =>
                  exportToCSV(productPerformance, "product-performance.csv")
                }
                className="flex items-center gap-2 px-3 py-2 bg-theme hover:bg-theme-tertiary rounded-lg text-sm font-medium text-theme transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export
              </button>
            </div>

            {productPerformance.length > 0 ? (
              <div className="space-y-3">
                {productPerformance.slice(0, 10).map((product, idx) => (
                  <div
                    key={product.productId}
                    className="flex items-center gap-3"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme truncate">
                        {product.productName}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-theme-muted">
                          {product.quantitySold} sold
                        </span>
                        <span className="text-xs text-success font-semibold">
                          ${product.revenue.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-theme-muted">
                No product data
              </div>
            )}
          </div>

          {/* Payment Methods */}
          <div className="bg-theme-secondary rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-theme flex items-center gap-2">
                <CreditCardIcon className="w-6 h-6" />
                Payment Methods
              </h2>
              <button
                onClick={() =>
                  exportToCSV(paymentBreakdown, "payment-breakdown.csv")
                }
                className="flex items-center gap-2 px-3 py-2 bg-theme hover:bg-theme-tertiary rounded-lg text-sm font-medium text-theme transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export
              </button>
            </div>

            {paymentBreakdown.length > 0 ? (
              <div className="space-y-3">
                {paymentBreakdown.map((payment) => (
                  <div
                    key={payment.paymentMethod}
                    className="bg-theme rounded-lg p-3 border border-theme"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-theme">
                        {payment.paymentMethod}
                      </span>
                      <span className="text-sm text-theme-muted">
                        {payment.percentage.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-theme-muted">
                        {payment.count} transactions
                      </span>
                      <span className="text-lg font-bold text-success">
                        ${payment.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-theme-muted">
                No payment data
              </div>
            )}
          </div>

          {/* Size Distribution */}
          <div className="bg-theme-secondary rounded-lg p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-theme flex items-center gap-2">
                <Square3Stack3DIcon className="w-6 h-6" />
                Size Distribution
              </h2>
              <button
                onClick={() =>
                  exportToCSV(sizeDistribution, "size-distribution.csv")
                }
                className="flex items-center gap-2 px-3 py-2 bg-theme hover:bg-theme-tertiary rounded-lg text-sm font-medium text-theme transition-colors"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Export
              </button>
            </div>

            {sizeDistribution.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sizeDistribution.map((size) => (
                  <div
                    key={size.size}
                    className="bg-theme rounded-lg p-4 border border-theme text-center"
                  >
                    <p className="text-2xl font-bold text-theme mb-1">
                      {size.size}
                    </p>
                    <p className="text-lg font-semibold text-primary">
                      {size.quantity}
                    </p>
                    <p className="text-xs text-theme-muted">
                      {size.percentage.toFixed(1)}%
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-theme-muted">
                No size data
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
