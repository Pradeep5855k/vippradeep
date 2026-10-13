import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  User,
  CreditCard,
  IndianRupee,
  QrCode,
  Check,
  AlertCircle,
  Receipt,
  RotateCcw,
  Tag,
  Percent,
  CheckCircle,
  Zap,
  History,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Product, Customer, PaymentMethod, InvoiceItem, Invoice } from '../types';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';

interface CartItem extends InvoiceItem {
  availableStock: number;
}

interface RecentScanItem {
  product: Product;
  scannedAt: number;
}

interface BillingViewProps {
  onBillCompleted: (invoice: Invoice) => void;
}

export const BillingView: React.FC<BillingViewProps> = ({ onBillCompleted }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [settings, setSettings] = useState(storage.getSettings());

  // Search & Search-As-You-Type Dropdown
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showScanner, setShowScanner] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);
  const [scanToast, setScanToast] = useState<{ message: string; sub?: string } | null>(null);

  // Recent Scans list
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);

  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Customer state
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [amountReceived, setAmountReceived] = useState<number | ''>('');
  const [splitCash, setSplitCash] = useState<number>(0);
  const [splitUpi, setSplitUpi] = useState<number>(0);
  const [splitCard, setSplitCard] = useState<number>(0);
  const [billDiscountPercent, setBillDiscountPercent] = useState<number>(0);
  const [billNotes, setBillNotes] = useState('');

  // Guard against duplicate rapid clicks
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Audio scan beep feedback
  const playScanBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {
      // Audio autoplay policy fallback
    }
  };

  // Close search-as-you-type dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(e.target as Node)
      ) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load state & subscribe
  useEffect(() => {
    const refreshData = () => {
      setProducts(storage.getProducts());
      setCustomers(storage.getCustomers());
      setSettings(storage.getSettings());
    };
    refreshData();
    const unsub = storage.subscribe(refreshData);
    return unsub;
  }, []);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['All', ...Array.from(set)];
  }, [products]);

  // Search-as-you-type suggestions with multi-token partial matches & exact barcode matches
  const searchSuggestions = useMemo(() => {
    const raw = searchQuery.trim().toLowerCase();
    if (!raw) return [];

    // 1. Check for exact barcode match first
    const exactBarcodeItem = products.find(
      (p) => p.barcode && p.barcode.trim().toLowerCase() === raw
    );
    if (exactBarcodeItem) {
      return [exactBarcodeItem];
    }

    // 2. Partial multi-token matching for names, categories and barcodes
    const tokens = raw.split(/\s+/).filter(Boolean);
    return products
      .filter((p) => {
        const name = p.name.toLowerCase();
        const cat = p.category.toLowerCase();
        const barcode = (p.barcode || '').toLowerCase();
        // Every search token must match in either name, category or barcode
        return tokens.every(
          (t) => name.includes(t) || cat.includes(t) || barcode.includes(t)
        );
      })
      .slice(0, 8); // Top 8 fast results
  }, [products, searchQuery]);

  // Filtered Products for the bottom catalog grid
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      const matchCat = selectedCategory === 'All' || p.category === selectedCategory;
      if (!q) return matchCat;
      const tokens = q.split(/\s+/).filter(Boolean);
      const name = p.name.toLowerCase();
      const cat = p.category.toLowerCase();
      const barcode = (p.barcode || '').toLowerCase();
      const matchQuery = tokens.every(
        (t) => name.includes(t) || cat.includes(t) || barcode.includes(t)
      );
      return matchCat && matchQuery;
    });
  }, [products, searchQuery, selectedCategory]);

  // Selected Customer details
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Add product to Cart with feedback
  const addToCart = (product: Product, qtyToAdd = 1) => {
    if (product.stock <= 0) {
      setScanToast({
        message: `${product.name} is currently out of stock!`,
        sub: 'Stock count is 0',
      });
      setTimeout(() => setScanToast(null), 3000);
      return;
    }

    playScanBeep();
    setScanToast({
      message: `Added: ${product.name}`,
      sub: `${formatCurrency(product.sellingPrice)} · Unit: ${product.unit}`,
    });
    setTimeout(() => setScanToast(null), 2500);

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.productId === product.id);
      if (existingIndex >= 0) {
        const item = prev[existingIndex];
        const newQty = Number((item.quantity + qtyToAdd).toFixed(3));
        const updated = calculateCartItem(product, newQty, item.discountAmount);
        const nextCart = [...prev];
        nextCart[existingIndex] = updated;
        return nextCart;
      } else {
        const newItem = calculateCartItem(product, qtyToAdd, 0);
        return [newItem, ...prev];
      }
    });

    // Track in Recent Scans tray (most recent first, up to 10 unique items)
    setRecentScans((prev) => {
      const filtered = prev.filter((item) => item.product.id !== product.id);
      return [{ product, scannedAt: Date.now() }, ...filtered].slice(0, 10);
    });
  };

  // Live input handler: detects exact barcode scans as you type
  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    setShowSearchDropdown(true);
    setActiveSuggestionIndex(0);

    const clean = val.trim().toLowerCase();
    // If input matches an exact barcode of length >= 6 (typical barcode scanner input)
    if (clean.length >= 6) {
      const exactProduct = products.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === clean
      );
      if (exactProduct) {
        addToCart(exactProduct, 1);
        setSearchQuery('');
        setShowSearchDropdown(false);
      }
    }
  };

  // Keyboard navigation inside search-as-you-type
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) =>
        prev < searchSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveSuggestionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const clean = searchQuery.trim().toLowerCase();

      // 1. Exact barcode match check on Enter
      const exactProduct = products.find(
        (p) => p.barcode && p.barcode.trim().toLowerCase() === clean
      );
      if (exactProduct) {
        addToCart(exactProduct, 1);
        setSearchQuery('');
        setShowSearchDropdown(false);
        return;
      }

      // 2. Add currently highlighted partial match suggestion
      if (searchSuggestions.length > 0) {
        const target = searchSuggestions[activeSuggestionIndex] || searchSuggestions[0];
        if (target) {
          addToCart(target, 1);
          setSearchQuery('');
          setShowSearchDropdown(false);
        }
      }
    } else if (e.key === 'Escape') {
      setShowSearchDropdown(false);
    }
  };

  // Helper to accurately calculate taxes and line total
  const calculateCartItem = (
    product: Product,
    quantity: number,
    discountAmount: number
  ): CartItem => {
    const rate = product.sellingPrice;
    const grossAmount = rate * quantity;
    const discountedTotal = Math.max(0, grossAmount - discountAmount);

    let taxableValue = discountedTotal;
    let taxAmount = 0;
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (product.taxRate > 0) {
      if (product.isTaxInclusive) {
        // Price includes GST
        taxableValue = Number((discountedTotal / (1 + product.taxRate / 100)).toFixed(2));
        taxAmount = Number((discountedTotal - taxableValue).toFixed(2));
      } else {
        // Price is exclusive of GST
        taxAmount = Number(((discountedTotal * product.taxRate) / 100).toFixed(2));
        taxableValue = discountedTotal;
      }
      // Intrastate GST split by default for retail shops (CGST 50% + SGST 50%)
      cgstAmount = Number((taxAmount / 2).toFixed(2));
      sgstAmount = Number((taxAmount / 2).toFixed(2));
    }

    const lineTotal = product.isTaxInclusive
      ? discountedTotal
      : Number((taxableValue + taxAmount).toFixed(2));

    return {
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      unit: product.unit,
      quantity,
      unitPrice: rate,
      purchasePrice: product.purchasePrice,
      discountAmount,
      taxRate: product.taxRate,
      isTaxInclusive: product.isTaxInclusive,
      taxableValue,
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      lineTotal,
      availableStock: product.stock,
    };
  };

  // Update item quantity (supports decimals e.g. 0.500 kg)
  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? calculateCartItem(prod, Number(newQty.toFixed(3)), item.discountAmount)
          : item
      )
    );
  };

  // Update item discount
  const updateItemDiscount = (productId: string, discount: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId
          ? calculateCartItem(prod, item.quantity, Math.max(0, discount))
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setBillDiscountPercent(0);
    setAmountReceived('');
    setBillNotes('');
    setSubmitError(null);
  };

  // Calculations for entire cart
  const totals = useMemo(() => {
    const rawSubtotal = cart.reduce((acc, item) => acc + item.unitPrice * item.quantity, 0);
    const itemDiscounts = cart.reduce((acc, item) => acc + item.discountAmount, 0);

    const afterItemDiscount = Math.max(0, rawSubtotal - itemDiscounts);
    const overallDiscount = (afterItemDiscount * billDiscountPercent) / 100;
    const totalDiscount = itemDiscounts + overallDiscount;

    const taxableAmount = cart.reduce((acc, item) => acc + item.taxableValue, 0);
    const totalTax = cart.reduce((acc, item) => acc + item.taxAmount, 0);
    const cgst = cart.reduce((acc, item) => acc + item.cgstAmount, 0);
    const sgst = cart.reduce((acc, item) => acc + item.sgstAmount, 0);

    const calculatedTotal = cart.reduce((acc, item) => acc + item.lineTotal, 0) - overallDiscount;
    const roundedGrandTotal = Math.round(calculatedTotal);
    const roundOff = Number((roundedGrandTotal - calculatedTotal).toFixed(2));

    return {
      subtotal: Number(rawSubtotal.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      taxableAmount: Number(taxableAmount.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      igst: 0,
      totalTax: Number(totalTax.toFixed(2)),
      roundOff,
      grandTotal: roundedGrandTotal,
    };
  }, [cart, billDiscountPercent]);

  // Handle Barcode Scanned
  const handleBarcodeScanned = (code: string) => {
    const matched = storage.getProductByBarcode(code);
    if (matched) {
      addToCart(matched, 1);
    } else {
      setSubmitError(`Product with barcode "${code}" not found.`);
      setTimeout(() => setSubmitError(null), 4000);
    }
  };

  // Handle Quick Add Customer
  const handleSaveQuickCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    const saved = storage.saveCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      currentCreditBalance: 0,
    });
    setSelectedCustomerId(saved.id);
    setShowAddCustomerModal(false);
    setNewCustName('');
    setNewCustPhone('');
  };

  // Finalize & Save Sale Transaction
  const handleCheckout = () => {
    if (cart.length === 0) {
      setSubmitError('Cart is empty. Please add items to checkout.');
      return;
    }
    if (isSubmitting) return; // Prevent duplicate multi-clicks!

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0];

      let custName = 'Cash Walk-in';
      let custPhone = '';

      if (selectedCustomer) {
        custName = selectedCustomer.name;
        custPhone = selectedCustomer.phone;
      } else if (walkinName.trim()) {
        custName = walkinName.trim();
        custPhone = walkinPhone.trim();
      }

      // Check credit payment requirement
      if (paymentMethod === 'CREDIT' && !selectedCustomer) {
        setSubmitError('Please select or add a Customer account to give credit (Khata).');
        setIsSubmitting(false);
        return;
      }

      // Compute tendered amount & balance due
      let received = 0;
      let balanceDue = 0;

      if (paymentMethod === 'CREDIT') {
        received = 0;
        balanceDue = totals.grandTotal;
      } else if (paymentMethod === 'SPLIT') {
        received = splitCash + splitUpi + splitCard;
        balanceDue = Math.max(0, totals.grandTotal - received);
      } else {
        const entered = amountReceived === '' ? totals.grandTotal : Number(amountReceived);
        received = entered;
        balanceDue = Math.max(0, totals.grandTotal - received);
      }

      const invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'timestamp' | 'createdAt'> = {
        date: dateStr,
        time: timeStr,
        customerId: selectedCustomer?.id,
        customerName: custName,
        customerPhone: custPhone,
        items: cart,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        taxableAmount: totals.taxableAmount,
        cgst: totals.cgst,
        sgst: totals.sgst,
        igst: totals.igst,
        totalTax: totals.totalTax,
        roundOff: totals.roundOff,
        grandTotal: totals.grandTotal,
        paymentMethod,
        amountReceived: received,
        balanceDue,
        splitDetails:
          paymentMethod === 'SPLIT'
            ? { cash: splitCash, upi: splitUpi, card: splitCard }
            : undefined,
        status: 'COMPLETED',
        notes: billNotes,
      };

      // Atomic write to storage with stock deduction & khata update
      const createdInvoice = storage.createInvoice(invoiceData, true);

      // Trigger celebratory feedback
      try {
        confetti({
          particleCount: 40,
          spread: 60,
          origin: { y: 0.8 },
        });
      } catch (e) {
        // confetti fallback
      }

      // Reset cart and pass created invoice to open thermal receipt modal
      clearCart();
      setIsSubmitting(false);
      onBillCompleted(createdInvoice);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setSubmitError('Transaction failed: ' + (err.message || 'Unknown error'));
      setIsSubmitting(false);
    }
  };

  // Helper to highlight matching characters/tokens in product search results
  const renderHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text;
    const tokens = query.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return text;
    try {
      const escaped = tokens
        .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');
      const regex = new RegExp(`(${escaped})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark
            key={i}
            className="bg-yellow-200 text-slate-900 font-bold px-0.5 rounded"
          >
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch (e) {
      return text;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pb-20 items-start">
      {/* LEFT COLUMN: Product Catalog & Fast Counter Barcode Search (7 cols) */}
      <div className="lg:col-span-7 space-y-3">
        {/* Instant Scan / Add Toast Alert */}
        {scanToast && (
          <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-2xl shadow-lg flex items-center justify-between text-xs sm:text-sm animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-200 shrink-0" />
              <div>
                <span className="font-bold">{scanToast.message}</span>
                {scanToast.sub && (
                  <span className="text-emerald-100 text-xs ml-2">
                    · {scanToast.sub}
                  </span>
                )}
              </div>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-emerald-700/80 rounded-md">
              In Cart
            </span>
          </div>
        )}

        {/* Search Bar & Barcode Scanner Trigger */}
        <div
          ref={searchContainerRef}
          className="relative bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchInputChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => {
                if (searchQuery.trim()) setShowSearchDropdown(true);
              }}
              placeholder="Search products by name or scan barcode (search-as-you-type)..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white transition"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setShowSearchDropdown(false);
                  searchInputRef.current?.focus();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 p-1"
                title="Clear"
              >
                ✕
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 active:scale-95 transition shrink-0"
            title="Scan Barcode via Camera"
          >
            <Barcode className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Camera Scan</span>
          </button>

          {/* SEARCH-AS-YOU-TYPE FLOATING DROPDOWN */}
          {showSearchDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
              {/* Header with keyboard shortcut hints */}
              <div className="px-3.5 py-2 bg-slate-50 flex items-center justify-between text-[11px] text-slate-500 font-medium">
                <span className="font-bold text-slate-700">
                  {searchSuggestions.length > 0
                    ? `Matching Products (${searchSuggestions.length})`
                    : 'Search Results'}
                </span>
                <span className="hidden sm:inline text-slate-400">
                  Use <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">↑</kbd>{' '}
                  <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">↓</kbd> to navigate,{' '}
                  <kbd className="px-1 py-0.5 bg-slate-200 rounded font-mono text-[10px]">Enter ↵</kbd> to add
                </span>
              </div>

              {/* Suggestions List */}
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                {searchSuggestions.map((item, idx) => {
                  const isSelected = idx === activeSuggestionIndex;
                  const inCartItem = cart.find((c) => c.productId === item.id);
                  const isLow = item.stock <= item.minStockAlert;
                  const isOut = item.stock <= 0;

                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (!isOut) {
                          addToCart(item, 1);
                          setSearchQuery('');
                          setShowSearchDropdown(false);
                          searchInputRef.current?.focus();
                        }
                      }}
                      className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50/90 border-l-4 border-blue-600'
                          : 'hover:bg-slate-50'
                      } ${isOut ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''}`}
                    >
                      {/* Left: Product Info & Highlighted Match */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
                            {renderHighlightedText(item.name, searchQuery)}
                          </span>
                          {inCartItem && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold shrink-0">
                              {inCartItem.quantity} in cart
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-slate-600 font-medium">
                            {renderHighlightedText(item.category, searchQuery)}
                          </span>
                          <span>·</span>
                          <span className="font-mono-numbers text-[10px]">
                            Barcode: {item.barcode ? renderHighlightedText(item.barcode, searchQuery) : '—'}
                          </span>
                          <span>·</span>
                          <span
                            className={
                              isOut
                                ? 'text-red-600 font-bold'
                                : isLow
                                ? 'text-amber-600 font-semibold'
                                : 'text-emerald-700'
                            }
                          >
                            {isOut
                              ? 'Out of Stock'
                              : `${item.stock} ${item.unit} available`}
                          </span>
                        </div>
                      </div>

                      {/* Right: Price & Quick Action */}
                      <div className="text-right shrink-0 flex items-center gap-3">
                        <div>
                          <div className="font-bold text-sm sm:text-base text-slate-900 font-mono-numbers">
                            {formatCurrency(item.sellingPrice)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            per {item.unit}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isOut}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isOut) {
                              addToCart(item, 1);
                              setSearchQuery('');
                              setShowSearchDropdown(false);
                              searchInputRef.current?.focus();
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

                {searchSuggestions.length === 0 && (
                  <div className="p-6 text-center text-slate-500 text-xs">
                    <p className="font-semibold text-slate-700">
                      No matching products found for "{searchQuery}"
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Check spelling or scan the product barcode directly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RECENT SCANS LIST TRAY */}
        {recentScans.length > 0 && (
          <div className="bg-white rounded-2xl p-3 border border-slate-200/90 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <History className="w-4 h-4 text-blue-600" />
                <span>Recent Scans ({recentScans.length})</span>
                <span className="text-[11px] font-normal text-slate-400">· Tap + to re-add</span>
              </div>
              <button
                type="button"
                onClick={() => setRecentScans([])}
                className="text-[11px] text-slate-400 hover:text-red-600 transition font-medium"
              >
                Clear History
              </button>
            </div>

            {/* Horizontal scrollable cards for rapid counter re-add & adjustments */}
            <div className="flex items-stretch gap-2 overflow-x-auto pb-1 scrollbar-none">
              {recentScans.map((scan) => {
                const product = scan.product;
                const inCartItem = cart.find((c) => c.productId === product.id);
                const isOutOfStock = product.stock <= 0;
                const step = product.unit === 'kg' ? 0.25 : 1;

                return (
                  <div
                    key={scan.product.id}
                    className={`flex-shrink-0 w-48 sm:w-52 p-2.5 rounded-xl border flex flex-col justify-between text-xs transition select-none ${
                      inCartItem
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-slate-500 font-mono-numbers truncate">
                          {product.barcode || product.category}
                        </span>
                        {inCartItem ? (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-md shrink-0">
                            {inCartItem.quantity} {product.unit}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Not in bill</span>
                        )}
                      </div>

                      <h5 className="font-semibold text-slate-900 line-clamp-1 text-xs" title={product.name}>
                        {product.name}
                      </h5>

                      <div className="text-xs font-bold text-slate-900 font-mono-numbers mt-0.5">
                        {formatCurrency(product.sellingPrice)}
                        <span className="text-[10px] text-slate-500 font-normal"> / {product.unit}</span>
                      </div>
                    </div>

                    {/* Quick Re-Add & Quantity Adjust Controls */}
                    <div className="mt-2 pt-1.5 border-t border-slate-200/80">
                      {inCartItem ? (
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => updateQuantity(product.id, inCartItem.quantity - step)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                            title="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold font-mono-numbers text-xs text-blue-800">
                            {inCartItem.quantity} in cart
                          </span>
                          <button
                            type="button"
                            disabled={isOutOfStock}
                            onClick={() => addToCart(product, step)}
                            className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center hover:bg-blue-700 active:scale-95 transition shadow-xs"
                            title="Add one more"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => addToCart(product, 1)}
                          className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:bg-slate-300 text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-xs"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Re-Add to Bill</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Pills Scroller */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition shrink-0 ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-xs font-semibold'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[550px] overflow-y-auto p-0.5">
          {filteredProducts.map((p) => {
            const inCart = cart.find((i) => i.productId === p.id);
            const isLow = p.stock <= p.minStockAlert;
            const isOutOfStock = p.stock <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p, 1)}
                className={`bg-white rounded-2xl p-3 border text-left flex flex-col justify-between transition cursor-pointer select-none relative ${
                  isOutOfStock
                    ? 'opacity-60 bg-slate-50 border-slate-200 cursor-not-allowed'
                    : inCart
                    ? 'border-blue-600 ring-2 ring-blue-100 shadow-xs'
                    : 'border-slate-200/90 hover:border-blue-400 hover:shadow-xs'
                }`}
              >
                {inCart && (
                  <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-xs">
                    {inCart.quantity}
                  </span>
                )}

                <div>
                  <div className="text-[10px] text-slate-500 font-medium truncate">
                    {p.category}
                  </div>
                  <h4 className="font-semibold text-xs sm:text-sm text-slate-900 line-clamp-2 mt-0.5 leading-snug">
                    {p.name}
                  </h4>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm text-slate-900 font-mono-numbers">
                      {formatCurrency(p.sellingPrice)}
                    </div>
                    <div className="text-[10px] text-slate-500">per {p.unit}</div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`text-[10px] font-semibold ${
                        isOutOfStock
                          ? 'text-red-600'
                          : isLow
                          ? 'text-amber-600'
                          : 'text-slate-500'
                      }`}
                    >
                      {p.stock} left
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredProducts.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-600">No matching products found</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Try searching for a different keyword or scan barcode.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart, Customer Khata & Fast Checkout (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-md p-4 space-y-4">
        {/* Invoice Header Info */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Next Invoice
            </span>
            <div className="text-base font-bold text-slate-900 font-mono-numbers">
              {storage.getNextInvoiceNumber()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition"
              >
                Clear Cart
              </button>
            )}
            <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg font-mono-numbers">
              {cart.length} Items
            </span>
          </div>
        </div>

        {/* Customer Khata Selector */}
        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600" />
              <span>Customer / Khata Account</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAddCustomerModal(true)}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800"
            >
              + New Customer
            </button>
          </div>

          <select
            value={selectedCustomerId}
            onChange={(e) => {
              setSelectedCustomerId(e.target.value);
              if (e.target.value) {
                setWalkinName('');
                setWalkinPhone('');
              }
            }}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-600 focus:outline-none"
          >
            <option value="">Walk-in Cash Customer (No Khata)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - +91 {c.phone} {c.currentCreditBalance > 0 ? `(Due: ₹${c.currentCreditBalance})` : ''}
              </option>
            ))}
          </select>

          {selectedCustomer ? (
            <div className="text-[11px] bg-blue-50/70 p-2 rounded-lg border border-blue-200 text-blue-900 flex justify-between items-center">
              <div>
                <span className="font-bold">{selectedCustomer.name}</span>
                <div className="text-slate-500">+91 {selectedCustomer.phone}</div>
              </div>
              <div className="text-right">
                <span className="text-slate-500">Current Due:</span>
                <div className="font-bold text-amber-700 font-mono-numbers">
                  {formatCurrency(selectedCustomer.currentCreditBalance)}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <input
                type="text"
                value={walkinName}
                onChange={(e) => setWalkinName(e.target.value)}
                placeholder="Optional Name"
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs"
              />
              <input
                type="text"
                value={walkinPhone}
                onChange={(e) => setWalkinPhone(e.target.value)}
                placeholder="Optional Phone"
                className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono-numbers"
              />
            </div>
          )}
        </div>

        {/* Cart Items List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {cart.map((item) => (
            <div
              key={item.productId}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col gap-2 text-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 truncate">
                    {item.productName}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono-numbers">
                    ₹{item.unitPrice.toFixed(2)} / {item.unit} · GST {item.taxRate}%
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition"
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quantity Controls & Line Total */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - (item.unit === 'kg' ? 0.25 : 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Decimal input e.g. 1.250 kg */}
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.productId, parseFloat(e.target.value) || 0)}
                    className="w-14 px-1 py-1 text-center bg-white border border-slate-300 rounded-lg font-mono-numbers font-bold text-xs"
                  />

                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + (item.unit === 'kg' ? 0.25 : 1))}
                    className="w-7 h-7 rounded-lg bg-white border border-slate-300 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[10px] text-slate-500 ml-0.5">{item.unit}</span>
                </div>

                <div className="text-right">
                  <span className="font-bold text-sm text-slate-900 font-mono-numbers">
                    ₹{item.lineTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          ))}

          {cart.length === 0 && (
            <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
              <Receipt className="w-8 h-8 mx-auto text-slate-300 mb-1" />
              <p className="text-xs font-semibold text-slate-600">Cart is empty</p>
              <p className="text-[10px] text-slate-400">Click any product to add it to this bill</p>
            </div>
          )}
        </div>

        {/* Discounts & Calculations Box */}
        {cart.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-slate-200 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono-numbers">₹{totals.subtotal.toFixed(2)}</span>
            </div>

            {/* Special Discount % input */}
            <div className="flex items-center justify-between text-slate-600">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-blue-600" />
                <span>Bill Discount %:</span>
              </span>
              <input
                type="number"
                min="0"
                max="100"
                value={billDiscountPercent || ''}
                onChange={(e) => setBillDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                placeholder="0%"
                className="w-16 px-1.5 py-0.5 text-right bg-slate-50 border border-slate-300 rounded text-xs font-mono-numbers font-semibold"
              />
            </div>

            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-red-600">
                <span>Discount applied:</span>
                <span className="font-mono-numbers">-₹{totals.totalDiscount.toFixed(2)}</span>
              </div>
            )}

            {totals.totalTax > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST Tax (CGST+SGST):</span>
                <span className="font-mono-numbers">₹{totals.totalTax.toFixed(2)}</span>
              </div>
            )}

            {totals.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Round off:</span>
                <span className="font-mono-numbers">
                  {totals.roundOff > 0 ? '+' : ''}₹{totals.roundOff.toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-300">
              <span>Grand Total:</span>
              <span className="text-lg text-blue-700 font-mono-numbers">
                {formatCurrency(totals.grandTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Payment Mode Selector */}
        {cart.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <span className="text-xs font-bold text-slate-700">Payment Method:</span>
            <div className="grid grid-cols-5 gap-1 text-[11px] font-bold">
              {(['CASH', 'UPI', 'CARD', 'SPLIT', 'CREDIT'] as PaymentMethod[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-2 rounded-xl transition ${
                    paymentMethod === mode
                      ? mode === 'CREDIT'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {mode === 'CREDIT' ? 'Khata' : mode}
                </button>
              ))}
            </div>

            {/* Split Details Input */}
            {paymentMethod === 'SPLIT' && (
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <label className="text-[10px] text-slate-500 block">Cash (₹)</label>
                  <input
                    type="number"
                    value={splitCash || ''}
                    onChange={(e) => setSplitCash(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">UPI (₹)</label>
                  <input
                    type="number"
                    value={splitUpi || ''}
                    onChange={(e) => setSplitUpi(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono-numbers"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 block">Card (₹)</label>
                  <input
                    type="number"
                    value={splitCard || ''}
                    onChange={(e) => setSplitCard(parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded font-mono-numbers"
                  />
                </div>
              </div>
            )}

            {/* Cash Tendered & Change return calculator */}
            {paymentMethod === 'CASH' && (
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-600 font-medium whitespace-nowrap">Amount Tendered:</span>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder={`₹${totals.grandTotal}`}
                  className="w-28 px-2 py-1 bg-white border border-slate-300 rounded font-mono-numbers font-bold text-slate-900"
                />
                {amountReceived !== '' && Number(amountReceived) > totals.grandTotal && (
                  <span className="text-emerald-700 font-bold text-xs ml-auto">
                    Return: ₹{(Number(amountReceived) - totals.grandTotal).toFixed(2)}
                  </span>
                )}
              </div>
            )}

            {paymentMethod === 'CREDIT' && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                <strong>Udhar / Khata Bill:</strong> Amount ₹{totals.grandTotal} will be added to{' '}
                {selectedCustomer?.name || 'Customer'}'s credit ledger balance.
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Primary Complete & Print Bill CTA Button */}
        <button
          type="button"
          disabled={cart.length === 0 || isSubmitting}
          onClick={handleCheckout}
          className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base shadow-lg transition flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <span>Processing Sale...</span>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>Charge {formatCurrency(totals.grandTotal)} & Print Bill</span>
            </>
          )}
        </button>
      </div>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScan={handleBarcodeScanned}
      />

      {/* Quick Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl">
            <h3 className="font-bold text-base text-slate-900 mb-3">Add Customer (Khata)</h3>
            <form onSubmit={handleSaveQuickCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-medium mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-medium mb-1">Mobile Phone *</label>
                <input
                  type="tel"
                  required
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="10-digit mobile number"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 bg-slate-100 rounded-xl text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
                >
                  Save & Select
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
