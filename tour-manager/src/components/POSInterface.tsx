"use client";

import { Product, CartItem, PaymentMethod } from "@/types";
import { useState } from "react";
import {
  ShoppingCartIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
} from "@heroicons/react/24/outline";

interface POSInterfaceProps {
  products: Product[];
  onCompleteSale: (
    items: CartItem[],
    total: number,
    paymentMethod: PaymentMethod
  ) => Promise<void>;
}

export default function POSInterface({
  products,
  onCompleteSale,
}: POSInterfaceProps) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [cashReceived, setCashReceived] = useState(0);

  // US bill denominations
  const billDenominations = [100, 50, 20, 10, 5, 1];

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      return prev
        .map((item) =>
          item.product.id === productId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const calculateTotal = () => {
    return cart.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );
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

    // For cash payments, ensure enough money was received
    if (selectedPaymentMethod === "cash" && cashReceived < calculateTotal()) {
      alert("Not enough cash received!");
      return;
    }

    setIsProcessing(true);
    try {
      await onCompleteSale(cart, calculateTotal(), selectedPaymentMethod);
      setCart([]);
      setSelectedPaymentMethod("cash");
      setCashReceived(0);

      // Show success message
      alert("✅ Sale completed successfully!");
    } catch (error) {
      console.error("Failed to complete sale:", error);
      alert("Failed to complete sale. Please try again.");
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

  const categories = Array.from(new Set(products.map((p) => p.category)));
  const total = calculateTotal();
  const change = calculateChange();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-zinc-900">
      {/* Products Grid */}
      <div className="flex-1 p-4 lg:p-6">
        <h2 className="text-2xl font-bold mb-6 text-white">Products</h2>

        {categories.map((category) => (
          <div key={category} className="mb-8">
            <h3 className="text-lg font-semibold mb-3 text-red-400">
              {category}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {products
                .filter((p) => p.category === category)
                .map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="bg-zinc-800 border border-zinc-700 p-4 rounded-lg shadow-lg hover:shadow-red-900/20 hover:border-red-500/50 transition-all active:scale-95 touch-manipulation"
                  >
                    <div className="text-left">
                      <h4 className="font-semibold text-zinc-100 mb-1 text-sm lg:text-base">
                        {product.name}
                      </h4>
                      <p className="text-2xl font-bold text-red-400">
                        ${product.price}
                      </p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cart */}
      <div className="w-full lg:w-96 bg-zinc-800 border-t lg:border-t-0 lg:border-l border-zinc-700 flex flex-col">
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
              {cart.map((item) => (
                <div
                  key={item.product.id}
                  className="flex items-center gap-3 p-3 bg-zinc-900 border border-zinc-700 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-zinc-100 text-sm truncate">
                      {item.product.name}
                    </h4>
                    <p className="text-sm text-zinc-400">
                      ${item.product.price} × {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="p-1 rounded bg-zinc-700 hover:bg-zinc-600 active:scale-95 touch-manipulation"
                    >
                      <MinusIcon className="w-4 h-4 text-white" />
                    </button>
                    <span className="w-8 text-center font-semibold text-white">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, 1)}
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
          <div className="border-t border-zinc-700 p-4 lg:p-6 space-y-4 mb-4">
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

            <button
              onClick={handleCompleteSale}
              disabled={
                isProcessing ||
                (selectedPaymentMethod === "cash" && cashReceived < total)
              }
              className="w-full bg-red-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-red-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all touch-manipulation shadow-lg shadow-red-900/50"
            >
              {isProcessing ? "Processing..." : "Complete Sale"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
