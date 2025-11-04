"use client";

import { useState, useEffect } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline";
import { PaymentSetting } from "@/types";
import Toast, { ToastType } from "./Toast";
import { useTheme } from "./ThemeProvider";
import { getAllThemes } from "@/lib/themes";
import { clearAllProducts } from "@/lib/db";
import {
  getCurrencySettings,
  saveCurrencySettings,
  CURRENCIES,
  CurrencyCode,
  formatPrice,
} from "@/lib/currency";

// TypeScript declarations for Google Picker API
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface ToastState {
  message: string;
  type: ToastType;
}

export default function Settings() {
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [showTipJar, setShowTipJar] = useState(true); // Default to true

  // Theme state
  const { setTheme, themeId } = useTheme();
  const [selectedThemeId, setSelectedThemeId] = useState(themeId);
  const availableThemes = getAllThemes();

  // Only sync selectedThemeId with themeId on initial load
  // After that, user interactions control selectedThemeId
  useEffect(() => {
    // Only update if we haven't made a selection yet
    if (selectedThemeId === themeId) {
      return;
    }
    // This ensures we pick up the initial theme from context
    setSelectedThemeId(themeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only on mount

  // Collapsible section states (collapsed by default)
  const [isPaymentOptionsExpanded, setIsPaymentOptionsExpanded] =
    useState(false);
  const [isProductCategoriesExpanded, setIsProductCategoriesExpanded] =
    useState(false);
  const [isGoogleSheetsExpanded, setIsGoogleSheetsExpanded] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isCurrencyExpanded, setIsCurrencyExpanded] = useState(false);

  // Currency settings state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [exchangeRate, setExchangeRate] = useState<string>("1.0");

  // Google Sheets state
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [currentSheetName, setCurrentSheetName] = useState<string>("");
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCurrentSheetInfo();
    loadGooglePickerScript();
    loadCurrencySettings();
  }, []);

  const loadCurrencySettings = () => {
    const settings = getCurrencySettings();
    setSelectedCurrency(settings.displayCurrency);
    setExchangeRate(settings.exchangeRate.toString());
  };

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setSelectedCurrency(newCurrency);
    const currencyInfo = CURRENCIES[newCurrency];
    setExchangeRate(currencyInfo.defaultRate.toString());
  };

  const handleSaveCurrency = async () => {
    const currencyInfo = CURRENCIES[selectedCurrency];
    const settings = {
      displayCurrency: selectedCurrency,
      exchangeRate: Number.parseFloat(exchangeRate) || currencyInfo.defaultRate,
      symbol: currencyInfo.symbol,
      code: selectedCurrency,
    };

    // Save to localStorage
    saveCurrencySettings(settings);

    // Also save to Google Sheets so it persists across devices
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (spreadsheetId) {
        await fetch("/api/sheets/settings/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            spreadsheetId,
            paymentSettings,
            categories,
            theme: selectedThemeId,
            showTipJar,
            currency: {
              displayCurrency: selectedCurrency,
              exchangeRate: Number.parseFloat(exchangeRate),
            },
          }),
        });
      }
    } catch (error) {
      console.error("Error saving currency to sheet:", error);
    }

    setToast({
      message: `Currency set to ${currencyInfo.name}! Exchange rate: ${exchangeRate}`,
      type: "success",
    });
  };

  // Load current sheet info from localStorage and fetch name if needed
  const loadCurrentSheetInfo = async () => {
    const sheetId = localStorage.getItem("salesSheetId");
    let sheetName = localStorage.getItem("salesSheetName");

    setCurrentSheetId(sheetId);

    // If we have a sheet ID but no name, fetch it from Google Sheets API
    if (sheetId && !sheetName) {
      try {
        const response = await fetch("/api/sheets/get-sheet-name", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ spreadsheetId: sheetId }),
        });

        if (response.ok) {
          const data = await response.json();
          const fetchedName = data.name || "Your Current Sheet";
          sheetName = fetchedName;
          // Save it for next time
          localStorage.setItem("salesSheetName", fetchedName);
        }
      } catch (error) {
        console.error("Error fetching sheet name:", error);
      }
    }

    setCurrentSheetName(sheetName || "Your Current Sheet");
  };

  // Load Google Picker API script
  const loadGooglePickerScript = () => {
    if (window.google?.picker) {
      setIsPickerLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load("picker", () => {
        setIsPickerLoaded(true);
      });
    };
    document.body.appendChild(script);
  };

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
        setCategories(data.categories || ["Apparel", "Merch", "Music"]);
        setShowTipJar(data.showTipJar !== false); // Default to true if not set

        // Load theme if provided - but only update if user hasn't selected a different theme to preview
        // This prevents overwriting the user's preview selection
        if (data.theme && selectedThemeId === themeId) {
          setSelectedThemeId(data.theme);
        }

        // Load currency settings from sheet if available
        if (data.currency) {
          const currencyCode = (data.currency.displayCurrency ||
            "USD") as CurrencyCode;
          setSelectedCurrency(currencyCode);
          setExchangeRate((data.currency.exchangeRate || 1.0).toString());

          // Update localStorage with currency from sheet
          const currencyInfo = CURRENCIES[currencyCode];
          saveCurrencySettings({
            displayCurrency: currencyCode,
            exchangeRate: data.currency.exchangeRate || 1.0,
            symbol: currencyInfo.symbol,
            code: currencyCode,
          });
        }
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
        body: JSON.stringify({
          spreadsheetId,
          paymentSettings,
          categories,
          theme: selectedThemeId,
          showTipJar,
          currency: {
            displayCurrency: selectedCurrency,
            exchangeRate: Number.parseFloat(exchangeRate),
          },
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: "Settings saved successfully!",
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

  // Open Google Picker to select a spreadsheet
  const openSheetPicker = async () => {
    if (!isPickerLoaded) {
      setToast({
        message: "Google Picker is still loading. Please try again.",
        type: "error",
      });
      return;
    }

    try {
      // Get the access token from the session
      const response = await fetch("/api/auth/session");
      const session = await response.json();

      if (!session?.accessToken) {
        setToast({
          message: "Please sign in to select a sheet.",
          type: "error",
        });
        return;
      }

      const picker = new window.google.picker.PickerBuilder()
        .setOAuthToken(session.accessToken)
        .addView(window.google.picker.ViewId.SPREADSHEETS)
        .setCallback(handlePickerCallback)
        .setTitle("Select a Google Sheet")
        .build();

      picker.setVisible(true);
    } catch (error) {
      console.error("Error opening picker:", error);
      setToast({
        message: "Failed to open sheet picker.",
        type: "error",
      });
    }
  };

  // Handle sheet selection from picker
  const handlePickerCallback = async (data: any) => {
    if (data.action === window.google.picker.Action.PICKED) {
      const doc = data.docs[0];
      const newSheetId = doc.id;
      const newSheetName = doc.name;

      // Update localStorage
      localStorage.setItem("salesSheetId", newSheetId);
      localStorage.setItem("salesSheetName", newSheetName);
      localStorage.setItem("productsSheetId", newSheetId);

      // Clear IndexedDB products so they're loaded fresh from new sheet
      await clearAllProducts();

      // Update state
      setCurrentSheetId(newSheetId);
      setCurrentSheetName(newSheetName);

      // Show success message
      setToast({
        message: `Switched to "${newSheetName}"! Reloading data...`,
        type: "success",
      });

      // Reload settings from new sheet
      setTimeout(() => {
        loadSettings();
        window.location.reload(); // Refresh to reload all data
      }, 1000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-theme">
        <p className="text-theme-muted">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-theme p-3 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-theme">
            ⚙️ Settings
          </h1>
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className={`w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-success text-theme font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              selectedThemeId !== themeId
                ? "animate-pulse ring-2 ring-success"
                : ""
            }`}
          >
            {isSaving
              ? "Saving..."
              : selectedThemeId !== themeId
              ? "💾 Save Theme Changes"
              : "💾 Save Settings"}
          </button>
        </div>

        {/* Payment Options Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() =>
              setIsPaymentOptionsExpanded(!isPaymentOptionsExpanded)
            }
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme">
                💳 Payment Options
              </h2>
            </div>
            {isPaymentOptionsExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isPaymentOptionsExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Configure which payment types are available in your POS system.
              </p>

              {/* Show Tip Jar Option */}
              <div className="mb-6 p-4 bg-theme border border-theme rounded-lg">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={showTipJar}
                    onChange={(e) => setShowTipJar(e.target.checked)}
                    className="w-5 h-5"
                    id="showTipJar"
                  />
                  <label
                    htmlFor="showTipJar"
                    className="text-lg font-semibold text-theme cursor-pointer"
                  >
                    💰 Show Tip Jar
                  </label>
                </div>
                <p className="text-xs text-theme-muted ml-8 mt-1">
                  Allow customers to add tips to their purchase
                </p>
              </div>

              <div className="space-y-6">
                {paymentSettings.map((setting, index) => (
                  <div
                    key={setting.paymentType}
                    className="border border-theme rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={setting.enabled}
                          onChange={(e) =>
                            updatePaymentSetting(
                              index,
                              "enabled",
                              e.target.checked
                            )
                          }
                          className="w-5 h-5"
                        />
                        <span className="text-lg font-semibold text-theme">
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
                          <label className="block text-sm font-medium text-theme-secondary mb-1">
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
                            className="w-full px-3 py-2 bg-theme border border-theme rounded text-theme"
                            placeholder="e.g., Cash, Venmo, Credit Card"
                          />
                        </div>

                        {/* Transaction Fee (for credit and custom) */}
                        {(setting.paymentType === "credit" ||
                          setting.paymentType.startsWith("custom")) && (
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Transaction Fee %
                              {setting.paymentType === "credit" && (
                                <span className="text-xs text-theme-muted ml-2">
                                  (This doesn&apos;t process the card - just
                                  shows the total you should charge)
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
                              className="w-32 px-3 py-2 input-theme rounded"
                              placeholder="3.0"
                            />
                            <span className="text-sm text-theme-muted ml-2">
                              %
                            </span>
                          </div>
                        )}

                        {/* QR Code URL (for venmo and custom) */}
                        {(setting.paymentType === "venmo" ||
                          setting.paymentType.startsWith("custom")) && (
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
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
                              className="w-full px-3 py-2 input-theme rounded"
                              placeholder="https://example.com/qr-code.png"
                            />
                            <p className="text-xs text-theme-muted mt-1">
                              If set, a popup with the QR code will be shown
                              during checkout
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Currency Display Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsCurrencyExpanded(!isCurrencyExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme">
                💱 Currency Display
              </h2>
            </div>
            {isCurrencyExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isCurrencyExpanded && (
            <div className="px-6 pb-6">
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>💡 How it works:</strong> All prices are stored in USD
                  in your Google Sheets. This setting only changes how prices
                  are displayed to customers.
                </p>
                <p className="text-sm text-blue-400">
                  Perfect for touring! Show CAD prices in Canada, but all
                  reporting stays in USD.
                </p>
              </div>

              <div className="space-y-6">
                {/* Currency Selection */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Display Currency
                  </label>
                  <select
                    value={selectedCurrency}
                    onChange={(e) =>
                      handleCurrencyChange(e.target.value as CurrencyCode)
                    }
                    className="w-full p-3 bg-theme border border-theme rounded-lg text-theme font-medium"
                  >
                    {Object.values(CURRENCIES).map((currency) => (
                      <option key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exchange Rate */}
                <div>
                  <label className="block text-sm font-medium text-theme-secondary mb-2">
                    Exchange Rate (1 USD =)
                  </label>

                  {/* Check Rates Link - Prominent */}
                  <a
                    href="https://www.xe.com/currencyconverter/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 mb-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 rounded-lg text-sm font-medium text-blue-300 hover:text-blue-200 transition-colors"
                  >
                    <span>🔄</span>
                    Check Current Exchange Rates
                    <span className="text-xs opacity-75">↗</span>
                  </a>

                  <div className="flex gap-3 items-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={exchangeRate}
                      onChange={(e) => setExchangeRate(e.target.value)}
                      className="flex-1 p-3 bg-theme border border-theme rounded-lg text-theme font-bold"
                      placeholder="1.35"
                    />
                    <span className="text-theme-secondary font-medium">
                      {CURRENCIES[selectedCurrency].symbol}
                    </span>
                  </div>
                  <p className="text-xs text-theme-muted mt-2">
                    Default: {CURRENCIES[selectedCurrency].defaultRate}{" "}
                    (approximate Nov 2025 rate)
                  </p>
                </div>

                {/* Preview */}
                <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4">
                  <p className="text-sm text-green-300 mb-3 font-medium">
                    💰 Preview:
                  </p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-theme-muted">$10 USD →</span>
                      <span className="text-theme font-bold">
                        {formatPrice(10)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">$25 USD →</span>
                      <span className="text-theme font-bold">
                        {formatPrice(25)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-theme-muted">$50 USD →</span>
                      <span className="text-theme font-bold">
                        {formatPrice(50)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleSaveCurrency}
                  className="w-full bg-success hover:bg-success-hover text-theme font-semibold py-3 rounded-lg transition-colors"
                >
                  Apply Currency Settings
                </button>
              </div>

              {/* Info Box */}
              <div className="bg-theme-secondary border border-theme rounded-lg p-4 mt-6 opacity-70">
                <p className="text-sm text-theme-secondary">
                  <strong>Note:</strong> When entering product prices in
                  Inventory, they will be displayed in your chosen currency but
                  stored as USD. All Google Sheets data remains in USD for
                  accurate reporting.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Product Categories Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() =>
              setIsProductCategoriesExpanded(!isProductCategoriesExpanded)
            }
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme">
                📦 Product Categories
              </h2>
            </div>
            {isProductCategoriesExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isProductCategoriesExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Manage your product categories for inventory organization. The
                order here determines how they display in the POS interface.
              </p>

              <div className="space-y-4">
                {/* Add New Category */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && newCategory.trim()) {
                        if (!categories.includes(newCategory.trim())) {
                          setCategories([...categories, newCategory.trim()]);
                          setNewCategory("");
                        }
                      }
                    }}
                    placeholder="Enter new category name..."
                    className="flex-1 px-4 py-2 input-theme rounded focus:border-primary"
                  />
                  <button
                    onClick={() => {
                      if (
                        newCategory.trim() &&
                        !categories.includes(newCategory.trim())
                      ) {
                        setCategories([...categories, newCategory.trim()]);
                        setNewCategory("");
                      }
                    }}
                    disabled={
                      !newCategory.trim() ||
                      categories.includes(newCategory.trim())
                    }
                    className="px-4 py-2 bg-success text-theme font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    ➕ Add
                  </button>
                </div>

                {/* Category List with Reordering */}
                <div className="space-y-2">
                  {categories.map((category, index) => (
                    <div
                      key={category}
                      className="flex items-center gap-2 bg-theme-tertiary border border-theme rounded p-3"
                    >
                      {/* Order Controls */}
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => {
                            if (index > 0) {
                              const newCategories = [...categories];
                              [newCategories[index - 1], newCategories[index]] =
                                [
                                  newCategories[index],
                                  newCategories[index - 1],
                                ];
                              setCategories(newCategories);
                            }
                          }}
                          disabled={index === 0}
                          className="px-2 py-0.5 btn-theme text-theme text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Move up"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => {
                            if (index < categories.length - 1) {
                              const newCategories = [...categories];
                              [newCategories[index], newCategories[index + 1]] =
                                [
                                  newCategories[index + 1],
                                  newCategories[index],
                                ];
                              setCategories(newCategories);
                            }
                          }}
                          disabled={index === categories.length - 1}
                          className="px-2 py-0.5 btn-theme text-theme text-xs rounded disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                          title="Move down"
                        >
                          ▼
                        </button>
                      </div>

                      {/* Category Name */}
                      <span className="flex-1 text-theme font-medium">
                        {index + 1}. {category}
                      </span>

                      {/* Remove Button */}
                      <button
                        onClick={() => {
                          setCategories(
                            categories.filter((c) => c !== category)
                          );
                        }}
                        className="px-3 py-1 bg-error text-theme text-sm font-medium rounded transition-all"
                      >
                        🗑️ Remove
                      </button>
                    </div>
                  ))}
                </div>

                {categories.length === 0 && (
                  <p className="text-center text-theme-muted py-4">
                    No categories yet. Add your first category above!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Google Sheets Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsGoogleSheetsExpanded(!isGoogleSheetsExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme">
                📊 Google Sheets
              </h2>
            </div>
            {isGoogleSheetsExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isGoogleSheetsExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Select which Google Sheet to use for your POS data. You can
                switch between different sheets for different tours or events.
              </p>

              {currentSheetId ? (
                <div className="space-y-4">
                  {/* Current Sheet Display */}
                  <div className="bg-theme-tertiary rounded-lg p-4 border border-theme">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <label className="block text-xs font-medium text-theme-muted mb-1">
                          Current Sheet
                        </label>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-semibold text-theme truncate">
                            {currentSheetName}
                          </span>
                        </div>
                        <a
                          href={`https://docs.google.com/spreadsheets/d/${currentSheetId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-info hover:text-secondary underline break-all"
                        >
                          Open in Google Sheets →
                        </a>
                      </div>
                      <button
                        onClick={openSheetPicker}
                        className="px-4 py-2 bg-secondary text-theme font-semibold rounded transition-all whitespace-nowrap"
                      >
                        🔄 Change Sheet
                      </button>
                    </div>
                  </div>

                  {/* Info Box */}
                  <div className="bg-theme-secondary border border-theme rounded-lg p-4 opacity-70">
                    <p className="text-sm text-info">
                      💡 <strong>Tip:</strong> Switching sheets will reload all
                      your data (products, sales, settings) from the newly
                      selected sheet.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-theme-muted mb-4">
                    No sheet currently selected
                  </p>
                  <button
                    onClick={openSheetPicker}
                    className="px-6 py-3 bg-secondary text-theme font-semibold rounded transition-all"
                  >
                    📊 Select a Sheet
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Theme Selection Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsThemeExpanded(!isThemeExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-theme">🎨 Theme</h2>
            </div>
            {isThemeExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isThemeExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Choose a theme to customize the look and feel of your POS app.
                Your selection will be saved and applied every time you log in.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableThemes.map((theme) => {
                  const isSelected = selectedThemeId === theme.id;

                  return (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setSelectedThemeId(theme.id);
                        setTheme(theme.id);

                        // Only show toast if actually changing themes
                        if (theme.id !== themeId) {
                          setToast({
                            message: `Previewing ${theme.name}. Click "Save Settings" below to keep it!`,
                            type: "success",
                          });
                        }
                      }}
                      className={`
                        relative p-6 rounded-lg border-2 text-left transition-all
                        ${
                          isSelected
                            ? "border-success bg-success/10"
                            : "border-theme hover:border-theme-hover bg-theme-secondary"
                        }
                      `}
                    >
                      {/* Selected Indicator */}
                      {isSelected && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-success text-theme rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                            ✓
                          </div>
                        </div>
                      )}

                      {/* Theme Info */}
                      <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-3xl">{theme.emoji}</span>
                          <h3 className="text-xl font-bold text-theme">
                            {theme.name}
                          </h3>
                        </div>
                        <p className="text-sm text-theme-secondary">
                          {theme.description}
                        </p>
                      </div>

                      {/* Color Preview */}
                      <div className="flex gap-2 flex-wrap">
                        <div
                          className="w-10 h-10 rounded border"
                          style={{
                            backgroundColor: theme.colors.background,
                            borderColor: "var(--color-border)",
                          }}
                          title="Background"
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{
                            backgroundColor: theme.colors.primary,
                            borderColor: "var(--color-border)",
                          }}
                          title="Primary"
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{
                            backgroundColor: theme.colors.secondary,
                            borderColor: "var(--color-border)",
                          }}
                          title="Secondary"
                        />
                        <div
                          className="w-10 h-10 rounded border"
                          style={{
                            backgroundColor: theme.colors.success,
                            borderColor: "var(--color-border)",
                          }}
                          title="Success"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Info Box */}
              <div className="bg-theme-secondary border border-theme rounded-lg p-4 mt-6 opacity-70">
                <p className="text-sm text-info">
                  ✨ <strong>Preview Mode:</strong> You&apos;re seeing the theme
                  in real-time! Click &quot;Save Settings&quot; below to make it
                  permanent.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Save Button at bottom */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={isSaving}
            className={`px-6 py-3 bg-success text-theme font-semibold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              selectedThemeId !== themeId
                ? "animate-pulse ring-2 ring-success"
                : ""
            }`}
          >
            {isSaving
              ? "Saving..."
              : selectedThemeId !== themeId
              ? "💾 Save Theme Changes"
              : "💾 Save Settings"}
          </button>
        </div>

        {/* Legal Links */}
        <div className="mt-8 pt-6 border-t border-theme">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-muted hover:text-theme transition-colors"
            >
              Privacy Policy
            </a>
            <span className="text-theme-muted">•</span>
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="text-theme-muted hover:text-theme transition-colors"
            >
              Terms of Service
            </a>
          </div>
          <p className="text-center text-xs text-theme-muted mt-3 opacity-60">
            Band Merch POS • Made for musicians on tour
          </p>
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
