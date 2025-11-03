"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CartItem } from "@/types";

interface QRCodePaymentModalProps {
  qrCodeUrl: string;
  total: number;
  paymentMethodName: string;
  onComplete: (actualAmount: number, discount?: number) => void;
  onCancel: () => void;
  initialHookup?: boolean;
  initialHookupAmount?: string;
  cartTotal?: number;
  tipAmount?: number;
  cartItems?: CartItem[];
}

export default function QRCodePaymentModal({
  qrCodeUrl,
  total,
  paymentMethodName,
  onComplete,
  onCancel,
  initialHookup = false,
  initialHookupAmount = "",
  cartTotal,
  tipAmount = 0,
  cartItems = [],
}: QRCodePaymentModalProps) {
  const [isHookup, setIsHookup] = useState(initialHookup);
  const [hookupAmount, setHookupAmount] = useState<string>(initialHookupAmount);
  const [modalTip, setModalTip] = useState<string>(
    tipAmount > 0 ? tipAmount.toString() : ""
  );

  // Calculate tip value from modal input
  const tipValue = modalTip !== "" ? Number.parseFloat(modalTip) : 0;

  // Base cart total without transaction fee
  const baseCartTotal = cartTotal || total;

  // hookupAmount is what the customer is actually paying (after discount, before tip)
  const hookupValue =
    hookupAmount !== "" ? Number.parseFloat(hookupAmount) : null;
  const baseAmount =
    isHookup && hookupValue !== null ? hookupValue : baseCartTotal;
  const discount =
    isHookup && hookupValue !== null ? baseCartTotal - hookupValue : 0;

  // Total to collect = base amount + tip
  const actualAmount = baseAmount + tipValue;

  const handleComplete = () => {
    onComplete(actualAmount, discount > 0 ? discount : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full max-h-[90vh] flex flex-col relative">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors z-10"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header - Fixed */}
        <div className="p-6 pb-4 flex-shrink-0">
          <h2 className="text-2xl font-bold text-white">
            {paymentMethodName} Payment
          </h2>
        </div>

        {/* Scrollable Content with scroll indicator */}
        <div className="relative flex-1">
          <div className="absolute inset-0 overflow-y-auto px-6 pb-4 modal-scrollbar">
          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
              <h3 className="text-sm font-semibold text-zinc-300 mb-3">
                Your Order:
              </h3>
              <div className="space-y-2">
                {cartItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-sm"
                  >
                    <span className="text-zinc-300">
                      {item.quantity}x {item.product.name}
                      {item.size && ` (${item.size})`}
                    </span>
                    <span className="text-white font-medium">
                      ${(item.product.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg mb-4">
            <img
              src={qrCodeUrl}
              alt={`${paymentMethodName} QR Code`}
              className="w-full h-auto"
            />
          </div>

          {/* Add Tip Section - Large and Prominent */}
          <div className="mb-4 p-5 bg-gradient-to-br from-green-900/40 to-green-800/40 border-2 border-green-600 rounded-lg">
            <label className="block text-lg font-bold text-green-300 mb-3">
              💚 Add a Tip?
            </label>
            <div className="flex items-center gap-2">
              <span className="text-3xl text-green-400 font-bold">$</span>
              <input
                type="number"
                inputMode="decimal"
                value={modalTip}
                onChange={(e) => setModalTip(e.target.value)}
                className="flex-1 px-4 py-3 bg-zinc-800 border-2 border-green-600 rounded-lg text-white text-2xl font-semibold focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            {tipValue > 0 && (
              <p className="text-sm text-green-400 mt-2">
                Thanks for adding a ${tipValue.toFixed(2)} tip! 🙏
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="mb-4 p-4 bg-zinc-900/50 border border-zinc-700 rounded-lg">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-zinc-400">Cart Total:</span>
              <span className="text-white">${baseCartTotal.toFixed(2)}</span>
            </div>
            {isHookup && discount > 0 && (
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-yellow-400">Hookup Discount:</span>
                <span className="text-yellow-400">-${discount.toFixed(2)}</span>
              </div>
            )}
            {tipValue > 0 && (
              <div className="flex justify-between items-center text-sm mb-1">
                <span className="text-green-400">Tip:</span>
                <span className="text-green-400">+${tipValue.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-base font-bold border-t border-zinc-600 pt-2 mt-2">
              <span className="text-white">Total to Scan:</span>
              <span className="text-white">${actualAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Hookup Toggle */}
          <div className="mb-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
            <label className="flex items-center gap-3 cursor-pointer mb-3">
              <input
                type="checkbox"
                checked={isHookup}
                onChange={(e) => {
                  setIsHookup(e.target.checked);
                  if (!e.target.checked) setHookupAmount("");
                }}
                className="w-5 h-5"
              />
              <span className="text-yellow-400 font-medium">
                🎸 Hook it up (Discount)
              </span>
            </label>

            {isHookup && (
              <div>
                <label className="block text-sm font-medium text-yellow-300 mb-2">
                  Amount Customer is Paying
                </label>
                <div className="flex gap-2">
                  <span className="text-2xl text-yellow-400">$</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={hookupAmount}
                    onChange={(e) => setHookupAmount(e.target.value)}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-yellow-600 rounded text-white text-lg"
                    placeholder={(cartTotal || total).toFixed(2)}
                    step="0.01"
                    min="0"
                    max={(cartTotal || total).toString()}
                  />
                </div>
                <p className="text-xs text-yellow-500 mt-2">
                  Discount: ${discount.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Final Amount */}
          <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-green-300 font-medium">
                Amount to Collect:
              </span>
              <span className="text-3xl font-bold text-green-400">
                ${actualAmount.toFixed(2)}
              </span>
            </div>
            {isHookup && discount > 0 && (
              <p className="text-sm text-green-500 mt-2">
                Discount applied: ${discount.toFixed(2)}
              </p>
            )}
          </div>
          </div>
          {/* Scroll indicator gradient for mobile */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-800 via-zinc-800/50 to-transparent pointer-events-none" />
        </div>

        {/* Fixed Bottom Button */}
        <div className="p-6 pt-0 flex-shrink-0 border-t border-zinc-700">
          <button
            onClick={handleComplete}
            className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-all active:scale-95"
          >
            Complete Sale
          </button>
        </div>
      </div>
    </div>
  );
}
