"use client";

import {
  Product,
  CartItem,
  PaymentMethod,
  PaymentSetting,
  EmailSignupSettings,
  EmailSignup,
} from "@/types";
import { useState, useEffect } from "react";
import {
  ShoppingCartIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";
import QRCodePaymentModal from "./QRCodePaymentModal";
import EmailSignupModal from "./EmailSignupModal";
import {
  formatPrice,
  getBillDenominations,
  getCurrencySymbol,
  getEffectivePrice,
  formatDisplayPrice,
  getCurrencyCode,
} from "@/lib/currency";
import syncService from "@/lib/sync/syncService";

interface POSInterfaceProps {
  products: Product[];
  categoryOrder?: string[]; // Optional prop to avoid loading flash
  onCompleteSale: (
    items: CartItem[],
    total: number,
    actualAmount: number,
    paymentMethod: PaymentMethod,
    discount?: number,
    tipAmount?: number
  ) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
}

interface ToastState {
  message: string;
  type: ToastType;
  duration?: number;
}

export default function POSInterface({
  products,
  categoryOrder: initialCategoryOrder = [],
  onCompleteSale,
  onUpdateProduct,
}: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [selectedPaymentSetting, setSelectedPaymentSetting] =
    useState<PaymentSetting | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSetting[]>([]);
  const [categoryOrder, setCategoryOrder] =
    useState<string[]>(initialCategoryOrder);
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);
  const [isHookup, setIsHookup] = useState(false);
  const [hookupAmount, setHookupAmount] = useState<string>(""); // Amount for hookup/discount
  const [isTipEnabled, setIsTipEnabled] = useState(false);
  const [tipAmount, setTipAmount] = useState<string>(""); // Tip amount (keep for non-cash methods)
  const [showTipJar, setShowTipJar] = useState(true); // Setting from backend
  const [sizeSelectionProduct, setSizeSelectionProduct] =
    useState<Product | null>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Review Order Modal States (for cash payments)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewModalStep, setReviewModalStep] = useState<1 | 2>(1);
  const [modalTipOption, setModalTipOption] = useState<
    "none" | "5" | "10" | "20" | "custom"
  >("none");
  const [modalCustomTipAmount, setModalCustomTipAmount] = useState<string>("");

  // Bill denominations based on selected currency
  const [billDenominations, setBillDenominations] = useState<number[]>([
    100, 50, 20, 10, 5, 1,
  ]);

  // Email signup states
  const [showEmailSignupModal, setShowEmailSignupModal] = useState(false);
  const [emailSignupSettings, setEmailSignupSettings] =
    useState<EmailSignupSettings>({
      enabled: false,
      promptMessage: "Want to join our email list?",
      collectName: true,
      collectPhone: true,
      autoDismissSeconds: 15,
    });
  const [lastSaleId, setLastSaleId] = useState<string | null>(null);

  // Update categoryOrder when prop changes (e.g., after settings save)
  useEffect(() => {
    if (initialCategoryOrder.length > 0) {
      setCategoryOrder(initialCategoryOrder);
    }
  }, [initialCategoryOrder]);

  // Load payment settings and currency on mount
  useEffect(() => {
    loadPaymentSettings();
    updateBillDenominations();

    // Listen for currency changes
    const handleCurrencyChange = () => {
      updateBillDenominations();
    };
    window.addEventListener("currency-changed", handleCurrencyChange);
    return () =>
      window.removeEventListener("currency-changed", handleCurrencyChange);
  }, []);

  const updateBillDenominations = () => {
    const denominations = getBillDenominations();
    setBillDenominations(denominations);
  };

  const loadPaymentSettings = async () => {
    try {
      if (navigator.onLine) {
        // Online: Load from Supabase (auto-caches to IndexedDB)
        const { loadSettingsFromSupabase } = await import(
          "@/lib/supabase/data"
        );
        const settings = await loadSettingsFromSupabase();

        if (settings) {
          // Filter to only enabled payment types
          if (settings.paymentSettings) {
            const enabled = settings.paymentSettings.filter(
              (s: PaymentSetting) => s.enabled
            );
            setPaymentSettings(enabled);

            // Set first enabled payment as default
            if (enabled.length > 0) {
              setSelectedPaymentMethod(enabled[0].displayName);
              setSelectedPaymentSetting(enabled[0]);
            }
          }

          // Set tip jar visibility
          setShowTipJar(settings.showTipJar !== false); // Default to true if not set

          // Only update category order if not provided via props
          if (
            initialCategoryOrder.length === 0 &&
            settings.categories &&
            Array.isArray(settings.categories)
          ) {
            setCategoryOrder(settings.categories);
          }

          // Load email signup settings
          if (settings.emailSignup) {
            setEmailSignupSettings({
              enabled: settings.emailSignup.enabled !== false,
              promptMessage:
                settings.emailSignup.promptMessage ||
                "Want to join our email list?",
              collectName: settings.emailSignup.collectName !== false,
              collectPhone: settings.emailSignup.collectPhone !== false,
              autoDismissSeconds: settings.emailSignup.autoDismissSeconds || 15,
            });
          }
        }
      } else {
        // Offline: Load from IndexedDB cache
        const { getSettings } = await import("@/lib/db");
        const { createClient } = await import("@/lib/supabase/client");
        const {
          data: { user },
        } = await createClient().auth.getUser();

        if (user) {
          const cachedSettings = await getSettings(user.id);

          if (cachedSettings) {
            console.log("📱 Loaded payment settings from IndexedDB (offline)");

            // Filter to only enabled payment types
            if (cachedSettings.paymentSettings) {
              const enabled = cachedSettings.paymentSettings.filter(
                (s: PaymentSetting) => s.enabled
              );
              setPaymentSettings(enabled);

              // Set first enabled payment as default
              if (enabled.length > 0) {
                setSelectedPaymentMethod(enabled[0].displayName);
                setSelectedPaymentSetting(enabled[0]);
              }
            }

            // Set tip jar visibility
            setShowTipJar(cachedSettings.showTipJar !== false);

            // Only update category order if not provided via props
            if (
              initialCategoryOrder.length === 0 &&
              cachedSettings.categories &&
              Array.isArray(cachedSettings.categories)
            ) {
              setCategoryOrder(cachedSettings.categories);
            }

            // Load email signup settings
            if (cachedSettings.emailSignup) {
              setEmailSignupSettings({
                enabled: cachedSettings.emailSignup.enabled !== false,
                promptMessage:
                  cachedSettings.emailSignup.promptMessage ||
                  "Want to join our email list?",
                collectName: cachedSettings.emailSignup.collectName !== false,
                collectPhone: cachedSettings.emailSignup.collectPhone !== false,
                autoDismissSeconds:
                  cachedSettings.emailSignup.autoDismissSeconds || 15,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading payment settings:", error);
    }
  };

  // Track scroll position to show/hide jump button
  useEffect(() => {
    const handleScroll = () => {
      setShowJumpButton(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleProductClick = (product: Product) => {
    // If product has sizes, show size selection
    if (product.sizes && product.sizes.length > 0) {
      setSizeSelectionProduct(product);
    } else {
      addToCart(product);
    }
  };

  const handleSizeSelect = (size: string) => {
    if (sizeSelectionProduct) {
      addToCart(sizeSelectionProduct, size);
      setSizeSelectionProduct(null);
    }
  };

  const addToCart = (product: Product, size?: string) => {
    setCart((prev) => {
      // For products with sizes, treat each size as a separate cart item
      const existing = prev.find(
        (item) =>
          item.product.id === product.id && (!size || item.size === size)
      );

      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id && (!size || item.size === size)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, size }];
    });

    // Haptic feedback - light tap when adding to cart
    if (navigator.vibrate) {
      try {
        // Stronger vibration that's more noticeable
        navigator.vibrate(50); // 50ms - noticeable but not jarring
        console.log("✓ Haptic feedback triggered");
      } catch (error) {
        console.log("✗ Haptic feedback failed:", error);
      }
    } else {
      console.log("✗ Vibration API not supported on this device");
    }

    // Show success toast
    const itemName = size ? `${product.name} (${size})` : product.name;
    setToast({
      message: `${itemName} added to cart!`,
      type: "success",
      duration: 1000, // 1 second - quick dismiss so it doesn't block buttons
    });
  };

  const updateQuantity = (productId: string, delta: number, size?: string) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.product.id === productId && (!size || item.size === size)
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string, size?: string) => {
    setCart((prev) =>
      prev.filter(
        (item) =>
          !(item.product.id === productId && (!size || item.size === size))
      )
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => {
      const effectivePrice = getEffectivePrice(
        item.product.price,
        item.product.currencyPrices
      );
      return sum + effectivePrice * item.quantity;
    }, 0);
  };

  const hasStock = (product: Product): boolean => {
    if (!product.inventory) return true; // No inventory tracking, assume available
    const quantities = Object.values(product.inventory);
    return quantities.some((qty) => qty > 0);
  };

  const addCash = (amount: number) => {
    setCashReceived((prev) => prev + amount);
  };

  const resetCash = () => {
    setCashReceived(0);
  };

  const calculateChange = () => {
    const tip = isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0;
    return cashReceived - (calculateTotal() + tip);
  };

  const initiatePayment = () => {
    const total = calculateTotal();

    // Check if current payment method has QR code
    if (selectedPaymentSetting?.qrCodeUrl) {
      // Calculate total with transaction fee if applicable
      let totalWithFee = total;
      if (selectedPaymentSetting.transactionFee) {
        totalWithFee = total * (1 + selectedPaymentSetting.transactionFee);
      }

      // Show QR code modal
      setShowQRCodeModal(true);
    } else {
      // No QR code, process payment directly
      handleCompleteSale();
    }
  };

  const handleQRCodeComplete = async (
    actualAmount: number,
    discount?: number
  ) => {
    setShowQRCodeModal(false);
    await processCompleteSale(actualAmount, discount);
  };

  const processCompleteSale = async (
    finalAmount: number,
    discountAmount?: number
  ) => {
    if (cart.length === 0) return;

    const total = calculateTotal();
    const tip = isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0;

    setIsProcessing(true);
    try {
      // Deduct inventory for each item sold
      for (const cartItem of cart) {
        const product = cartItem.product;
        if (product && product.inventory) {
          const sizeKey = cartItem.size || "default";
          const currentQty = product.inventory[sizeKey] || 0;
          const updatedInventory = {
            ...product.inventory,
            [sizeKey]: Math.max(0, currentQty - cartItem.quantity),
          };
          await onUpdateProduct({
            ...product,
            inventory: updatedInventory,
            synced: false, // Inventory change needs to be synced
          });
        }
      }

      await onCompleteSale(
        cart,
        total,
        finalAmount,
        selectedPaymentMethod,
        discountAmount,
        tip > 0 ? tip : undefined
      );

      // Generate sale ID (same format as in page.tsx)
      const saleId = `sale-${Date.now()}`;
      setLastSaleId(saleId);

      // Reset state
      setCart([]);
      if (paymentSettings.length > 0) {
        setSelectedPaymentMethod(paymentSettings[0].displayName);
        setSelectedPaymentSetting(paymentSettings[0]);
      }
      setCashReceived(0);
      setIsHookup(false);
      setHookupAmount("");
      setIsTipEnabled(false);
      setTipAmount("");

      // Show success toast
      setToast({
        message:
          discountAmount && discountAmount > 0
            ? `✨ Hook up completed! Saved $${discountAmount.toFixed(2)}`
            : "Sale completed successfully!",
        type: "success",
      });

      // Show email signup modal if enabled
      if (emailSignupSettings.enabled) {
        setShowEmailSignupModal(true);
      }
    } catch (error) {
      console.error("Failed to complete sale:", error);
      setToast({
        message: "Failed to complete sale. Please try again.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Modified version that accepts tip as parameter (for modal flow)
  const processCompleteSaleWithTip = async (
    finalAmount: number,
    tipFromModal: number,
    discountAmount?: number
  ) => {
    if (cart.length === 0) return;

    const total = calculateTotal();
    const tip = tipFromModal;

    setIsProcessing(true);
    try {
      // Deduct inventory for each item sold
      for (const cartItem of cart) {
        const product = cartItem.product;
        if (product && product.inventory) {
          const sizeKey = cartItem.size || "default";
          const currentQty = product.inventory[sizeKey] || 0;
          const updatedInventory = {
            ...product.inventory,
            [sizeKey]: Math.max(0, currentQty - cartItem.quantity),
          };
          await onUpdateProduct({
            ...product,
            inventory: updatedInventory,
            synced: false, // Inventory change needs to be synced
          });
        }
      }

      await onCompleteSale(
        cart,
        total,
        finalAmount,
        selectedPaymentMethod,
        discountAmount,
        tip > 0 ? tip : undefined
      );

      // Generate sale ID (same format as in page.tsx)
      const saleId = `sale-${Date.now()}`;
      setLastSaleId(saleId);

      // Reset state including modal states
      setCart([]);
      if (paymentSettings.length > 0) {
        setSelectedPaymentMethod(paymentSettings[0].displayName);
        setSelectedPaymentSetting(paymentSettings[0]);
      }
      setCashReceived(0);
      setIsHookup(false);
      setHookupAmount("");
      setIsTipEnabled(false);
      setTipAmount("");

      // Reset modal states
      setModalTipOption("none");
      setModalCustomTipAmount("");

      // Show success toast
      setToast({
        message:
          discountAmount && discountAmount > 0
            ? `✨ Hook up completed! Saved $${discountAmount.toFixed(2)}`
            : "Sale completed successfully!",
        type: "success",
      });

      // Show email signup modal if enabled
      if (emailSignupSettings.enabled) {
        setShowEmailSignupModal(true);
      }
    } catch (error) {
      console.error("Failed to complete sale:", error);
      setToast({
        message: "Failed to complete sale. Please try again.",
        type: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    const total = calculateTotal(); // Effective total in display currency
    const tip = isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0;

    // Calculate USD base total (without currency conversion/overrides)
    const usdBaseTotal = cart.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    let actualAmount = usdBaseTotal; // Start with USD base total (for regular sales)
    let discount = 0;

    // Determine actual amount based on payment method and hookup status
    if (
      selectedPaymentMethod.toLowerCase() === "cash" ||
      selectedPaymentSetting?.paymentType === "cash"
    ) {
      if (isHookup) {
        // Cash + hookup - actualAmount is what they paid (hookup amount in display currency)
        if (hookupAmount !== "" && hookupAmount !== undefined) {
          const hookupValue = Number.parseFloat(hookupAmount);
          actualAmount = hookupValue;
          // Apply transaction fee after hookup if applicable
          if (selectedPaymentSetting?.transactionFee) {
            actualAmount =
              hookupValue * (1 + selectedPaymentSetting.transactionFee);
          }
          discount = total - hookupValue;
        } else if (cashReceived > 0) {
          actualAmount = cashReceived;
          discount = total - cashReceived;
        } else {
          setToast({
            message: "Please enter the hookup amount or cash received!",
            type: "error",
          });
          return;
        }
      } else if (isTipEnabled) {
        // Cash payment with tip - validate they have enough
        const requiredAmount = selectedPaymentSetting?.transactionFee
          ? (total + tip) * (1 + selectedPaymentSetting.transactionFee)
          : total + tip;

        if (cashReceived < requiredAmount) {
          setToast({
            message: "Not enough cash received (including tip)!",
            type: "error",
          });
          return;
        }
        // For regular cash with tip, actualAmount stays as usdBaseTotal
      } else {
        // Regular cash payment - validate they have enough
        const requiredAmount = selectedPaymentSetting?.transactionFee
          ? total * (1 + selectedPaymentSetting.transactionFee)
          : total;

        if (cashReceived < requiredAmount) {
          setToast({
            message: "Not enough cash received!",
            type: "error",
          });
          return;
        }
        // For regular cash, actualAmount stays as usdBaseTotal
      }
    } else {
      // Other payment methods
      if (isHookup) {
        // Non-cash + hookup - actualAmount is what they paid (hookup amount in display currency)
        if (hookupAmount === "" || hookupAmount === undefined) {
          setToast({
            message: "Please enter the hookup amount!",
            type: "error",
          });
          return;
        }
        const hookupValue = Number.parseFloat(hookupAmount);
        actualAmount = hookupValue;
        // Apply transaction fee after hookup if applicable
        if (selectedPaymentSetting?.transactionFee) {
          actualAmount =
            hookupValue * (1 + selectedPaymentSetting.transactionFee);
        }
        discount = total - hookupValue;
      }
      // For regular non-cash, actualAmount stays as usdBaseTotal
    }

    await processCompleteSale(
      actualAmount,
      discount > 0 ? discount : undefined
    );
  };

  // Modified version that accepts tip as parameter (for modal flow - all payment types)
  const handleCompleteSaleWithTip = async (tipFromModal: number) => {
    if (cart.length === 0) return;

    const total = calculateTotal(); // Effective total in display currency
    const tip = tipFromModal;

    // Calculate USD base total (without currency conversion/overrides)
    const usdBaseTotal = cart.reduce((sum, item) => {
      return sum + item.product.price * item.quantity;
    }, 0);

    let actualAmount = usdBaseTotal; // Start with USD base total (for regular sales)
    let discount = 0;

    const isCashPayment =
      selectedPaymentMethod.toLowerCase() === "cash" ||
      selectedPaymentSetting?.paymentType === "cash";

    // Determine actual amount based on payment method and hookup status
    if (isCashPayment) {
      // === CASH PAYMENTS ===
      if (isHookup) {
        // Cash + hookup - actualAmount is what they paid (hookup amount in display currency)
        if (hookupAmount !== "" && hookupAmount !== undefined) {
          const hookupValue = Number.parseFloat(hookupAmount);
          actualAmount = hookupValue;
          if (selectedPaymentSetting?.transactionFee) {
            actualAmount =
              hookupValue * (1 + selectedPaymentSetting.transactionFee);
          }
          discount = total - hookupValue;
        } else if (cashReceived > 0) {
          actualAmount = cashReceived;
          discount = total - cashReceived;
        } else {
          setToast({
            message: "Please enter the hookup amount or cash received!",
            type: "error",
          });
          return;
        }
      }
      // For regular cash payment, actualAmount stays as usdBaseTotal
    } else {
      // === NON-CASH PAYMENTS (Venmo, Card, Other, etc.) ===
      if (isHookup) {
        // Non-cash + hookup - actualAmount is what they paid (hookup amount in display currency)
        if (hookupAmount === "" || hookupAmount === undefined) {
          setToast({
            message: "Please enter the hookup amount!",
            type: "error",
          });
          return;
        }
        const hookupValue = Number.parseFloat(hookupAmount);
        actualAmount = hookupValue;
        if (selectedPaymentSetting?.transactionFee) {
          actualAmount =
            hookupValue * (1 + selectedPaymentSetting.transactionFee);
        }
        discount = total - hookupValue;
      }
      // For regular non-cash payment, actualAmount stays as usdBaseTotal
    }

    await processCompleteSaleWithTip(
      actualAmount,
      tip,
      discount > 0 ? discount : undefined
    );
  };

  const handleCompleteSaleClick = () => {
    // Check if we should skip tip collection
    // Skip tips for non-cash payments when currency is not USD
    const isCashPayment =
      selectedPaymentMethod.toLowerCase() === "cash" ||
      selectedPaymentSetting?.paymentType === "cash";
    const currentCurrency = getCurrencyCode();
    const shouldSkipTips = !isCashPayment && currentCurrency !== "USD";

    // Open review modal
    if (shouldSkipTips) {
      // Skip directly to step 2 (order review) without tip collection
      setReviewModalStep(2);
      setModalTipOption("none");
      setModalCustomTipAmount("");
      setShowReviewModal(true);
    } else {
      // Show tip collection step first
      setReviewModalStep(1);
      setModalTipOption("none");
      setModalCustomTipAmount("");
      setShowReviewModal(true);
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    // Reset cash received when switching payment methods
    if (method !== "cash" && method.toLowerCase() !== "cash") {
      setCashReceived(0);
    }
  };

  const handleEmailSignupSubmit = async (data: {
    email: string;
    name?: string;
    phone?: string;
  }) => {
    try {
      // Create EmailSignup object
      const { nanoid } = await import("nanoid");
      const emailSignup: EmailSignup = {
        id: nanoid(),
        timestamp: new Date().toISOString(),
        email: data.email,
        name: data.name,
        phone: data.phone,
        source: lastSaleId ? "post-checkout" : "manual-entry",
        saleId: lastSaleId || undefined,
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
              email: data.email,
              name: data.name,
              phone: data.phone,
              saleId: lastSaleId,
            }),
          });

          if (response.ok) {
            console.log("✅ Email also synced to Google Sheets (legacy)");
          }
        } catch (sheetsError) {
          console.warn(
            "⚠️ Google Sheets sync failed (non-critical):",
            sheetsError
          );
          // Non-critical - Supabase is primary storage
        }
      }

      setToast({
        message: "Email saved! Thanks for signing up! 🎉",
        type: "success",
      });
    } catch (error) {
      console.error("Error saving email signup:", error);
      setToast({
        message: "Failed to save email. Please try again.",
        type: "error",
      });
    } finally {
      setShowEmailSignupModal(false);
      setLastSaleId(null);
    }
  };

  const handleEmailSignupSkip = () => {
    setShowEmailSignupModal(false);
    setLastSaleId(null);
  };

  const scrollToPayment = () => {
    // Always scroll to cart section, even if empty
    const cartSection = document.getElementById("cart-section");
    if (cartSection) {
      cartSection.scrollIntoView({ behavior: "auto", block: "start" });
    }
  };

  const getCompleteButtonText = () => {
    if (isProcessing) return "Processing...";

    // All payment methods now use "Review Order" flow
    return "Review Order";
  };

  // Get categories from products, then order them according to settings
  const getOrderedCategories = () => {
    const productCategories = Array.from(
      new Set(products.map((p) => p.category))
    );

    if (categoryOrder.length === 0) {
      // No order specified, return categories as they appear in products
      return productCategories;
    }

    // Order categories according to categoryOrder, then add any new categories not in the order
    const ordered: string[] = [];
    for (const cat of categoryOrder) {
      if (productCategories.includes(cat)) {
        ordered.push(cat);
      }
    }

    // Add any categories that exist in products but not in the order
    for (const cat of productCategories) {
      if (!ordered.includes(cat)) {
        ordered.push(cat);
      }
    }

    return ordered;
  };

  const categories = getOrderedCategories();
  const total = calculateTotal();
  const change = calculateChange();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-theme">
      {/* Sticky Jump to Payment Header - Mobile Only - Shows when scrolled down */}
      {showJumpButton && (
        <div className="fixed top-0 left-0 right-0 z-50 lg:hidden">
          <button
            onClick={scrollToPayment}
            className="w-full bg-primary text-on-primary py-3 px-4 font-bold text-center shadow-lg hover:bg-primary transition-all"
          >
            ↓ Jump to Payment
          </button>

          {/* Cart Summary Bar - Shows below Jump button when cart has items */}
          {cart.length > 0 && (
            <div className="bg-theme-secondary border-b border-theme px-4 py-2 shadow-lg">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <ShoppingCartIcon className="w-4 h-4 text-primary" />
                  <span className="text-theme-secondary">
                    {cart.reduce((sum, item) => sum + item.quantity, 0)} item
                    {cart.reduce((sum, item) => sum + item.quantity, 0) !== 1
                      ? "s"
                      : ""}
                  </span>
                </div>
                <span className="font-bold text-theme">
                  {formatDisplayPrice(total)}
                </span>
              </div>
              {/* Mini cart items preview - Optimized for quick size identification */}
              <div className="mt-2 space-y-2 max-h-32 overflow-y-auto">
                {cart.map((item) => (
                  <div
                    key={`${item.product.id}-${item.size || "default"}`}
                    className="flex items-center gap-2 bg-theme-tertiary rounded px-2 py-1.5"
                  >
                    {/* Size badge - Large and prominent for quick identification */}
                    {item.size && (
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-primary text-on-primary font-bold text-base rounded shadow-lg">
                        {item.size}
                      </span>
                    )}

                    {/* Item details */}
                    <div className="flex-1 min-w-0">
                      <div className="text-theme font-medium text-sm truncate">
                        {item.quantity}x {item.product.name}
                      </div>
                    </div>

                    {/* Price */}
                    <span className="text-theme font-semibold text-sm whitespace-nowrap">
                      {formatDisplayPrice(
                        getEffectivePrice(
                          item.product.price,
                          item.product.currencyPrices
                        ) * item.quantity
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Products Grid */}
      <div
        className={`flex-1 p-4 lg:p-6 ${
          showJumpButton && cart.length > 0
            ? "pt-32"
            : showJumpButton
            ? "pt-16"
            : "pt-4"
        } lg:pt-6`}
      >
        <h2 className="text-2xl font-bold mb-6 text-theme">Products</h2>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-primary">
              {category}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products
                .filter((p) => p.category === category)
                .map((product) => {
                  const inStock = hasStock(product);
                  const hasImage =
                    product.imageUrl && product.imageUrl.trim().length > 0;
                  const showText = product.showTextOnButton !== false; // default true

                  return (
                    <button
                      key={product.id}
                      onClick={() => inStock && handleProductClick(product)}
                      disabled={!inStock}
                      className={`relative border border-theme rounded-lg shadow-lg transition-all touch-manipulation overflow-hidden aspect-square ${
                        hasImage ? "p-0" : "p-4 bg-theme-secondary"
                      } ${
                        inStock
                          ? "hover:shadow-lg hover:border-primary active:scale-95"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                    >
                      {/* Full Image Display */}
                      {hasImage ? (
                        <div className="relative w-full h-full">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className={`w-full h-full object-contain ${
                              inStock ? "" : "opacity-40"
                            }`}
                          />

                          {/* Text overlay - only show gradient if text is on */}
                          {showText ? (
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-3">
                              <h4 className="font-semibold text-theme mb-1 text-sm lg:text-base drop-shadow-lg">
                                {product.name}
                              </h4>
                              {inStock ? (
                                <>
                                  <p className="text-xl font-bold text-primary drop-shadow-lg">
                                    {formatPrice(
                                      product.price,
                                      product.currencyPrices
                                    )}
                                  </p>
                                  {product.sizes &&
                                    product.sizes.length > 0 && (
                                      <p className="text-xs text-theme-secondary mt-1">
                                        {product.sizes.join(", ")}
                                      </p>
                                    )}
                                </>
                              ) : (
                                <p className="text-lg font-bold text-theme-muted">
                                  Out of Stock
                                </p>
                              )}
                            </div>
                          ) : (
                            /* Minimal price badge when text is off - doesn't block image */
                            <div className="absolute top-2 right-2">
                              {inStock ? (
                                <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                  <p className="text-lg font-bold text-primary">
                                    {formatPrice(
                                      product.price,
                                      product.currencyPrices
                                    )}
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-black/80 backdrop-blur-sm rounded-lg px-3 py-1.5">
                                  <p className="text-sm font-bold text-theme-muted">
                                    Out of Stock
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        // No image - text only display
                        <div className="text-left relative z-10">
                          <h4 className="font-semibold text-theme mb-1 text-sm lg:text-base">
                            {product.name}
                          </h4>
                          {inStock ? (
                            <>
                              <p className="text-2xl font-bold text-primary">
                                {formatPrice(
                                  product.price,
                                  product.currencyPrices
                                )}
                              </p>
                              {product.sizes && product.sizes.length > 0 && (
                                <p className="text-xs text-theme-secondary mt-1">
                                  {product.sizes.join(", ")}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-lg font-bold text-theme-muted mt-2">
                              Out of Stock
                            </p>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {/* Cart */}
      <div
        id="cart-section"
        className="w-full lg:w-96 bg-theme-secondary border-t lg:border-t-0 lg:border-l border-theme flex flex-col"
      >
        <div className="p-4 lg:p-6 border-b border-theme flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="w-6 h-6 text-theme-muted" />
            <h2 className="text-xl font-bold text-theme">Cart</h2>
            <span className="ml-auto text-sm text-theme-muted">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {cart.length === 0 ? (
            <p className="text-center text-theme-muted mt-8">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.product.id}-${item.size || "no-size"}-${index}`}
                  className="p-3 bg-theme border border-theme rounded-lg"
                >
                  {/* Desktop layout: Product info on top, size and controls below */}
                  <div className="hidden lg:flex lg:flex-col gap-2">
                    {/* Product name and price on top */}
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-theme text-base truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-theme-muted">
                          {formatPrice(
                            item.product.price,
                            item.product.currencyPrices
                          )}{" "}
                          × {item.quantity}
                        </p>
                      </div>
                      <div className="font-bold text-theme min-w-[60px] text-right flex-shrink-0">
                        {formatDisplayPrice(
                          getEffectivePrice(
                            item.product.price,
                            item.product.currencyPrices
                          ) * item.quantity
                        )}
                      </div>
                    </div>

                    {/* Size badge on left, controls aligned right under price */}
                    <div className="flex items-center justify-between">
                      {item.size && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-on-primary font-bold text-xl rounded-lg shadow-lg">
                            {item.size}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, -1, item.size)
                          }
                          className="p-1 rounded btn-theme active:scale-95 touch-manipulation"
                        >
                          <MinusIcon className="w-4 h-4 text-theme" />
                        </button>
                        <span className="w-8 text-center font-semibold text-theme">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, 1, item.size)
                          }
                          className="p-1 rounded bg-theme-tertiary hover:bg-theme-tertiary active:scale-95 touch-manipulation"
                        >
                          <PlusIcon className="w-4 h-4 text-theme" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 rounded bg-red-900/40 hover:bg-red-900/60 text-primary active:scale-95 touch-manipulation ml-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mobile layout: Stacked on smallest screens, horizontal on larger */}
                  <div className="lg:hidden">
                    {/* Smallest screens: vertical stack */}
                    <div className="flex sm:hidden flex-col gap-2">
                      {/* Product name and price on top */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-theme text-base truncate">
                            {item.product.name}
                          </h4>
                          <p className="text-sm text-theme-muted">
                            {formatPrice(
                              item.product.price,
                              item.product.currencyPrices
                            )}{" "}
                            × {item.quantity}
                          </p>
                        </div>
                        <div className="font-bold text-theme min-w-[60px] text-right flex-shrink-0">
                          {formatDisplayPrice(
                            getEffectivePrice(
                              item.product.price,
                              item.product.currencyPrices
                            ) * item.quantity
                          )}
                        </div>
                      </div>

                      {/* Size badge, controls aligned right */}
                      <div className="flex items-center justify-between">
                        {item.size && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-on-primary font-bold text-xl rounded-lg shadow-lg">
                              {item.size}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, -1, item.size)
                            }
                            className="p-1 rounded bg-theme-tertiary hover:bg-theme-tertiary active:scale-95 touch-manipulation"
                          >
                            <MinusIcon className="w-4 h-4 text-theme" />
                          </button>
                          <span className="w-8 text-center font-semibold text-theme">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.product.id, 1, item.size)
                            }
                            className="p-1 rounded bg-theme-tertiary hover:bg-theme-tertiary active:scale-95 touch-manipulation"
                          >
                            <PlusIcon className="w-4 h-4 text-theme" />
                          </button>
                          <button
                            onClick={() => removeFromCart(item.product.id)}
                            className="p-1 rounded bg-red-900/40 hover:bg-red-900/60 text-primary active:scale-95 touch-manipulation ml-1"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Tablet/medium screens: horizontal layout */}
                    <div className="hidden sm:flex items-center gap-3">
                      {/* Large size badge for easy visibility */}
                      {item.size && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-on-primary font-bold text-xl rounded-lg shadow-lg">
                            {item.size}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-theme text-base truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-theme-muted">
                          {formatPrice(
                            item.product.price,
                            item.product.currencyPrices
                          )}{" "}
                          × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, -1, item.size)
                          }
                          className="p-1 rounded bg-theme-tertiary hover:bg-theme-tertiary active:scale-95 touch-manipulation"
                        >
                          <MinusIcon className="w-4 h-4 text-theme" />
                        </button>
                        <span className="w-8 text-center font-semibold text-theme">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.product.id, 1, item.size)
                          }
                          className="p-1 rounded bg-theme-tertiary hover:bg-theme-tertiary active:scale-95 touch-manipulation"
                        >
                          <PlusIcon className="w-4 h-4 text-theme" />
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="p-1 rounded bg-red-900/40 hover:bg-red-900/60 text-primary active:scale-95 touch-manipulation ml-1"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="font-bold text-theme min-w-[60px] text-right flex-shrink-0">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div
            id="payment-section"
            className="border-t border-theme p-4 lg:p-6 space-y-4 mb-4"
          >
            <div className="flex justify-between text-xl font-bold">
              <span className="text-theme">Total:</span>
              <span className="text-primary">{formatDisplayPrice(total)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {paymentSettings.length > 0
                  ? paymentSettings.map((setting) => (
                      <button
                        key={setting.paymentType}
                        onClick={() => {
                          setSelectedPaymentMethod(setting.displayName);
                          setSelectedPaymentSetting(setting);
                          handlePaymentMethodChange(setting.displayName);
                        }}
                        className={`py-3 px-2 rounded-lg font-medium transition-all touch-manipulation ${
                          selectedPaymentMethod === setting.displayName
                            ? "bg-primary text-on-primary"
                            : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary"
                        }`}
                      >
                        {setting.displayName}
                      </button>
                    ))
                  : // Fallback if settings not loaded
                    (["cash", "venmo", "other"] as const).map((method) => (
                      <button
                        key={method}
                        onClick={() => handlePaymentMethodChange(method)}
                        className={`py-3 px-2 rounded-lg font-medium capitalize transition-all touch-manipulation ${
                          selectedPaymentMethod === method
                            ? "bg-primary text-on-primary"
                            : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary"
                        }`}
                      >
                        {method}
                      </button>
                    ))}
              </div>
            </div>

            {/* Cash Calculator - show for cash payment type */}
            {(selectedPaymentMethod.toLowerCase() === "cash" ||
              selectedPaymentSetting?.paymentType === "cash") && (
              <div className="space-y-3 p-4 bg-theme border border-theme rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-theme-secondary">
                    Cash Received
                  </h3>
                  <button
                    onClick={resetCash}
                    className="px-3 py-1 text-sm bg-red-900/40 hover:bg-red-900/60 text-primary hover:text-red-300 rounded border border-red-700 transition-all active:scale-95"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {billDenominations.map((bill) => (
                    <button
                      key={bill}
                      onClick={() => addCash(bill)}
                      className="bg-secondary hover:bg-secondary text-on-secondary font-bold py-3 px-4 rounded-lg active:scale-95 transition-all touch-manipulation"
                    >
                      {getCurrencySymbol()}
                      {bill}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Cash received:</span>
                    <span className="font-bold text-primary">
                      {formatDisplayPrice(cashReceived)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Total due:</span>
                    <span className="font-bold text-theme">
                      {formatDisplayPrice(total)}
                    </span>
                  </div>
                  {isHookup && hookupAmount !== "" && (
                    <div className="flex justify-between">
                      <span className="text-yellow-300">Hookup discount:</span>
                      <span className="font-semibold text-yellow-400">
                        -
                        {formatDisplayPrice(
                          total - Number.parseFloat(hookupAmount)
                        )}
                      </span>
                    </div>
                  )}
                  {isTipEnabled &&
                    tipAmount &&
                    Number.parseFloat(tipAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-theme-secondary">
                          Tips added:
                        </span>
                        <span className="font-semibold text-primary">
                          {formatDisplayPrice(Number.parseFloat(tipAmount))}
                        </span>
                      </div>
                    )}
                  <div className="border-t border-theme pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-theme-secondary">
                        {isHookup ? "Final Total:" : "Change:"}
                      </span>
                      <span
                        className={`font-bold text-xl ${
                          isHookup
                            ? "text-warning"
                            : change >= 0
                            ? "text-primary"
                            : "text-error"
                        }`}
                      >
                        {isHookup && hookupAmount
                          ? formatDisplayPrice(Number.parseFloat(hookupAmount))
                          : formatDisplayPrice(Math.abs(change))}
                      </span>
                    </div>
                    {!isHookup && change < 0 && (
                      <p className="text-xs text-primary mt-1 text-right">
                        Need {formatDisplayPrice(Math.abs(change))} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Fee Info */}
            {selectedPaymentSetting?.transactionFee && (
              <div className="p-3 bg-blue-900/20 border border-blue-600/30 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-blue-300">Cart Total:</span>
                  <span className="text-theme font-semibold">
                    {formatDisplayPrice(total)}
                  </span>
                </div>
                {isHookup && hookupAmount !== "" && (
                  <div className="flex justify-between items-center text-sm mt-1">
                    <span className="text-yellow-300">Hookup discount:</span>
                    <span className="text-yellow-400 font-semibold">
                      -
                      {formatDisplayPrice(
                        total - Number.parseFloat(hookupAmount)
                      )}
                    </span>
                  </div>
                )}
                {isTipEnabled &&
                  tipAmount &&
                  Number.parseFloat(tipAmount) > 0 && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-theme-secondary">Tips added:</span>
                      <span className="text-primary font-semibold">
                        {formatDisplayPrice(Number.parseFloat(tipAmount))}
                      </span>
                    </div>
                  )}
                <div className="flex justify-between items-center text-sm mt-1">
                  <span className="text-blue-300">
                    Transaction Fee (
                    {(selectedPaymentSetting.transactionFee * 100).toFixed(1)}
                    %):
                  </span>
                  <span className="text-blue-400 font-semibold">
                    {formatDisplayPrice(
                      ((isHookup && hookupAmount
                        ? Number.parseFloat(hookupAmount)
                        : total) +
                        (isTipEnabled && tipAmount
                          ? Number.parseFloat(tipAmount)
                          : 0)) *
                        selectedPaymentSetting.transactionFee
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base mt-2 pt-2 border-t border-blue-600/30">
                  <span className="text-blue-200 font-medium">
                    Total to Collect:
                  </span>
                  <span className="text-blue-400 font-bold text-lg">
                    {formatDisplayPrice(
                      ((isHookup && hookupAmount
                        ? Number.parseFloat(hookupAmount)
                        : total) +
                        (isTipEnabled && tipAmount
                          ? Number.parseFloat(tipAmount)
                          : 0)) *
                        (1 + selectedPaymentSetting.transactionFee)
                    )}
                  </span>
                </div>
              </div>
            )}

            {/* Payment Summary for non-cash/non-transaction-fee methods */}
            {!selectedPaymentSetting?.transactionFee &&
              selectedPaymentMethod.toLowerCase() !== "cash" &&
              selectedPaymentSetting?.paymentType !== "cash" &&
              (isHookup || (isTipEnabled && tipAmount)) && (
                <div className="p-3 bg-theme-tertiary border border-theme rounded-lg">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-theme-muted">Cart Total:</span>
                    <span className="text-theme font-semibold">
                      {formatDisplayPrice(total)}
                    </span>
                  </div>
                  {isHookup && hookupAmount !== "" && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-yellow-300">Hookup discount:</span>
                      <span className="text-yellow-400 font-semibold">
                        -
                        {formatDisplayPrice(
                          total - Number.parseFloat(hookupAmount)
                        )}
                      </span>
                    </div>
                  )}
                  {isTipEnabled &&
                    tipAmount &&
                    Number.parseFloat(tipAmount) > 0 && (
                      <div className="flex justify-between items-center text-sm mt-1">
                        <span className="text-theme-secondary">
                          Tips added:
                        </span>
                        <span className="text-primary font-semibold">
                          {formatPrice(Number.parseFloat(tipAmount))}
                        </span>
                      </div>
                    )}
                  <div className="flex justify-between items-center text-base mt-2 pt-2 border-t border-theme">
                    <span className="text-theme-secondary font-medium">
                      Total to Collect:
                    </span>
                    <span className="text-theme font-bold text-lg">
                      {formatDisplayPrice(
                        (isHookup && hookupAmount
                          ? Number.parseFloat(hookupAmount)
                          : total) +
                          (isTipEnabled && tipAmount
                            ? Number.parseFloat(tipAmount)
                            : 0)
                      )}
                    </span>
                  </div>
                </div>
              )}

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const newHookupState = !isHookup;
                    setIsHookup(newHookupState);

                    if (newHookupState) {
                      // Enabling hookup - disable tip
                      setIsTipEnabled(false);
                      setTipAmount("");
                      // If cash payment, auto-fill with cash amount (even if $0 for free hookups)
                      if (
                        selectedPaymentMethod.toLowerCase() === "cash" ||
                        selectedPaymentSetting?.paymentType === "cash"
                      ) {
                        setHookupAmount(cashReceived.toFixed(2));
                      }
                    } else {
                      // Disabling hookup - clear the amount
                      setHookupAmount("");
                    }
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all touch-manipulation ${
                    isHookup
                      ? "bg-yellow-600 text-theme"
                      : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary"
                  }`}
                >
                  {isHookup ? "✨ Hook Up Active" : "🤝 Hook It Up"}
                </button>
              </div>

              {/* Hookup Amount Input */}
              {isHookup && (
                <div className="p-3 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                  <label className="block text-sm font-medium text-yellow-300 mb-2">
                    Hookup Amount (what they&apos;re actually paying)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted font-bold">
                      {getCurrencySymbol()}
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={hookupAmount}
                      onChange={(e) => setHookupAmount(e.target.value)}
                      placeholder={formatDisplayPrice(total).replace(
                        /[^\d.]/g,
                        ""
                      )}
                      className="w-full pl-8 pr-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme font-bold focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  {hookupAmount !== "" &&
                    Number.parseFloat(hookupAmount) <= total && (
                      <p className="text-xs text-yellow-300 mt-1">
                        {Number.parseFloat(hookupAmount) === 0 ? (
                          <span className="font-bold">
                            🎉 100% FREE HOOKUP!
                          </span>
                        ) : (
                          <>
                            Discount: $
                            {(total - Number.parseFloat(hookupAmount)).toFixed(
                              2
                            )}
                          </>
                        )}
                      </p>
                    )}
                </div>
              )}

              {/* Tip Jar - REMOVED: All payment methods now use modal for tips */}
              {false && showTipJar && !isHookup && (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const newTipState = !isTipEnabled;
                      setIsTipEnabled(newTipState);
                      if (!newTipState) {
                        setTipAmount("");
                      }
                    }}
                    className={`w-full px-4 py-2 rounded-lg font-medium transition-all touch-manipulation ${
                      isTipEnabled
                        ? "bg-secondary text-on-secondary"
                        : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary"
                    }`}
                  >
                    {isTipEnabled ? "💰 Tip Added" : "💰 Add a Tip"}
                  </button>

                  {/* Tip Amount Input */}
                  {isTipEnabled && (
                    <div className="p-3 bg-theme-tertiary border border-[#b565f2]/40 rounded-lg">
                      <label className="block text-sm font-medium text-accent-light mb-2">
                        Tip Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={tipAmount}
                          onChange={(e) => setTipAmount(e.target.value)}
                          placeholder="0.00"
                          autoFocus
                          className="w-full pl-8 pr-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme font-bold focus:outline-none focus:border-[#b565f2]"
                        />
                      </div>
                      {tipAmount && Number.parseFloat(tipAmount) > 0 && (
                        <p className="text-xs text-accent-light mt-1">
                          Total with tip: $
                          {(total + Number.parseFloat(tipAmount)).toFixed(2)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleCompleteSaleClick}
              disabled={
                isProcessing ||
                (selectedPaymentMethod === "cash" &&
                  !isHookup &&
                  cashReceived < total)
              }
              className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:bg-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-red-900/50"
            >
              {getCompleteButtonText()}
            </button>
          </div>
        )}
      </div>

      {/* Review Order Modal (for Cash payments) */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme rounded-lg max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Step 1: Tip Collection */}
            {reviewModalStep === 1 && (
              <>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-theme flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-theme">
                    💰 Add a Tip?
                  </h2>
                  <button
                    onClick={() => setShowReviewModal(false)}
                    className="text-theme-muted hover:text-theme transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  <p className="text-theme-secondary text-center mb-6">
                    Would the customer like to add a tip?
                  </p>

                  {/* Tip Options Grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {/* No Tip */}
                    <button
                      onClick={() => {
                        setModalTipOption("none");
                        setModalCustomTipAmount("");
                      }}
                      className={`p-4 rounded-lg font-semibold text-lg transition-all ${
                        modalTipOption === "none"
                          ? "bg-primary text-on-primary border-2 border-primary"
                          : "bg-theme-tertiary text-theme border-2 border-transparent hover:border-theme"
                      }`}
                    >
                      No Tip
                    </button>

                    {/* 5% Tip */}
                    <button
                      onClick={() => {
                        setModalTipOption("5");
                        setModalCustomTipAmount("");
                      }}
                      className={`p-4 rounded-lg font-semibold text-lg transition-all ${
                        modalTipOption === "5"
                          ? "bg-secondary text-on-secondary border-2 border-secondary"
                          : "bg-theme-tertiary text-theme border-2 border-transparent hover:border-theme"
                      }`}
                    >
                      <div>5%</div>
                      <div className="text-sm font-normal">
                        {formatDisplayPrice(
                          (() => {
                            const base =
                              isHookup && hookupAmount
                                ? Number.parseFloat(hookupAmount)
                                : calculateTotal();
                            return base * 0.05;
                          })()
                        )}
                      </div>
                    </button>

                    {/* 10% Tip */}
                    <button
                      onClick={() => {
                        setModalTipOption("10");
                        setModalCustomTipAmount("");
                      }}
                      className={`p-4 rounded-lg font-semibold text-lg transition-all ${
                        modalTipOption === "10"
                          ? "bg-secondary text-on-secondary border-2 border-secondary"
                          : "bg-theme-tertiary text-theme border-2 border-transparent hover:border-theme"
                      }`}
                    >
                      <div>10%</div>
                      <div className="text-sm font-normal">
                        {formatDisplayPrice(
                          (() => {
                            const base =
                              isHookup && hookupAmount
                                ? Number.parseFloat(hookupAmount)
                                : calculateTotal();
                            return base * 0.1;
                          })()
                        )}
                      </div>
                    </button>

                    {/* 20% Tip */}
                    <button
                      onClick={() => {
                        setModalTipOption("20");
                        setModalCustomTipAmount("");
                      }}
                      className={`p-4 rounded-lg font-semibold text-lg transition-all ${
                        modalTipOption === "20"
                          ? "bg-secondary text-on-secondary border-2 border-secondary"
                          : "bg-theme-tertiary text-theme border-2 border-transparent hover:border-theme"
                      }`}
                    >
                      <div>20%</div>
                      <div className="text-sm font-normal">
                        {formatDisplayPrice(
                          (() => {
                            const base =
                              isHookup && hookupAmount
                                ? Number.parseFloat(hookupAmount)
                                : calculateTotal();
                            return base * 0.2;
                          })()
                        )}
                      </div>
                    </button>
                  </div>

                  {/* Custom Tip Option */}
                  <button
                    onClick={() => setModalTipOption("custom")}
                    className={`w-full p-4 rounded-lg font-semibold text-lg transition-all mb-3 ${
                      modalTipOption === "custom"
                        ? "bg-secondary text-on-secondary border-2 border-secondary"
                        : "bg-theme-tertiary text-theme border-2 border-transparent hover:border-theme"
                    }`}
                  >
                    Custom Amount
                  </button>

                  {/* Custom Tip Input */}
                  {modalTipOption === "custom" && (
                    <div className="p-4 bg-theme-tertiary border border-[#b565f2]/40 rounded-lg">
                      <label className="block text-sm font-medium text-accent-light mb-2">
                        Enter Custom Tip Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted font-bold">
                          {getCurrencySymbol()}
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.01"
                          min="0"
                          value={modalCustomTipAmount}
                          onChange={(e) =>
                            setModalCustomTipAmount(e.target.value)
                          }
                          placeholder="0.00"
                          autoFocus
                          className="w-full pl-8 pr-4 py-3 bg-theme-secondary border border-theme rounded-lg text-theme font-bold focus:outline-none focus:border-green-500"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 pt-4 border-t border-theme">
                  <button
                    onClick={() => setReviewModalStep(2)}
                    disabled={
                      modalTipOption === "custom" && !modalCustomTipAmount
                    }
                    className="w-full bg-primary text-on-primary py-4 rounded-lg font-bold text-lg hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    Next →
                  </button>
                </div>
              </>
            )}

            {/* Step 2: Order Review */}
            {reviewModalStep === 2 && (
              <>
                {/* Header */}
                <div className="p-6 pb-4 border-b border-theme">
                  <h2 className="text-2xl font-bold text-theme">
                    📋 Order Summary
                  </h2>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Financial Breakdown */}
                  <div className="bg-theme border border-theme rounded-lg p-4 mb-6">
                    <div className="flex justify-between items-center text-sm mb-2">
                      <span className="text-theme-muted">Cart Total:</span>
                      <span className="text-theme font-semibold">
                        {formatDisplayPrice(calculateTotal())}
                      </span>
                    </div>

                    {isHookup && hookupAmount && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-yellow-300">
                          Hook Up Discount:
                        </span>
                        <span className="text-yellow-400 font-semibold">
                          -
                          {formatDisplayPrice(
                            calculateTotal() - Number.parseFloat(hookupAmount)
                          )}
                        </span>
                      </div>
                    )}

                    {modalTipOption !== "none" && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span className="text-theme-secondary">Tip:</span>
                        <span className="text-primary font-semibold">
                          {formatDisplayPrice(
                            (() => {
                              if (
                                modalTipOption === "custom" &&
                                modalCustomTipAmount
                              ) {
                                return Number.parseFloat(modalCustomTipAmount);
                              }
                              const base =
                                isHookup && hookupAmount
                                  ? Number.parseFloat(hookupAmount)
                                  : calculateTotal();
                              const percentage =
                                Number.parseFloat(modalTipOption) / 100;
                              return base * percentage;
                            })()
                          )}
                        </span>
                      </div>
                    )}

                    {/* Show transaction fee if applicable */}
                    {selectedPaymentSetting?.transactionFee &&
                      selectedPaymentSetting.transactionFee > 0 && (
                        <div className="flex justify-between items-center text-sm mb-2">
                          <span className="text-blue-300">
                            Transaction Fee (
                            {(
                              selectedPaymentSetting.transactionFee * 100
                            ).toFixed(1)}
                            %):
                          </span>
                          <span className="text-blue-400 font-semibold">
                            {formatDisplayPrice(
                              (() => {
                                const base =
                                  isHookup && hookupAmount
                                    ? Number.parseFloat(hookupAmount)
                                    : calculateTotal();
                                let tip = 0;
                                if (modalTipOption !== "none") {
                                  if (
                                    modalTipOption === "custom" &&
                                    modalCustomTipAmount
                                  ) {
                                    tip =
                                      Number.parseFloat(modalCustomTipAmount);
                                  } else {
                                    const percentage =
                                      Number.parseFloat(modalTipOption) / 100;
                                    tip = base * percentage;
                                  }
                                }
                                const subtotal = base + tip;
                                const fee =
                                  subtotal *
                                  selectedPaymentSetting.transactionFee;
                                return fee;
                              })()
                            )}
                          </span>
                        </div>
                      )}

                    <div className="flex justify-between items-center text-lg font-bold pt-2 border-t border-theme mt-2">
                      <span className="text-theme">Total to Collect:</span>
                      <span className="text-success">
                        {formatDisplayPrice(
                          (() => {
                            const base =
                              isHookup && hookupAmount
                                ? Number.parseFloat(hookupAmount)
                                : calculateTotal();
                            let tip = 0;
                            if (modalTipOption !== "none") {
                              if (
                                modalTipOption === "custom" &&
                                modalCustomTipAmount
                              ) {
                                tip = Number.parseFloat(modalCustomTipAmount);
                              } else {
                                const percentage =
                                  Number.parseFloat(modalTipOption) / 100;
                                tip = base * percentage;
                              }
                            }
                            const subtotal = base + tip;
                            // Add transaction fee if applicable
                            const transactionFee =
                              selectedPaymentSetting?.transactionFee || 0;
                            const totalWithFee =
                              subtotal * (1 + transactionFee);
                            return totalWithFee;
                          })()
                        )}
                      </span>
                    </div>

                    {/* Show cash received and change only if sufficient */}
                    {cashReceived > 0 &&
                      (() => {
                        const base =
                          isHookup && hookupAmount
                            ? Number.parseFloat(hookupAmount)
                            : calculateTotal();
                        let tip = 0;
                        if (modalTipOption !== "none") {
                          if (
                            modalTipOption === "custom" &&
                            modalCustomTipAmount
                          ) {
                            tip = Number.parseFloat(modalCustomTipAmount);
                          } else {
                            const percentage =
                              Number.parseFloat(modalTipOption) / 100;
                            tip = base * percentage;
                          }
                        }
                        const subtotal = base + tip;
                        // Add transaction fee if applicable
                        const transactionFee =
                          selectedPaymentSetting?.transactionFee || 0;
                        const totalToCollect = subtotal * (1 + transactionFee);
                        const change = cashReceived - totalToCollect;

                        // Only show cash received if they gave enough money
                        if (change < 0) return null;

                        return (
                          <>
                            <div className="flex justify-between items-center text-base pt-2 border-t border-theme mt-2">
                              <span className="text-theme-muted">
                                Cash Received:
                              </span>
                              <span className="text-theme font-semibold">
                                {formatDisplayPrice(cashReceived)}
                              </span>
                            </div>
                            {change > 0 ? (
                              <div className="flex justify-between items-center text-lg font-bold mt-2">
                                <span className="text-blue-300">
                                  Change Due:
                                </span>
                                <span className="text-blue-400 font-bold">
                                  {formatDisplayPrice(change)}
                                </span>
                              </div>
                            ) : (
                              <div className="flex justify-between items-center text-sm mt-2">
                                <span className="text-green-300">
                                  ✓ Exact Amount
                                </span>
                              </div>
                            )}
                          </>
                        );
                      })()}
                  </div>

                  {/* QR Code Display (if applicable) */}
                  {selectedPaymentSetting?.qrCodeUrl &&
                    selectedPaymentSetting.qrCodeUrl.trim() !== "" && (
                      <div className="bg-theme-secondary border border-theme rounded-lg p-4 mb-6">
                        <h3 className="font-bold text-theme mb-3 text-lg text-center">
                          📱 Scan to Pay
                        </h3>
                        <div className="bg-white p-4 rounded-lg">
                          <img
                            src={selectedPaymentSetting.qrCodeUrl}
                            alt={`${selectedPaymentSetting.displayName} QR Code`}
                            className="w-full h-auto max-w-xs mx-auto"
                          />
                        </div>
                        <p className="text-center text-theme-muted text-sm mt-3">
                          Show this QR code to the customer to complete payment
                        </p>
                      </div>
                    )}

                  {/* Items to Grab */}
                  <div className="bg-theme-secondary border border-theme rounded-lg p-4">
                    <h3 className="font-bold text-theme mb-3 text-lg">
                      🛍️ Items to Grab:
                    </h3>
                    <div className="space-y-2">
                      {cart.map((item, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-theme rounded-lg"
                        >
                          <div className="flex-1">
                            <span className="text-theme font-medium">
                              {item.product.name}
                            </span>
                            {item.size && (
                              <span className="text-theme-muted ml-2">
                                (Size: {item.size})
                              </span>
                            )}
                          </div>
                          <span className="text-theme font-bold ml-4">
                            x{item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer - Fixed */}
                <div className="p-6 pt-4 border-t border-theme space-y-3">
                  <button
                    onClick={() => setReviewModalStep(1)}
                    className="w-full bg-theme-tertiary text-theme py-3 rounded-lg font-semibold hover:bg-theme-tertiary transition-all"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={async () => {
                      // Calculate final tip amount
                      let finalTip = 0;
                      if (modalTipOption !== "none") {
                        if (
                          modalTipOption === "custom" &&
                          modalCustomTipAmount
                        ) {
                          finalTip = Number.parseFloat(modalCustomTipAmount);
                        } else {
                          const base =
                            isHookup && hookupAmount
                              ? Number.parseFloat(hookupAmount)
                              : calculateTotal();
                          const percentage =
                            Number.parseFloat(modalTipOption) / 100;
                          finalTip = base * percentage;
                        }
                      }

                      // Close modal
                      setShowReviewModal(false);

                      // Complete sale with the calculated tip
                      await handleCompleteSaleWithTip(finalTip);
                    }}
                    disabled={isProcessing}
                    className="w-full bg-success text-theme py-4 rounded-lg font-bold text-lg hover:bg-success/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    {isProcessing ? "Processing..." : "Complete Sale ✓"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* QR Code Payment Modal */}
      {showQRCodeModal && selectedPaymentSetting?.qrCodeUrl && (
        <QRCodePaymentModal
          qrCodeUrl={selectedPaymentSetting.qrCodeUrl}
          total={
            (calculateTotal() +
              (isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0)) *
            (selectedPaymentSetting.transactionFee
              ? 1 + selectedPaymentSetting.transactionFee
              : 1)
          }
          paymentMethodName={selectedPaymentSetting.displayName}
          onComplete={handleQRCodeComplete}
          onCancel={() => setShowQRCodeModal(false)}
          initialHookup={isHookup}
          initialHookupAmount={hookupAmount}
          cartTotal={calculateTotal()}
          tipAmount={
            isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0
          }
          cartItems={cart}
        />
      )}

      {/* Size Selection Modal */}
      {sizeSelectionProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-theme-secondary border border-theme rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-theme mb-4">
              Select Size for {sizeSelectionProduct.name}
            </h3>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {sizeSelectionProduct.sizes?.map((size) => {
                const stockQty = sizeSelectionProduct.inventory?.[size] || 0;
                const inStock = stockQty > 0;
                return (
                  <button
                    key={size}
                    onClick={() => inStock && handleSizeSelect(size)}
                    disabled={!inStock}
                    className={`py-4 px-6 rounded-lg font-bold text-lg transition-all touch-manipulation ${
                      inStock
                        ? "bg-theme-tertiary hover:bg-theme-tertiary text-theme active:scale-95"
                        : "bg-theme-secondary text-theme-muted cursor-not-allowed opacity-50"
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-lg">{size}</div>
                      {sizeSelectionProduct.inventory && (
                        <div className="text-xs mt-1">
                          {inStock ? `${stockQty} left` : "Out of stock"}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setSizeSelectionProduct(null)}
              className="w-full bg-theme-tertiary text-theme-secondary py-2 rounded-lg hover:bg-theme-tertiary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Email Signup Modal */}
      {showEmailSignupModal && (
        <EmailSignupModal
          settings={emailSignupSettings}
          onSubmit={handleEmailSignupSubmit}
          onClose={handleEmailSignupSkip}
        />
      )}

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
