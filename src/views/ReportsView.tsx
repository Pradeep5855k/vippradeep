import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  PiggyBank,
  Users,
  Package,
  Layers,
  CreditCard,
  Percent,
  Brain,
  Truck,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Invoice } from '../types';
import { StockForecastPanel } from '../components/StockForecastPanel';
import { generateInventoryForecast } from '../services/forecastingService';

export const ReportsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'financials' | 'forecast'>('financials');
  const [db, setDb] = useState(() => storage.getDatabase());

  useEffect(() => {
    return storage.subscribe(() => {
      setDb(storage.getDatabase());
    });
  }, []);

  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState(
    new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  const invoices = db.invoices;
  const products = db.products;
  const expenses = db.expenses;
  const customers = db.customers;
  const suppliers = db.suppliers;
  const purchases = db.purchases;
  const returns = db.returns;

  const urgentStockoutCount = useMemo(() => {
    return generateInventoryForecast(products, invoices).filter(
      (f) => f.riskLevel === 'OUT_OF_STOCK' || f.riskLevel === 'CRITICAL'
    ).length;
  }, [products, invoices]);

  // Filter invoices by date range
  const filteredInvoices = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0];

    return invoices.filter((inv) => {
      if (inv.status === 'CANCELLED') return false;
      if (dateFilter === 'today') return inv.date === today;
      if (dateFilter === 'week') return inv.date >= sevenDaysAgo;
      if (dateFilter === 'month') return inv.date >= thirtyDaysAgo;
      if (dateFilter === 'custom') return inv.date >= customStartDate && inv.date <= customEndDate;
      return true;
    });
  }, [invoices, dateFilter, customStartDate, customEndDate]);

  // Aggregate metrics
  const totalSales = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
  }, [filteredInvoices]);

  const totalBills = filteredInvoices.length;

  const totalDiscountsGiven = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.totalDiscount, 0);
  }, [filteredInvoices]);

  const totalTaxCollected = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + inv.totalTax, 0);
  }, [filteredInvoices]);

  // Real Cost of Goods Sold (COGS)
  const costOfGoodsSold = useMemo(() => {
    let cost = 0;
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        cost += (item.purchasePrice || 0) * item.quantity;
      });
    });
    return cost;
  }, [filteredInvoices]);

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const sevenDaysAgo = new Date(Date.now() - 86400000 * 7).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString().split('T')[0];

    return expenses.filter((e) => {
      if (dateFilter === 'today') return e.date === today;
      if (dateFilter === 'week') return e.date >= sevenDaysAgo;
      if (dateFilter === 'month') return e.date >= thirtyDaysAgo;
      if (dateFilter === 'custom') return e.date >= customStartDate && e.date <= customEndDate;
      return true;
    });
  }, [expenses, dateFilter, customStartDate, customEndDate]);

  const totalOperatingExpenses = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  // True Net Profit calculation
  const grossProfit = Math.max(0, totalSales - costOfGoodsSold);
  const netEstimatedProfit = grossProfit - totalOperatingExpenses;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = { CASH: 0, UPI: 0, CARD: 0, SPLIT: 0, CREDIT: 0 };
    filteredInvoices.forEach((inv) => {
      map[inv.paymentMethod] = (map[inv.paymentMethod] || 0) + inv.grandTotal;
    });
    return map;
  }, [filteredInvoices]);

  // Sales by Category
  const categorySales = useMemo(() => {
    const map: Record<string, { revenue: number; qty: number }> = {};
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'General';
        if (!map[cat]) map[cat] = { revenue: 0, qty: 0 };
        map[cat].revenue += item.lineTotal;
        map[cat].qty += item.quantity;
      });
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [filteredInvoices, products]);

  // Inventory Valuation
  const inventoryStats = useMemo(() => {
    let costVal = 0;
    let retailVal = 0;
    products.forEach((p) => {
      if (!p.isArchived) {
        costVal += p.stock * p.purchasePrice;
        retailVal += p.stock * p.sellingPrice;
      }
    });
    return {
      costValuation: costVal,
      retailValuation: retailVal,
      unrealizedMargin: Math.max(0, retailVal - costVal),
    };
  }, [products]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Invoice Number', 'Date', 'Time', 'Customer', 'Payment Mode', 'Items Count', 'Subtotal', 'Tax', 'Grand Total', 'Status'];
    const rows = filteredInvoices.map((inv) => [
      inv.invoiceNumber,
      inv.date,
      inv.time,
      `"${inv.customerName || 'Walk-in'}"`,
      inv.paymentMethod,
      inv.items.length,
      inv.subtotal.toFixed(2),
      inv.totalTax.toFixed(2),
      inv.grandTotal.toFixed(2),
      inv.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `billing_pro_sales_report_${dateFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Top Module Switcher: Financials vs ML Forecasting */}
      <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveTab('financials')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 ${
            activeTab === 'financials'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span>Financial Reports & P&L Analysis</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('forecast')}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 relative ${
            activeTab === 'forecast'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Brain className="w-4 h-4 text-amber-300" />
          <span>ML Stockout Forecasting & Restock</span>
          {urgentStockoutCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === 'forecast'
                  ? 'bg-white text-rose-600'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {urgentStockoutCount} Urgent
            </span>
          )}
        </button>
      </div>

      {activeTab === 'forecast' ? (
        <StockForecastPanel
          products={products}
          invoices={invoices}
          suppliers={suppliers}
          shopName={db.settings.shopName}
        />
      ) : (
        <>
          {/* Predictive Alert Banner in Financials */}
          {urgentStockoutCount > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-amber-950">
                    AI Sales Velocity Alert: {urgentStockoutCount} Items Depleting Fast!
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Statistical forecast predicts stockout within 3 days based on active counter velocity.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('forecast')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition shadow-xs whitespace-nowrap self-start sm:self-auto"
              >
                <span>View Forecast & Restock</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Top Filter & Export Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <span>Reports, Profit & Loss & Inventory Valuation</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Real calculations computed directly from stored sales, COGS and expenses
              </p>
            </div>

            <div className="flex items-center gap-2">
          {/* Date Segmented Control */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {(['today', 'week', 'month', 'custom'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setDateFilter(period)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  dateFilter === period
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {period === 'today'
                  ? 'Today'
                  : period === 'week'
                  ? '7 Days'
                  : period === 'month'
                  ? '30 Days'
                  : 'Custom'}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {dateFilter === 'custom' && (
        <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-3 text-xs">
          <span className="font-semibold text-slate-700">Date Range:</span>
          <input
            type="date"
            value={customStartDate}
            onChange={(e) => setCustomStartDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={customEndDate}
            onChange={(e) => setCustomEndDate(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-mono-numbers"
          />
        </div>
      )}

      {/* KPI Cards: Sales, COGS, Expenses & Net Profit */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Total Revenue
          </span>
          <div className="text-xl font-bold text-slate-900 font-mono-numbers mt-1">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {totalBills} bills generated
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Cost of Goods (COGS)
          </span>
          <div className="text-xl font-bold text-slate-700 font-mono-numbers mt-1">
            {formatCurrency(costOfGoodsSold)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Purchase cost of sold items
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Operating Expenses
          </span>
          <div className="text-xl font-bold text-red-600 font-mono-numbers mt-1">
            {formatCurrency(totalOperatingExpenses)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Rent, electricity & freight
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase">
            Estimated Net Profit
          </span>
          <div
            className={`text-xl font-bold font-mono-numbers mt-1 ${
              netEstimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(netEstimatedProfit)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Gross profit - Operating expenses
          </div>
        </div>
      </div>

      {/* Inventory Valuation Strip */}
      <div className="bg-blue-900 text-white p-4 sm:p-5 rounded-3xl shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
              Current Shelf Inventory Valuation
            </div>
            <div className="flex items-baseline gap-4 mt-1">
              <div>
                <span className="text-xs text-blue-300">Retail Value:</span>
                <div className="text-lg sm:text-xl font-bold font-mono-numbers">
                  {formatCurrency(inventoryStats.retailValuation)}
                </div>
              </div>
              <div className="border-l border-blue-700 pl-4">
                <span className="text-xs text-blue-300">Purchase Cost Value:</span>
                <div className="text-lg sm:text-xl font-bold font-mono-numbers">
                  {formatCurrency(inventoryStats.costValuation)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-800/80 p-3 rounded-2xl border border-blue-700 text-right">
            <span className="text-[11px] text-blue-200 uppercase tracking-wider block font-semibold">
              Expected Gross Margin
            </span>
            <span className="text-lg font-bold text-emerald-300 font-mono-numbers">
              {formatCurrency(inventoryStats.unrealizedMargin)}
            </span>
          </div>
        </div>
      </div>

      {/* Two-Column Deep Analytics: Payment Methods & Category Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment Methods Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-600" />
            <span>Payment Modes Collected</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            {Object.entries(paymentBreakdown).map(([mode, amount]) => {
              const pct = totalSales > 0 ? (amount / totalSales) * 100 : 0;
              return (
                <div key={mode} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">{mode === 'CREDIT' ? 'Khata (Udhar)' : mode}</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(amount)} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        mode === 'CASH'
                          ? 'bg-emerald-500'
                          : mode === 'UPI'
                          ? 'bg-blue-500'
                          : mode === 'CREDIT'
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
          <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Top Sales by Product Category</span>
          </h3>

          <div className="space-y-2.5 text-xs">
            {categorySales.map(([cat, data]) => {
              const pct = totalSales > 0 ? (data.revenue / totalSales) * 100 : 0;
              return (
                <div key={cat} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-700">{cat}</span>
                    <span className="font-mono-numbers">
                      {formatCurrency(data.revenue)}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-600"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {categorySales.length === 0 && (
              <p className="text-slate-400 py-4 text-center">No category sales in this period.</p>
            )}
          </div>
        </div>
      </div>
        </>
      )}
    </div>
  );
};
