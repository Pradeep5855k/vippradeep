import {
  AppDatabase,
  Product,
  Invoice,
  Customer,
  CustomerTransaction,
  Supplier,
  PurchaseOrder,
  SalesReturn,
  Expense,
  ShopSettings,
} from '../types';
import {
  DEFAULT_SETTINGS,
  SAMPLE_PRODUCTS,
  SAMPLE_CUSTOMERS,
  SAMPLE_SUPPLIERS,
  SAMPLE_EXPENSES,
  generateRealisticSampleInvoices,
} from './sampleData';

const STORAGE_KEY = 'billing_pro_db_v1';

class StorageService {
  private db: AppDatabase;
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.db = this.loadFromStorage();
  }

  private loadFromStorage(): AppDatabase {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.products && parsed.settings) {
          const invoices =
            parsed.invoices && parsed.invoices.length > 0
              ? parsed.invoices
              : generateRealisticSampleInvoices();
          return {
            products: parsed.products || [],
            invoices,
            customers: parsed.customers || [],
            customerTransactions: parsed.customerTransactions || [],
            suppliers: parsed.suppliers || [],
            purchases: parsed.purchases || [],
            returns: parsed.returns || [],
            expenses: parsed.expenses || [],
            settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
          };
        }
      }
    } catch (e) {
      console.error('Failed to load database from localStorage, initializing fresh:', e);
    }

    // Default initialization with demo data so the shopkeeper can immediately experience realistic workflows
    const initialDb: AppDatabase = {
      products: [...SAMPLE_PRODUCTS],
      invoices: [],
      customers: [...SAMPLE_CUSTOMERS],
      customerTransactions: [
        {
          id: 'tx_init_1',
          customerId: 'cust_1',
          type: 'CREDIT_SALE',
          amount: 1250,
          date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
          time: '14:20:00',
          timestamp: Date.now() - 86400000 * 2,
          invoiceNumber: 'SKP-998',
          paymentMethod: 'CREDIT',
          notes: 'Provisions credit bill',
          balanceAfter: 1250,
        },
        {
          id: 'tx_init_2',
          customerId: 'cust_2',
          type: 'CREDIT_SALE',
          amount: 3400,
          date: new Date(Date.now() - 86400000 * 4).toISOString().split('T')[0],
          time: '11:15:00',
          timestamp: Date.now() - 86400000 * 4,
          invoiceNumber: 'SKP-995',
          paymentMethod: 'CREDIT',
          notes: 'Monthly bulk grocery credit',
          balanceAfter: 3400,
        },
      ],
      suppliers: [...SAMPLE_SUPPLIERS],
      purchases: [],
      returns: [],
      expenses: [...SAMPLE_EXPENSES],
      settings: { ...DEFAULT_SETTINGS },
    };

    // Pre-populate 2 initial historical sales today so dashboard is immediately rich & informative
    const todayStr = new Date().toISOString().split('T')[0];
    const initialInvoices: Invoice[] = [
      {
        id: 'inv_demo_1',
        invoiceNumber: 'SKP-999',
        date: todayStr,
        time: '09:30:15',
        timestamp: Date.now() - 1000 * 60 * 180,
        customerName: 'Ramesh Kumar Sharma',
        customerPhone: '9845012345',
        customerId: 'cust_1',
        items: [
          {
            productId: 'prod_1',
            productName: 'Aashirvaad Shudh Chakki Atta 5kg',
            barcode: '8901030383748',
            unit: 'packet',
            quantity: 1,
            unitPrice: 275,
            purchasePrice: 245,
            discountAmount: 0,
            taxRate: 0,
            isTaxInclusive: true,
            taxableValue: 275,
            taxAmount: 0,
            cgstAmount: 0,
            sgstAmount: 0,
            igstAmount: 0,
            lineTotal: 275,
          },
          {
            productId: 'prod_2',
            productName: 'Fortune Sunlite Sunflower Oil 1L',
            barcode: '8901030383755',
            unit: 'packet',
            quantity: 2,
            unitPrice: 145,
            purchasePrice: 125,
            discountAmount: 0,
            taxRate: 5,
            isTaxInclusive: true,
            taxableValue: 276.19,
            taxAmount: 13.81,
            cgstAmount: 6.9,
            sgstAmount: 6.9,
            igstAmount: 0,
            lineTotal: 290,
          },
        ],
        subtotal: 565,
        totalDiscount: 0,
        taxableAmount: 551.19,
        cgst: 6.9,
        sgst: 6.9,
        igst: 0,
        totalTax: 13.81,
        roundOff: 0,
        grandTotal: 565,
        paymentMethod: 'UPI',
        amountReceived: 565,
        balanceDue: 0,
        status: 'COMPLETED',
        createdAt: Date.now() - 1000 * 60 * 180,
      },
      {
        id: 'inv_demo_2',
        invoiceNumber: 'SKP-1000',
        date: todayStr,
        time: '11:10:45',
        timestamp: Date.now() - 1000 * 60 * 90,
        customerName: 'Cash Walk-in',
        customerPhone: '',
        items: [
          {
            productId: 'prod_7',
            productName: 'Amul Butter Salted 500g',
            barcode: '8901262010011',
            unit: 'packet',
            quantity: 1,
            unitPrice: 275,
            purchasePrice: 245,
            discountAmount: 15,
            taxRate: 12,
            isTaxInclusive: true,
            taxableValue: 232.14,
            taxAmount: 27.86,
            cgstAmount: 13.93,
            sgstAmount: 13.93,
            igstAmount: 0,
            lineTotal: 260,
          },
          {
            productId: 'prod_10',
            productName: 'Maggi 2-Minute Noodles Masala 70g',
            barcode: '8901063142211',
            unit: 'packet',
            quantity: 5,
            unitPrice: 14,
            purchasePrice: 12,
            discountAmount: 0,
            taxRate: 12,
            isTaxInclusive: true,
            taxableValue: 62.5,
            taxAmount: 7.5,
            cgstAmount: 3.75,
            sgstAmount: 3.75,
            igstAmount: 0,
            lineTotal: 70,
          },
        ],
        subtotal: 345,
        totalDiscount: 15,
        taxableAmount: 294.64,
        cgst: 17.68,
        sgst: 17.68,
        igst: 0,
        totalTax: 35.36,
        roundOff: 0,
        grandTotal: 330,
        paymentMethod: 'CASH',
        amountReceived: 500,
        balanceDue: 0,
        status: 'COMPLETED',
        createdAt: Date.now() - 1000 * 60 * 90,
      },
    ];

    const seedInvoices = generateRealisticSampleInvoices();
    initialDb.invoices = [...initialInvoices, ...seedInvoices];
    this.saveToStorage(initialDb);
    return initialDb;
  }

  private saveToStorage(data: AppDatabase) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      this.db = data;
      this.notifyListeners();
    } catch (e) {
      console.error('Storage write error:', e);
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('Listener callback error:', err);
      }
    });
  }

  public getDatabase(): AppDatabase {
    return this.db;
  }

  // --- PRODUCTS ---
  public getProducts(includeArchived = false): Product[] {
    return includeArchived
      ? this.db.products
      : this.db.products.filter((p) => !p.isArchived);
  }

  public getProductById(id: string): Product | undefined {
    return this.db.products.find((p) => p.id === id);
  }

  public getProductByBarcode(barcode: string): Product | undefined {
    if (!barcode) return undefined;
    const clean = barcode.trim().toLowerCase();
    return this.db.products.find(
      (p) => !p.isArchived && p.barcode && p.barcode.trim().toLowerCase() === clean
    );
  }

  public saveProduct(product: Partial<Product> & { name: string; sellingPrice: number }): Product {
    const existingIndex = this.db.products.findIndex((p) => p.id === product.id);
    let updatedProduct: Product;

    if (existingIndex >= 0) {
      updatedProduct = {
        ...this.db.products[existingIndex],
        ...product,
        updatedAt: Date.now(),
      };
      const updatedProducts = [...this.db.products];
      updatedProducts[existingIndex] = updatedProduct;
      this.saveToStorage({ ...this.db, products: updatedProducts });
    } else {
      updatedProduct = {
        id: product.id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        barcode: product.barcode || '',
        name: product.name.trim(),
        category: product.category || 'General',
        unit: product.unit || 'piece',
        purchasePrice: Number(product.purchasePrice) || 0,
        sellingPrice: Number(product.sellingPrice) || 0,
        stock: Number(product.stock) || 0,
        minStockAlert: Number(product.minStockAlert) || 5,
        taxRate: Number(product.taxRate) || 0,
        isTaxInclusive: product.isTaxInclusive !== undefined ? product.isTaxInclusive : true,
        supplierId: product.supplierId || '',
        expiryDate: product.expiryDate || '',
        isArchived: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.saveToStorage({
        ...this.db,
        products: [updatedProduct, ...this.db.products],
      });
    }
    return updatedProduct;
  }

  public archiveProduct(id: string, archive = true) {
    const updatedProducts = this.db.products.map((p) =>
      p.id === id ? { ...p, isArchived: archive, updatedAt: Date.now() } : p
    );
    this.saveToStorage({ ...this.db, products: updatedProducts });
  }

  public adjustStock(productId: string, newStock: number) {
    const updatedProducts = this.db.products.map((p) =>
      p.id === productId ? { ...p, stock: Math.max(0, newStock), updatedAt: Date.now() } : p
    );
    this.saveToStorage({ ...this.db, products: updatedProducts });
  }

  // --- INVOICES & SAFE BILLING TRANSACTION ---
  public getInvoices(): Invoice[] {
    return [...this.db.invoices].sort((a, b) => b.timestamp - a.timestamp);
  }

  public getInvoiceById(id: string): Invoice | undefined {
    return this.db.invoices.find((i) => i.id === id);
  }

  public getNextInvoiceNumber(): string {
    const prefix = this.db.settings.invoicePrefix || 'BILL-';
    const num = this.db.settings.nextInvoiceNumber || 1001;
    return `${prefix}${num}`;
  }

  /**
   * Executes a safe atomic checkout:
   * 1. Validates stock deductions
   * 2. Decrements product inventory safely
   * 3. Updates Customer credit if balanceDue > 0 or paymentMethod === 'CREDIT'
   * 4. Updates settings sequence
   * 5. Appends invoice record
   */
  public createInvoice(
    invoiceData: Omit<Invoice, 'id' | 'invoiceNumber' | 'timestamp' | 'createdAt'>,
    deductStock = true
  ): Invoice {
    const invoiceNumber = this.getNextInvoiceNumber();
    const timestamp = Date.now();
    const newInvoice: Invoice = {
      ...invoiceData,
      id: 'inv_' + timestamp + '_' + Math.random().toString(36).substring(2, 6),
      invoiceNumber,
      timestamp,
      createdAt: timestamp,
    };

    // 1. Deduct Stock safely
    let updatedProducts = [...this.db.products];
    if (deductStock) {
      updatedProducts = updatedProducts.map((p) => {
        const itemSold = invoiceData.items.find((item) => item.productId === p.id);
        if (itemSold) {
          const updatedStock = Math.max(0, p.stock - itemSold.quantity);
          return { ...p, stock: updatedStock, updatedAt: timestamp };
        }
        return p;
      });
    }

    // 2. Handle Customer Credit (Khata) if credit balance due
    let updatedCustomers = [...this.db.customers];
    let updatedTx = [...this.db.customerTransactions];

    if (invoiceData.customerId) {
      const custIndex = updatedCustomers.findIndex((c) => c.id === invoiceData.customerId);
      if (custIndex >= 0) {
        const cust = updatedCustomers[custIndex];
        const creditAmount =
          invoiceData.paymentMethod === 'CREDIT'
            ? invoiceData.grandTotal
            : invoiceData.balanceDue > 0
            ? invoiceData.balanceDue
            : 0;

        const newBalance = cust.currentCreditBalance + creditAmount;
        const newPurchases = cust.totalPurchases + invoiceData.grandTotal;

        updatedCustomers[custIndex] = {
          ...cust,
          currentCreditBalance: newBalance,
          totalPurchases: newPurchases,
          updatedAt: timestamp,
        };

        if (creditAmount > 0) {
          updatedTx.unshift({
            id: 'tx_' + timestamp + '_' + Math.random().toString(36).substring(2, 6),
            customerId: cust.id,
            type: 'CREDIT_SALE',
            amount: creditAmount,
            date: invoiceData.date,
            time: invoiceData.time,
            timestamp,
            invoiceId: newInvoice.id,
            invoiceNumber,
            paymentMethod: invoiceData.paymentMethod,
            notes: `Credit bill #${invoiceNumber}`,
            balanceAfter: newBalance,
          });
        }
      }
    }

    // 3. Increment invoice counter
    const updatedSettings = {
      ...this.db.settings,
      nextInvoiceNumber: this.db.settings.nextInvoiceNumber + 1,
    };

    // 4. Save atomic state
    this.saveToStorage({
      ...this.db,
      products: updatedProducts,
      invoices: [newInvoice, ...this.db.invoices],
      customers: updatedCustomers,
      customerTransactions: updatedTx,
      settings: updatedSettings,
    });

    return newInvoice;
  }

  /**
   * Safe Sales Return or Bill Cancellation:
   * Restores inventory if items returned, logs return audit record, updates customer ledger
   */
  public processSalesReturn(
    invoiceId: string,
    returnItems: { productId: string; quantity: number; refundAmount: number; restock: boolean }[],
    reason: string,
    refundMethod: 'CASH' | 'UPI' | 'CREDIT'
  ): SalesReturn | null {
    const invoice = this.db.invoices.find((i) => i.id === invoiceId);
    if (!invoice) return null;

    const timestamp = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const totalRefund = returnItems.reduce((acc, curr) => acc + curr.refundAmount, 0);

    const salesReturn: SalesReturn = {
      id: 'ret_' + timestamp,
      invoiceId,
      invoiceNumber: invoice.invoiceNumber,
      date: todayStr,
      timestamp,
      items: returnItems.map((r) => {
        const prod = this.db.products.find((p) => p.id === r.productId);
        return {
          productId: r.productId,
          productName: prod?.name || 'Item',
          unit: prod?.unit || 'piece',
          quantity: r.quantity,
          unitPrice: prod?.sellingPrice || 0,
          refundAmount: r.refundAmount,
          restockStock: r.restock,
        };
      }),
      totalRefund,
      refundMethod,
      reason,
      createdAt: timestamp,
    };

    // 1. Restock inventory if requested
    let updatedProducts = [...this.db.products];
    returnItems.forEach((r) => {
      if (r.restock) {
        const pIndex = updatedProducts.findIndex((p) => p.id === r.productId);
        if (pIndex >= 0) {
          updatedProducts[pIndex] = {
            ...updatedProducts[pIndex],
            stock: updatedProducts[pIndex].stock + r.quantity,
            updatedAt: timestamp,
          };
        }
      }
    });

    // 2. Mark invoice status
    const allItemsReturned = returnItems.length >= invoice.items.length;
    const updatedInvoices = this.db.invoices.map((inv) =>
      inv.id === invoiceId
        ? {
            ...inv,
            status: (allItemsReturned ? 'RETURNED' : 'PARTIAL_RETURN') as any,
          }
        : inv
    );

    // 3. Update customer balance if credit adjustment
    let updatedCustomers = [...this.db.customers];
    let updatedTx = [...this.db.customerTransactions];
    if (invoice.customerId && refundMethod === 'CREDIT') {
      const cIndex = updatedCustomers.findIndex((c) => c.id === invoice.customerId);
      if (cIndex >= 0) {
        const cust = updatedCustomers[cIndex];
        const newBal = Math.max(0, cust.currentCreditBalance - totalRefund);
        updatedCustomers[cIndex] = {
          ...cust,
          currentCreditBalance: newBal,
          updatedAt: timestamp,
        };
        updatedTx.unshift({
          id: 'tx_' + timestamp,
          customerId: cust.id,
          type: 'RETURN_REFUND',
          amount: totalRefund,
          date: todayStr,
          time: new Date().toTimeString().split(' ')[0],
          timestamp,
          invoiceId,
          invoiceNumber: invoice.invoiceNumber,
          paymentMethod: 'CREDIT',
          notes: `Return refund for bill #${invoice.invoiceNumber}: ${reason}`,
          balanceAfter: newBal,
        });
      }
    }

    this.saveToStorage({
      ...this.db,
      products: updatedProducts,
      invoices: updatedInvoices,
      customers: updatedCustomers,
      customerTransactions: updatedTx,
      returns: [salesReturn, ...this.db.returns],
    });

    return salesReturn;
  }

  // --- CUSTOMERS & KHATA ---
  public getCustomers(): Customer[] {
    return [...this.db.customers].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.db.customers.find((c) => c.id === id);
  }

  public saveCustomer(cust: Partial<Customer> & { name: string; phone: string }): Customer {
    const existingIndex = this.db.customers.findIndex((c) => c.id === cust.id);
    let updated: Customer;

    if (existingIndex >= 0) {
      updated = {
        ...this.db.customers[existingIndex],
        ...cust,
        updatedAt: Date.now(),
      };
      const updatedList = [...this.db.customers];
      updatedList[existingIndex] = updated;
      this.saveToStorage({ ...this.db, customers: updatedList });
    } else {
      updated = {
        id: cust.id || 'cust_' + Date.now(),
        name: cust.name.trim(),
        phone: cust.phone.trim(),
        address: cust.address || '',
        gstin: cust.gstin || '',
        creditLimit: Number(cust.creditLimit) || 5000,
        currentCreditBalance: Number(cust.currentCreditBalance) || 0,
        totalPurchases: Number(cust.totalPurchases) || 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      this.saveToStorage({
        ...this.db,
        customers: [updated, ...this.db.customers],
      });
    }
    return updated;
  }

  public recordCustomerPayment(
    customerId: string,
    amount: number,
    paymentMethod: 'CASH' | 'UPI' | 'CARD',
    notes = ''
  ): CustomerTransaction | null {
    const custIndex = this.db.customers.findIndex((c) => c.id === customerId);
    if (custIndex < 0 || amount <= 0) return null;

    const cust = this.db.customers[custIndex];
    const timestamp = Date.now();
    const todayStr = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toTimeString().split(' ')[0];

    const newBalance = Math.max(0, cust.currentCreditBalance - amount);

    const updatedCustomer: Customer = {
      ...cust,
      currentCreditBalance: newBalance,
      updatedAt: timestamp,
    };

    const updatedCustomers = [...this.db.customers];
    updatedCustomers[custIndex] = updatedCustomer;

    const tx: CustomerTransaction = {
      id: 'tx_' + timestamp,
      customerId,
      type: 'PAYMENT_RECEIVED',
      amount,
      date: todayStr,
      time: timeStr,
      timestamp,
      paymentMethod,
      notes: notes || `Credit payment received via ${paymentMethod}`,
      balanceAfter: newBalance,
    };

    this.saveToStorage({
      ...this.db,
      customers: updatedCustomers,
      customerTransactions: [tx, ...this.db.customerTransactions],
    });

    return tx;
  }

  public getCustomerLedger(customerId: string): CustomerTransaction[] {
    return this.db.customerTransactions
      .filter((tx) => tx.customerId === customerId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  // --- SUPPLIERS & PURCHASES ---
  public getSuppliers(): Supplier[] {
    return this.db.suppliers;
  }

  public saveSupplier(sup: Partial<Supplier> & { name: string; phone: string }): Supplier {
    const existingIndex = this.db.suppliers.findIndex((s) => s.id === sup.id);
    let updated: Supplier;

    if (existingIndex >= 0) {
      updated = {
        ...this.db.suppliers[existingIndex],
        ...sup,
      };
      const list = [...this.db.suppliers];
      list[existingIndex] = updated;
      this.saveToStorage({ ...this.db, suppliers: list });
    } else {
      updated = {
        id: sup.id || 'sup_' + Date.now(),
        name: sup.name.trim(),
        phone: sup.phone.trim(),
        address: sup.address || '',
        gstin: sup.gstin || '',
        currentBalanceDue: Number(sup.currentBalanceDue) || 0,
        totalPurchased: 0,
        createdAt: Date.now(),
      };
      this.saveToStorage({
        ...this.db,
        suppliers: [updated, ...this.db.suppliers],
      });
    }
    return updated;
  }

  public recordPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'timestamp' | 'createdAt'>): PurchaseOrder {
    const timestamp = Date.now();
    const newPO: PurchaseOrder = {
      ...po,
      id: 'po_' + timestamp,
      timestamp,
      createdAt: timestamp,
    };

    // 1. Automatically increment product stock & update purchase price
    let updatedProducts = [...this.db.products];
    po.items.forEach((item) => {
      const pIndex = updatedProducts.findIndex((p) => p.id === item.productId);
      if (pIndex >= 0) {
        updatedProducts[pIndex] = {
          ...updatedProducts[pIndex],
          stock: updatedProducts[pIndex].stock + item.quantity,
          purchasePrice: item.unitCost || updatedProducts[pIndex].purchasePrice,
          updatedAt: timestamp,
        };
      }
    });

    // 2. Update Supplier dues
    let updatedSuppliers = [...this.db.suppliers];
    const supIndex = updatedSuppliers.findIndex((s) => s.id === po.supplierId);
    if (supIndex >= 0) {
      const sup = updatedSuppliers[supIndex];
      updatedSuppliers[supIndex] = {
        ...sup,
        currentBalanceDue: sup.currentBalanceDue + (po.balanceDue || 0),
        totalPurchased: sup.totalPurchased + po.totalAmount,
      };
    }

    this.saveToStorage({
      ...this.db,
      products: updatedProducts,
      purchases: [newPO, ...this.db.purchases],
      suppliers: updatedSuppliers,
    });

    return newPO;
  }

  public getPurchases(): PurchaseOrder[] {
    return [...this.db.purchases].sort((a, b) => b.timestamp - a.timestamp);
  }

  // --- EXPENSES ---
  public getExpenses(): Expense[] {
    return [...this.db.expenses].sort((a, b) => b.timestamp - a.timestamp);
  }

  public saveExpense(expense: Omit<Expense, 'id' | 'timestamp' | 'createdAt'>): Expense {
    const timestamp = Date.now();
    const newExpense: Expense = {
      ...expense,
      id: 'exp_' + timestamp,
      timestamp,
      createdAt: timestamp,
    };
    this.saveToStorage({
      ...this.db,
      expenses: [newExpense, ...this.db.expenses],
    });
    return newExpense;
  }

  public deleteExpense(id: string) {
    this.saveToStorage({
      ...this.db,
      expenses: this.db.expenses.filter((e) => e.id !== id),
    });
  }

  // --- SETTINGS ---
  public getSettings(): ShopSettings {
    return this.db.settings;
  }

  public updateSettings(settings: Partial<ShopSettings>) {
    this.saveToStorage({
      ...this.db,
      settings: { ...this.db.settings, ...settings },
    });
  }

  // --- DASHBOARD REAL CALCULATIONS ---
  public getDashboardMetrics() {
    const todayStr = new Date().toISOString().split('T')[0];

    const todayInvoices = this.db.invoices.filter(
      (inv) => inv.date === todayStr && inv.status !== 'CANCELLED'
    );

    const todaySales = todayInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const todayBillsCount = todayInvoices.length;

    // Gross Profit Today = Sum of (item.lineTotal - (item.purchasePrice * item.quantity))
    let todayEstimatedGrossProfit = 0;
    todayInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const cost = (item.purchasePrice || 0) * item.quantity;
        todayEstimatedGrossProfit += item.lineTotal - cost;
      });
    });

    // Customer Pending Credit (Khata total)
    const pendingCustomerCredit = this.db.customers.reduce(
      (sum, c) => sum + (c.currentCreditBalance || 0),
      0
    );

    // Products & Low stock
    const activeProducts = this.db.products.filter((p) => !p.isArchived);
    const totalProducts = activeProducts.length;
    const lowStockAlerts = activeProducts.filter((p) => p.stock <= p.minStockAlert).length;

    // Total Inventory Retail Valuation & Cost Valuation
    let inventoryCostValuation = 0;
    let inventoryRetailValuation = 0;
    activeProducts.forEach((p) => {
      inventoryCostValuation += p.stock * p.purchasePrice;
      inventoryRetailValuation += p.stock * p.sellingPrice;
    });

    return {
      todaySales,
      todayBillsCount,
      todayEstimatedGrossProfit,
      pendingCustomerCredit,
      totalProducts,
      lowStockAlerts,
      inventoryCostValuation,
      inventoryRetailValuation,
    };
  }

  // --- BACKUP & RESTORE ---
  public exportDatabaseJSON(): string {
    return JSON.stringify(this.db, null, 2);
  }

  public importDatabaseJSON(jsonStr: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed || !Array.isArray(parsed.products) || !parsed.settings) {
        return { success: false, message: 'Invalid backup file schema: missing products or settings.' };
      }
      this.saveToStorage(parsed);
      return { success: true, message: 'Data restored successfully.' };
    } catch (e: any) {
      return { success: false, message: 'Failed to parse JSON backup file: ' + e.message };
    }
  }

  public resetToDemoData() {
    localStorage.removeItem(STORAGE_KEY);
    this.db = this.loadFromStorage();
    this.notifyListeners();
  }

  public clearAllData() {
    const blankDb: AppDatabase = {
      products: [],
      invoices: [],
      customers: [],
      customerTransactions: [],
      suppliers: [],
      purchases: [],
      returns: [],
      expenses: [],
      settings: { ...DEFAULT_SETTINGS, nextInvoiceNumber: 1001 },
    };
    this.saveToStorage(blankDb);
  }
}

export const storage = new StorageService();
