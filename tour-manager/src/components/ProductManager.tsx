"use client";

import { Product } from "@/types";
import { useState, useEffect } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  PhotoIcon,
} from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";
import { CURRENCIES, type CurrencyCode } from "@/lib/currency";

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onUpdateProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export default function ProductManager({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: ProductManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    category: "Apparel",
    description: "",
  });
  const [categories, setCategories] = useState<string[]>([
    "Apparel",
    "Merch",
    "Music",
  ]);
  const [sizesInput, setSizesInput] = useState(""); // Separate state for sizes input
  const [sizeQuantities, setSizeQuantities] = useState<{
    [size: string]: number;
  }>({}); // Per-size quantities
  const [defaultQuantity, setDefaultQuantity] = useState("3"); // For non-sized products
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [currencyPrices, setCurrencyPrices] = useState<{
    [currencyCode: string]: string;
  }>({}); // Currency price overrides

  // Categories are now managed in Settings and synced via Supabase
  // No need to load from Sheets API

  // Track unsaved changes when editing a product
  useEffect(() => {
    if (!editingProduct) {
      setHasUnsavedChanges(false);
      return;
    }

    // Check if anything has changed from the original product
    const hasChanges =
      newProduct.name !== editingProduct.name ||
      newProduct.price !== editingProduct.price ||
      newProduct.category !== editingProduct.category ||
      newProduct.description !== editingProduct.description ||
      newProduct.imageUrl !== editingProduct.imageUrl ||
      newProduct.showTextOnButton !== editingProduct.showTextOnButton ||
      sizesInput !== (editingProduct.sizes?.join(", ") || "") ||
      JSON.stringify(sizeQuantities) !==
        JSON.stringify(editingProduct.inventory || {}) ||
      (sizesInput === "" &&
        defaultQuantity !==
          (editingProduct.inventory?.default?.toString() || "3")) ||
      JSON.stringify(currencyPrices) !==
        JSON.stringify(
          Object.fromEntries(
            Object.entries(editingProduct.currencyPrices || {}).map(
              ([k, v]) => [k, v.toString()]
            )
          )
        );

    setHasUnsavedChanges(hasChanges);
  }, [
    editingProduct,
    newProduct,
    sizesInput,
    sizeQuantities,
    defaultQuantity,
    currencyPrices,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    // Parse sizes from input
    const sizesArray = sizesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Build inventory based on sizes
    const inventory: { [key: string]: number } = {};

    if (sizesArray.length > 0) {
      // If has sizes, use per-size quantities
      sizesArray.forEach((size) => {
        inventory[size] = sizeQuantities[size] || 0;
      });
    } else {
      // No sizes, use default quantity
      inventory.default = Number.parseInt(defaultQuantity) || 0;
    }

    // Build currency price overrides
    const currencyPriceOverrides: { [key: string]: number } = {};
    Object.entries(currencyPrices).forEach(([code, priceStr]) => {
      const price = Number.parseFloat(priceStr);
      if (!Number.isNaN(price) && price > 0) {
        currencyPriceOverrides[code] = price;
      }
    });

    const product: Product = {
      id:
        editingProduct?.id ||
        `${newProduct.name
          .toLowerCase()
          .replaceAll(/\s+/g, "-")}-${Date.now()}`,
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category || "Merch",
      description: newProduct.description,
      imageUrl: newProduct.imageUrl,
      showTextOnButton: newProduct.showTextOnButton !== false, // default true
      sizes: sizesArray.length > 0 ? sizesArray : undefined,
      inventory,
      currencyPrices:
        Object.keys(currencyPriceOverrides).length > 0
          ? currencyPriceOverrides
          : undefined,
      synced: false, // Always false - edits need sync
    };

    if (editingProduct) {
      await onUpdateProduct(product);
      setEditingProduct(null);
    } else {
      await onAddProduct(product);
    }

    setNewProduct({ name: "", price: 0, category: "Apparel", description: "" });
    setSizesInput("");
    setSizeQuantities({});
    setDefaultQuantity("3");
    setCurrencyPrices({});
    setIsAdding(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setHasUnsavedChanges(false); // Reset when starting edit
    setNewProduct({
      name: product.name,
      price: product.price,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl,
      showTextOnButton: product.showTextOnButton,
    });
    setSizesInput(product.sizes?.join(", ") || "");

    // Load inventory quantities
    if (product.inventory) {
      if (product.sizes && product.sizes.length > 0) {
        // Has sizes, load per-size quantities
        setSizeQuantities(product.inventory);
      } else {
        // No sizes, load default quantity
        setDefaultQuantity((product.inventory.default || 0).toString());
      }
    }

    // Load currency price overrides
    if (product.currencyPrices) {
      const currencyPriceStrings: { [key: string]: string } = {};
      Object.entries(product.currencyPrices).forEach(([code, price]) => {
        currencyPriceStrings[code] = price.toString();
      });
      setCurrencyPrices(currencyPriceStrings);
    } else {
      setCurrencyPrices({});
    }

    // Don't set isAdding(true) - we show inline instead
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setHasUnsavedChanges(false);
    setNewProduct({ name: "", price: 0, category: "Apparel", description: "" });
    setSizesInput("");
    setSizeQuantities({});
    setDefaultQuantity("3");
    setCurrencyPrices({});
    setIsAdding(false);
  };

  // When sizes change, initialize quantities for new sizes
  const handleSizesChange = (value: string) => {
    setSizesInput(value);
    const sizesArray = value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    // Initialize quantities for any new sizes
    const newQuantities: { [size: string]: number } = {};
    sizesArray.forEach((size) => {
      newQuantities[size] = sizeQuantities[size] || 3; // Keep existing or default to 3
    });
    setSizeQuantities(newQuantities);
  };

  // Client-side image compression
  const compressImage = async (
    file: File,
    maxWidth: number = 1200,
    quality: number = 0.85
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            reject(new Error("Failed to get canvas context"));
            return;
          }

          // Calculate new dimensions
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw with high quality
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = "high";
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to blob with high quality
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error("Failed to compress image"));
                return;
              }

              const compressedFile = new File([blob], file.name, {
                type: "image/jpeg",
                lastModified: Date.now(),
              });

              console.log(
                `🖼️  Image compressed: ${(file.size / 1024).toFixed(0)}KB → ${(
                  compressedFile.size / 1024
                ).toFixed(0)}KB`
              );

              resolve(compressedFile);
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = () => reject(new Error("Failed to load image"));
      };
      reader.onerror = () => reject(new Error("Failed to read file"));
    });
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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

    // Validate file size (10MB limit before compression)
    if (file.size > 10 * 1024 * 1024) {
      setToast({
        message: "Image must be less than 10MB",
        type: "error",
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress("Compressing image...");

      // Compress image on client side before uploading
      const compressedFile = await compressImage(file);
      const originalSize = (file.size / 1024).toFixed(0);
      const compressedSize = (compressedFile.size / 1024).toFixed(0);

      setUploadProgress("Uploading to cloud storage...");

      // Generate temporary product ID if creating new product
      const productId = newProduct.id || `temp-${Date.now()}`;

      // Upload to Supabase Storage via API route
      const formData = new FormData();
      formData.append("image", compressedFile); // Upload compressed file
      formData.append("productId", productId);

      const response = await fetch("/api/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadProgress(`Uploaded (${originalSize}KB → ${compressedSize}KB)`);

      // Update image URL with Supabase CDN URL
      setNewProduct({ ...newProduct, id: productId, imageUrl: data.url });

      setToast({
        message: `Image uploaded to cloud! (${originalSize}KB → ${compressedSize}KB)`,
        type: "success",
      });

      console.log(
        `✅ Product image uploaded to Supabase Storage: ${data.url} (${data.originalSize} → ${data.compressedSize})`
      );
    } catch (error) {
      console.error("Upload error:", error);
      setToast({
        message:
          error instanceof Error
            ? error.message
            : "Failed to upload image. Please paste URL instead.",
        type: "error",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress("");
      // Reset file input
      e.target.value = "";
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto bg-theme min-h-screen">
      {/* Sticky Unsaved Changes Bar */}
      {hasUnsavedChanges && editingProduct && (
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
                  Unsaved changes to {editingProduct.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-on-primary/20 text-on-primary border-2 border-on-primary/30 font-bold rounded transition-all active:scale-95 hover:bg-on-primary/30"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="edit-product-form"
                  className="flex-1 sm:flex-none px-6 py-2.5 bg-black text-primary border-2 border-black font-bold rounded transition-all active:scale-95 hover:bg-black/90 shadow-lg"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 ${
          hasUnsavedChanges && editingProduct ? "pt-20" : ""
        }`}
      >
        <h2 className="text-2xl sm:text-3xl font-bold text-theme">
          Product Management
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-3 sm:py-2 bg-theme-tertiary text-theme rounded-lg hover:bg-theme-tertiary flex items-center justify-center gap-2 touch-manipulation font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
      </div>

      {isAdding && !editingProduct && (
        <form
          onSubmit={handleSubmit}
          className="bg-theme-secondary border border-theme p-6 rounded-lg shadow-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4 text-theme">New Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Price *
              </label>
              <input
                type="number"
                step="0.01"
                value={newProduct.price}
                onChange={(e) =>
                  setNewProduct({
                    ...newProduct,
                    price: Number.parseFloat(e.target.value),
                  })
                }
                className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Category *
              </label>
              <select
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, category: e.target.value })
                }
                className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Description
              </label>
              <input
                type="text"
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
                className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Image URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={newProduct.imageUrl || ""}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, imageUrl: e.target.value })
                  }
                  placeholder="https://example.com/image.jpg"
                  className="flex-1 px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <label className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget
                        .previousElementSibling as HTMLInputElement;
                      input?.click();
                    }}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  >
                    <PhotoIcon className="w-5 h-5" />
                    {isUploading ? "Uploading..." : "Upload"}
                  </button>
                </label>
              </div>
              {uploadProgress && (
                <p className="text-xs text-blue-400 mt-1">{uploadProgress}</p>
              )}
              {!uploadProgress && (
                <p className="text-xs text-theme-muted mt-1">
                  Optional - Upload an image or paste a URL
                </p>
              )}

              {/* Show text on button checkbox - only if image URL exists */}
              {newProduct.imageUrl && newProduct.imageUrl.trim().length > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    type="checkbox"
                    id="showTextOnButton"
                    checked={newProduct.showTextOnButton !== false} // default true
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        showTextOnButton: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-primary bg-theme border-theme rounded focus:ring-2 focus:ring-primary"
                  />
                  <label
                    htmlFor="showTextOnButton"
                    className="text-sm text-theme-secondary cursor-pointer"
                  >
                    Show text title on POS button
                  </label>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-theme-secondary mb-1">
                Sizes (optional)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => handleSizesChange(e.target.value)}
                placeholder="S, M, L, XL (comma separated)"
                className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="text-xs text-theme-muted mt-1">
                For apparel - customer will choose size when adding to cart
              </p>
            </div>

            {/* Show per-size quantity inputs if sizes are defined */}
            {sizesInput.trim().length > 0 ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-theme-secondary mb-2">
                  Quantities per Size *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {sizesInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                    .map((size) => (
                      <div key={size}>
                        <label className="block text-xs text-theme-muted mb-1">
                          {size}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={sizeQuantities[size] || 0}
                          onChange={(e) =>
                            setSizeQuantities({
                              ...sizeQuantities,
                              [size]: Number.parseInt(e.target.value) || 0,
                            })
                          }
                          className="w-full px-3 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                          required
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-theme-secondary mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(e.target.value)}
                  placeholder="3"
                  className="w-full px-4 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                <p className="text-xs text-theme-muted mt-1">
                  Total quantity available
                </p>
              </div>
            )}

            {/* Currency Price Overrides */}
            <div className="md:col-span-2 border-t border-theme pt-4 mt-2">
              <label className="block text-sm font-medium text-theme-secondary mb-2">
                Currency Price Overrides (optional)
              </label>
              <p className="text-xs text-theme-muted mb-3">
                Set specific prices for different currencies instead of using
                automatic conversion. Leave blank to use automatic conversion
                based on exchange rates.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(CURRENCIES) as CurrencyCode[])
                  .filter((code) => code !== "USD") // USD is the base price
                  .map((code) => {
                    const currency = CURRENCIES[code];
                    return (
                      <div key={code}>
                        <label className="block text-xs text-theme-muted mb-1">
                          {currency.symbol} {code}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={currencyPrices[code] || ""}
                          onChange={(e) =>
                            setCurrencyPrices({
                              ...currencyPrices,
                              [code]: e.target.value,
                            })
                          }
                          placeholder={`Auto: ${(
                            (newProduct.price || 0) * currency.defaultRate
                          ).toFixed(2)}`}
                          className="w-full px-3 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                        />
                      </div>
                    );
                  })}
              </div>
              <p className="text-xs text-theme-muted mt-2">
                Example: If your $20 USD record should be $30 CAD (not $27
                auto-converted), enter 30 in the CAD field.
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary touch-manipulation"
            >
              Save Product
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-2 bg-theme-tertiary text-theme-secondary rounded-lg hover:bg-theme-tertiary touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-theme-secondary border border-theme rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-theme border-b border-theme">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-theme-muted uppercase">
                Name
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-theme-muted uppercase hidden sm:table-cell">
                Category
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-theme-muted uppercase">
                Price
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-theme-muted uppercase hidden md:table-cell">
                Sizes
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-theme-muted uppercase hidden lg:table-cell">
                Inventory
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-theme-muted uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {products.map((product) => (
              <>
                <tr key={product.id} className="hover:bg-theme/50">
                  <td className="px-4 sm:px-6 py-4 text-sm font-medium text-theme">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        {product.imageUrl && (
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        {product.name}
                      </div>
                      {/* Show inventory on mobile/tablet - hide on desktop where we have column */}
                      <div className="lg:hidden">
                        {product.inventory ? (
                          product.sizes && product.sizes.length > 0 ? (
                            // Product has sizes - show size breakdown
                            <div className="flex flex-wrap gap-1 mt-1">
                              {product.sizes.map((size) => {
                                const qty = product.inventory?.[size] || 0;
                                return (
                                  <span
                                    key={size}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                                      qty === 0
                                        ? "bg-red-900/30 text-primary"
                                        : qty <= 2
                                        ? "bg-yellow-900/30 text-yellow-400"
                                        : "bg-green-900/30 text-green-400"
                                    }`}
                                  >
                                    {size}: {qty}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            // No sizes - show total quantity
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                (product.inventory.default || 0) === 0
                                  ? "bg-red-900/30 text-primary"
                                  : (product.inventory.default || 0) <= 2
                                  ? "bg-yellow-900/30 text-yellow-400"
                                  : "bg-green-900/30 text-green-400"
                              }`}
                            >
                              {product.inventory.default || 0} in stock
                            </span>
                          )
                        ) : (
                          <span className="text-theme-muted text-xs">
                            No inventory data
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-theme-secondary hidden sm:table-cell">
                    {product.category}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-theme-secondary">
                    ${product.price.toFixed(2)}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-theme-secondary hidden md:table-cell">
                    {product.sizes?.join(", ") || "-"}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-sm text-theme-secondary hidden lg:table-cell">
                    {product.inventory ? (
                      product.sizes && product.sizes.length > 0 ? (
                        // Product has sizes - show size breakdown
                        <div className="flex flex-wrap gap-1">
                          {product.sizes.map((size) => {
                            const qty = product.inventory?.[size] || 0;
                            return (
                              <span
                                key={size}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                  qty === 0
                                    ? "bg-red-900/30 text-primary"
                                    : qty <= 2
                                    ? "bg-yellow-900/30 text-yellow-400"
                                    : "bg-green-900/30 text-green-400"
                                }`}
                              >
                                {size}: {qty}
                              </span>
                            );
                          })}
                        </div>
                      ) : (
                        // No sizes - show total quantity
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
                            (product.inventory.default || 0) === 0
                              ? "bg-red-900/30 text-primary"
                              : (product.inventory.default || 0) <= 2
                              ? "bg-yellow-900/30 text-yellow-400"
                              : "bg-green-900/30 text-green-400"
                          }`}
                        >
                          {product.inventory.default || 0} in stock
                        </span>
                      )
                    ) : (
                      <span className="text-theme-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 sm:px-6 py-4 text-right text-sm">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-blue-500 hover:text-blue-400 p-2 touch-manipulation"
                        aria-label="Edit product"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => onDeleteProduct(product.id)}
                        className="text-primary hover:text-primary p-2 touch-manipulation"
                        aria-label="Delete product"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>

                {/* Inline Edit Form - appears below the row being edited */}
                {editingProduct?.id === product.id && (
                  <tr key={`${product.id}-edit`}>
                    <td
                      colSpan={6}
                      className="px-4 sm:px-6 py-4 bg-theme-secondary/50"
                    >
                      <form
                        id="edit-product-form"
                        onSubmit={handleSubmit}
                        className="space-y-4"
                      >
                        <h3 className="text-lg font-semibold text-theme mb-4">
                          Edit Product
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Product Name *
                            </label>
                            <input
                              type="text"
                              value={newProduct.name || ""}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  name: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Price *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={newProduct.price || ""}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  price: Number.parseFloat(e.target.value),
                                })
                              }
                              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Category *
                            </label>
                            <select
                              value={newProduct.category || ""}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  category: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                            >
                              {categories.map((cat) => (
                                <option key={cat} value={cat}>
                                  {cat}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={newProduct.description || ""}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  description: e.target.value,
                                })
                              }
                              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-theme-secondary mb-1">
                            Image URL
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={newProduct.imageUrl || ""}
                              onChange={(e) =>
                                setNewProduct({
                                  ...newProduct,
                                  imageUrl: e.target.value,
                                })
                              }
                              className="flex-1 px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                              placeholder="https://example.com/image.jpg"
                            />
                            <label className="relative">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={isUploading}
                                className="hidden"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  const input = e.currentTarget
                                    .previousElementSibling as HTMLInputElement;
                                  input?.click();
                                }}
                                disabled={isUploading}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 text-white rounded-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                              >
                                <PhotoIcon className="w-5 h-5" />
                                {isUploading ? "..." : "Upload"}
                              </button>
                            </label>
                          </div>
                          {uploadProgress && (
                            <p className="text-xs text-blue-400 mt-1">
                              {uploadProgress}
                            </p>
                          )}
                          {!uploadProgress && (
                            <p className="text-xs text-theme-muted mt-1">
                              Optional - Upload an image or paste a URL
                            </p>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-theme-secondary mb-1">
                            Sizes (optional)
                          </label>
                          <input
                            type="text"
                            value={sizesInput}
                            onChange={(e) => handleSizesChange(e.target.value)}
                            className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                            placeholder="S, M, L, XL (comma separated)"
                          />
                          <p className="text-xs text-theme-muted mt-1">
                            For apparel - customer will choose size when adding
                            to cart
                          </p>
                        </div>

                        {sizesInput.split(",").filter((s) => s.trim()).length >
                        0 ? (
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-2">
                              Quantity per Size
                            </label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                              {sizesInput
                                .split(",")
                                .map((s) => s.trim())
                                .filter((s) => s.length > 0)
                                .map((size) => (
                                  <div key={size}>
                                    <label className="block text-xs text-theme-muted mb-1">
                                      {size}
                                    </label>
                                    <input
                                      type="number"
                                      min="0"
                                      value={sizeQuantities[size] || 0}
                                      onChange={(e) =>
                                        setSizeQuantities({
                                          ...sizeQuantities,
                                          [size]:
                                            Number.parseInt(e.target.value) ||
                                            0,
                                        })
                                      }
                                      className="w-full px-2 py-1 bg-theme border border-theme rounded text-theme text-sm focus:outline-none focus:border-red-500"
                                    />
                                  </div>
                                ))}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <label className="block text-sm font-medium text-theme-secondary mb-1">
                              Quantity *
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={defaultQuantity}
                              onChange={(e) =>
                                setDefaultQuantity(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:border-red-500"
                              placeholder="Total quantity available"
                            />
                            <p className="text-xs text-theme-muted mt-1">
                              Total quantity available
                            </p>
                          </div>
                        )}

                        {/* Currency Price Overrides */}
                        <div className="border-t border-theme pt-4 mt-4">
                          <label className="block text-sm font-medium text-theme-secondary mb-2">
                            Currency Price Overrides (optional)
                          </label>
                          <p className="text-xs text-theme-muted mb-3">
                            Set specific prices for different currencies instead
                            of using automatic conversion.
                          </p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {(Object.keys(CURRENCIES) as CurrencyCode[])
                              .filter((code) => code !== "USD")
                              .map((code) => {
                                const currency = CURRENCIES[code];
                                return (
                                  <div key={code}>
                                    <label className="block text-xs text-theme-muted mb-1">
                                      {currency.symbol} {code}
                                    </label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={currencyPrices[code] || ""}
                                      onChange={(e) =>
                                        setCurrencyPrices({
                                          ...currencyPrices,
                                          [code]: e.target.value,
                                        })
                                      }
                                      placeholder={`Auto: ${(
                                        (newProduct.price || 0) *
                                        currency.defaultRate
                                      ).toFixed(2)}`}
                                      className="w-full px-3 py-2 bg-theme border border-theme text-theme rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    />
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      </form>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-theme-muted mt-4 mb-6">
        Total: {products.length} products
      </p>

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
