import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Receipt,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckCircle,
  IndianRupee,
  Search,
  PackageCheck,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Expense, SalesReturn, Invoice, ExpenseCategory } from '../types';

export const ReturnsExpensesView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'expenses' | 'returns'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('RENT');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expensePaymentMethod, setExpensePaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [expenseNotes, setExpenseNotes] = useState('');

  // Process Sales Return Modal
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnInvoiceNumber, setReturnInvoiceNumber] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<Invoice | null>(null);
  const [returnReason, setReturnReason] = useState('Customer changed mind / wrong item');
  const [refundMethod, setRefundMethod] = useState<'CASH' | 'UPI' | 'CREDIT'>('CASH');
  const [returnItemsState, setReturnItemsState] = useState<
    { productId: string; selected: boolean; returnQty: number; restock: boolean }[]
  >([]);

  useEffect(() => {
    const refresh = () => {
      setExpenses(storage.getExpenses());
      setReturns(storage.getDatabase().returns);
      setInvoices(storage.getInvoices());
    };
    refresh();
    return storage.subscribe(refresh);
  }, []);

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, e) => sum + e.amount, 0);
  }, [expenses]);

  const totalRefunds = useMemo(() => {
    return returns.reduce((sum, r) => sum + r.totalRefund, 0);
  }, [returns]);

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseTitle.trim() || !expenseAmount || expenseAmount <= 0) return;

    storage.saveExpense({
      title: expenseTitle.trim(),
      category: expenseCategory,
      amount: Number(expenseAmount),
      date: new Date().toISOString().split('T')[0],
      paymentMethod: expensePaymentMethod,
      notes: expenseNotes,
    });

    setIsExpenseModalOpen(false);
    setExpenseTitle('');
    setExpenseAmount('');
    setExpenseNotes('');
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm('Delete this expense record?')) {
      storage.deleteExpense(id);
    }
  };

  const handleFindInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = returnInvoiceNumber.trim().toUpperCase();
    const inv = invoices.find(
      (i) => i.invoiceNumber.toUpperCase() === clean && i.status !== 'CANCELLED'
    );
    if (inv) {
      setFoundInvoice(inv);
      setReturnItemsState(
        inv.items.map((item) => ({
          productId: item.productId,
          selected: true,
          returnQty: item.quantity,
          restock: true,
        }))
      );
    } else {
      alert(`Invoice #${clean} not found or is already cancelled.`);
    }
  };

  const handleProcessReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundInvoice) return;

    const itemsToReturn = returnItemsState
      .filter((r) => r.selected && r.returnQty > 0)
      .map((r) => {
        const origItem = foundInvoice.items.find((i) => i.productId === r.productId)!;
        const refundAmt = (origItem.lineTotal / origItem.quantity) * r.returnQty;
        return {
          productId: r.productId,
          quantity: r.returnQty,
          refundAmount: refundAmt,
          restock: r.restock,
        };
      });

    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    storage.processSalesReturn(
      foundInvoice.id,
      itemsToReturn,
      returnReason,
      refundMethod
    );

    setIsReturnModalOpen(false);
    setFoundInvoice(null);
    setReturnInvoiceNumber('');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-600" />
            <span>Returns & Shop Operating Expenses</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Maintain clear audit trails for refunds, damaged stock, rent, utilities and transport
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'expenses' ? (
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Expense</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setFoundInvoice(null);
                setReturnInvoiceNumber('');
                setIsReturnModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Process Sales Return</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-200 p-1 rounded-2xl max-w-sm">
        <button
          type="button"
          onClick={() => setActiveTab('expenses')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'expenses'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Daily Expenses ({expenses.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('returns')}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'returns'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sales Returns Audit ({returns.length})
        </button>
      </div>

      {/* EXPENSES TAB */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Total Recorded Expenses
              </span>
              <div className="text-xl font-bold text-red-600 font-mono-numbers mt-1">
                {formatCurrency(totalExpenses)}
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Expense Categories
              </span>
              <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
                Rent, BESCOM, Freight, Packaging
              </div>
            </div>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                P&L Impact
              </span>
              <div className="text-xs text-slate-600 mt-1">
                Operating costs automatically deducted from gross sales in Reports
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Expense Log
            </div>
            <div className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="p-4 hover:bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{exp.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                        {exp.category}
                      </span>
                      <span>·</span>
                      <span>{exp.date}</span>
                      <span>·</span>
                      <span>Paid via {exp.paymentMethod}</span>
                      {exp.notes && <span>· {exp.notes}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-bold text-base text-red-600 font-mono-numbers">
                      -{formatCurrency(exp.amount)}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 transition"
                      title="Delete expense"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {expenses.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No shop expenses recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SALES RETURNS TAB */}
      {activeTab === 'returns' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex justify-between items-center">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase">
                Total Refunded Value
              </span>
              <div className="text-xl font-bold text-amber-700 font-mono-numbers mt-0.5">
                {formatCurrency(totalRefunds)}
              </div>
            </div>
            <div className="text-xs text-slate-500 max-w-xs text-right">
              Stock automatically restored to shelves for inspected intact goods.
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-900">
              Sales Returns Audit Trail
            </div>
            <div className="divide-y divide-slate-100">
              {returns.map((ret) => (
                <div key={ret.id} className="p-4 hover:bg-slate-50 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-900 font-mono-numbers">
                        Return for Bill #{ret.invoiceNumber}
                      </span>
                      <span className="text-slate-500 text-[11px] ml-2">
                        {ret.date} · Refunded via {ret.refundMethod}
                      </span>
                    </div>
                    <span className="font-bold text-sm text-amber-700 font-mono-numbers">
                      Refund: {formatCurrency(ret.totalRefund)}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 italic">Reason: "{ret.reason}"</p>

                  <div className="bg-slate-50 p-2 rounded-xl space-y-1">
                    {ret.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-[11px]">
                        <span>
                          {item.productName} ({item.quantity} {item.unit})
                        </span>
                        <span className="font-mono-numbers">
                          {item.restockStock ? '✓ Restocked into inventory' : '✗ Scrapped/Damaged'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {returns.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No sales returns recorded.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-3">Record Shop Expense</h3>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder="e.g. BESCOM Electricity or Shop Rent"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="RENT">Shop Rent</option>
                  <option value="ELECTRICITY">Electricity / BESCOM</option>
                  <option value="TRANSPORT">Transport / Auto Freight</option>
                  <option value="SALARY">Staff Salary</option>
                  <option value="PACKAGING">Carry Bags & Packaging</option>
                  <option value="CHAI_SNACKS">Tea, Water & Refreshments</option>
                  <option value="MAINTENANCE">Shop Maintenance & Cleaning</option>
                  <option value="OTHER">Other Operating Expense</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers text-base font-bold text-red-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setExpensePaymentMethod(m)}
                      className={`py-2 rounded-xl font-bold ${
                        expensePaymentMethod === m
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Notes / Voucher</label>
                <input
                  type="text"
                  value={expenseNotes}
                  onChange={(e) => setExpenseNotes(e.target.value)}
                  placeholder="Optional notes"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Process Return Modal */}
      {isReturnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl my-auto">
            <h3 className="font-bold text-base text-slate-900 mb-1">Process Sales Return</h3>
            <p className="text-xs text-slate-500 mb-4">
              Search original bill number to return items and restore inventory
            </p>

            {!foundInvoice ? (
              <form onSubmit={handleFindInvoice} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Invoice Number (e.g. SKP-1000) *
                  </label>
                  <input
                    type="text"
                    required
                    value={returnInvoiceNumber}
                    onChange={(e) => setReturnInvoiceNumber(e.target.value)}
                    placeholder="Enter Invoice #"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers text-sm font-bold"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReturnModalOpen(false)}
                    className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold"
                  >
                    Find Bill
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="font-bold text-slate-900">
                    Bill #{foundInvoice.invoiceNumber}
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Date: {foundInvoice.date} · Customer: {foundInvoice.customerName || 'Walk-in'}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Select Items to Return & Restock:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {foundInvoice.items.map((item, idx) => {
                      const state = returnItemsState[idx];
                      if (!state) return null;
                      return (
                        <div
                          key={item.productId}
                          className="p-2 border border-slate-200 rounded-xl space-y-1 bg-white"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={state.selected}
                              onChange={(e) =>
                                setReturnItemsState((prev) =>
                                  prev.map((s, i) =>
                                    i === idx ? { ...s, selected: e.target.checked } : s
                                  )
                                )
                              }
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span className="font-semibold text-slate-900 truncate">
                              {item.productName}
                            </span>
                          </div>

                          {state.selected && (
                            <div className="flex items-center justify-between pl-6 text-[11px]">
                              <div className="flex items-center gap-1">
                                <span>Qty:</span>
                                <input
                                  type="number"
                                  min="0.1"
                                  max={item.quantity}
                                  step="0.001"
                                  value={state.returnQty}
                                  onChange={(e) =>
                                    setReturnItemsState((prev) =>
                                      prev.map((s, i) =>
                                        i === idx
                                          ? { ...s, returnQty: parseFloat(e.target.value) || 0 }
                                          : s
                                      )
                                    )
                                  }
                                  className="w-16 px-1 py-0.5 border border-slate-300 rounded font-mono-numbers text-center"
                                />
                                <span>of {item.quantity}</span>
                              </div>

                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={state.restock}
                                  onChange={(e) =>
                                    setReturnItemsState((prev) =>
                                      prev.map((s, i) =>
                                        i === idx ? { ...s, restock: e.target.checked } : s
                                      )
                                    )
                                  }
                                  className="w-3.5 h-3.5 text-blue-600 rounded"
                                />
                                <span>Add to Stock</span>
                              </label>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reason</label>
                  <input
                    type="text"
                    required
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Refund Method</label>
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="CASH">Cash Refund</option>
                    <option value="UPI">UPI Refund</option>
                    <option value="CREDIT">Adjust to Customer Credit (Khata)</option>
                  </select>
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setFoundInvoice(null)}
                    className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold"
                  >
                    Confirm Return
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
