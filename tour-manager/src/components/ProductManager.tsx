"use client";

import { Product } from "@/types";
import { useState } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

interface ProductManagerProps {
  products: Product[];
  onAddProduct: (product: Product) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onSyncToSheet: () => Promise<void>;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name || !newProduct.price) return;

    const product: Product = {
      id: `${newProduct.name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
      name: newProduct.name,
      price: newProduct.price,
      category: newProduct.category || "Merch",
      description: newProduct.description,
    };

    await onAddProduct(product);
    setNewProduct({ name: "", price: 0, category: "Apparel", description: "" });
    setIsAdding(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncToSheet();
      alert("Products synced to Google Sheets!");
    } catch (error) {
      alert("Failed to sync products");
    } finally {
      setIsSyncing(false);
    }
  };

  const categories = ["Apparel", "Music", "Merch"];

  return (
    <div className="p-6 max-w-6xl mx-auto bg-zinc-900 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-white">Product Management</h2>
        <div className="flex gap-3">
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 touch-manipulation"
          >
            {isSyncing ? "Syncing..." : "Sync to Sheet"}
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex items-center gap-2 touch-manipulation"
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

      <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-zinc-900 border-b border-zinc-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Price
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-zinc-400 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-700">
            {products.map((product) => (
              <tr key={product.id} className="hover:bg-zinc-900/50">
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {product.name}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {product.category}
                </td>
                <td className="px-6 py-4 text-sm text-red-400 font-semibold">
                  ${product.price.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-sm text-zinc-400">
                  {product.description}
                </td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => onDeleteProduct(product.id)}
                    className="text-red-400 hover:text-red-300 p-2 touch-manipulation"
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
    </div>
  );
}
