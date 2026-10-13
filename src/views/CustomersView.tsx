import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  IndianRupee,
  FileText,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  ChevronRight,
  X,
  CreditCard,
  CheckCircle,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Customer, CustomerTransaction, Invoice, PaymentMethod } from '../types';

interface CustomersViewProps {
  onOpenReceipt: (invoice: Invoice) => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ onOpenReceipt }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Add / Edit Customer Modal
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState<number | ''>(5000);

  // Record Payment Modal
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  useEffect(() => {
    const refresh = () => {
      const list = storage.getCustomers();
      setCustomers(list);
      if (list.length > 0 && !selectedCustomerId) {
        setSelectedCustomerId(list[0].id);
      }
    };
    refresh();
    return storage.subscribe(refresh);
  }, []);

  const activeCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;
  }, [customers, selectedCustomerId]);

  const customerLedger = useMemo(() => {
    if (!activeCustomer) return [];
    return storage.getCustomerLedger(activeCustomer.id);
  }, [activeCustomer]);

  const customerInvoices = useMemo(() => {
    if (!activeCustomer) return [];
    return storage.getInvoices().filter((inv) => inv.customerId === activeCustomer.id);
  }, [activeCustomer]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, searchQuery]);

  const totalOutstandingCredit = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentCreditBalance || 0), 0);
  }, [customers]);

  const openAddCustomer = () => {
    setEditingCustomer(null);
    setFormName('');
    setFormPhone('');
    setFormAddress('');
    setFormCreditLimit(5000);
    setIsCustomerModalOpen(true);
  };

  const openEditCustomer = (c: Customer) => {
    setEditingCustomer(c);
    setFormName(c.name);
    setFormPhone(c.phone);
    setFormAddress(c.address || '');
    setFormCreditLimit(c.creditLimit || 5000);
    setIsCustomerModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) return;

    const saved = storage.saveCustomer({
      id: editingCustomer?.id,
      name: formName.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      creditLimit: Number(formCreditLimit) || 5000,
      currentCreditBalance: editingCustomer?.currentCreditBalance || 0,
      totalPurchases: editingCustomer?.totalPurchases || 0,
    });

    setIsCustomerModalOpen(false);
    setSelectedCustomerId(saved.id);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer || !paymentAmount || paymentAmount <= 0) return;

    storage.recordCustomerPayment(
      activeCustomer.id,
      Number(paymentAmount),
      paymentMethod,
      paymentNotes
    );

    setIsPaymentModalOpen(false);
    setPaymentAmount('');
    setPaymentNotes('');
  };

  const handleWhatsAppReminder = (customer: Customer) => {
    const settings = storage.getSettings();
    const phone = customer.phone.replace(/[^0-9]/g, '');
    const text =
      `Namaste *${customer.name}* ji,\n\n` +
      `This is a cordial reminder from *${settings.shopName}*.\n` +
      `Your current pending credit balance is *${formatCurrency(customer.currentCreditBalance)}*.\n\n` +
      (settings.upiId ? `You can pay online via UPI to *${settings.upiId}*.\n\n` : '') +
      `Thank you for your valued patronage!\n` +
      `Phone: ${settings.phone}`;

    const url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Overview Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Customers & Khata (Udhar Book)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track customer credit accounts, repayments, ledgers and purchase histories
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              Total Market Credit
            </span>
            <div className="text-lg font-bold text-amber-700 font-mono-numbers">
              {formatCurrency(totalOutstandingCredit)}
            </div>
          </div>

          <button
            type="button"
            onClick={openAddCustomer}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Customer List (5 cols) | Right Ledger & Transactions (7 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Search bar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by customer name or phone..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>

          {/* Customers List */}
          <div className="divide-y divide-slate-100 max-h-[550px] overflow-y-auto">
            {filteredCustomers.map((c) => {
              const isSelected = activeCustomer?.id === c.id;
              const hasCredit = c.currentCreditBalance > 0;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCustomerId(c.id)}
                  className={`p-3.5 flex items-center justify-between cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/80 border-l-4 border-blue-600'
                      : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                      {c.name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono-numbers mt-0.5">
                      +91 {c.phone}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-bold text-xs sm:text-sm font-mono-numbers ${
                        hasCredit ? 'text-amber-700' : 'text-slate-600'
                      }`}
                    >
                      {formatCurrency(c.currentCreditBalance)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      {hasCredit ? 'Due Balance' : 'Zero Due'}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredCustomers.length === 0 && (
              <div className="p-8 text-center text-slate-400">
                <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-semibold text-slate-600">No customers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Details: Ledger, Credit settlement & Bills */}
        <div className="lg:col-span-7 space-y-4">
          {activeCustomer ? (
            <>
              {/* Customer Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      {activeCustomer.name}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono-numbers mt-0.5">
                      Phone: +91 {activeCustomer.phone}
                      {activeCustomer.address && ` · ${activeCustomer.address}`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleWhatsAppReminder(activeCustomer)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp Due</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openEditCustomer(activeCustomer)}
                      className="px-3 py-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
                    >
                      Edit
                    </button>
                  </div>
                </div>

                {/* Balance & Settle CTA */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4">
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block">
                      Outstanding Credit
                    </span>
                    <span className="text-lg font-bold text-amber-900 font-mono-numbers">
                      {formatCurrency(activeCustomer.currentCreditBalance)}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
                      Total Purchases
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-mono-numbers">
                      {formatCurrency(activeCustomer.totalPurchases)}
                    </span>
                  </div>

                  <div className="col-span-2 sm:col-span-1 flex items-center">
                    <button
                      type="button"
                      disabled={activeCustomer.currentCreditBalance <= 0}
                      onClick={() => {
                        setPaymentAmount(activeCustomer.currentCreditBalance);
                        setIsPaymentModalOpen(true);
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5"
                    >
                      <IndianRupee className="w-4 h-4" />
                      <span>Record Payment</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Customer Khata Ledger History */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span>Credit Ledger & Payment Statement</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono-numbers">
                    {customerLedger.length} Entries
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {customerLedger.map((tx) => {
                    const isCredit = tx.type === 'CREDIT_SALE';
                    return (
                      <div
                        key={tx.id}
                        className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/70"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                              isCredit
                                ? 'bg-red-50 text-red-600'
                                : 'bg-emerald-50 text-emerald-600'
                            }`}
                          >
                            {isCredit ? (
                              <ArrowUpRight className="w-4 h-4" />
                            ) : (
                              <ArrowDownLeft className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {isCredit
                                ? `Credit Bill #${tx.invoiceNumber || 'Sale'}`
                                : `Payment Received (${tx.paymentMethod || 'Cash'})`}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {tx.date} at {tx.time} {tx.notes ? `· ${tx.notes}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div
                            className={`font-bold font-mono-numbers ${
                              isCredit ? 'text-red-600' : 'text-emerald-700'
                            }`}
                          >
                            {isCredit ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono-numbers">
                            Bal: {formatCurrency(tx.balanceAfter)}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {customerLedger.length === 0 && (
                    <div className="p-8 text-center text-slate-400">
                      <Clock className="w-8 h-8 mx-auto text-slate-300 mb-1" />
                      <p className="text-xs font-semibold text-slate-600">
                        No credit transactions recorded
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Purchase Invoices by this customer */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Invoices for {activeCustomer.name}</span>
                  </h4>
                  <span className="text-xs text-slate-500 font-mono-numbers">
                    {customerInvoices.length} Bills
                  </span>
                </div>

                <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                  {customerInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-slate-50/70"
                    >
                      <div>
                        <span className="font-bold text-slate-900 font-mono-numbers">
                          #{inv.invoiceNumber}
                        </span>
                        <div className="text-[11px] text-slate-500">
                          {inv.date} · {inv.items.length} items · Paid via {inv.paymentMethod}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 font-mono-numbers">
                          {formatCurrency(inv.grandTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(inv)}
                          className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 rounded-lg text-[11px] font-semibold"
                        >
                          View Bill
                        </button>
                      </div>
                    </div>
                  ))}

                  {customerInvoices.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs">
                      No invoices found for this customer.
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-400 border border-slate-200">
              <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-600">Select or Add a Customer</p>
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white rounded-3xl p-5 sm:p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="font-bold text-base text-slate-900">
                {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
              </h3>
              <button
                onClick={() => setIsCustomerModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Mobile Phone Number *
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Address / Location
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Flat 201, Market Cross"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="5000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Credit Payment Modal */}
      {isPaymentModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 sm:p-6 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-1">
              Record Customer Credit Repayment
            </h3>
            <p className="text-xs text-slate-500 mb-4">{activeCustomer.name}</p>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount Received (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-base font-bold font-mono-numbers text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['CASH', 'UPI', 'CARD'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-2 rounded-xl font-bold text-xs transition ${
                        paymentMethod === m
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
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Reference
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. GPay UPI Ref 9845..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold"
                >
                  Save Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
