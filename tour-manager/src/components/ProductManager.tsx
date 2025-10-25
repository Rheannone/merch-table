"use client";

import { Product } from "@/types";
import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSyncToSheet: () => Promise<void>;
}

interface ToastState {
  message: string;
  type: ToastType;
}

export default function ProductManager({
  products,
  onAddProduct,
  onDeleteProduct,
  onSyncToSheet,
}: ProductManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: "",
    price: 0,
    category: "Apparel",
    description: "",
  });
  const [sizesInput, setSizesInput] = useState(""); // Separate state for sizes input
  const [toast, setToast] = useState<ToastState | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    // Parse sizes from input
    const sizesArray = sizesInput
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const product: Product = {
      id: `${newProduct.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category || "Merch",
      description: newProduct.description,
      imageUrl: newProduct.imageUrl,
      sizes: sizesArray.length > 0 ? sizesArray : undefined,
    };

    await onAddProduct(product);
    setNewProduct({ name: "", price: 0, category: "Apparel", description: "" });
    setSizesInput("");
    setIsAdding(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncToSheet();
      setToast({
        message: "Products synced to Google Sheets!",
        type: "success",
      });
    } catch (error) {
      console.error("Sync failed:", error);
      setToast({
        message: "Failed to sync products",
        type: "error",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const categories = ["Apparel", "Music", "Merch"];

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto bg-zinc-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Product Management
        </h2>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-3 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 touch-manipulation font-medium"
          >
            {isSyncing ? "Syncing..." : "Sync to Sheet"}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-3 sm:py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex items-center justify-center gap-2 touch-manipulation font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Add Product
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleSubmit}
          className="bg-zinc-800 border border-zinc-700 p-6 rounded-lg shadow-lg mb-6"
        >
          <h3 className="text-xl font-semibold mb-4 text-white">New Product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Product Name *
              </label>
              <input
                type="text"
                value={newProduct.name}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, name: e.target.value })
                }
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
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
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Category *
              </label>
              <select
                value={newProduct.category}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, category: e.target.value })
                }
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={newProduct.description}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, description: e.target.value })
                }
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Image URL
              </label>
              <input
                type="url"
                value={newProduct.imageUrl || ""}
                onChange={(e) =>
                  setNewProduct({ ...newProduct, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.jpg"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Optional - will be used as button background in POS
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Sizes (optional)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => setSizesInput(e.target.value)}
                placeholder="S, M, L, XL (comma separated)"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">
                For apparel - customer will choose size when adding to cart
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 touch-manipulation"
            >
              Save Product
            </button>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-6 py-2 bg-zinc-700 text-zinc-300 rounded-lg hover:bg-zinc-600 touch-manipulation"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow overflow-hidden overflow-x-auto">
        <table className="w-full">
          <thead className="bg-zinc-900 border-b border-zinc-700">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Name
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase hidden sm:table-cell">
                Category
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Price
              </th>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase hidden md:table-cell">
                Sizes
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-900/50">
                <td className="px-4 sm:px-6 py-4 text-sm font-medium text-white">
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
                </td>
                <td className="px-4 sm:px-6 py-4 text-sm text-zinc-300 hidden sm:table-cell">
                  {product.category}
                </td>
                <td className="px-4 sm:px-6 py-4 text-sm text-zinc-300">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-4 sm:px-6 py-4 text-sm text-zinc-300 hidden md:table-cell">
                  {product.sizes?.join(", ") || "-"}
                </td>
                <td className="px-4 sm:px-6 py-4 text-right text-sm">
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="text-red-500 hover:text-red-400 p-2 touch-manipulation"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-500 mt-4">
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
