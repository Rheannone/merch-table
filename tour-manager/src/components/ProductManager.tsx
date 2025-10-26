"use client";

import { Product } from "@/types";
import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon, PencilIcon } from "@heroicons/react/24/outline";
import Toast, { ToastType } from "./Toast";

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

  // Load categories from settings on component mount
  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const spreadsheetId = localStorage.getItem("salesSheetId");
      if (!spreadsheetId) return;

      const response = await fetch("/api/sheets/settings/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spreadsheetId }),
      });

      const data = await response.json();
      if (response.ok && data.categories) {
        setCategories(data.categories);
        // Update newProduct category if current one doesn't exist
        if (
          newProduct.category &&
          !data.categories.includes(newProduct.category)
        ) {
          setNewProduct({ ...newProduct, category: data.categories[0] });
        }
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      // Keep default categories if load fails
    }
  };

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
    setIsAdding(false);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
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

    setIsAdding(true);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setNewProduct({ name: "", price: 0, category: "Apparel", description: "" });
    setSizesInput("");
    setSizeQuantities({});
    setDefaultQuantity("3");
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

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto bg-zinc-900 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h2 className="text-2xl sm:text-3xl font-bold text-white">
          Product Management
        </h2>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="px-4 py-3 sm:py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 flex items-center justify-center gap-2 touch-manipulation font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add Product
        </button>
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
                Optional - will be displayed as full image in POS button
              </p>

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
                    className="w-4 h-4 text-red-600 bg-zinc-900 border-zinc-700 rounded focus:ring-2 focus:ring-red-500"
                  />
                  <label
                    htmlFor="showTextOnButton"
                    className="text-sm text-zinc-300 cursor-pointer"
                  >
                    Show text title on POS button
                  </label>
                </div>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-zinc-300 mb-1">
                Sizes (optional)
              </label>
              <input
                type="text"
                value={sizesInput}
                onChange={(e) => handleSizesChange(e.target.value)}
                placeholder="S, M, L, XL (comma separated)"
                className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
              <p className="text-xs text-zinc-500 mt-1">
                For apparel - customer will choose size when adding to cart
              </p>
            </div>

            {/* Show per-size quantity inputs if sizes are defined */}
            {sizesInput.trim().length > 0 ? (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Quantities per Size *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {sizesInput
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0)
                    .map((size) => (
                      <div key={size}>
                        <label className="block text-xs text-zinc-400 mb-1">
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
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          required
                        />
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0"
                  value={defaultQuantity}
                  onChange={(e) => setDefaultQuantity(e.target.value)}
                  placeholder="3"
                  className="w-full px-4 py-2 bg-zinc-900 border border-zinc-700 text-white rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-zinc-500 mt-1">
                  Total quantity available
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            {editingProduct && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-6 py-2 bg-zinc-700 text-white rounded-lg hover:bg-zinc-600 touch-manipulation"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 touch-manipulation"
            >
              {editingProduct ? "Update Product" : "Save Product"}
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
                      className="text-red-500 hover:text-red-400 p-2 touch-manipulation"
                      aria-label="Delete product"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-zinc-500 mt-4 mb-6">
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
