"use client";

import { useState, useEffect } from "react";
import { CloseOut } from "@/types";
import {
  getCurrentSessionStats,
  formatCurrency,
  formatDate,
  getSessionDuration,
} from "@/lib/closeouts";
import { getCloseOuts, refreshDB } from "@/lib/db";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ClockIcon,
  BanknotesIcon,
  ChartBarIcon,
  PlusIcon,
  PencilIcon,
} from "@heroicons/react/24/outline";

interface CurrentSessionData {
  salesCount: number;
  totalRevenue: number;
  actualRevenue: number;
  discountsGiven: number;
  tipsReceived: number;
  paymentBreakdown: { [method: string]: { count: number; amount: number } };
  productsSold: {
    productId: string;
    productName: string;
    quantitySold: number;
    revenue: number;
    sizes: { [size: string]: number };
  }[];
  expectedCash: number;
  saleIds: string[];
  salesPeriod: { startDate: string; endDate: string } | null;
}

interface CloseOutSectionProps {
  onCreateCloseOut: () => void;
  onEditCloseOut: (closeOut: CloseOut) => void;
}

export default function CloseOutSection({
  onCreateCloseOut,
  onEditCloseOut,
}: CloseOutSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentSession, setCurrentSession] =
    useState<CurrentSessionData | null>(null);
  const [closeOuts, setCloseOuts] = useState<CloseOut[]>([]);
  const [loading, setLoading] = useState(true);

  // Load data on mount and set up refresh interval
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Refresh every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [sessionData, closeOutData] = await Promise.all([
        getCurrentSessionStats(),
        getCloseOuts(),
      ]);

      setCurrentSession(sessionData);
      setCloseOuts(closeOutData);
    } catch (error) {
      console.error("Failed to load close-out data:", error);

      // If it's a database store not found error, try refreshing the database connection
      if (
        error instanceof Error &&
        error.message.includes("object stores was not found")
      ) {
        console.log(
          "🔄 Database store not found, attempting to refresh DB connection..."
        );
        try {
          await refreshDB();
          // Retry loading data
          const [sessionData, closeOutData] = await Promise.all([
            getCurrentSessionStats(),
            getCloseOuts(),
          ]);
          setCurrentSession(sessionData);
          setCloseOuts(closeOutData);
        } catch (retryError) {
          console.error(
            "Failed to load data even after DB refresh:",
            retryError
          );
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-theme-tertiary rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-theme-tertiary rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
      >
        <div className="flex items-center gap-3">
          <ChartBarIcon className="w-7 h-7 text-primary" />
          <h2 className="text-2xl font-bold text-theme">
            Sessions & Close-Outs
          </h2>
        </div>
        {isExpanded ? (
          <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
        ) : (
          <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
        )}
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6">
          {/* Current Session Stats */}
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 border-2 border-primary/30 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-theme flex items-center gap-2">
                <ClockIcon className="w-6 h-6" />
                Current Session
              </h3>
              <button
                onClick={onCreateCloseOut}
                disabled={!currentSession || currentSession.salesCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
              >
                <PlusIcon className="w-5 h-5" />
                Close Out Session
              </button>
            </div>

            {currentSession && currentSession.salesCount > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-theme-secondary rounded-lg p-4">
                  <div className="text-sm text-theme-muted">Sales Count</div>
                  <div className="text-2xl font-bold text-theme">
                    {currentSession.salesCount}
                  </div>
                </div>

                <div className="bg-theme-secondary rounded-lg p-4">
                  <div className="text-sm text-theme-muted">Total Revenue</div>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(currentSession.totalRevenue)}
                  </div>
                </div>

                <div className="bg-theme-secondary rounded-lg p-4">
                  <div className="text-sm text-theme-muted">Actual Revenue</div>
                  <div className="text-2xl font-bold text-theme">
                    {formatCurrency(currentSession.actualRevenue)}
                  </div>
                </div>

                <div className="bg-theme-secondary rounded-lg p-4">
                  <div className="text-sm text-theme-muted">
                    Session Duration
                  </div>
                  <div className="text-lg font-semibold text-theme">
                    {getSessionDuration(
                      currentSession.salesPeriod?.startDate,
                      currentSession.salesPeriod?.endDate
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎪</div>
                <div className="text-xl font-semibold text-theme mb-2">
                  No sales in current session
                </div>
                <div className="text-theme-muted">
                  Make some sales to see session stats here!
                </div>
              </div>
            )}
          </div>

          {/* Close-Out History */}
          <div>
            <h3 className="text-xl font-bold text-theme mb-4 flex items-center gap-2">
              <BanknotesIcon className="w-6 h-6" />
              Close-Out History
            </h3>

            {closeOuts.length > 0 ? (
              <div className="space-y-3">
                {closeOuts.slice(0, 5).map((closeOut) => (
                  <div
                    key={closeOut.id}
                    className="bg-theme border border-theme rounded-lg p-4 hover:bg-theme-tertiary transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold text-theme">
                            {closeOut.sessionName ||
                              `Session ${formatDate(closeOut.timestamp)}`}
                          </h4>
                          {closeOut.location && (
                            <span className="text-sm text-theme-muted bg-theme-secondary px-2 py-1 rounded">
                              📍 {closeOut.location}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-theme-muted">Sales:</span>
                            <span className="ml-1 font-semibold text-theme">
                              {closeOut.salesCount}
                            </span>
                          </div>
                          <div>
                            <span className="text-theme-muted">Revenue:</span>
                            <span className="ml-1 font-semibold text-green-600">
                              {formatCurrency(closeOut.actualRevenue)}
                            </span>
                          </div>
                          <div>
                            <span className="text-theme-muted">Date:</span>
                            <span className="ml-1 font-semibold text-theme">
                              {new Date(
                                closeOut.eventDate || closeOut.timestamp
                              ).toLocaleDateString()}
                            </span>
                          </div>
                          {closeOut.cashDifference !== undefined && (
                            <div>
                              <span className="text-theme-muted">
                                Cash Diff:
                              </span>
                              <span
                                className={`ml-1 font-semibold ${
                                  closeOut.cashDifference >= 0
                                    ? "text-green-600"
                                    : "text-red-500"
                                }`}
                              >
                                {closeOut.cashDifference >= 0 ? "+" : ""}
                                {formatCurrency(closeOut.cashDifference)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onEditCloseOut(closeOut)}
                          className="p-2 hover:bg-theme-secondary rounded-lg transition-colors"
                          title="Edit close-out"
                        >
                          <PencilIcon className="w-5 h-5 text-theme-muted hover:text-theme" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {closeOuts.length > 5 && (
                  <div className="text-center py-4">
                    <div className="text-theme-muted">
                      + {closeOuts.length - 5} more close-outs
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 bg-theme border border-theme rounded-lg">
                <div className="text-4xl mb-4">📊</div>
                <div className="text-lg font-semibold text-theme mb-2">
                  No close-outs yet
                </div>
                <div className="text-theme-muted">
                  Close out your first session to see history here
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
