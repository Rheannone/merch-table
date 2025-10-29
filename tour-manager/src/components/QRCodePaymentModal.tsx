"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface QRCodePaymentModalProps {
  qrCodeUrl: string;
  total: number;
  paymentMethodName: string;
  onComplete: (actualAmount: number, discount?: number) => void;
  onCancel: () => void;
  initialHookup?: boolean;
  initialHookupAmount?: string;
}

export default function QRCodePaymentModal({
  qrCodeUrl,
  total,
  paymentMethodName,
  onComplete,
  onCancel,
  initialHookup = false,
  initialHookupAmount = "",
}: QRCodePaymentModalProps) {
  const [isHookup, setIsHookup] = useState(initialHookup);
  const [hookupAmount, setHookupAmount] = useState<string>(initialHookupAmount);

  // hookupAmount is what the customer is actually paying (after discount)
  const hookupValue = Number.parseFloat(hookupAmount) || 0;
  const actualAmount = isHookup && hookupValue > 0 ? hookupValue : total;
  const discount = isHookup && hookupValue > 0 ? total - hookupValue : 0;

  const handleComplete = () => {
    onComplete(actualAmount, discount > 0 ? discount : undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-800 rounded-lg max-w-md w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white transition-colors"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Header */}
        <h2 className="text-2xl font-bold text-white mb-4">
          {paymentMethodName} Payment
        </h2>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-lg mb-6">
          <img
            src={qrCodeUrl}
            alt={`${paymentMethodName} QR Code`}
            className="w-full h-auto"
          />
        </div>

        {/* Total */}
        <div className="mb-6">
          <div className="flex justify-between items-center text-lg mb-2">
            <span className="text-zinc-300">Cart Total:</span>
            <span className="font-bold text-white">${total.toFixed(2)}</span>
          </div>

          {/* Hookup Toggle */}
          <div className="mt-4 p-4 bg-zinc-900 border border-zinc-700 rounded-lg">
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
                    value={hookupAmount}
                    onChange={(e) => setHookupAmount(e.target.value)}
                    className="flex-1 px-4 py-2 bg-zinc-800 border border-yellow-600 rounded text-white text-lg"
                    placeholder={total.toFixed(2)}
                    step="0.01"
                    min="0"
                    max={total.toString()}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-yellow-500 mt-2">
                  Discount: ${discount.toFixed(2)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Final Amount */}
        <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-6">
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

        {/* Complete Sale Button */}
        <button
          onClick={handleComplete}
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-lg transition-all active:scale-95"
        >
          Complete Sale
        </button>
      </div>
    </div>
  );
}
