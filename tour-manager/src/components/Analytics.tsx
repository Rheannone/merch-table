"use client";

import { useState, useEffect } from "react";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";

interface ToastState {
  message: string;
  type: ToastType;
}

interface QuickStats {
  totalRevenue: number;
  numberOfSales: number;
  averageSale: number;
  topItem: string;
  topSize: string;
}

interface ProductBreakdown {
  productName: string;
  quantity: number;
}

interface DailyRevenueData {
  date: string;
  numberOfSales: number;
  actualRevenue: number;
  payments: { [key: string]: number };
  tips?: number; // Tips for the day
  productBreakdown?: ProductBreakdown[];
}

interface InsightsData {
  quickStats: QuickStats;
  dailyRevenue: DailyRevenueData[];
  paymentMethods: string[];
  schemaOutdated?: boolean; // Flag if payment methods have changed
  expectedPaymentMethods?: string[]; // What the schema should have
  currentPaymentMethods?: string[]; // What the schema currently has
}

export default function Analytics() {
  const [isCreatingInsights, setIsCreatingInsights] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [checkingInsights, setCheckingInsights] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
  const [loadingProducts, setLoadingProducts] = useState<Set<string>>(
    new Set()
  );
  const [showSchemaBanner, setShowSchemaBanner] = useState(false);

  // Check if Insights sheet already exists on component mount
  useEffect(() => {
    checkInsightsStatus();
  }, []);

  // Fetch insights data when enabled
  useEffect(() => {
    if (insightsEnabled) {
      fetchInsightsData();
    }
  }, [insightsEnabled]);

  const checkInsightsStatus = async () => {
    setCheckingInsights(true);
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) {
        setCheckingInsights(false);
        return;
      }

      const response = await fetch("/api/sheets/check-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsightsEnabled(data.exists);
      }
    } catch (error) {
      console.error("Error checking insights status:", error);
    } finally {
      setCheckingInsights(false);
    }
  };

  const fetchInsightsData = async () => {
    setLoadingData(true);
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) {
        setLoadingData(false);
        return;
      }

      const response = await fetch("/api/sheets/get-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (response.ok) {
        const data = await response.json();
        setInsightsData(data);

        // Check if schema is outdated
        if (data.schemaOutdated) {
          setShowSchemaBanner(true);
        } else {
          setShowSchemaBanner(false);
        }
      } else {
        const error = await response.json();
        console.error("Failed to fetch insights data", error);

        // Show helpful error message if schema needs refresh
        if (error.suggestion) {
          setToast({
            message: `${error.error}. ${error.suggestion}`,
            type: "error",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching insights data:", error);
    } finally {
      setLoadingData(false);
    }
  };

  const handleCreateInsights = async () => {
    setIsCreatingInsights(true);

    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");

      if (!spreadsheetId) {
        setToast({
          message: "No spreadsheet found. Please sync first.",
          type: "error",
        });
        setIsCreatingInsights(false);
        return;
      }

      const response = await fetch("/api/sheets/create-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.alreadyExists) {
          setInsightsEnabled(true);
          setToast({
            message: "Insights sheet already exists in your spreadsheet!",
            type: "success",
          });
        } else {
          setInsightsEnabled(true);
          setToast({
            message:
              "Insights sheet created! Check your Google Sheets for analytics.",
            type: "success",
          });
        }
      } else {
        const error = await response.json();
        setToast({
          message: `Failed to create insights: ${error.error}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error creating insights:", error);
      setToast({
        message: "Failed to create insights sheet. Please try again.",
        type: "error",
      });
    } finally {
      setIsCreatingInsights(false);
    }
  };

  const handleMigrateInsights = async () => {
    if (
      !confirm(
        "This will recreate your Insights sheet with the new format (payment breakdowns). Your Sales and Products sheets will NOT be affected. Continue?"
      )
    ) {
      return;
    }

    setIsMigrating(true);

    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");

      if (!spreadsheetId) {
        setToast({
          message: "No spreadsheet found. Please sync first.",
          type: "error",
        });
        setIsMigrating(false);
        return;
      }

      // Step 1: Delete the existing Insights sheet
      const deleteResponse = await fetch("/api/sheets/delete-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (!deleteResponse.ok) {
        throw new Error("Failed to delete old Insights sheet");
      }

      // Step 2: Create new Insights sheet with updated format
      const createResponse = await fetch("/api/sheets/create-insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      if (createResponse.ok) {
        setToast({
          message:
            "Insights sheet migrated successfully! Now includes payment breakdowns.",
          type: "success",
        });
        // Hide the banner after successful migration
        setShowSchemaBanner(false);
        // Refresh the insights data
        await fetchInsightsData();
      } else {
        const error = await createResponse.json();
        setToast({
          message: `Failed to migrate insights: ${error.error}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error migrating insights:", error);
      setToast({
        message:
          "Failed to migrate insights sheet. Please try again or recreate manually.",
        type: "error",
      });
    } finally {
      setIsMigrating(false);
    }
  };

  const getButtonText = () => {
    if (isCreatingInsights) return "Creating Analytics Sheet...";
    if (checkingInsights) return "Checking Status...";
    return "Enable Advanced Insights";
  };

  const toggleProductBreakdown = async (date: string) => {
    // If already expanded, just collapse it
    if (expandedDates.has(date)) {
      const newExpanded = new Set(expandedDates);
      newExpanded.delete(date);
      setExpandedDates(newExpanded);
      return;
    }

    // Expand and fetch data if not already loaded
    const newExpanded = new Set(expandedDates);
    newExpanded.add(date);
    setExpandedDates(newExpanded);

    // Check if we already have product breakdown for this date
    const dayData = insightsData?.dailyRevenue.find((d) => d.date === date);
    if (dayData?.productBreakdown) {
      // Already have data, just expand
      return;
    }

    // Fetch product breakdown for this date
    const newLoadingProducts = new Set(loadingProducts);
    newLoadingProducts.add(date);
    setLoadingProducts(newLoadingProducts);

    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) return;

      const response = await fetch("/api/sheets/get-daily-products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, date }),
      });

      if (response.ok) {
        const data = await response.json();

        // Update insightsData with the product breakdown
        if (insightsData) {
          const updatedDailyRevenue = insightsData.dailyRevenue.map((day) => {
            if (day.date === date) {
              return {
                ...day,
                productBreakdown: data.productBreakdown,
              };
            }
            return day;
          });

          setInsightsData({
            ...insightsData,
            dailyRevenue: updatedDailyRevenue,
          });
        }
      }
    } catch (error) {
      console.error("Error fetching product breakdown:", error);
    } finally {
      const newLoadingProducts = new Set(loadingProducts);
      newLoadingProducts.delete(date);
      setLoadingProducts(newLoadingProducts);
    }
  };

  return (
    <div className="min-h-screen bg-theme p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-theme mb-2 flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-primary" />
            Data Analytics
          </h1>
          <p className="text-theme-muted">
            Get detailed insights about your sales, revenue, and trends directly
            in your Google Sheets.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-theme-secondary rounded-lg p-8">
          {/* Experimental Warning Banner */}
          <div className="mb-6 p-4 bg-theme-tertiary border border-theme rounded-lg opacity-70">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-block px-2 py-1 text-xs font-bold bg-secondary text-theme rounded">
                  BETA
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-info font-medium mb-1">
                  Experimental Feature
                </p>
                <p className="text-sm text-theme-secondary">
                  This feature is still being developed and tested. It may have
                  bugs or incomplete functionality. Use with caution.
                </p>
              </div>
            </div>
          </div>

          {/* Features List - Only show when insights are NOT enabled */}
          {!insightsEnabled && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-theme mb-4">
                What you&apos;ll get:
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-success mt-1">✓</span>
                  <div>
                    <p className="text-theme font-medium">
                      Daily Revenue Tracking
                    </p>
                    <p className="text-sm text-theme-muted">
                      Automatic aggregation of sales by date with actual revenue
                      amounts
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success mt-1">✓</span>
                  <div>
                    <p className="text-theme font-medium">
                      Payment Method Breakdowns
                    </p>
                    <p className="text-sm text-theme-muted">
                      See daily totals by payment type (Cash, Venmo, Card,
                      Other) for easy reconciliation
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success mt-1">✓</span>
                  <div>
                    <p className="text-theme font-medium">Sales Analytics</p>
                    <p className="text-sm text-theme-muted">
                      Number of transactions, average sale value, and top
                      selling items
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-success mt-1">✓</span>
                  <div>
                    <p className="text-theme font-medium">
                      Auto-Updating Dashboard
                    </p>
                    <p className="text-sm text-theme-muted">
                      Formulas automatically update as new sales are synced
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          )}

          {/* Enable Button */}
          <button
            onClick={handleCreateInsights}
            disabled={isCreatingInsights || insightsEnabled || checkingInsights}
            className={`w-full px-6 py-4 rounded-lg flex items-center justify-center gap-3 touch-manipulation font-semibold text-lg transition-all ${
              insightsEnabled
                ? "bg-success text-theme cursor-default"
                : "bg-secondary text-theme hover:bg-secondary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {insightsEnabled ? (
              <>
                <CheckCircleIcon className="w-6 h-6" />
                Advanced Insights Enabled
              </>
            ) : (
              <>
                <ChartBarIcon className="w-6 h-6" />
                {getButtonText()}
              </>
            )}
          </button>
        </div>

        {/* Schema Outdated Banner - Show PROMINENTLY when payment methods have changed */}
        {insightsEnabled && showSchemaBanner && insightsData && (
          <div className="mt-6 bg-warning bg-opacity-20 border-2 border-warning rounded-lg p-6">
            <div className="flex items-start gap-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-warning flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-warning mb-2">
                  ⚠️ Payment Methods Changed - Update Required
                </h3>
                <p className="text-base text-theme mb-3">
                  Your Insights sheet needs to be updated to include new payment
                  methods.
                </p>
                {insightsData.expectedPaymentMethods &&
                  insightsData.currentPaymentMethods && (
                    <div className="text-sm space-y-2 mb-4 bg-theme-tertiary p-3 rounded">
                      <p className="text-theme">
                        <strong>Current columns:</strong>{" "}
                        {insightsData.currentPaymentMethods.join(", ") ||
                          "None"}
                      </p>
                      <p className="text-theme">
                        <strong>Should be:</strong>{" "}
                        {insightsData.expectedPaymentMethods.join(", ")}
                      </p>
                    </div>
                  )}
                <button
                  onClick={() => {
                    setShowSchemaBanner(false);
                    handleMigrateInsights();
                  }}
                  disabled={isMigrating}
                  className="w-full px-6 py-3 bg-yellow-500 text-black rounded-lg font-bold text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {isMigrating ? (
                    <>
                      <ArrowPathIcon className="w-6 h-6 animate-spin" />
                      Updating Schema...
                    </>
                  ) : (
                    <>
                      <ArrowPathIcon className="w-6 h-6" />
                      Update Schema Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Live Insights Data Display */}
        {insightsEnabled && insightsData && (
          <div className="mt-8 space-y-6">
            {/* Quick Stats */}
            <div className="bg-theme-secondary rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-theme">💰 Quick Stats</h2>
                <button
                  onClick={fetchInsightsData}
                  disabled={loadingData}
                  className="p-2 rounded-lg bg-theme-tertiary hover:bg-theme-tertiary disabled:opacity-50 transition-colors"
                  title="Refresh data"
                >
                  <ArrowPathIcon
                    className={`w-5 h-5 text-theme-secondary ${
                      loadingData ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-theme rounded-lg p-4 border border-theme">
                  <p className="text-sm text-theme-muted mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-success">
                    ${insightsData.quickStats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-theme rounded-lg p-4 border border-theme">
                  <p className="text-sm text-theme-muted mb-1">
                    Number of Sales
                  </p>
                  <p className="text-2xl font-bold text-blue-400">
                    {insightsData.quickStats.numberOfSales}
                  </p>
                </div>
                <div className="bg-theme rounded-lg p-4 border border-theme">
                  <p className="text-sm text-theme-muted mb-1">Average Sale</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${insightsData.quickStats.averageSale.toFixed(2)}
                  </p>
                </div>
                <div className="bg-theme rounded-lg p-4 border border-theme">
                  <p className="text-sm text-theme-muted mb-1">Top Item</p>
                  <p className="text-xl font-bold text-primary">
                    {insightsData.quickStats.topItem}
                  </p>
                </div>
                <div className="bg-theme rounded-lg p-4 border border-theme">
                  <p className="text-sm text-theme-muted mb-1">Top Size</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {insightsData.quickStats.topSize}
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Revenue Table */}
            <div className="bg-theme-secondary rounded-lg p-6">
              <h2 className="text-xl font-bold text-theme mb-4">
                📅 Revenue by Date
              </h2>

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
                      {insightsData.paymentMethods.map((method) => (
                        <th
                          key={method}
                          className="px-4 py-3 text-sm font-semibold text-theme-secondary text-right"
                        >
                          {method}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-sm font-semibold text-theme-secondary text-right">
                        Tips
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {insightsData.dailyRevenue.length > 0 ? (
                      insightsData.dailyRevenue.map((row) => {
                        const isExpanded = expandedDates.has(row.date);
                        const isLoadingProducts = loadingProducts.has(row.date);

                        return (
                          <>
                            <tr
                              key={row.date}
                              className="border-b border-theme/50 hover:bg-theme-tertiary/30 transition-colors"
                            >
                              <td className="px-4 py-3 text-sm text-theme font-medium">
                                {row.date}
                              </td>
                              <td className="px-4 py-3 text-sm text-theme-secondary text-center">
                                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-900/30 text-blue-300">
                                  {row.numberOfSales}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-success font-semibold text-right">
                                ${row.actualRevenue.toFixed(2)}
                              </td>
                              {insightsData.paymentMethods.map((method) => {
                                const amount = row.payments[method] || 0;
                                return (
                                  <td
                                    key={method}
                                    className="px-4 py-3 text-sm text-theme-secondary text-right"
                                  >
                                    {amount > 0 ? `$${amount.toFixed(2)}` : "-"}
                                  </td>
                                );
                              })}
                              <td className="px-4 py-3 text-sm text-green-400 font-semibold text-right">
                                {row.tips && row.tips > 0
                                  ? `$${row.tips.toFixed(2)}`
                                  : "-"}
                              </td>
                            </tr>
                            {/* Collapsible Product Insights Row */}
                            <tr key={`${row.date}-expand`}>
                              <td
                                colSpan={4 + insightsData.paymentMethods.length}
                                className="px-4 py-0 bg-theme-tertiary/20"
                              >
                                <button
                                  onClick={() =>
                                    toggleProductBreakdown(row.date)
                                  }
                                  className="w-full py-3 flex items-center justify-center gap-2 text-sm text-theme-secondary hover:text-theme transition-colors group"
                                >
                                  {isExpanded ? (
                                    <>
                                      <ChevronUpIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                      Hide Daily Product Insights
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDownIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                      See Daily Product Insights
                                    </>
                                  )}
                                </button>

                                {/* Expanded Product Breakdown */}
                                {isExpanded && (
                                  <div className="pb-4 px-4">
                                    {isLoadingProducts ? (
                                      <div className="text-center py-4">
                                        <ArrowPathIcon className="w-6 h-6 text-theme-muted mx-auto mb-2 animate-spin" />
                                        <p className="text-sm text-theme-muted">
                                          Loading product breakdown...
                                        </p>
                                      </div>
                                    ) : row.productBreakdown &&
                                      row.productBreakdown.length > 0 ? (
                                      <div className="bg-theme rounded-lg p-4 border border-theme">
                                        <h4 className="text-sm font-semibold text-theme mb-3 flex items-center gap-2">
                                          🎸 Products Sold on {row.date}
                                        </h4>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                          {row.productBreakdown.map(
                                            (product) => (
                                              <div
                                                key={product.productName}
                                                className="bg-theme-secondary rounded-lg p-3 border border-theme/50"
                                              >
                                                <p className="text-xs text-theme-muted mb-1">
                                                  {product.productName}
                                                </p>
                                                <p className="text-lg font-bold text-primary">
                                                  {product.quantity}
                                                  <span className="text-xs text-theme-muted ml-1">
                                                    sold
                                                  </span>
                                                </p>
                                              </div>
                                            )
                                          )}
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
                          </>
                        );
                      })
                    ) : (
                      <tr>
                        <td
                          colSpan={4 + insightsData.paymentMethods.length}
                          className="px-4 py-8 text-center text-theme-muted"
                        >
                          No sales data yet. Start making sales to see your
                          analytics!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Refresh Schema Button - At bottom of page when insights enabled */}
            <div className="mt-6 p-5 bg-theme-secondary border border-theme rounded-lg">
              <div className="mb-3">
                <p className="text-sm font-medium text-info mb-1">
                  🔄 Refresh Insights Schema
                </p>
                <p className="text-sm text-theme-secondary">
                  Click this button after adding or removing payment methods to
                  update your Insights sheet columns. This will recreate the
                  Insights tab with the current payment methods from your sales
                  data. Your Sales and Products data will not be affected.
                </p>
              </div>
              <button
                onClick={handleMigrateInsights}
                disabled={isMigrating}
                className="w-full px-4 py-3 bg-secondary hover:bg-secondary text-theme rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Refreshing Schema...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-5 h-5" />
                    Refresh Insights Schema
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {insightsEnabled && loadingData && !insightsData && (
          <div className="mt-8 bg-theme-secondary rounded-lg p-12 text-center">
            <ArrowPathIcon className="w-12 h-12 text-theme-muted mx-auto mb-4 animate-spin" />
            <p className="text-theme-muted">Loading your analytics...</p>
          </div>
        )}
      </div>

      {/* Toast Notification */}
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
