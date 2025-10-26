"use client";

import { useState, useEffect } from "react";
import { PaymentSetting } from "@/types";
import Toast, { ToastType } from "./Toast";

interface SettingsProps {
  // No props needed for now
}

interface ToastState {
  message: string;
  type: ToastType;
}

export default function Settings({}: SettingsProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");

      if (!spreadsheetId) {
        setToast({
          message: "No spreadsheet found. Please initialize sheets first.",
          type: "error",
        });
        return;
      }

      const response = await fetch("/api/sheets/settings/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();

      if (response.ok) {
        setPaymentSettings(data.paymentSettings);
      } else {
        setToast({
          message: `Failed to load settings: ${data.error}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
      setToast({
        message: "Failed to load settings. Please try again.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");

      if (!spreadsheetId) {
        setToast({
          message: "No spreadsheet found. Please initialize sheets first.",
          type: "error",
        });
        return;
      }

      const response = await fetch("/api/sheets/settings/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId, paymentSettings }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: "✅ Settings saved successfully!",
          type: "success",
        });
      } else {
        setToast({
          message: `Failed to save settings: ${data.error}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      setToast({
        message: "Failed to save settings. Please try again.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const updatePaymentSetting = (
    index: number,
    field: keyof PaymentSetting,
    value: string | number | boolean | undefined
  ) => {
    const updated = [...paymentSettings];
    if (field === "transactionFee" || field === "qrCodeUrl") {
      updated[index][field] = value as any;
    } else {
      (updated[index] as Record<string, any>)[field] = value;
    }
    setPaymentSettings(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-900">
        <p className="text-zinc-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-white">⚙️ Settings</h1>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Saving..." : "💾 Save Settings"}
          </button>
        </div>

        {/* Payment Options Section */}
        <div className="bg-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            💳 Payment Options
          </h2>
          <p className="text-sm text-zinc-400 mb-6">
            Configure which payment types are available in your POS system.
          </p>

          <div className="space-y-6">
            {paymentSettings.map((setting, index) => (
              <div
                key={setting.paymentType}
                className="border border-zinc-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={setting.enabled}
                      onChange={(e) =>
                        updatePaymentSetting(index, "enabled", e.target.checked)
                      }
                      className="w-5 h-5"
                    />
                    <span className="text-lg font-semibold text-white">
                      {setting.paymentType === "cash" && "💵 Cash"}
                      {setting.paymentType === "venmo" && "📱 Venmo"}
                      {setting.paymentType === "credit" && "💳 Credit Card"}
                      {setting.paymentType === "other" && "🔧 Other"}
                      {setting.paymentType.startsWith("custom") &&
                        `✨ Custom ${setting.paymentType.slice(-1)}`}
                    </span>
                  </div>
                </div>

                {setting.enabled && (
                  <div className="ml-8 space-y-3">
                    {/* Display Name */}
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">
                        Button Label
                      </label>
                      <input
                        type="text"
                        value={setting.displayName}
                        onChange={(e) =>
                          updatePaymentSetting(
                            index,
                            "displayName",
                            e.target.value
                          )
                        }
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                        placeholder="e.g., Cash, Venmo, Credit Card"
                      />
                    </div>

                    {/* Transaction Fee (for credit and custom) */}
                    {(setting.paymentType === "credit" ||
                      setting.paymentType.startsWith("custom")) && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          Transaction Fee %
                          {setting.paymentType === "credit" && (
                            <span className="text-xs text-zinc-500 ml-2">
                              (This doesn't process the card - just shows the
                              total you should charge)
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={
                            setting.transactionFee !== undefined
                              ? setting.transactionFee * 100
                              : ""
                          }
                          onChange={(e) =>
                            updatePaymentSetting(
                              index,
                              "transactionFee",
                              e.target.value
                                ? Number.parseFloat(e.target.value) / 100
                                : undefined
                            )
                          }
                          className="w-32 px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                          placeholder="3.0"
                        />
                        <span className="text-sm text-zinc-400 ml-2">%</span>
                      </div>
                    )}

                    {/* QR Code URL (for venmo and custom) */}
                    {(setting.paymentType === "venmo" ||
                      setting.paymentType.startsWith("custom")) && (
                      <div>
                        <label className="block text-sm font-medium text-zinc-300 mb-1">
                          QR Code Image URL (optional)
                        </label>
                        <input
                          type="url"
                          value={setting.qrCodeUrl || ""}
                          onChange={(e) =>
                            updatePaymentSetting(
                              index,
                              "qrCodeUrl",
                              e.target.value || undefined
                            )
                          }
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white"
                          placeholder="https://example.com/qr-code.png"
                        />
                        <p className="text-xs text-zinc-500 mt-1">
                          If set, a popup with the QR code will be shown during
                          checkout
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Save Button at bottom */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isSaving ? "Saving..." : "💾 Save Settings"}
          </button>
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
