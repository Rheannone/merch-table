"use client";

import { useState, useEffect } from "react";
import {
  ChartBarIcon,
  CheckCircleIcon,
  ArrowPathIcon,
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

interface DailyRevenueData {
  date: string;
  numberOfSales: number;
  actualRevenue: number;
  payments: { [key: string]: number };
}

interface InsightsData {
  quickStats: QuickStats;
  dailyRevenue: DailyRevenueData[];
  paymentMethods: string[];
}

export default function Analytics() {
  const [isCreatingInsights, setIsCreatingInsights] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [checkingInsights, setCheckingInsights] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

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
      } else {
        console.error("Failed to fetch insights data");
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

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ChartBarIcon className="w-8 h-8 text-red-400" />
            Data Analytics
          </h1>
          <p className="text-zinc-400">
            Get detailed insights about your sales, revenue, and trends directly
            in your Google Sheets.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-zinc-800 rounded-lg p-8">
          {/* Experimental Warning Banner */}
          <div className="mb-6 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <span className="inline-block px-2 py-1 text-xs font-bold bg-purple-600 text-white rounded">
                  BETA
                </span>
              </div>
              <div className="flex-1">
                <p className="text-sm text-purple-300 font-medium mb-1">
                  Experimental Feature
                </p>
                <p className="text-sm text-purple-400">
                  This feature is still being developed and tested. It may have
                  bugs or incomplete functionality. Use with caution.
                </p>
              </div>
            </div>
          </div>

          {/* Features List */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">
              What you&apos;ll get:
            </h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <p className="text-white font-medium">
                    Daily Revenue Tracking
                  </p>
                  <p className="text-sm text-zinc-400">
                    Automatic aggregation of sales by date with actual revenue
                    amounts
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <p className="text-white font-medium">
                    Payment Method Breakdowns
                  </p>
                  <p className="text-sm text-zinc-400">
                    See daily totals by payment type (Cash, Venmo, Card, Other)
                    for easy reconciliation
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <p className="text-white font-medium">Sales Analytics</p>
                  <p className="text-sm text-zinc-400">
                    Number of transactions, average sale value, and top selling
                    items
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <p className="text-white font-medium">
                    Auto-Updating Dashboard
                  </p>
                  <p className="text-sm text-zinc-400">
                    Formulas automatically update as new sales are synced
                  </p>
                </div>
              </li>
            </ul>
          </div>

          {/* Enable Button */}
          <button
            onClick={handleCreateInsights}
            disabled={isCreatingInsights || insightsEnabled || checkingInsights}
            className={`w-full px-6 py-4 rounded-lg flex items-center justify-center gap-3 touch-manipulation font-semibold text-lg transition-all ${
              insightsEnabled
                ? "bg-green-600 text-white cursor-default"
                : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
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

          {/* Migration Button - Only show when insights are enabled */}
          {insightsEnabled && (
            <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
              <div className="mb-3">
                <p className="text-sm font-medium text-blue-300 mb-1">
                  🔄 Update Available: Payment Breakdowns
                </p>
                <p className="text-sm text-blue-400">
                  Migrate your Insights sheet to the new format with daily
                  payment method totals (Cash, Venmo, Card, Other). This will
                  recreate the Insights tab only - your Sales and Products data
                  will not be affected.
                </p>
              </div>
              <button
                onClick={handleMigrateInsights}
                disabled={isMigrating}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    Migrating Insights Sheet...
                  </>
                ) : (
                  <>
                    <ArrowPathIcon className="w-5 h-5" />
                    Migrate to New Format
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Live Insights Data Display */}
        {insightsEnabled && insightsData && (
          <div className="mt-8 space-y-6">
            {/* Quick Stats */}
            <div className="bg-zinc-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">💰 Quick Stats</h2>
                <button
                  onClick={fetchInsightsData}
                  disabled={loadingData}
                  className="p-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 transition-colors"
                  title="Refresh data"
                >
                  <ArrowPathIcon
                    className={`w-5 h-5 text-zinc-300 ${
                      loadingData ? "animate-spin" : ""
                    }`}
                  />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Total Revenue</p>
                  <p className="text-2xl font-bold text-green-400">
                    ${insightsData.quickStats.totalRevenue.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Number of Sales</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {insightsData.quickStats.numberOfSales}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Average Sale</p>
                  <p className="text-2xl font-bold text-purple-400">
                    ${insightsData.quickStats.averageSale.toFixed(2)}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Top Item</p>
                  <p className="text-xl font-bold text-red-400">
                    {insightsData.quickStats.topItem}
                  </p>
                </div>
                <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-700">
                  <p className="text-sm text-zinc-400 mb-1">Top Size</p>
                  <p className="text-xl font-bold text-yellow-400">
                    {insightsData.quickStats.topSize}
                  </p>
                </div>
              </div>
            </div>

            {/* Daily Revenue Table */}
            <div className="bg-zinc-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                📅 Revenue by Date
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-700">
                      <th className="px-4 py-3 text-sm font-semibold text-zinc-300">
                        Date
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-zinc-300 text-center">
                        Sales
                      </th>
                      <th className="px-4 py-3 text-sm font-semibold text-zinc-300 text-right">
                        Revenue
                      </th>
                      {insightsData.paymentMethods.map((method) => (
                        <th
                          key={method}
                          className="px-4 py-3 text-sm font-semibold text-zinc-300 text-right"
                        >
                          {method === "Cash" && "💵 "}
                          {method === "Venmo" && "📱 "}
                          {method === "Card" && "💳 "}
                          {method === "Other" && "🔧 "}
                          {method}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {insightsData.dailyRevenue.length > 0 ? (
                      insightsData.dailyRevenue.map((row) => (
                        <tr
                          key={row.date}
                          className="border-b border-zinc-700/50 hover:bg-zinc-700/30 transition-colors"
                        >
                          <td className="px-4 py-3 text-sm text-white font-medium">
                            {row.date}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-300 text-center">
                            <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-900/30 text-blue-300">
                              {row.numberOfSales}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-green-400 font-semibold text-right">
                            ${row.actualRevenue.toFixed(2)}
                          </td>
                          {insightsData.paymentMethods.map((method) => {
                            const amount = row.payments[method] || 0;
                            return (
                              <td
                                key={method}
                                className="px-4 py-3 text-sm text-zinc-300 text-right"
                              >
                                {amount > 0 ? `$${amount.toFixed(2)}` : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={3 + insightsData.paymentMethods.length}
                          className="px-4 py-8 text-center text-zinc-500"
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
          </div>
        )}

        {/* Loading State */}
        {insightsEnabled && loadingData && !insightsData && (
          <div className="mt-8 bg-zinc-800 rounded-lg p-12 text-center">
            <ArrowPathIcon className="w-12 h-12 text-zinc-500 mx-auto mb-4 animate-spin" />
            <p className="text-zinc-400">Loading your analytics...</p>
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
