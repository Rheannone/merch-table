"use client";

import { Product, CartItem, PaymentMethod } from "@/types";
import { useState, useEffect } from "react";
import {
  ShoppingCartIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";

interface POSInterfaceProps {
  products: Product[];
  onCompleteSale: (
    items: CartItem[],
    total: number,
    paymentMethod: PaymentMethod,
    isHookup?: boolean
  ) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export default function POSInterface({
  products,
  onCompleteSale,
  onUpdateProduct,
}: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);
  const [isHookup, setIsHookup] = useState(false);
  const [sizeSelectionProduct, setSizeSelectionProduct] =
    useState<Product | null>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // US bill denominations
  const billDenominations = [100, 50, 20, 10, 5, 1];

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
    return cashReceived - calculateTotal();
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) return;

    // For cash payments (unless hookup), ensure enough money was received
    if (
      selectedPaymentMethod === "cash" &&
      !isHookup &&
      cashReceived < calculateTotal()
    ) {
      setToast({
        message: "Not enough cash received!",
        type: "error",
      });
      return;
    }

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
        calculateTotal(),
        selectedPaymentMethod,
        isHookup
      );
      setCart([]);
      setSelectedPaymentMethod("cash");
      setCashReceived(0);
      setIsHookup(false);

      // Show success toast
      setToast({
        message: isHookup
          ? "✨ Hook up completed!"
          : "✅ Sale completed successfully!",
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

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    // Reset cash received when switching payment methods
    if (method !== "cash") {
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

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const total = calculateTotal();
  const change = calculateChange();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-900">
      {/* Sticky Jump to Payment Header - Mobile Only - Shows when scrolled down */}
      {showJumpButton && (
        <div className="fixed top-0 left-0 right-0 z-50 lg:hidden">
          <button
            onClick={scrollToPayment}
            className="w-full bg-red-600 text-white py-3 px-4 font-bold text-center shadow-lg hover:bg-red-700 transition-all"
          >
            ↓ Jump to Payment
          </button>
        </div>
      )}

      {/* Products Grid */}
      <div
        className={`flex-1 p-4 lg:p-6 ${
          showJumpButton ? "pt-16" : "pt-4"
        } lg:pt-6`}
      >
        <h2 className="text-2xl font-bold mb-6 text-white">Products</h2>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-red-400">
              {category}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products
                .filter((p) => p.category === category)
                .map((product) => {
                  const inStock = hasStock(product);
                  return (
                    <button
                      key={product.id}
                      onClick={() => inStock && handleProductClick(product)}
                      disabled={!inStock}
                      className={`relative bg-zinc-800 border border-zinc-700 p-4 rounded-lg shadow-lg transition-all touch-manipulation overflow-hidden min-h-[100px] ${
                        inStock
                          ? "hover:shadow-red-900/20 hover:border-red-500/50 active:scale-95"
                          : "opacity-50 cursor-not-allowed"
                      }`}
                      style={
                        product.imageUrl && inStock
                          ? {
                              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.7)), url(${product.imageUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : product.imageUrl
                          ? {
                              backgroundImage: `linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)), url(${product.imageUrl})`,
                              backgroundSize: "cover",
                              backgroundPosition: "center",
                            }
                          : undefined
                      }
                    >
                      <div className="text-left relative z-10">
                        <h4 className="font-semibold text-zinc-100 mb-1 text-sm lg:text-base drop-shadow-lg">
                          {product.name}
                        </h4>
                        {inStock ? (
                          <>
                            <p className="text-2xl font-bold text-red-400 drop-shadow-lg">
                              ${product.price}
                            </p>
                            {product.sizes && product.sizes.length > 0 && (
                              <p className="text-xs text-zinc-300 mt-1">
                                {product.sizes.join(", ")}
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-lg font-bold text-zinc-400 mt-2">
                            Out of Stock
                          </p>
                        )}
                      </div>
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
        className="w-full lg:w-96 bg-zinc-800 border-t lg:border-t-0 lg:border-l border-zinc-700 flex flex-col"
      >
        <div className="p-4 lg:p-6 border-b border-zinc-700 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="w-6 h-6 text-zinc-400" />
            <h2 className="text-xl font-bold text-white">Cart</h2>
            <span className="ml-auto text-sm text-zinc-400">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} items
            </span>
          </div>
        </div>

        <div className="p-4 lg:p-6">
          {cart.length === 0 ? (
            <p className="text-center text-zinc-500 mt-8">Cart is empty</p>
          ) : (
            <div className="space-y-3">
              {cart.map((item, index) => (
                <div
                  key={`${item.product.id}-${item.size || "no-size"}-${index}`}
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-zinc-100 text-sm truncate">
                      {item.product.name}
                      {item.size && (
                        <span className="ml-2 text-xs bg-red-600 px-2 py-0.5 rounded">
                          {item.size}
                        </span>
                      )}
                    </h4>
                    <p className="text-sm text-zinc-400">
                      ${item.product.price} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, -1, item.size)
                      }
                      className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 active:scale-95 touch-manipulation"
                    >
                      <MinusIcon className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-8 text-center font-semibold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() =>
                        updateQuantity(item.product.id, 1, item.size)
                      }
                      className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 active:scale-95 touch-manipulation"
                    >
                      <PlusIcon className="w-4 h-4 text-white" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.product.id)}
                      className="p-1 rounded bg-red-900/40 hover:bg-red-900/60 text-red-400 active:scale-95 touch-manipulation ml-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="font-bold text-white min-w-[60px] text-right flex-shrink-0">
                    ${(item.product.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && (
          <div
            id="payment-section"
            className="border-t border-zinc-700 p-4 lg:p-6 space-y-4 mb-4"
          >
            <div className="flex justify-between text-xl font-bold">
              <span className="text-white">Total:</span>
              <span className="text-red-400">${total.toFixed(2)}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["cash", "card", "venmo", "other"] as PaymentMethod[]).map(
                  (method) => (
                    <button
                      key={method}
                      onClick={() => handlePaymentMethodChange(method)}
                      className={`py-3 px-2 rounded-lg font-medium capitalize transition-all touch-manipulation ${
                        selectedPaymentMethod === method
                          ? "bg-red-600 text-white"
                          : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                      }`}
                    >
                      {method}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Cash Calculator */}
            {selectedPaymentMethod === "cash" && (
              <div className="space-y-3 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-sm font-medium text-zinc-300">
                    Cash Received
                  </h3>
                  <button
                    onClick={resetCash}
                    className="px-3 py-1 text-sm bg-red-900/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 rounded border border-red-700 transition-all active:scale-95"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  {billDenominations.map((bill) => (
                    <button
                      key={bill}
                      onClick={() => addCash(bill)}
                      className="bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg active:scale-95 transition-all touch-manipulation"
                    >
                      ${bill}
                    </button>
                  ))}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Cash received:</span>
                    <span className="font-bold text-green-400">
                      ${cashReceived.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Total due:</span>
                    <span className="font-bold text-white">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t border-zinc-700 pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-zinc-200">
                        Change:
                      </span>
                      <span
                        className={`font-bold text-xl ${
                          change >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        ${Math.abs(change).toFixed(2)}
                      </span>
                    </div>
                    {change < 0 && (
                      <p className="text-xs text-red-400 mt-1 text-right">
                        Need ${Math.abs(change).toFixed(2)} more
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setIsHookup(!isHookup)}
                className={`px-4 py-2 rounded-lg font-medium transition-all touch-manipulation ${
                  isHookup
                    ? "bg-yellow-600 text-white"
                    : "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                }`}
              >
                {isHookup ? "✨ Hook Up Active" : "🤝 Hook It Up"}
              </button>
            </div>

            <button
              onClick={handleCompleteSale}
              disabled={
                isProcessing ||
                (selectedPaymentMethod === "cash" &&
                  !isHookup &&
                  cashReceived < total)
              }
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-red-900/50"
            >
              {isProcessing ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        )}
      </div>

      {/* Size Selection Modal */}
      {sizeSelectionProduct && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
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
                        ? "bg-zinc-700 hover:bg-zinc-600 text-white active:scale-95"
                        : "bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-50"
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
              className="w-full bg-zinc-700 text-zinc-300 py-2 rounded-lg hover:bg-zinc-600"
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
