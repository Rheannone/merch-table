"use client";

import { useState, useEffect } from "react";
import { ChartBarIcon, CheckCircleIcon } from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";

interface ToastState {
  message: string;
  type: ToastType;
}

export default function Analytics() {
  const [isCreatingInsights, setIsCreatingInsights] = useState(false);
  const [insightsEnabled, setInsightsEnabled] = useState(false);
  const [checkingInsights, setCheckingInsights] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Check if Insights sheet already exists on component mount
  useEffect(() => {
    checkInsightsStatus();
  }, []);

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
              "✅ Insights sheet created! Check your Google Sheets for analytics.",
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
                  <p className="text-white font-medium">Sales Analytics</p>
                  <p className="text-sm text-zinc-400">
                    Number of transactions, average sale value, and trends over
                    time
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-green-400 mt-1">✓</span>
                <div>
                  <p className="text-white font-medium">Product Insights</p>
                  <p className="text-sm text-zinc-400">
                    Top selling items and popular sizes per day
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

          {insightsEnabled && (
            <div className="mt-6 p-4 bg-green-900/20 border border-green-500/30 rounded-lg">
              <p className="text-sm text-green-300">
                ✅ Your analytics are ready! Open your Google Sheets and check
                the &quot;Insights&quot; tab to view your data dashboard.
              </p>
            </div>
          )}
        </div>
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
