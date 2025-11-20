"use client";

import { useState, useEffect } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  CreditCardIcon,
  CurrencyDollarIcon,
  Square3Stack3DIcon,
  TableCellsIcon,
  CircleStackIcon,
  PaintBrushIcon,
  ArrowDownTrayIcon,
  EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { PaymentSetting, EmailSignupSettings, CloseOut } from "@/types";
import Toast, { ToastType } from "./Toast";
import CloseOutSection from "./CloseOutSection";
import CloseOutWizard from "./CloseOutWizard";
import { useTheme } from "./ThemeProvider";
import { getAllThemes } from "@/lib/themes";
import {
  clearAllProducts,
  saveSettings as saveSettingsToIndexedDB,
} from "@/lib/db";
import syncService from "@/lib/sync/syncService";
import {
  saveCurrencySettings,
  CURRENCIES,
  CurrencyCode,
  formatPrice,
} from "@/lib/currency";
import { processImageForUpload } from "@/lib/imageCompression";
import {
  loadSettingsFromSupabase,
  saveSettingsToSupabase,
} from "@/lib/supabase/data";

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
  duration?: number;
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
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);
  const [isCurrencyExpanded, setIsCurrencyExpanded] = useState(false);

  // Currency settings state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>("USD");
  const [exchangeRate, setExchangeRate] = useState<string>("1.0");

  // Google Sheets state
  const [currentSheetId, setCurrentSheetId] = useState<string | null>(null);
  const [currentSheetName, setCurrentSheetName] = useState<string>("");
  const [isPickerLoaded, setIsPickerLoaded] = useState(false);

  // QR Code upload state
  const [uploadingQRCode, setUploadingQRCode] = useState<string | null>(null); // payment type being uploaded

  // Backup state
  const [isBackupExpanded, setIsBackupExpanded] = useState(false);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);

  // Email Signup state
  const [isEmailSignupExpanded, setIsEmailSignupExpanded] = useState(false);
  const [emailSignupSettings, setEmailSignupSettings] =
    useState<EmailSignupSettings>({
      enabled: false,
      promptMessage: "Want to join our email list?",
      collectName: false,
      collectPhone: false,
      autoDismissSeconds: 10,
    });

  // Manual email entry state
  const [manualEmail, setManualEmail] = useState("");
  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [isManualEntrySubmitting, setIsManualEntrySubmitting] = useState(false);
  const [needsEmailListSheet, setNeedsEmailListSheet] = useState(false);
  const [isAddingEmailSheet, setIsAddingEmailSheet] = useState(false);

  // Close-out state
  const [showCloseOutWizard, setShowCloseOutWizard] = useState(false);
  const [editingCloseOut, setEditingCloseOut] = useState<CloseOut | null>(null);
  const [requireCashReconciliation, setRequireCashReconciliation] =
    useState(false);

  // Unsaved changes tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [originalPaymentSettings, setOriginalPaymentSettings] = useState<
    PaymentSetting[]
  >([]);
  const [originalCategories, setOriginalCategories] = useState<string[]>([]);
  const [originalShowTipJar, setOriginalShowTipJar] = useState(true);
  const [originalCurrency, setOriginalCurrency] = useState<CurrencyCode>("USD");
  const [originalExchangeRate, setOriginalExchangeRate] =
    useState<string>("1.0");
  const [originalEmailSignupSettings, setOriginalEmailSignupSettings] =
    useState<EmailSignupSettings>({
      enabled: false,
      promptMessage: "Want to join our email list?",
      collectName: false,
      collectPhone: false,
      autoDismissSeconds: 10,
    });
  const [
    originalRequireCashReconciliation,
    setOriginalRequireCashReconciliation,
  ] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCurrentSheetInfo();
    loadGooglePickerScript();
  }, []);

  // Detect changes
  useEffect(() => {
    const paymentChanged =
      JSON.stringify(paymentSettings) !==
      JSON.stringify(originalPaymentSettings);
    const categoriesChanged =
      JSON.stringify(categories) !== JSON.stringify(originalCategories);
    const tipJarChanged = showTipJar !== originalShowTipJar;
    const themeChanged = selectedThemeId !== themeId;
    const currencyChanged = selectedCurrency !== originalCurrency;
    const rateChanged = exchangeRate !== originalExchangeRate;
    const emailSignupChanged =
      JSON.stringify(emailSignupSettings) !==
      JSON.stringify(originalEmailSignupSettings);
    const closeOutSettingsChanged =
      requireCashReconciliation !== originalRequireCashReconciliation;

    const hasChanges =
      paymentChanged ||
      categoriesChanged ||
      tipJarChanged ||
      themeChanged ||
      currencyChanged ||
      rateChanged ||
      emailSignupChanged ||
      closeOutSettingsChanged;

    setHasUnsavedChanges(hasChanges);
  }, [
    paymentSettings,
    originalPaymentSettings,
    categories,
    originalCategories,
    showTipJar,
    originalShowTipJar,
    selectedThemeId,
    themeId,
    selectedCurrency,
    originalCurrency,
    exchangeRate,
    originalExchangeRate,
    emailSignupSettings,
    originalEmailSignupSettings,
    requireCashReconciliation,
    originalRequireCashReconciliation,
  ]);

  // Helper to check if specific section has changes
  const sectionHasChanges = (section: string) => {
    switch (section) {
      case "payment":
        return (
          JSON.stringify(paymentSettings) !==
            JSON.stringify(originalPaymentSettings) ||
          showTipJar !== originalShowTipJar
        );
      case "currency":
        return (
          selectedCurrency !== originalCurrency ||
          exchangeRate !== originalExchangeRate
        );
      case "categories":
        return (
          JSON.stringify(categories) !== JSON.stringify(originalCategories)
        );
      case "theme":
        return selectedThemeId !== themeId;
      case "emailSignup":
        return (
          JSON.stringify(emailSignupSettings) !==
          JSON.stringify(originalEmailSignupSettings)
        );
      default:
        return false;
    }
  };

  const handleCurrencyChange = (newCurrency: CurrencyCode) => {
    setSelectedCurrency(newCurrency);
    const currencyInfo = CURRENCIES[newCurrency];
    setExchangeRate(currencyInfo.defaultRate.toString());
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
      if (navigator.onLine) {
        // Online: Load from Supabase (auto-caches to IndexedDB)
        console.log("📥 Loading settings from Supabase...");
        const supabaseSettings = await loadSettingsFromSupabase();

        if (supabaseSettings) {
          // Apply settings from Supabase
          if (supabaseSettings.paymentSettings) {
            setPaymentSettings(supabaseSettings.paymentSettings);
            setOriginalPaymentSettings(
              JSON.parse(JSON.stringify(supabaseSettings.paymentSettings))
            );
          }

          if (supabaseSettings.categories) {
            setCategories(supabaseSettings.categories);
            setOriginalCategories([...supabaseSettings.categories]);
          }

          if (supabaseSettings.theme) {
            setSelectedThemeId(supabaseSettings.theme);
          }

          if (supabaseSettings.showTipJar !== undefined) {
            setShowTipJar(supabaseSettings.showTipJar);
            setOriginalShowTipJar(supabaseSettings.showTipJar);
          }

          if (supabaseSettings.currency) {
            const currencyCode = (supabaseSettings.currency.displayCurrency ||
              "USD") as CurrencyCode;
            const rate = supabaseSettings.currency.exchangeRate || 1;

            setSelectedCurrency(currencyCode);
            setExchangeRate(rate.toString());
            setOriginalCurrency(currencyCode);
            setOriginalExchangeRate(rate.toString());

            // Sync to localStorage cache for helper functions
            const currencyInfo = CURRENCIES[currencyCode];
            saveCurrencySettings({
              displayCurrency: currencyCode,
              exchangeRate: rate,
              symbol: currencyInfo.symbol,
              code: currencyCode,
            });
          }

          if (supabaseSettings.emailSignup) {
            setEmailSignupSettings(supabaseSettings.emailSignup);
            setOriginalEmailSignupSettings(
              JSON.parse(JSON.stringify(supabaseSettings.emailSignup))
            );
          }

          if (supabaseSettings.closeOutSettings) {
            setRequireCashReconciliation(
              supabaseSettings.closeOutSettings.requireCashReconciliation ??
                false
            );
            setOriginalRequireCashReconciliation(
              supabaseSettings.closeOutSettings.requireCashReconciliation ??
                false
            );
          }

          console.log("✅ Settings loaded from Supabase");
        } else {
          console.log("ℹ️ No settings in Supabase yet");
        }
      } else {
        // Offline: Load from IndexedDB cache
        console.log("📴 Offline - loading settings from cache...");
        const { getSettings } = await import("@/lib/db");
        const { createClient } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await createClient().auth.getUser();

        if (user) {
          const cachedSettings = await getSettings(user.id);

          if (cachedSettings) {
            // Apply cached settings
            if (cachedSettings.paymentSettings) {
              setPaymentSettings(cachedSettings.paymentSettings);
              setOriginalPaymentSettings(
                JSON.parse(JSON.stringify(cachedSettings.paymentSettings))
              );
            }

            if (cachedSettings.categories) {
              setCategories(cachedSettings.categories);
              setOriginalCategories([...cachedSettings.categories]);
            }

            if (cachedSettings.theme) {
              setSelectedThemeId(cachedSettings.theme);
            }

            if (cachedSettings.showTipJar !== undefined) {
              setShowTipJar(cachedSettings.showTipJar);
              setOriginalShowTipJar(cachedSettings.showTipJar);
            }

            if (cachedSettings.currency) {
              const currencyCode = (cachedSettings.currency.displayCurrency ||
                "USD") as CurrencyCode;
              const rate = cachedSettings.currency.exchangeRate || 1;

              setSelectedCurrency(currencyCode);
              setExchangeRate(rate.toString());
              setOriginalCurrency(currencyCode);
              setOriginalExchangeRate(rate.toString());

              // Sync to localStorage cache for helper functions
              const currencyInfo = CURRENCIES[currencyCode];
              saveCurrencySettings({
                displayCurrency: currencyCode,
                exchangeRate: rate,
                symbol: currencyInfo.symbol,
                code: currencyCode,
              });
            }

            if (cachedSettings.emailSignup) {
              setEmailSignupSettings(cachedSettings.emailSignup);
              setOriginalEmailSignupSettings(
                JSON.parse(JSON.stringify(cachedSettings.emailSignup))
              );
            }

            if (cachedSettings.closeOutSettings) {
              setRequireCashReconciliation(
                cachedSettings.closeOutSettings.requireCashReconciliation ??
                  false
              );
              setOriginalRequireCashReconciliation(
                cachedSettings.closeOutSettings.requireCashReconciliation ??
                  false
              );
            }

            console.log("📱 Settings loaded from IndexedDB (offline)");
          } else {
            console.log("ℹ️ No cached settings available");
          }
        }
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
      // Log QR codes before saving
      paymentSettings.forEach((setting) => {
        if (setting.qrCodeUrl) {
          console.log(
            `Saving ${setting.displayName} QR code:`,
            setting.qrCodeUrl.startsWith("data:")
              ? `Base64 (${setting.qrCodeUrl.length} chars)`
              : `URL: ${setting.qrCodeUrl}`
          );
        }
      });

      // Build settings object
      const settingsObject = {
        paymentSettings,
        categories,
        theme: selectedThemeId,
        showTipJar,
        currency: {
          displayCurrency: selectedCurrency,
          exchangeRate: Number.parseFloat(exchangeRate),
        },
        emailSignup: emailSignupSettings,
        closeOutSettings: {
          requireCashReconciliation,
        },
      };

      // Save to Supabase immediately
      const success = await saveSettingsToSupabase(settingsObject);

      // Check if save was successful (only fails if online and error occurred)
      if (!success && navigator.onLine) {
        throw new Error("Failed to save settings to Supabase");
      }

      // Cache to IndexedDB for offline access
      const { createClient } = await import("@/lib/supabase/client");
      const {
        data: { user },
      } = await createClient().auth.getUser();
      if (user) {
        await saveSettingsToIndexedDB(user.id, settingsObject);
        console.log("✅ Cached settings to IndexedDB");
      }

      // Update originals to match current state (deep clone to avoid reference issues)
      setOriginalPaymentSettings(JSON.parse(JSON.stringify(paymentSettings)));
      setOriginalCategories([...categories]);
      setOriginalShowTipJar(showTipJar);
      setOriginalCurrency(selectedCurrency);
      setOriginalExchangeRate(exchangeRate);
      setOriginalEmailSignupSettings(
        JSON.parse(JSON.stringify(emailSignupSettings))
      );
      setOriginalRequireCashReconciliation(requireCashReconciliation);

      // IMPORTANT: Also cache currency to localStorage so helper functions
      // (formatPrice, convertToDisplayCurrency, etc.) can access it
      // Source of truth is Supabase, but localStorage is used as a cache
      const currencyInfo = CURRENCIES[selectedCurrency];
      saveCurrencySettings({
        displayCurrency: selectedCurrency,
        exchangeRate:
          Number.parseFloat(exchangeRate) || currencyInfo.defaultRate,
        symbol: currencyInfo.symbol,
        code: selectedCurrency,
      });

      // Provide accurate feedback based on online/offline status
      if (navigator.onLine) {
        setToast({
          message: "Settings saved successfully!",
          type: "success",
        });
      } else {
        setToast({
          message: "Settings cached locally. Will sync when online.",
          type: "success",
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

  const handleAddEmailListSheet = async () => {
    setIsAddingEmailSheet(true);

    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) {
        setToast({ message: "No spreadsheet found", type: "error" });
        return;
      }

      const response = await fetch("/api/sheets/add-email-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();

      if (response.ok) {
        setNeedsEmailListSheet(false);
        setToast({
          message: data.alreadyExists
            ? "Email List sheet already exists!"
            : "Email List sheet created successfully! 🎉",
          type: "success",
        });
        return true;
      } else {
        setToast({
          message: data.error || "Failed to create Email List sheet",
          type: "error",
        });
        return false;
      }
    } catch (error) {
      console.error("Error creating Email List sheet:", error);
      setToast({ message: "Failed to create Email List sheet", type: "error" });
      return false;
    } finally {
      setIsAddingEmailSheet(false);
    }
  };

  const handleToggleEmailSignup = async () => {
    const newEnabledState = !emailSignupSettings.enabled;

    // If enabling, check if Email List sheet exists first
    if (newEnabledState) {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) {
        setToast({
          message: "No spreadsheet found. Please initialize sheets first.",
          type: "error",
        });
        return;
      }

      setIsAddingEmailSheet(true);

      // Try to add the Email List sheet (it will return success if it already exists)
      const success = await handleAddEmailListSheet();

      if (success) {
        // Only enable if sheet was created/exists
        setEmailSignupSettings((prev) => ({
          ...prev,
          enabled: true,
        }));
      }
    } else {
      // If disabling, just update the state
      setEmailSignupSettings((prev) => ({
        ...prev,
        enabled: false,
      }));
    }
  };

  const handleManualEmailEntry = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualEmail.trim()) {
      setToast({ message: "Email is required", type: "error" });
      return;
    }

    setIsManualEntrySubmitting(true);

    try {
      // Create EmailSignup object
      const { nanoid } = await import("nanoid");
      const emailSignup = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        email: manualEmail.trim().toLowerCase(),
        name: manualName.trim() || undefined,
        phone: manualPhone.trim() || undefined,
        source: "manual-entry" as const,
        saleId: undefined,
        synced: false,
      };

      // Save to IndexedDB first (immediate local save)
      const { saveEmailSignup } = await import("@/lib/db");
      await saveEmailSignup(emailSignup);
      console.log("📧 Email signup saved to IndexedDB:", emailSignup.id);

      // Queue for Supabase sync (will sync when online)
      if (syncService) {
        try {
          await syncService.syncEmailSignup(emailSignup);
          console.log("📤 Email signup queued for Supabase sync");
        } catch (syncError) {
          console.error("⚠️ Failed to queue email signup for sync:", syncError);
          // Continue - it's saved in IndexedDB, will retry on network return
        }
      }

      // Keep Google Sheets sync as fallback for legacy compatibility
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (spreadsheetId) {
        try {
          const response = await fetch("/api/sheets/email-signup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              spreadsheetId,
              email: emailSignup.email,
              name: emailSignup.name,
              phone: emailSignup.phone,
              // No saleId for manual entry
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            console.error("Google Sheets sync error:", errorData);
            // Don't fail the whole operation if Sheets sync fails
          }
        } catch (sheetsError) {
          console.error("Google Sheets sync error:", sheetsError);
          // Don't fail the whole operation if Sheets sync fails
        }
      }

      setToast({ message: "Email added successfully! 📧", type: "success" });
      setNeedsEmailListSheet(false);
      // Clear form
      setManualEmail("");
      setManualName("");
      setManualPhone("");
    } catch (error) {
      console.error("Error adding manual email:", error);
      setToast({ message: "Failed to add email", type: "error" });
    } finally {
      setIsManualEntrySubmitting(false);
    }
  };

  // Close-out handlers
  const handleCreateCloseOut = () => {
    setEditingCloseOut(null);
    setShowCloseOutWizard(true);
  };

  const handleEditCloseOut = (closeOut: CloseOut) => {
    setEditingCloseOut(closeOut);
    setShowCloseOutWizard(true);
  };

  const handleCloseOutSuccess = () => {
    setShowCloseOutWizard(false);
    setEditingCloseOut(null);
    setToast({
      message: editingCloseOut
        ? "Close-out updated successfully!"
        : "Session closed out successfully! 🎉",
      type: "success",
    });
  };

  const handleCloseOutCancel = () => {
    setShowCloseOutWizard(false);
    setEditingCloseOut(null);
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

  // Handle QR code image upload (convert to base64 with compression)
  const handleQRCodeUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    index: number
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setToast({
        message: "Please select an image file",
        type: "error",
      });
      return;
    }

    // Validate file size (5MB limit for QR codes)
    if (file.size > 5 * 1024 * 1024) {
      setToast({
        message: "Image must be less than 5MB",
        type: "error",
      });
      return;
    }

    try {
      const paymentType = paymentSettings[index].paymentType;
      setUploadingQRCode(paymentType);

      // Use unified image processing utility
      const { base64, originalSize, compressedSize } =
        await processImageForUpload(file);

      console.log(
        `✅ QR code compressed for ${paymentType}: ${originalSize} → ${compressedSize} (${base64.length} chars)`
      );

      updatePaymentSetting(index, "qrCodeUrl", base64);
      setUploadingQRCode(null);
      setToast({
        message: `QR code uploaded (${originalSize} → ${compressedSize})! Click 'Save Settings' to persist.`,
        type: "success",
        duration: 4000,
      });

      // Reset the file input so the same file can be re-uploaded if needed
      e.target.value = "";
    } catch (error) {
      setUploadingQRCode(null);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to upload QR code";
      setToast({
        message: errorMessage,
        type: "error",
        duration: 5000,
      });
      e.target.value = "";
    }
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

  // Revoke Google OAuth access
  const handleRevokeAccess = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to revoke Google access? You will need to sign in again to use Google Sheets features."
    );

    if (!confirmed) return;

    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      // Sign out from Supabase (this will clear the session and provider tokens)
      await supabase.auth.signOut();

      setToast({
        message:
          "✅ Google access revoked successfully. Redirecting to sign in...",
        type: "success",
        duration: 3000,
      });

      // Redirect to sign in page after a brief delay
      setTimeout(() => {
        window.location.href = "/auth/signin";
      }, 2000);
    } catch (error) {
      console.error("Error revoking access:", error);
      setToast({
        message: "Failed to revoke access. Please try again.",
        type: "error",
        duration: 5000,
      });
    }
  };

  // Create backup of current spreadsheet
  const handleCreateBackup = async () => {
    if (!currentSheetId) {
      setToast({
        message: "No spreadsheet found to backup.",
        type: "error",
      });
      return;
    }

    setIsCreatingBackup(true);
    try {
      const response = await fetch("/api/sheets/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId: currentSheetId }),
      });

      const data = await response.json();

      if (response.ok) {
        setToast({
          message: `✅ Backup created successfully! "${data.backupName}"`,
          type: "success",
          duration: 5000,
        });
      } else {
        throw new Error(data.error || "Failed to create backup");
      }
    } catch (error) {
      console.error("Error creating backup:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to create backup";
      setToast({
        message: errorMessage,
        type: "error",
        duration: 5000,
      });
    } finally {
      setIsCreatingBackup(false);
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
      {/* Sticky Unsaved Changes Bar */}
      {hasUnsavedChanges && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary shadow-lg">
          <div className="px-4 py-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-7xl mx-auto">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="bg-on-primary rounded-full p-1 flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <p className="text-on-primary font-bold text-sm">
                  Unsaved changes
                </p>
              </div>
              <button
                onClick={saveSettings}
                disabled={isSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-black text-primary border-2 border-black font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 hover:bg-black/90 flex items-center justify-center gap-2 shadow-lg"
              >
                {!isSaving && <ArrowDownTrayIcon className="w-5 h-5" />}
                {isSaving ? "Saving..." : "Save Settings"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        className={`max-w-4xl mx-auto ${
          hasUnsavedChanges ? "pt-24 sm:pt-20" : ""
        }`}
      >
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-theme">
            Settings
          </h1>
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
              <CreditCardIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">Payment Options</h2>
              {sectionHasChanges("payment") && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
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

                        {/* QR Code Image (for venmo, other, and custom) */}
                        {(setting.paymentType === "venmo" ||
                          setting.paymentType === "other" ||
                          setting.paymentType.startsWith("custom")) && (
                          <div className="space-y-3">
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              QR Code Image (optional)
                            </label>

                            {/* Preview current QR code if exists */}
                            {setting.qrCodeUrl && (
                              <div className="mb-3">
                                <div className="bg-white p-3 rounded-lg inline-block">
                                  <img
                                    src={setting.qrCodeUrl}
                                    alt="QR Code Preview"
                                    className="w-32 h-32 object-contain"
                                  />
                                </div>
                                <button
                                  onClick={() =>
                                    updatePaymentSetting(
                                      index,
                                      "qrCodeUrl",
                                      undefined
                                    )
                                  }
                                  className="ml-3 px-3 py-1 text-sm bg-red-900/40 hover:bg-red-900/60 text-primary rounded"
                                >
                                  Remove
                                </button>
                              </div>
                            )}

                            {/* Upload button */}
                            <div className="flex gap-2">
                              <label className="flex-1 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-medium cursor-pointer hover:bg-secondary/90 transition-all text-center">
                                {uploadingQRCode === setting.paymentType
                                  ? "Uploading..."
                                  : setting.qrCodeUrl
                                  ? "Change QR Code"
                                  : "Upload QR Code"}
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleQRCodeUpload(e, index)}
                                  disabled={
                                    uploadingQRCode === setting.paymentType
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {/* Alternative: URL input */}
                            <div className="text-center text-xs text-theme-muted">
                              — or enter URL —
                            </div>
                            <input
                              type="url"
                              value={
                                setting.qrCodeUrl?.startsWith("data:")
                                  ? ""
                                  : setting.qrCodeUrl || ""
                              }
                              onChange={(e) =>
                                updatePaymentSetting(
                                  index,
                                  "qrCodeUrl",
                                  e.target.value || undefined
                                )
                              }
                              className="w-full px-3 py-2 input-theme rounded"
                              placeholder="https://example.com/qr-code.png"
                              disabled={uploadingQRCode === setting.paymentType}
                            />
                            <p className="text-xs text-theme-muted">
                              Upload an image or paste a URL. A popup with the
                              QR code will be shown during checkout.
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
              <CurrencyDollarIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">
                Currency Display
              </h2>
              {sectionHasChanges("currency") && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
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
                <div className="bg-theme-tertiary border border-theme rounded-lg p-4">
                  <p className="text-sm text-theme mb-3 font-medium">
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
              <Square3Stack3DIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">
                Product Categories
              </h2>
              {sectionHasChanges("categories") && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
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
              <TableCellsIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">Google Sheets</h2>
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
                          className="text-xs text-primary hover:text-primary underline break-all"
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
                    <p className="text-sm text-theme">
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

        {/* Account & Privacy Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsAccountExpanded(!isAccountExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <svg
                className="w-7 h-7 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              <h2 className="text-2xl font-bold text-theme">
                Account & Privacy
              </h2>
            </div>
            {isAccountExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isAccountExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Manage your Google account connection and data permissions.
              </p>

              <div className="space-y-4">
                {/* Revoke Access Card */}
                <div className="bg-theme-tertiary rounded-lg p-6 border border-theme">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 text-4xl">🔐</div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-theme mb-2">
                        Revoke Google Access
                      </h3>
                      <p className="text-sm text-theme-muted mb-4">
                        Remove this app&apos;s access to your Google account and
                        Google Sheets. You&apos;ll need to sign in again to
                        continue using the app.
                      </p>
                      <button
                        onClick={handleRevokeAccess}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded transition-all active:scale-95"
                      >
                        Revoke Access
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="bg-theme-secondary border border-theme rounded-lg p-4 opacity-70">
                  <p className="text-sm text-theme">
                    ℹ️ <strong>Note:</strong> Revoking access will sign you out
                    and clear your session. Your data in Google Sheets will
                    remain unchanged.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Backup Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsBackupExpanded(!isBackupExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <CircleStackIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">Backup Data</h2>
            </div>
            {isBackupExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isBackupExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Create a complete backup of your current spreadsheet. The backup
                will be saved as a new Google Sheet with all your data.
              </p>

              {currentSheetId ? (
                <div className="space-y-4">
                  {/* Backup Action */}
                  <div className="bg-theme-tertiary rounded-lg p-6 border border-theme text-center">
                    <div className="mb-4">
                      <div className="text-4xl mb-3">💾</div>
                      <h3 className="text-lg font-semibold text-theme mb-2">
                        Create Backup
                      </h3>
                      <p className="text-sm text-theme-muted mb-4">
                        Backup will be named:{" "}
                        <span className="font-mono text-theme">
                          {new Date().toISOString().split("T")[0]}
                          -tour-manager-backup
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={handleCreateBackup}
                      disabled={isCreatingBackup}
                      className="px-6 py-3 bg-success text-theme font-semibold rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:bg-success/90 active:scale-95"
                    >
                      {isCreatingBackup
                        ? "Creating Backup..."
                        : "📦 Create Backup"}
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                    <p className="text-sm text-blue-300 mb-2">
                      ℹ️ <strong>What gets backed up:</strong>
                    </p>
                    <ul className="text-sm text-blue-200 space-y-1 ml-4 list-disc">
                      <li>All products and inventory</li>
                      <li>All sales history</li>
                      <li>Payment settings and categories</li>
                      <li>Currency preferences</li>
                    </ul>
                    <p className="text-xs text-blue-300 mt-3">
                      💡 The backup will appear in your Google Drive. You can
                      switch to it anytime using the &quot;Change Sheet&quot;
                      option above.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-theme-muted mb-2">
                    No spreadsheet to backup
                  </p>
                  <p className="text-sm text-theme-muted">
                    Please initialize or select a sheet first.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Close-Out Section */}
        <CloseOutSection
          onCreateCloseOut={handleCreateCloseOut}
          onEditCloseOut={handleEditCloseOut}
        />

        {/* Email Signup Section */}
        <div className="bg-theme-secondary rounded-lg mb-6 overflow-hidden">
          {/* Collapsible Header */}
          <button
            onClick={() => setIsEmailSignupExpanded(!isEmailSignupExpanded)}
            className="w-full p-6 flex items-center justify-between hover:bg-theme-tertiary transition-colors"
          >
            <div className="flex items-center gap-3">
              <EnvelopeIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">Email Signup</h2>
              {sectionHasChanges("emailSignup") && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
            </div>
            {isEmailSignupExpanded ? (
              <ChevronUpIcon className="w-6 h-6 text-theme-muted" />
            ) : (
              <ChevronDownIcon className="w-6 h-6 text-theme-muted" />
            )}
          </button>

          {/* Collapsible Content */}
          {isEmailSignupExpanded && (
            <div className="px-6 pb-6">
              <p className="text-sm text-theme-muted mb-6">
                Collect emails from customers after checkout. Build your mailing
                list for updates, new merch, and tour announcements.
              </p>

              <div className="space-y-6">
                {/* Enable/Disable Toggle */}
                <div className="flex items-center justify-between p-5 bg-gradient-to-r from-theme-tertiary to-theme-secondary rounded-lg border-2 border-theme hover:border-primary/30 transition-all">
                  <div className="flex-1">
                    <h3 className="font-bold text-theme mb-1 text-lg">
                      Enable Email Signup
                    </h3>
                    <p className="text-sm text-theme-muted">
                      Show email signup prompt after each sale
                    </p>
                  </div>
                  <button
                    onClick={handleToggleEmailSignup}
                    disabled={isAddingEmailSheet}
                    className={`relative inline-flex h-10 w-[70px] flex-shrink-0 items-center rounded-full transition-all duration-300 shadow-lg ${
                      emailSignupSettings.enabled
                        ? "bg-gradient-to-r from-green-600 to-green-500"
                        : "bg-gradient-to-r from-gray-600 to-gray-500"
                    } hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100`}
                  >
                    {isAddingEmailSheet ? (
                      <div className="w-full flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : (
                      <span
                        className={`inline-block h-8 w-8 transform rounded-full bg-white shadow-md transition-transform duration-300 ${
                          emailSignupSettings.enabled
                            ? "translate-x-[34px]"
                            : "translate-x-[2px]"
                        }`}
                      />
                    )}
                  </button>
                </div>

                {/* Custom Message */}
                <div>
                  <label
                    htmlFor="promptMessage"
                    className="block text-sm font-semibold text-theme mb-2"
                  >
                    Prompt Message
                  </label>
                  <input
                    id="promptMessage"
                    type="text"
                    value={emailSignupSettings.promptMessage}
                    onChange={(e) =>
                      setEmailSignupSettings((prev) => ({
                        ...prev,
                        promptMessage: e.target.value,
                      }))
                    }
                    placeholder="Join our mailing list!"
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Additional Fields */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-theme">
                    Optional Information to Collect
                  </h3>

                  <label className="flex items-center gap-3 p-3 bg-theme-tertiary rounded-lg cursor-pointer hover:bg-theme transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSignupSettings.collectName}
                      onChange={(e) =>
                        setEmailSignupSettings((prev) => ({
                          ...prev,
                          collectName: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-theme">Collect Name</div>
                      <div className="text-sm text-theme-muted">
                        Ask for customer&apos;s name
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 bg-theme-tertiary rounded-lg cursor-pointer hover:bg-theme transition-colors">
                    <input
                      type="checkbox"
                      checked={emailSignupSettings.collectPhone}
                      onChange={(e) =>
                        setEmailSignupSettings((prev) => ({
                          ...prev,
                          collectPhone: e.target.checked,
                        }))
                      }
                      className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-theme">
                        Collect Phone Number
                      </div>
                      <div className="text-sm text-theme-muted">
                        Ask for customer&apos;s phone
                      </div>
                    </div>
                  </label>
                </div>

                {/* Auto-dismiss Timer */}
                <div>
                  <label
                    htmlFor="autoDismiss"
                    className="block text-sm font-semibold text-theme mb-2"
                  >
                    Auto-dismiss Timer (seconds)
                  </label>
                  <input
                    id="autoDismiss"
                    type="number"
                    min="5"
                    max="30"
                    value={emailSignupSettings.autoDismissSeconds}
                    onChange={(e) =>
                      setEmailSignupSettings((prev) => ({
                        ...prev,
                        autoDismissSeconds:
                          Number.parseInt(e.target.value) || 10,
                      }))
                    }
                    className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-theme-muted mt-2">
                    Modal will auto-close after this many seconds if no action
                    taken
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
                  <p className="text-sm text-blue-300 mb-2">
                    📧 <strong>Email List will be saved to:</strong>
                  </p>
                  <ul className="text-sm text-blue-200 space-y-1 ml-4 list-disc">
                    <li>
                      New &quot;Email List&quot; sheet in your spreadsheet
                    </li>
                    <li>Includes timestamp, email, name, phone, and sale ID</li>
                    <li>Automatically syncs with Google Sheets</li>
                  </ul>
                </div>

                {/* Manual Email Entry Section */}
                <div className="border-t border-theme pt-6 mt-6">
                  <h3 className="text-lg font-bold text-theme mb-3">
                    📝 Manual Entry
                  </h3>
                  <p className="text-sm text-theme-muted mb-4">
                    Add emails from physical signup sheets or paper lists
                  </p>

                  <form onSubmit={handleManualEmailEntry} className="space-y-4">
                    <div>
                      <label
                        htmlFor="manualEmail"
                        className="block text-sm font-medium text-theme mb-2"
                      >
                        Email Address *
                      </label>
                      <input
                        id="manualEmail"
                        type="email"
                        value={manualEmail}
                        onChange={(e) => setManualEmail(e.target.value)}
                        placeholder="customer@example.com"
                        disabled={isManualEntrySubmitting}
                        className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="manualName"
                          className="block text-sm font-medium text-theme mb-2"
                        >
                          Name (Optional)
                        </label>
                        <input
                          id="manualName"
                          type="text"
                          value={manualName}
                          onChange={(e) => setManualName(e.target.value)}
                          placeholder="John Doe"
                          disabled={isManualEntrySubmitting}
                          className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="manualPhone"
                          className="block text-sm font-medium text-theme mb-2"
                        >
                          Phone (Optional)
                        </label>
                        <input
                          id="manualPhone"
                          type="tel"
                          value={manualPhone}
                          onChange={(e) => setManualPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                          disabled={isManualEntrySubmitting}
                          className="w-full px-4 py-3 bg-theme-tertiary border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isManualEntrySubmitting || !manualEmail.trim()}
                      className="w-full px-4 py-3 bg-primary hover:bg-primary/90 text-on-primary font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                    >
                      {isManualEntrySubmitting
                        ? "Adding..."
                        : "Add to Email List"}
                    </button>

                    {/* Helper message if Email List sheet is missing */}
                    {needsEmailListSheet && (
                      <div className="mt-4 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
                        <p className="text-sm text-yellow-200">
                          ⚠️ The Email List sheet is missing. Toggle the
                          &quot;Enable Email Signup&quot; off and back on to
                          auto-create it.
                        </p>
                      </div>
                    )}
                  </form>
                </div>
              </div>
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
              <PaintBrushIcon className="w-7 h-7 text-primary" />
              <h2 className="text-2xl font-bold text-theme">Theme</h2>
              {sectionHasChanges("theme") && (
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              )}
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
                <p className="text-sm text-theme">
                  ✨ <strong>Preview Mode:</strong> You&apos;re seeing the theme
                  in real-time! Click &quot;Save Settings&quot; below to make it
                  permanent.
                </p>
              </div>
            </div>
          )}
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
            ROAD DOG • Road-ready POS for bands on tour
          </p>
        </div>
      </div>

      {/* Close-Out Wizard */}
      <CloseOutWizard
        isOpen={showCloseOutWizard}
        onClose={handleCloseOutCancel}
        onSuccess={handleCloseOutSuccess}
        editingCloseOut={editingCloseOut}
        requireCashReconciliation={requireCashReconciliation}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
