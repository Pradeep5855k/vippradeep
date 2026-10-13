/**
 * Billing Pro - Data Models & Types
 * Designed for Indian Retail & Grocery Stores
 */

export type ProductUnit = 'piece' | 'packet' | 'kg' | 'g' | 'litre' | 'ml' | 'box' | 'dozen';

export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT';

export type BillStatus = 'COMPLETED' | 'CANCELLED' | 'RETURNED' | 'PARTIAL_RETURN';

export type ExpenseCategory = 'RENT' | 'ELECTRICITY' | 'SALARY' | 'TRANSPORT' | 'PACKAGING' | 'MAINTENANCE' | 'CHAI_SNACKS' | 'OTHER';

export interface Product {
  id: string;
  barcode: string;
  name: string;
  category: string;
  unit: ProductUnit;
  purchasePrice: number;
  sellingPrice: number;
  stock: number;
  minStockAlert: number;
  taxRate: number; // e.g. 0, 5, 12, 18, 28
  isTaxInclusive: boolean;
  supplierId?: string;
  expiryDate?: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  barcode: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number; // selling price entered/configured
  purchasePrice: number; // for profit tracking
  discountAmount: number; // rupee discount on this item
  taxRate: number;
  isTaxInclusive: boolean;
  taxableValue: number;
  taxAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  lineTotal: number;
}

export interface SplitPaymentDetail {
  cash: number;
  upi: number;
  card: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  timestamp: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  totalDiscount: number;
  taxableAmount: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  roundOff: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountReceived: number;
  balanceDue: number; // Credit amount if any
  splitDetails?: SplitPaymentDetail;
  status: BillStatus;
  notes?: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  creditLimit?: number;
  currentCreditBalance: number;
  totalPurchases: number;
  createdAt: number;
  updatedAt: number;
}

export interface CustomerTransaction {
  id: string;
  customerId: string;
  type: 'CREDIT_SALE' | 'PAYMENT_RECEIVED' | 'RETURN_REFUND';
  amount: number;
  date: string;
  time: string;
  timestamp: number;
  invoiceId?: string;
  invoiceNumber?: string;
  paymentMethod?: PaymentMethod;
  notes?: string;
  balanceAfter: number;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address?: string;
  gstin?: string;
  currentBalanceDue: number;
  totalPurchased: number;
  createdAt: number;
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  unitCost: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  date: string;
  timestamp: number;
  items: PurchaseItem[];
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export interface ReturnItem {
  productId: string;
  productName: string;
  unit: ProductUnit;
  quantity: number;
  unitPrice: number;
  refundAmount: number;
  restockStock: boolean;
}

export interface SalesReturn {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  timestamp: number;
  items: ReturnItem[];
  totalRefund: number;
  refundMethod: PaymentMethod;
  reason: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  timestamp: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  createdAt: number;
}

export interface ShopSettings {
  shopName: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  gstin: string;
  fssaiNumber: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  currencySymbol: string;
  thermalWidth: '58mm' | '80mm';
  printTaxBreakdown: boolean;
  returnPolicyText: string;
  footerNote: string;
  upiId: string; // for dynamic receipt QR code
  enablePinLock: boolean;
  appPin: string;
}

export interface AppDatabase {
  products: Product[];
  invoices: Invoice[];
  customers: Customer[];
  customerTransactions: CustomerTransaction[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  returns: SalesReturn[];
  expenses: Expense[];
  settings: ShopSettings;
}
