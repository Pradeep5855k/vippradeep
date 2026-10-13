import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  PackagePlus,
  IndianRupee,
  FileText,
  Calendar,
  X,
  Check,
  Search,
  CheckCircle,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Supplier, PurchaseOrder, Product, PurchaseItem } from '../types';

export const SuppliersView: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Add Supplier Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [supplierGstin, setSupplierGstin] = useState('');

  // Record Stock Purchase Modal
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<
    { productId: string; quantity: number; unitCost: number }[]
  >([]);
  const [amountPaid, setAmountPaid] = useState<number | ''>('');
  const [purchasePaymentMethod, setPurchasePaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>(
    'UPI'
  );
  const [purchaseNotes, setPurchaseNotes] = useState('');

  useEffect(() => {
    const refresh = () => {
      setSuppliers(storage.getSuppliers());
      setPurchases(storage.getPurchases());
      setProducts(storage.getProducts());
    };
    refresh();
    return storage.subscribe(refresh);
  }, []);

  const totalSupplierDues = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentBalanceDue || 0), 0);
  }, [suppliers]);

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim() || !supplierPhone.trim()) return;

    storage.saveSupplier({
      name: supplierName.trim(),
      phone: supplierPhone.trim(),
      address: supplierAddress.trim(),
      gstin: supplierGstin.trim(),
      currentBalanceDue: 0,
    });

    setIsSupplierModalOpen(false);
    setSupplierName('');
    setSupplierPhone('');
    setSupplierAddress('');
    setSupplierGstin('');
  };

  const openNewPurchaseModal = () => {
    setSelectedSupplierId(suppliers[0]?.id || '');
    setPurchaseItems([{ productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.purchasePrice || 0 }]);
    setAmountPaid('');
    setPurchaseNotes('');
    setIsPurchaseModalOpen(true);
  };

  const handleAddPurchaseItemRow = () => {
    setPurchaseItems((prev) => [
      ...prev,
      { productId: products[0]?.id || '', quantity: 10, unitCost: products[0]?.purchasePrice || 0 },
    ]);
  };

  const handleRemovePurchaseItemRow = (index: number) => {
    setPurchaseItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const calculatePurchaseTotal = useMemo(() => {
    return purchaseItems.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitCost || 0), 0);
  }, [purchaseItems]);

  const handleSavePurchaseOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || purchaseItems.length === 0) return;

    const supplier = suppliers.find((s) => s.id === selectedSupplierId);
    if (!supplier) return;

    const total = calculatePurchaseTotal;
    const paid = amountPaid === '' ? total : Number(amountPaid);
    const balanceDue = Math.max(0, total - paid);

    const items: PurchaseItem[] = purchaseItems.map((p) => {
      const prod = products.find((pr) => pr.id === p.productId);
      return {
        productId: p.productId,
        productName: prod?.name || 'Item',
        unit: prod?.unit || 'packet',
        quantity: p.quantity,
        unitCost: p.unitCost,
        lineTotal: p.quantity * p.unitCost,
      };
    });

    const poNumber = 'PO-' + (purchases.length + 101);
    const dateStr = new Date().toISOString().split('T')[0];

    storage.recordPurchaseOrder({
      poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      date: dateStr,
      items,
      totalAmount: total,
      amountPaid: paid,
      balanceDue,
      paymentMethod: purchasePaymentMethod,
      notes: purchaseNotes,
    });

    setIsPurchaseModalOpen(false);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Suppliers & Stock Purchases</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add supplier invoices, update inventory automatically and manage payable balances
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition"
          >
            + New Supplier
          </button>
          <button
            type="button"
            onClick={openNewPurchaseModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <PackagePlus className="w-4 h-4" />
            <span>Record Inward Stock</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Active Suppliers
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            {suppliers.length}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Outstanding Supplier Dues
          </span>
          <div className="text-xl font-bold text-red-600 font-mono-numbers mt-1">
            {formatCurrency(totalSupplierDues)}
          </div>
        </div>

        <div className="col-span-2 sm:col-span-1 p-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Inward Purchase Orders
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            {purchases.length} Orders
          </div>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900 flex justify-between">
          <span>Supplier Directory & Ledgers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
              <tr>
                <th className="py-2.5 px-4">Supplier Name</th>
                <th className="py-2.5 px-3">Phone</th>
                <th className="py-2.5 px-3">GSTIN</th>
                <th className="py-2.5 px-3 text-right">Total Purchased</th>
                <th className="py-2.5 px-4 text-right">Balance Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{s.name}</td>
                  <td className="py-3 px-3 font-mono-numbers text-slate-600">+91 {s.phone}</td>
                  <td className="py-3 px-3 font-mono-numbers text-slate-600">{s.gstin || '—'}</td>
                  <td className="py-3 px-3 text-right font-mono-numbers">
                    {formatCurrency(s.totalPurchased)}
                  </td>
                  <td className="py-3 px-4 text-right font-bold font-mono-numbers">
                    <span
                      className={s.currentBalanceDue > 0 ? 'text-red-600' : 'text-slate-600'}
                    >
                      {formatCurrency(s.currentBalanceDue)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inward Purchase Orders Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
          Recent Inward Stock Purchases
        </div>
        <div className="divide-y divide-slate-100">
          {purchases.map((po) => (
            <div key={po.id} className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs">
              <div>
                <div className="font-bold text-slate-900 font-mono-numbers">
                  #{po.poNumber} · {po.supplierName}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {po.date} · {po.items.length} items received · Paid via {po.paymentMethod}
                </div>
              </div>

              <div className="text-right">
                <div className="font-bold text-slate-900 font-mono-numbers text-sm">
                  {formatCurrency(po.totalAmount)}
                </div>
                {po.balanceDue > 0 && (
                  <div className="text-[10px] text-red-600 font-semibold font-mono-numbers">
                    Due: {formatCurrency(po.balanceDue)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {purchases.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No stock purchases recorded yet. Click "Record Inward Stock" to add inventory.
            </div>
          )}
        </div>
      </div>

      {/* Add Supplier Modal */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-3">Add Supplier</h3>
            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  placeholder="e.g. Balaji Wholesale FMCG"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Phone *</label>
                <input
                  type="tel"
                  required
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  placeholder="Contact number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">GSTIN Number</label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value)}
                  placeholder="e.g. 29AAGCB1234F1Z9"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Market Address</label>
                <input
                  type="text"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  placeholder="APMC Yard, Gate 2"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Inward Stock Modal */}
      {isPurchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl my-auto">
            <h3 className="font-bold text-base sm:text-lg text-slate-900 mb-1">
              Record Inward Stock Purchase
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Stock will be added to inventory automatically upon saving
            </p>

            <form onSubmit={handleSavePurchaseOrder} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                <select
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} (+91 {s.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Items List */}
              <div className="space-y-2 max-h-48 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                {purchaseItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 text-xs">
                    <select
                      value={item.productId}
                      onChange={(e) => {
                        const pid = e.target.value;
                        const prod = products.find((p) => p.id === pid);
                        setPurchaseItems((prev) =>
                          prev.map((r, i) =>
                            i === idx
                              ? { ...r, productId: pid, unitCost: prod?.purchasePrice || r.unitCost }
                              : r
                          )
                        );
                      }}
                      className="flex-1 px-2 py-1.5 border border-slate-300 rounded-lg"
                    >
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      step="0.001"
                      min="0.1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPurchaseItems((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, quantity: val } : r))
                        );
                      }}
                      className="w-16 px-1.5 py-1.5 border border-slate-300 rounded-lg text-center font-mono-numbers"
                    />

                    <input
                      type="number"
                      step="0.01"
                      placeholder="Cost"
                      value={item.unitCost}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setPurchaseItems((prev) =>
                          prev.map((r, i) => (i === idx ? { ...r, unitCost: val } : r))
                        );
                      }}
                      className="w-20 px-1.5 py-1.5 border border-slate-300 rounded-lg text-right font-mono-numbers"
                    />

                    {purchaseItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemovePurchaseItemRow(idx)}
                        className="text-red-500 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPurchaseItemRow}
                className="text-xs font-bold text-blue-600 hover:text-blue-800"
              >
                + Add Another Product Row
              </button>

              <div className="p-3 bg-slate-100 rounded-xl flex justify-between font-bold text-sm">
                <span>Total Inward Bill Amount:</span>
                <span className="font-mono-numbers">{formatCurrency(calculatePurchaseTotal)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Amount Paid Now (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value === '' ? '' : parseFloat(e.target.value))}
                    placeholder={`₹${calculatePurchaseTotal}`}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                  <select
                    value={purchasePaymentMethod}
                    onChange={(e) => setPurchasePaymentMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="CARD">Bank Transfer / Card</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPurchaseModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 rounded-xl text-slate-700 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Confirm & Update Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
