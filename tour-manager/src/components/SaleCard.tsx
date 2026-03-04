"use client";

import { Sale } from "@/types";
import {
  TrashIcon,
  PencilIcon,
  ClockIcon,
  CreditCardIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";

interface SaleCardProps {
  sale: Sale;
  isInClosedSession: boolean;
  onEdit: (sale: Sale) => void;
  onDelete: (sale: Sale) => void;
}

export default function SaleCard({
  sale,
  isInClosedSession,
  onEdit,
  onDelete,
}: SaleCardProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div
      className={`bg-theme-secondary rounded-lg border ${
        isInClosedSession ? "border-theme/30 opacity-75" : "border-theme"
      } overflow-hidden`}
    >
      {/* Header */}
      <div className="p-3 border-b border-theme/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm font-medium text-theme">
              {formatTime(sale.timestamp)}
            </span>
            {isInClosedSession && (
              <span className="flex items-center gap-1 text-xs text-theme-muted bg-theme-tertiary px-2 py-0.5 rounded">
                <LockClosedIcon className="w-3 h-3" />
                Closed
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4 text-theme-muted" />
            <span className="text-sm text-theme-secondary">
              {sale.paymentMethod}
            </span>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="p-3 space-y-2">
        {sale.items.map((item, idx) => (
          <div
            key={`${item.productId}-${idx}`}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex-1 min-w-0">
              <span className="text-theme truncate block">
                {item.productName}
                {item.size && item.size !== "default" && (
                  <span className="text-theme-muted ml-1">({item.size})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className="text-theme-muted">×{item.quantity}</span>
              <span className="text-theme font-medium">
                {formatCurrency(item.price * item.quantity)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 bg-theme-tertiary/30 border-t border-theme/50">
        <div className="flex items-center justify-between">
          {/* Totals */}
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-success">
                {formatCurrency(sale.actualAmount)}
              </span>
              {sale.discount && sale.discount > 0 && (
                <span className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-0.5 rounded">
                  -{formatCurrency(sale.discount)} hookup
                </span>
              )}
            </div>
            {sale.tipAmount && sale.tipAmount > 0 && (
              <span className="text-xs text-green-400">
                +{formatCurrency(sale.tipAmount)} tip
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(sale)}
              disabled={isInClosedSession}
              className={`p-2 rounded-lg transition-colors ${
                isInClosedSession
                  ? "bg-theme-tertiary/50 text-theme-muted cursor-not-allowed"
                  : "bg-theme hover:bg-theme-tertiary text-theme hover:text-primary"
              }`}
              title={isInClosedSession ? "Cannot edit closed session sale" : "Edit sale"}
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(sale)}
              disabled={isInClosedSession}
              className={`p-2 rounded-lg transition-colors ${
                isInClosedSession
                  ? "bg-theme-tertiary/50 text-theme-muted cursor-not-allowed"
                  : "bg-theme hover:bg-error/20 text-theme hover:text-error"
              }`}
              title={isInClosedSession ? "Cannot delete closed session sale" : "Delete sale"}
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
