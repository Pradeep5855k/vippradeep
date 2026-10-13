import React from 'react';
import {
  TrendingUp,
  Receipt,
  PiggyBank,
  Users,
  Package,
  AlertTriangle,
  PlusCircle,
  BarChart3,
  ChevronRight,
  ArrowUpRight,
  Printer,
  Sparkles,
  Cuboid,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { formatCurrency } from '../services/printService';
import { Invoice, Product } from '../types';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onOpenReceipt: (invoice: Invoice) => void;
  onOpen3DModal?: (model: 'pos' | 'scanner' | 'product') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenReceipt,
  onOpen3DModal,
}) => {
  const metrics = storage.getDashboardMetrics();
  const settings = storage.getSettings();
  const invoices = storage.getInvoices();
  const products = storage.getProducts();

  const recentInvoices = invoices.slice(0, 5);
  const lowStockItems = products.filter((p) => p.stock <= p.minStockAlert);

  return (
    <div className="space-y-6 pb-20">
      {/* Modern High-Fidelity Hero Banner with Generated Retail Photography */}
      <div className="relative overflow-hidden rounded-3xl shadow-sm border border-slate-800 bg-slate-950 text-white min-h-[220px] flex flex-col justify-end">
        {/* Background Retail Photography with Scrim */}
        <div className="absolute inset-0 z-0">
          <img
            src="/src/assets/images/pos_counter_hero_1791866246631.jpg"
            alt="Modern Grocery Checkout Counter"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover opacity-35 object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/80 to-transparent" />
        </div>

        {/* Content */}
        <div className="relative z-10 p-5 sm:p-7 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-400 uppercase tracking-wider mb-1.5">
              <span>Counter POS Active</span>
              <span>·</span>
              <span>Offline Ready</span>
              <span>·</span>
              <span className="text-emerald-400">GST Billing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight">
              {settings.shopName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Offline-first general store billing, thermal receipt printing, customer khata credit ledger, and real-time inventory management.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {onOpen3DModal && (
              <button
                type="button"
                onClick={() => onOpen3DModal('pos')}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 text-white font-bold text-xs sm:text-sm backdrop-blur-md border border-slate-700 transition shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>3D Hardware Viewer</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigate('billing')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-white font-bold text-xs sm:text-sm shadow-md transition"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Start New Bill</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid - All derived directly from stored records */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Today's Sales</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-numbers">
              {formatCurrency(metrics.todaySales)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-semibold text-slate-700">{metrics.todayBillsCount}</span>
              <span>bills generated today</span>
            </div>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Gross Profit (Est.)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PiggyBank className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 font-mono-numbers">
              {formatCurrency(metrics.todayEstimatedGrossProfit)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Sales revenue minus product cost
            </div>
          </div>
        </div>

        {/* Customer Credit (Khata) */}
        <div
          onClick={() => onNavigate('customers')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Pending Credit (Khata)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 font-mono-numbers">
              {formatCurrency(metrics.pendingCustomerCredit)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
              <span>Customer dues to collect</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Products & Low Stock Alerts */}
        <div
          onClick={() => onNavigate('products')}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-300 transition"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500">Inventory Alert</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-numbers">
                {metrics.totalProducts}
              </span>
              <span className="text-xs text-slate-500">items</span>
            </div>
            <div className="text-xs mt-1">
              {metrics.lowStockAlerts > 0 ? (
                <span className="text-red-600 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {metrics.lowStockAlerts} items low stock!
                </span>
              ) : (
                <span className="text-emerald-600 font-medium">All stock healthy</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Warning Card if any */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200/90 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span>Low Stock Warning ({lowStockItems.length} Products need reorder)</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-bold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition"
              >
                ML Forecast & Restock →
              </button>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline"
              >
                Manage Inventory
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between text-xs"
              >
                <div className="truncate pr-2">
                  <div className="font-semibold text-slate-900 truncate">{item.name}</div>
                  <div className="text-[11px] text-slate-500">
                    Min alert: {item.minStockAlert} {item.unit}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-bold text-red-600 font-mono-numbers">
                    {item.stock} {item.unit}
                  </span>
                  <div className="text-[10px] text-slate-400">Remaining</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Visual Category & Department Showcase */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>Shop Departments & Rapid Catalog</span>
          </h3>
          <button
            type="button"
            onClick={() => onNavigate('products')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            View All Inventory →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Category 1: Grains & Flours */}
          <div
            onClick={() => onNavigate('billing')}
            className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer group h-36 bg-slate-900 flex flex-col justify-end p-4 text-white"
          >
            <img
              src="/src/assets/images/flour_grains_groceries_1791866246878.jpg"
              alt="Grains and Atta Flours"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Pantry Staples
              </span>
              <h4 className="font-bold text-sm text-white">Atta, Rice & Pulses</h4>
              <p className="text-[11px] text-slate-300">Chakki fresh flour, dals & basmati</p>
            </div>
          </div>

          {/* Category 2: Edible Oils & Dairy */}
          <div
            onClick={() => onNavigate('billing')}
            className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer group h-36 bg-slate-900 flex flex-col justify-end p-4 text-white"
          >
            <img
              src="/src/assets/images/edible_oils_dairy_1791866246482.jpg"
              alt="Edible Oils and Dairy"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Oils & Dairy
              </span>
              <h4 className="font-bold text-sm text-white">Cooking Oils, Ghee & Butter</h4>
              <p className="text-[11px] text-slate-300">Sunflower oil, Amul milk & butter</p>
            </div>
          </div>

          {/* Category 3: FMCG & Packaged Foods */}
          <div
            onClick={() => onNavigate('billing')}
            className="relative overflow-hidden rounded-2xl border border-slate-200/90 shadow-xs cursor-pointer group h-36 bg-slate-900 flex flex-col justify-end p-4 text-white"
          >
            <img
              src="/src/assets/images/fmcg_packaged_goods_1791866247408.jpg"
              alt="FMCG Groceries and Spices"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Packaged Foods
              </span>
              <h4 className="font-bold text-sm text-white">Spices, Tea & FMCG Goods</h4>
              <p className="text-[11px] text-slate-300">Red Label tea, Maggi, detergents</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => onNavigate('billing')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition text-left flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">New Bill</div>
            <div className="text-xs text-slate-500">Quick POS counter billing</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('products')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition text-left flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center mb-3">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">Products</div>
            <div className="text-xs text-slate-500">Add, edit & barcode pricing</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('customers')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition text-left flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">Khata / Udhar</div>
            <div className="text-xs text-slate-500">Customer ledger & credit</div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('reports')}
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 hover:shadow-xs transition text-left flex flex-col justify-between"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-sm text-slate-900">Reports</div>
            <div className="text-xs text-slate-500">Daily P&L & CSV export</div>
          </div>
        </button>
      </div>

      {/* Recent Invoices Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-blue-600" />
            <h2 className="font-bold text-sm sm:text-base text-slate-900">
              Recent Bills
            </h2>
          </div>
          <button
            onClick={() => onNavigate('reports')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium text-slate-600">No bills generated yet</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Tap "Start New Bill" above to print your first invoice.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentInvoices.map((inv) => (
              <div
                key={inv.id}
                className="p-4 hover:bg-slate-50 transition flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 font-mono-numbers">
                      {inv.invoiceNumber}
                    </span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {inv.paymentMethod}
                    </span>
                    {inv.status !== 'COMPLETED' && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {inv.status}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                    <span>{inv.customerName || 'Cash Walk-in'}</span>
                    <span>·</span>
                    <span>
                      {inv.date} at {inv.time}
                    </span>
                    <span>·</span>
                    <span>{inv.items.length} items</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="font-bold text-sm sm:text-base text-slate-900 font-mono-numbers">
                      {formatCurrency(inv.grandTotal)}
                    </div>
                    {inv.balanceDue > 0 && (
                      <div className="text-[10px] text-red-600 font-semibold">
                        Due: {formatCurrency(inv.balanceDue)}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenReceipt(inv)}
                    className="p-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition border border-slate-200"
                    title="View & Print Receipt"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
