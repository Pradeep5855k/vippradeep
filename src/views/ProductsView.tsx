import React, { useState, useMemo, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  Edit2,
  Archive,
  RotateCcw,
  Barcode,
  Layers,
  Calendar,
  IndianRupee,
  X,
  Check,
  CheckCircle,
  Sparkles,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Product, ProductUnit, Supplier } from '../types';
import { ThreeDHardwareModal } from '../components/ThreeDHardwareModal';

export const ProductsView: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [preview3DProduct, setPreview3DProduct] = useState<Product | null>(null);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form Fields
  const [formName, setFormName] = useState('');
  const [formBarcode, setFormBarcode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formUnit, setFormUnit] = useState<ProductUnit>('packet');
  const [formPurchasePrice, setFormPurchasePrice] = useState<number | ''>('');
  const [formSellingPrice, setFormSellingPrice] = useState<number | ''>('');
  const [formStock, setFormStock] = useState<number | ''>('');
  const [formMinStock, setFormMinStock] = useState<number | ''>(5);
  const [formTaxRate, setFormTaxRate] = useState<number>(0);
  const [formTaxInclusive, setFormTaxInclusive] = useState<boolean>(true);
  const [formSupplierId, setFormSupplierId] = useState<string>('');
  const [formExpiryDate, setFormExpiryDate] = useState<string>('');

  // Quick Stock Adjustment Modal
  const [stockAdjustItem, setStockAdjustItem] = useState<Product | null>(null);
  const [adjustValue, setAdjustValue] = useState<number>(0);

  useEffect(() => {
    const refresh = () => {
      setProducts(storage.getProducts(true));
      setSuppliers(storage.getSuppliers());
    };
    refresh();
    return storage.subscribe(refresh);
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!showArchived && p.isArchived) return false;
      if (showArchived && !p.isArchived) return false;
      if (showLowStockOnly && p.stock > p.minStockAlert) return false;
      if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
      if (q) {
        return (
          p.name.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, searchQuery, selectedCategory, showLowStockOnly, showArchived]);

  const openAddModal = () => {
    setEditingProduct(null);
    setFormName('');
    setFormBarcode(Math.floor(100000000000 + Math.random() * 900000000000).toString());
    setFormCategory('General');
    setFormUnit('packet');
    setFormPurchasePrice('');
    setFormSellingPrice('');
    setFormStock(10);
    setFormMinStock(5);
    setFormTaxRate(0);
    setFormTaxInclusive(true);
    setFormSupplierId('');
    setFormExpiryDate('');
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormName(p.name);
    setFormBarcode(p.barcode);
    setFormCategory(p.category);
    setFormUnit(p.unit);
    setFormPurchasePrice(p.purchasePrice);
    setFormSellingPrice(p.sellingPrice);
    setFormStock(p.stock);
    setFormMinStock(p.minStockAlert);
    setFormTaxRate(p.taxRate);
    setFormTaxInclusive(p.isTaxInclusive);
    setFormSupplierId(p.supplierId || '');
    setFormExpiryDate(p.expiryDate || '');
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || formSellingPrice === '') return;

    storage.saveProduct({
      id: editingProduct?.id,
      name: formName.trim(),
      barcode: formBarcode.trim(),
      category: formCategory.trim() || 'General',
      unit: formUnit,
      purchasePrice: Number(formPurchasePrice) || 0,
      sellingPrice: Number(formSellingPrice) || 0,
      stock: Number(formStock) || 0,
      minStockAlert: Number(formMinStock) || 5,
      taxRate: Number(formTaxRate) || 0,
      isTaxInclusive: formTaxInclusive,
      supplierId: formSupplierId,
      expiryDate: formExpiryDate,
    });

    setIsModalOpen(false);
  };

  const handleToggleArchive = (p: Product) => {
    storage.archiveProduct(p.id, !p.isArchived);
  };

  const handleAdjustStockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockAdjustItem) return;
    const newStock = Math.max(0, stockAdjustItem.stock + adjustValue);
    storage.adjustStock(stockAdjustItem.id, newStock);
    setStockAdjustItem(null);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Bar with Add Product & Low stock filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span>Product Inventory ({products.filter((p) => !p.isArchived).length} items)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage stock, barcodes, GST tax rates, units and pricing
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowLowStockOnly((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
              showLowStockOnly
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Low Stock</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, barcode number, or category..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
          />
        </div>

        <div className="sm:col-span-4 flex gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-600 shadow-xs"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                Category: {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowArchived((prev) => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-medium border transition ${
              showArchived
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {showArchived ? 'Archived' : 'Active'}
          </button>
        </div>
      </div>

      {/* Product Table / Cards */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Selling Price</th>
                <th className="py-3 px-3 text-center">GST Rate</th>
                <th className="py-3 px-3 text-center">Stock</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const isLow = p.stock <= p.minStockAlert;
                return (
                  <tr key={p.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-medium">
                          {p.category}
                        </span>
                        <span>Unit: {p.unit}</span>
                        {p.expiryDate && <span>Exp: {p.expiryDate}</span>}
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono-numbers text-slate-600 text-xs">
                      {p.barcode || '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers text-slate-600">
                      ₹{p.purchasePrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-right font-mono-numbers font-bold text-slate-900">
                      ₹{p.sellingPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-3 text-center">
                      <span className="font-mono-numbers text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-700">
                        {p.taxRate}% {p.isTaxInclusive ? '(Inc)' : '(Exc)'}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStockAdjustItem(p);
                          setAdjustValue(0);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl font-bold font-mono-numbers text-xs transition ${
                          isLow
                            ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                            : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                        title="Click to adjust stock"
                      >
                        {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                        <span>
                          {p.stock} {p.unit}
                        </span>
                      </button>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPreview3DProduct(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Inspect in 3D Packaging Viewer"
                        >
                          <Sparkles className="w-4 h-4 text-blue-500" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(p)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Product"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleArchive(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                          title={p.isArchived ? 'Restore Product' : 'Archive Product'}
                        >
                          {p.isArchived ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : (
                            <Archive className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No products found</p>
                    <p className="text-xs text-slate-400">Try clearing filters or add a new product</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Aashirvaad Shudh Chakki Atta 5kg"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Barcode / SKU
                  </label>
                  <input
                    type="text"
                    value={formBarcode}
                    onChange={(e) => setFormBarcode(e.target.value)}
                    placeholder="e.g. 8901030383748"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Flour & Grains"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Unit
                  </label>
                  <select
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value as ProductUnit)}
                    className="w-full px-2.5 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="packet">Packet</option>
                    <option value="piece">Piece</option>
                    <option value="kg">kg (Weight)</option>
                    <option value="g">gram</option>
                    <option value="litre">Litre</option>
                    <option value="ml">ml</option>
                    <option value="box">Box</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Purchase Price (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formPurchasePrice}
                    onChange={(e) => setFormPurchasePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="Cost"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Selling Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formSellingPrice}
                    onChange={(e) => setFormSellingPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder="MRP / Rate"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formStock}
                    onChange={(e) => setFormStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    value={formMinStock}
                    onChange={(e) => setFormMinStock(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-end">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Applicable GST Slab
                  </label>
                  <select
                    value={formTaxRate}
                    onChange={(e) => setFormTaxRate(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono-numbers"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5% GST</option>
                    <option value={12}>12% GST</option>
                    <option value={18}>18% GST</option>
                    <option value={28}>28% GST</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <input
                    type="checkbox"
                    id="taxInclusiveCheck"
                    checked={formTaxInclusive}
                    onChange={(e) => setFormTaxInclusive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="taxInclusiveCheck" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Price is Tax-Inclusive
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Quick Adjustment Modal */}
      {stockAdjustItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-1">Adjust Inventory Stock</h3>
            <p className="text-xs text-slate-500 mb-3">{stockAdjustItem.name}</p>

            <form onSubmit={handleAdjustStockSubmit} className="space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                <span>Current Stock:</span>
                <span className="font-bold text-sm font-mono-numbers">
                  {stockAdjustItem.stock} {stockAdjustItem.unit}
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Add or Subtract Quantity (+ or -):
                </label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={adjustValue || ''}
                  onChange={(e) => setAdjustValue(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. +10 or -5"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono-numbers font-bold"
                />
              </div>

              <div className="text-slate-600 text-[11px]">
                New stock will be:{' '}
                <strong className="font-mono-numbers">
                  {Math.max(0, stockAdjustItem.stock + adjustValue)} {stockAdjustItem.unit}
                </strong>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStockAdjustItem(null)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Apply Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3D Product Packaging Inspection Modal */}
      {preview3DProduct && (
        <ThreeDHardwareModal
          isOpen={!!preview3DProduct}
          onClose={() => setPreview3DProduct(null)}
          initialModel="product"
          productName={preview3DProduct.name}
          productPrice={preview3DProduct.sellingPrice}
        />
      )}
    </div>
  );
};
