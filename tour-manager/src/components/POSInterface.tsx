"use client";

import { Product, CartItem, PaymentMethod, PaymentSetting } from "@/types";
import { useState, useEffect } from "react";
import {
  ShoppingCartIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";
import QRCodePaymentModal from "./QRCodePaymentModal";

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
  const [tipAmount, setTipAmount] = useState<string>(""); // Tip amount
  const [showTipJar, setShowTipJar] = useState(true); // Setting from backend
  const [sizeSelectionProduct, setSizeSelectionProduct] =
    useState<Product | null>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // US bill denominations
  const billDenominations = [100, 50, 20, 10, 5, 1];

  // Update categoryOrder when prop changes (e.g., after settings save)
  useEffect(() => {
    if (initialCategoryOrder.length > 0) {
      setCategoryOrder(initialCategoryOrder);
    }
  }, [initialCategoryOrder]);

  // Load payment settings on mount
  useEffect(() => {
    loadPaymentSettings();
  }, []);

  const loadPaymentSettings = async () => {
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) return;

      const response = await fetch("/api/sheets/settings/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();
      if (response.ok) {
        // Filter to only enabled payment types
        const enabled = data.paymentSettings.filter(
          (s: PaymentSetting) => s.enabled
        );
        setPaymentSettings(enabled);
        setShowTipJar(data.showTipJar !== false); // Default to true if not set

        // Set first enabled payment as default
        if (enabled.length > 0) {
          setSelectedPaymentMethod(enabled[0].displayName);
          setSelectedPaymentSetting(enabled[0]);
        }

        // Only update category order if not provided via props
        if (
          initialCategoryOrder.length === 0 &&
          data.categories &&
          Array.isArray(data.categories)
        ) {
          setCategoryOrder(data.categories);
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

    // Show success toast
    const itemName = size ? `${product.name} (${size})` : product.name;
    setToast({
      message: `${itemName} added to cart!`,
      type: "success",
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
    return cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
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

    const total = calculateTotal();
    const tip = isTipEnabled && tipAmount ? Number.parseFloat(tipAmount) : 0;
    let actualAmount = total + tip; // Add tip to the base total
    let discount = 0;

    // Apply transaction fee if applicable (on total + tip)
    if (selectedPaymentSetting?.transactionFee) {
      actualAmount =
        (total + tip) * (1 + selectedPaymentSetting.transactionFee);
    }

    // Determine actual amount based on payment method and hookup status
    if (
      selectedPaymentMethod.toLowerCase() === "cash" ||
      selectedPaymentSetting?.paymentType === "cash"
    ) {
      if (isHookup) {
        // For cash + hookup, use the hookup amount if provided, otherwise use cash received
        if (hookupAmount && Number.parseFloat(hookupAmount) > 0) {
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
        // Cash payment with tip - must have enough cash for total + tip
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
        actualAmount = requiredAmount;
      } else {
        // Regular cash payment - must have enough cash
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
        actualAmount = requiredAmount;
      }
    } else {
      // Other payment methods
      if (isHookup) {
        // For hookup with non-cash payment, require hookup amount
        if (!hookupAmount || Number.parseFloat(hookupAmount) <= 0) {
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
      } else {
        // Regular non-cash payment - apply transaction fee if applicable (total + tip)
        actualAmount = selectedPaymentSetting?.transactionFee
          ? (total + tip) * (1 + selectedPaymentSetting.transactionFee)
          : total + tip;
      }
    }

    await processCompleteSale(
      actualAmount,
      discount > 0 ? discount : undefined
    );
  };

  const handleCompleteSaleClick = () => {
    // Check if QR code should be shown
    if (
      selectedPaymentSetting?.qrCodeUrl &&
      selectedPaymentSetting.qrCodeUrl.trim() !== ""
    ) {
      setShowQRCodeModal(true);
    } else {
      handleCompleteSale();
    }
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    // Reset cash received when switching payment methods
    if (method !== "cash" && method.toLowerCase() !== "cash") {
      setCashReceived(0);
    }
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
    if (
      selectedPaymentSetting?.qrCodeUrl &&
      selectedPaymentSetting.qrCodeUrl.trim() !== ""
    ) {
      return "Show QR Code";
    }
    return "Complete Sale";
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
            className="w-full bg-primary text-theme py-3 px-4 font-bold text-center shadow-lg hover:bg-primary transition-all"
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
                  ${total.toFixed(2)}
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
                      <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2 py-1 bg-primary text-theme font-bold text-base rounded shadow-lg">
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
                      ${(item.product.price * item.quantity).toFixed(2)}
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
                                    ${product.price}
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
                                    ${product.price}
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
                                ${product.price}
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
                          ${item.product.price} × {item.quantity}
                        </p>
                      </div>
                      <div className="font-bold text-theme min-w-[60px] text-right flex-shrink-0">
                        ${(item.product.price * item.quantity).toFixed(2)}
                      </div>
                    </div>

                    {/* Size badge on left, controls aligned right under price */}
                    <div className="flex items-center justify-between">
                      {item.size && (
                        <div className="flex-shrink-0">
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-theme font-bold text-xl rounded-lg shadow-lg">
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
                            ${item.product.price} × {item.quantity}
                          </p>
                        </div>
                        <div className="font-bold text-theme min-w-[60px] text-right flex-shrink-0">
                          ${(item.product.price * item.quantity).toFixed(2)}
                        </div>
                      </div>

                      {/* Size badge, controls aligned right */}
                      <div className="flex items-center justify-between">
                        {item.size && (
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-theme font-bold text-xl rounded-lg shadow-lg">
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
                          <span className="inline-flex items-center justify-center min-w-[3rem] px-3 py-2 bg-primary text-theme font-bold text-xl rounded-lg shadow-lg">
                            {item.size}
                          </span>
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-theme text-base truncate">
                          {item.product.name}
                        </h4>
                        <p className="text-sm text-theme-muted">
                          ${item.product.price} × {item.quantity}
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
              <span className="text-primary">${total.toFixed(2)}</span>
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
                            ? "bg-primary text-theme"
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
                            ? "bg-primary text-theme"
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
                      className="bg-green-700 hover:bg-success text-theme font-bold py-3 px-4 rounded-lg active:scale-95 transition-all touch-manipulation"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Cash received:</span>
                    <span className="font-bold text-green-400">
                      ${cashReceived.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-theme-muted">Total due:</span>
                    <span className="font-bold text-theme">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  {isHookup &&
                    hookupAmount &&
                    Number.parseFloat(hookupAmount) > 0 &&
                    Number.parseFloat(hookupAmount) < total && (
                      <div className="flex justify-between">
                        <span className="text-yellow-300">
                          Hookup discount:
                        </span>
                        <span className="font-semibold text-yellow-400">
                          -$
                          {(total - Number.parseFloat(hookupAmount)).toFixed(2)}
                        </span>
                      </div>
                    )}
                  {isTipEnabled &&
                    tipAmount &&
                    Number.parseFloat(tipAmount) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-300">Tips added:</span>
                        <span className="font-semibold text-green-400">
                          ${Number.parseFloat(tipAmount).toFixed(2)}
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
                            ? "text-yellow-400"
                            : change >= 0
                            ? "text-green-400"
                            : "text-primary"
                        }`}
                      >
                        {isHookup && hookupAmount
                          ? `$${Number.parseFloat(hookupAmount).toFixed(2)}`
                          : `$${Math.abs(change).toFixed(2)}`}
                      </span>
                    </div>
                    {!isHookup && change < 0 && (
                      <p className="text-xs text-primary mt-1 text-right">
                        Need ${Math.abs(change).toFixed(2)} more
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
                    ${total.toFixed(2)}
                  </span>
                </div>
                {isHookup &&
                  hookupAmount &&
                  Number.parseFloat(hookupAmount) > 0 &&
                  Number.parseFloat(hookupAmount) < total && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-yellow-300">Hookup discount:</span>
                      <span className="text-yellow-400 font-semibold">
                        -${(total - Number.parseFloat(hookupAmount)).toFixed(2)}
                      </span>
                    </div>
                  )}
                {isTipEnabled &&
                  tipAmount &&
                  Number.parseFloat(tipAmount) > 0 && (
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-green-300">Tips added:</span>
                      <span className="text-green-400 font-semibold">
                        ${Number.parseFloat(tipAmount).toFixed(2)}
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
                    $
                    {(
                      ((isHookup && hookupAmount
                        ? Number.parseFloat(hookupAmount)
                        : total) +
                        (isTipEnabled && tipAmount
                          ? Number.parseFloat(tipAmount)
                          : 0)) *
                      selectedPaymentSetting.transactionFee
                    ).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-base mt-2 pt-2 border-t border-blue-600/30">
                  <span className="text-blue-200 font-medium">
                    Total to Collect:
                  </span>
                  <span className="text-blue-400 font-bold text-lg">
                    $
                    {(
                      ((isHookup && hookupAmount
                        ? Number.parseFloat(hookupAmount)
                        : total) +
                        (isTipEnabled && tipAmount
                          ? Number.parseFloat(tipAmount)
                          : 0)) *
                      (1 + selectedPaymentSetting.transactionFee)
                    ).toFixed(2)}
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
                      // If cash payment and cash has been received, auto-fill with cash amount
                      if (
                        (selectedPaymentMethod.toLowerCase() === "cash" ||
                          selectedPaymentSetting?.paymentType === "cash") &&
                        cashReceived > 0
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
                      $
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max={total}
                      value={hookupAmount}
                      onChange={(e) => setHookupAmount(e.target.value)}
                      placeholder={total.toFixed(2)}
                      className="w-full pl-8 pr-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme font-bold focus:outline-none focus:border-yellow-500"
                    />
                  </div>
                  {hookupAmount && Number.parseFloat(hookupAmount) < total && (
                    <p className="text-xs text-yellow-300 mt-1">
                      Discount: $
                      {(total - Number.parseFloat(hookupAmount)).toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Tip Jar - Only show if enabled in settings and hookup is NOT active */}
              {showTipJar && !isHookup && (
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
                        ? "bg-green-600 text-theme"
                        : "bg-theme-tertiary text-theme-secondary hover:bg-theme-tertiary"
                    }`}
                  >
                    {isTipEnabled ? "💰 Tip Added" : "💰 Add a Tip"}
                  </button>

                  {/* Tip Amount Input */}
                  {isTipEnabled && (
                    <div className="p-3 bg-green-900/20 border border-green-600/50 rounded-lg">
                      <label className="block text-sm font-medium text-green-300 mb-2">
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
                          className="w-full pl-8 pr-4 py-2 bg-theme-secondary border border-theme rounded-lg text-theme font-bold focus:outline-none focus:border-green-500"
                        />
                      </div>
                      {tipAmount && Number.parseFloat(tipAmount) > 0 && (
                        <p className="text-xs text-green-300 mt-1">
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
              className="w-full bg-primary text-theme py-4 rounded-lg font-bold text-lg hover:bg-primary active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-red-900/50"
            >
              {getCompleteButtonText()}
            </button>
          </div>
        )}
      </div>

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
