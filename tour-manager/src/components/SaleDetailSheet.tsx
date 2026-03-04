"use client";

import { useState, useEffect } from "react";
import { Sale, Product } from "@/types";
import {
  XMarkIcon,
  TrashIcon,
  ArrowsRightLeftIcon,
  CheckIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  deleteSaleWithInventoryRestore,
  swapSaleItem,
} from "@/lib/saleModification";

interface SaleDetailSheetProps {
  sale: Sale | null;
  isOpen: boolean;
  isInClosedSession: boolean;
  products: Product[];
  onClose: () => void;
  onUpdateProduct: (product: Product) => Promise<void>;
  onSaleDeleted: (saleId: string) => void;
  onSaleUpdated: (sale: Sale) => void;
}

type ViewState = "details" | "swap-select-item" | "swap-select-product";

export default function SaleDetailSheet({
  sale,
  isOpen,
  isInClosedSession,
  products,
  onClose,
  onUpdateProduct,
  onSaleDeleted,
  onSaleUpdated,
}: SaleDetailSheetProps) {
  const [viewState, setViewState] = useState<ViewState>("details");
  const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Reset state when sheet opens/closes
  useEffect(() => {
    if (isOpen) {
      setViewState("details");
      setSelectedItemIndex(null);
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [isOpen]);

  if (!isOpen || !sale) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const handleDelete = async () => {
    if (!sale) return;

    setIsProcessing(true);
    setError(null);

    const result = await deleteSaleWithInventoryRestore(
      sale.id,
      products,
      onUpdateProduct
    );

    setIsProcessing(false);

    if (result.success) {
      onSaleDeleted(sale.id);
      onClose();
    } else {
      setError(result.error || "Failed to delete sale");
      setShowDeleteConfirm(false);
    }
  };

  const handleSwapItem = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setViewState("swap-select-product");
    setError(null);
  };

  const handleSelectNewProduct = async (
    newProductId: string,
    newSize?: string
  ) => {
    if (!sale || selectedItemIndex === null) return;

    setIsProcessing(true);
    setError(null);

    const result = await swapSaleItem(
      sale,
      selectedItemIndex,
      newProductId,
      newSize,
      products,
      onUpdateProduct
    );

    setIsProcessing(false);

    if (result.success && result.updatedSale) {
      onSaleUpdated(result.updatedSale);
      setViewState("details");
      setSelectedItemIndex(null);
    } else {
      setError(result.error || "Failed to swap item");
    }
  };

  const selectedItem = selectedItemIndex !== null ? sale.items[selectedItemIndex] : null;

  // Group products by category for easier selection
  const productsByCategory = products.reduce(
    (acc, product) => {
      const category = product.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    },
    {} as Record<string, Product[]>
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 bg-theme rounded-t-2xl max-h-[90vh] flex flex-col md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg md:rounded-2xl md:max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-theme">
          <h2 className="text-lg font-bold text-theme">
            {viewState === "details" && "Sale Details"}
            {viewState === "swap-select-product" && "Swap Item"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-theme-secondary transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-theme" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-error/20 border border-error rounded-lg flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-error flex-shrink-0" />
            <span className="text-sm text-error">{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewState === "details" && (
            <div className="space-y-4">
              {/* Sale info */}
              <div className="bg-theme-secondary rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-theme-muted">
                    {formatDate(sale.timestamp)} at {formatTime(sale.timestamp)}
                  </span>
                  <span className="text-sm font-medium text-theme-secondary bg-theme-tertiary px-2 py-1 rounded">
                    {sale.paymentMethod}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-success">
                    {formatCurrency(sale.actualAmount)}
                  </span>
                  {sale.discount && sale.discount > 0 && (
                    <span className="text-sm text-yellow-400">
                      -{formatCurrency(sale.discount)} hookup
                    </span>
                  )}
                </div>
                {sale.tipAmount && sale.tipAmount > 0 && (
                  <span className="text-sm text-green-400">
                    +{formatCurrency(sale.tipAmount)} tip
                  </span>
                )}
              </div>

              {/* Items list */}
              <div>
                <h3 className="text-sm font-semibold text-theme-secondary mb-2">
                  Items ({sale.items.length})
                </h3>
                <div className="space-y-2">
                  {sale.items.map((item, idx) => (
                    <div
                      key={`${item.productId}-${idx}`}
                      className="bg-theme-secondary rounded-lg p-3 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-theme font-medium truncate">
                          {item.productName}
                        </p>
                        <p className="text-sm text-theme-muted">
                          {item.size && item.size !== "default"
                            ? `Size: ${item.size} • `
                            : ""}
                          {formatCurrency(item.price)} × {item.quantity}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-theme font-semibold">
                          {formatCurrency(item.price * item.quantity)}
                        </span>
                        {!isInClosedSession && (
                          <button
                            onClick={() => handleSwapItem(idx)}
                            disabled={isProcessing}
                            className="p-2 rounded-lg bg-theme hover:bg-primary/20 text-theme hover:text-primary transition-colors disabled:opacity-50"
                            title="Swap this item"
                          >
                            <ArrowsRightLeftIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delete section */}
              {!isInClosedSession && (
                <div className="pt-4 border-t border-theme">
                  {showDeleteConfirm ? (
                    <div className="space-y-3">
                      <p className="text-sm text-theme-muted text-center">
                        Are you sure? This will restore inventory for all items.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(false)}
                          disabled={isProcessing}
                          className="flex-1 py-3 px-4 bg-theme-secondary rounded-lg font-medium text-theme hover:bg-theme-tertiary transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleDelete}
                          disabled={isProcessing}
                          className="flex-1 py-3 px-4 bg-error rounded-lg font-medium text-white hover:bg-error/80 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isProcessing ? (
                            <span className="animate-pulse">Deleting...</span>
                          ) : (
                            <>
                              <TrashIcon className="w-4 h-4" />
                              Confirm Delete
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full py-3 px-4 bg-error/20 border border-error rounded-lg font-medium text-error hover:bg-error/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <TrashIcon className="w-4 h-4" />
                      Delete Sale
                    </button>
                  )}
                </div>
              )}

              {isInClosedSession && (
                <div className="pt-4 border-t border-theme">
                  <p className="text-sm text-theme-muted text-center p-3 bg-theme-secondary rounded-lg">
                    This sale belongs to a closed-out session and cannot be modified.
                  </p>
                </div>
              )}
            </div>
          )}

          {viewState === "swap-select-product" && selectedItem && (
            <div className="space-y-4">
              {/* Current item info */}
              <div className="bg-theme-secondary rounded-lg p-3">
                <p className="text-xs text-theme-muted mb-1">Swapping:</p>
                <p className="text-theme font-medium">
                  {selectedItem.productName}
                  {selectedItem.size && selectedItem.size !== "default" && (
                    <span className="text-theme-muted ml-1">
                      ({selectedItem.size})
                    </span>
                  )}
                </p>
              </div>

              {/* Product selection */}
              <div>
                <h3 className="text-sm font-semibold text-theme-secondary mb-2">
                  Select new product
                </h3>
                <div className="space-y-4">
                  {Object.entries(productsByCategory).map(
                    ([category, categoryProducts]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-theme-muted uppercase tracking-wide mb-2">
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {categoryProducts.map((product) => (
                            <ProductSwapOption
                              key={product.id}
                              product={product}
                              currentProductId={selectedItem.productId}
                              currentSize={selectedItem.size}
                              isProcessing={isProcessing}
                              onSelect={handleSelectNewProduct}
                            />
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Back button */}
              <button
                onClick={() => {
                  setViewState("details");
                  setSelectedItemIndex(null);
                }}
                className="w-full py-3 px-4 bg-theme-secondary rounded-lg font-medium text-theme hover:bg-theme-tertiary transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Sub-component for product swap selection
interface ProductSwapOptionProps {
  product: Product;
  currentProductId: string;
  currentSize?: string;
  isProcessing: boolean;
  onSelect: (productId: string, size?: string) => void;
}

function ProductSwapOption({
  product,
  currentProductId,
  currentSize,
  isProcessing,
  onSelect,
}: ProductSwapOptionProps) {
  const [expanded, setExpanded] = useState(false);

  const hasSizes = product.sizes && product.sizes.length > 0;
  const isCurrentProduct = product.id === currentProductId;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getStockForSize = (size: string) => {
    if (!product.inventory) return undefined;
    return product.inventory[size] || 0;
  };

  if (hasSizes) {
    return (
      <div className="bg-theme-secondary rounded-lg overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full p-3 flex items-center justify-between text-left hover:bg-theme-tertiary/50 transition-colors"
        >
          <div>
            <p className="text-theme font-medium">{product.name}</p>
            <p className="text-sm text-theme-muted">
              {formatCurrency(product.price)} • {product.sizes?.length} sizes
            </p>
          </div>
          <div
            className={`transform transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          >
            <svg
              className="w-5 h-5 text-theme-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>
        {expanded && (
          <div className="border-t border-theme p-2 grid grid-cols-3 gap-2">
            {product.sizes?.map((size) => {
              const stock = getStockForSize(size);
              const isCurrentSelection =
                isCurrentProduct && currentSize === size;
              const isOutOfStock = stock !== undefined && stock <= 0;

              return (
                <button
                  key={size}
                  onClick={() => !isCurrentSelection && !isOutOfStock && onSelect(product.id, size)}
                  disabled={isProcessing || isCurrentSelection || isOutOfStock}
                  className={`p-2 rounded-lg text-center transition-colors ${
                    isCurrentSelection
                      ? "bg-primary/20 border-2 border-primary text-primary"
                      : isOutOfStock
                      ? "bg-theme-tertiary/50 text-theme-muted cursor-not-allowed"
                      : "bg-theme hover:bg-primary/20 text-theme hover:text-primary"
                  }`}
                >
                  <span className="text-sm font-medium">{size}</span>
                  {stock !== undefined && (
                    <span className="block text-xs text-theme-muted">
                      {stock} left
                    </span>
                  )}
                  {isCurrentSelection && (
                    <CheckIcon className="w-4 h-4 mx-auto mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Product without sizes
  const stock = getStockForSize("default");
  const isOutOfStock = stock !== undefined && stock <= 0;

  return (
    <button
      onClick={() => !isCurrentProduct && !isOutOfStock && onSelect(product.id, undefined)}
      disabled={isProcessing || isCurrentProduct || isOutOfStock}
      className={`w-full p-3 rounded-lg text-left transition-colors ${
        isCurrentProduct
          ? "bg-primary/20 border-2 border-primary"
          : isOutOfStock
          ? "bg-theme-tertiary/50 cursor-not-allowed"
          : "bg-theme-secondary hover:bg-primary/20"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`font-medium ${
              isCurrentProduct ? "text-primary" : "text-theme"
            }`}
          >
            {product.name}
          </p>
          <p className="text-sm text-theme-muted">
            {formatCurrency(product.price)}
            {stock !== undefined && ` • ${stock} in stock`}
            {isOutOfStock && " • Out of stock"}
          </p>
        </div>
        {isCurrentProduct && <CheckIcon className="w-5 h-5 text-primary" />}
      </div>
    </button>
  );
}
