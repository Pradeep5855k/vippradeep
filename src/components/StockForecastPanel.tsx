import React, { useState, useMemo } from 'react';
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  Share2,
  Download,
  Filter,
  Search,
  SlidersHorizontal,
  ChevronRight,
  ShieldAlert,
  ArrowRight,
  X,
  Truck,
  IndianRupee,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product, Invoice, Supplier } from '../types';
import {
  generateInventoryForecast,
  ProductForecast,
  ForecastingConfig,
  DEFAULT_FORECAST_CONFIG,
  StockoutRisk,
  formatSupplierRestockWhatsApp,
} from '../services/forecastingService';
import { formatCurrency } from '../services/printService';
import { storage } from '../services/storageService';

interface StockForecastPanelProps {
  products: Product[];
  invoices: Invoice[];
  suppliers: Supplier[];
  shopName: string;
}

export const StockForecastPanel: React.FC<StockForecastPanelProps> = ({
  products,
  invoices,
  suppliers,
  shopName,
}) => {
  // Forecasting engine configuration
  const [config, setConfig] = useState<ForecastingConfig>(DEFAULT_FORECAST_CONFIG);
  const [showConfigDrawer, setShowConfigDrawer] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | StockoutRisk>('ALL');

  // Interactive Quick Restock Modal
  const [restockModalItem, setRestockModalItem] = useState<ProductForecast | null>(null);
  const [restockQtyInput, setRestockQtyInput] = useState<number>(0);
  const [restockSupplierId, setRestockSupplierId] = useState<string>('');
  const [restockUnitCost, setRestockUnitCost] = useState<number>(0);
  const [restockSuccessMsg, setRestockSuccessMsg] = useState<string | null>(null);

  // Generate ML predictions
  const allForecasts = useMemo(() => {
    return generateInventoryForecast(products, invoices, config);
  }, [products, invoices, config]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtered forecasts
  const filteredForecasts = useMemo(() => {
    return allForecasts.filter((f) => {
      // Risk filter
      if (riskFilter !== 'ALL' && f.riskLevel !== riskFilter) {
        return false;
      }
      // Category filter
      if (selectedCategory !== 'ALL' && f.product.category !== selectedCategory) {
        return false;
      }
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = f.product.name.toLowerCase().includes(q);
        const matchesBarcode = f.product.barcode.toLowerCase().includes(q);
        if (!matchesName && !matchesBarcode) return false;
      }
      return true;
    });
  }, [allForecasts, riskFilter, selectedCategory, searchQuery]);

  // Aggregate KPI summary metrics
  const kpis = useMemo(() => {
    const outOfStock = allForecasts.filter((f) => f.riskLevel === 'OUT_OF_STOCK');
    const critical = allForecasts.filter((f) => f.riskLevel === 'CRITICAL');
    const highRisk = allForecasts.filter((f) => f.riskLevel === 'HIGH');
    const mediumRisk = allForecasts.filter((f) => f.riskLevel === 'MEDIUM');

    const urgentItems = allForecasts.filter(
      (f) => f.riskLevel === 'OUT_OF_STOCK' || f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH'
    );

    const totalRestockCapital = allForecasts.reduce(
      (sum, f) => sum + f.estimatedRestockCost,
      0
    );

    const urgentRestockCapital = urgentItems.reduce(
      (sum, f) => sum + f.estimatedRestockCost,
      0
    );

    const totalRevenueAtRisk = urgentItems.reduce(
      (sum, f) => sum + f.revenueAtRisk,
      0
    );

    // Highest velocity item
    const sortedByVelocity = [...allForecasts].sort(
      (a, b) => b.dailySalesVelocity - a.dailySalesVelocity
    );
    const topVelocityItem = sortedByVelocity[0] || null;

    return {
      outOfStockCount: outOfStock.length,
      criticalCount: critical.length,
      highRiskCount: highRisk.length,
      mediumRiskCount: mediumRisk.length,
      urgentCount: urgentItems.length,
      totalRestockCapital,
      urgentRestockCapital,
      totalRevenueAtRisk,
      topVelocityItem,
    };
  }, [allForecasts]);

  // Quick Restock Action
  const handleOpenRestock = (item: ProductForecast) => {
    setRestockModalItem(item);
    setRestockQtyInput(item.suggestedRestockQty > 0 ? item.suggestedRestockQty : 10);
    setRestockSupplierId(item.product.supplierId || (suppliers[0]?.id || ''));
    setRestockUnitCost(item.product.purchasePrice);
    setRestockSuccessMsg(null);
  };

  const handleConfirmRestock = () => {
    if (!restockModalItem) return;
    const qty = Number(restockQtyInput);
    if (isNaN(qty) || qty <= 0) return;

    const sup = suppliers.find((s) => s.id === restockSupplierId) || suppliers[0];
    const totalAmount = qty * restockUnitCost;

    storage.recordPurchaseOrder({
      supplierId: sup?.id || 'sup_general',
      supplierName: sup?.name || 'General Supplier',
      invoiceNumber: 'RESTOCK-' + Date.now().toString().slice(-4),
      date: new Date().toISOString().split('T')[0],
      items: [
        {
          productId: restockModalItem.product.id,
          productName: restockModalItem.product.name,
          quantity: qty,
          unitCost: restockUnitCost,
          totalCost: totalAmount,
        },
      ],
      totalAmount,
      paidAmount: totalAmount,
      balanceDue: 0,
      paymentMethod: 'CASH',
      status: 'RECEIVED',
      notes: `ML-suggested velocity replenishment (${qty} ${restockModalItem.product.unit})`,
    });

    setRestockSuccessMsg(
      `Successfully inwarded ${qty} ${restockModalItem.product.unit} of ${restockModalItem.product.name}! Stock updated.`
    );

    setTimeout(() => {
      setRestockModalItem(null);
      setRestockSuccessMsg(null);
    }, 1800);
  };

  // Bulk WhatsApp Order share for all urgent items
  const handleShareWhatsAppOrder = () => {
    const urgentItems = allForecasts.filter(
      (f) => f.riskLevel === 'OUT_OF_STOCK' || f.riskLevel === 'CRITICAL' || f.riskLevel === 'HIGH'
    );
    if (urgentItems.length === 0) {
      alert('No critical restock items found right now. Stock levels are healthy!');
      return;
    }

    const defaultSupplier = suppliers[0]?.name || 'Distributor';
    const text = formatSupplierRestockWhatsApp(defaultSupplier, shopName, urgentItems);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Export Forecast CSV
  const handleExportForecastCSV = () => {
    const headers = [
      'Product Name',
      'Barcode',
      'Category',
      'Current Stock',
      'Min Alert',
      'Daily Velocity (units/day)',
      'Sales Trend',
      'Days To Zero',
      'Stockout Date',
      'Risk Level',
      'Safety Stock',
      'Suggested Restock Qty',
      'Purchase Price',
      'Est. Restock Cost',
      'Revenue At Risk',
    ];

    const rows = allForecasts.map((f) => [
      `"${f.product.name.replace(/"/g, '""')}"`,
      f.product.barcode,
      f.product.category,
      f.currentStock,
      f.minStockAlert,
      f.dailySalesVelocity,
      f.salesTrend,
      f.daysToZero === 999 ? 'Stable' : f.daysToZero,
      f.predictedStockoutDate || 'Stable',
      f.riskLevel,
      f.safetyStock,
      f.suggestedRestockQty,
      f.product.purchasePrice,
      f.estimatedRestockCost,
      f.revenueAtRisk,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `billing_pro_inventory_forecast_${config.historyWindowDays}d.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Forecast Engine Banner & Controls */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-5 rounded-2xl shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-[11px] font-bold tracking-wide uppercase">
                <Brain className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>Statistical ML Velocity Model</span>
              </span>
              <span className="text-[11px] text-blue-300">
                Window: {config.historyWindowDays} Days • Lead Time: {config.supplierLeadTimeDays} Days
              </span>
            </div>
            <h2 className="text-xl font-bold tracking-tight">
              Stockout Depletion & Restock Forecasting
            </h2>
            <p className="text-xs text-blue-200/80 mt-1 max-w-2xl leading-relaxed">
              Analyzes real transaction velocity using Exponential Weighted Moving Averages (EWMA) and linear trend regression to predict exact days until shelf items hit zero.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold backdrop-blur-xs border border-white/10 transition"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-blue-300" />
              <span>Model Parameters</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsAppOrder}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Restock via WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleExportForecastCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Forecast</span>
            </button>
          </div>
        </div>

        {/* Collapsible Model Parameters Drawer */}
        {showConfigDrawer && (
          <div className="mt-4 pt-4 border-t border-white/15 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <label className="block text-blue-200 font-semibold mb-1.5">
                Training Window (Sales History)
              </label>
              <div className="flex gap-1.5">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setConfig({ ...config, historyWindowDays: days })}
                    className={`flex-1 py-1 rounded-lg text-center font-bold transition ${
                      config.historyWindowDays === days
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-blue-200 hover:bg-white/15'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-blue-300/70 mt-1">
                More days smoothen spikes; fewer days react quicker.
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <label className="block text-blue-200 font-semibold mb-1.5">
                Supplier Delivery Lead Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="7"
                  value={config.supplierLeadTimeDays}
                  onChange={(e) =>
                    setConfig({ ...config, supplierLeadTimeDays: Number(e.target.value) })
                  }
                  className="w-full accent-blue-400"
                />
                <span className="font-mono font-bold text-white min-w-[36px] text-right">
                  {config.supplierLeadTimeDays} d
                </span>
              </div>
              <p className="text-[10px] text-blue-300/70 mt-1">
                Days for truck/supplier goods arrival.
              </p>
            </div>

            <div className="bg-white/5 p-3 rounded-xl border border-white/10">
              <label className="block text-blue-200 font-semibold mb-1.5">
                Target Stock Replenishment Buffer
              </label>
              <div className="flex gap-1.5">
                {([7, 14, 30] as const).map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setConfig({ ...config, targetStockDays: days })}
                    className={`flex-1 py-1 rounded-lg text-center font-bold transition ${
                      config.targetStockDays === days
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-blue-200 hover:bg-white/15'
                    }`}
                  >
                    {days} Days
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-blue-300/70 mt-1">
                Number of days worth of inventory to reorder.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Critical & Depleting */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span>Stockout Threat (&le;3d)</span>
            </span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          </div>
          <div className="text-2xl font-bold text-rose-700 font-mono-numbers mt-2">
            {kpis.criticalCount + kpis.outOfStockCount}
            <span className="text-xs font-normal text-rose-500 ml-1.5">products</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>{kpis.outOfStockCount} already zero</span>
            <button
              type="button"
              onClick={() => setRiskFilter('CRITICAL')}
              className="text-rose-600 font-bold hover:underline"
            >
              Filter &rarr;
            </button>
          </div>
        </div>

        {/* Card 2: High Risk */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>High Risk (4–7d)</span>
          </span>
          <div className="text-2xl font-bold text-amber-800 font-mono-numbers mt-2">
            {kpis.highRiskCount}
            <span className="text-xs font-normal text-amber-600 ml-1.5">products</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Order within 48 hours</span>
            <button
              type="button"
              onClick={() => setRiskFilter('HIGH')}
              className="text-amber-700 font-bold hover:underline"
            >
              Filter &rarr;
            </button>
          </div>
        </div>

        {/* Card 3: Urgent Restock Capital */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider flex items-center gap-1">
            <IndianRupee className="w-3.5 h-3.5 text-blue-600" />
            <span>Urgent Restock Capital</span>
          </span>
          <div className="text-xl sm:text-2xl font-bold text-blue-900 font-mono-numbers mt-2">
            {formatCurrency(kpis.urgentRestockCapital)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            For {kpis.urgentCount} high priority items
          </div>
        </div>

        {/* Card 4: Revenue At Risk */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Sales Revenue at Risk</span>
          </span>
          <div className="text-xl sm:text-2xl font-bold text-slate-900 font-mono-numbers mt-2">
            {formatCurrency(kpis.totalRevenueAtRisk)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Potential loss over next 7 days
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search items by name or scan barcode..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none bg-white"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Risk Filter Buttons */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setRiskFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                riskFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({allForecasts.length})
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter('CRITICAL')}
              className={`px-2.5 py-1 rounded-lg transition ${
                riskFilter === 'CRITICAL'
                  ? 'bg-rose-500 text-white shadow-xs font-bold'
                  : 'text-rose-600 hover:text-rose-700'
              }`}
            >
              Critical ({kpis.criticalCount + kpis.outOfStockCount})
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter('HIGH')}
              className={`px-2.5 py-1 rounded-lg transition ${
                riskFilter === 'HIGH'
                  ? 'bg-amber-500 text-white shadow-xs font-bold'
                  : 'text-amber-600 hover:text-amber-700'
              }`}
            >
              High Risk ({kpis.highRiskCount})
            </button>
            <button
              type="button"
              onClick={() => setRiskFilter('STABLE')}
              className={`px-2.5 py-1 rounded-lg transition ${
                riskFilter === 'STABLE'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Healthy
            </button>
          </div>
        </div>
      </div>

      {/* Main Forecast Items List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Inventory Depletion & Restock Matrix ({filteredForecasts.length} Products)
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Sorted by urgency (Depletion time & lowest days-to-zero)
          </span>
        </div>

        {/* Forecast Items Container */}
        <div className="divide-y divide-slate-100">
          {filteredForecasts.map((forecast) => {
            const isOutOfStock = forecast.riskLevel === 'OUT_OF_STOCK';
            const isCritical = forecast.riskLevel === 'CRITICAL';
            const isHigh = forecast.riskLevel === 'HIGH';
            const isMedium = forecast.riskLevel === 'MEDIUM';

            return (
              <div
                key={forecast.product.id}
                className="p-4 hover:bg-slate-50/70 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Product Identity & Stock */}
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900">
                      {forecast.product.name}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                      {forecast.product.category}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{forecast.product.barcode}
                    </span>
                  </div>

                  {/* Stock Bar & Current Levels */}
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <div>
                      <span className="text-slate-400">Stock: </span>
                      <span
                        className={`font-bold font-mono-numbers ${
                          isOutOfStock
                            ? 'text-rose-600'
                            : isCritical
                            ? 'text-rose-600'
                            : isHigh
                            ? 'text-amber-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {forecast.currentStock} {forecast.product.unit}
                      </span>
                      <span className="text-slate-400 text-[11px] ml-1">
                        (Min: {forecast.minStockAlert})
                      </span>
                    </div>

                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-slate-400">Safety Buffer: </span>
                      <span className="font-semibold text-slate-700 font-mono-numbers">
                        +{forecast.safetyStock} {forecast.product.unit}
                      </span>
                    </div>

                    <div className="border-l border-slate-200 pl-3">
                      <span className="text-slate-400">Unit Cost: </span>
                      <span className="font-semibold text-slate-700 font-mono-numbers">
                        ₹{forecast.product.purchasePrice}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sales Velocity & Trend */}
                <div className="flex items-center gap-6 min-w-[200px]">
                  <div>
                    <span className="text-[11px] text-slate-400 block font-medium">
                      Daily Sales Velocity
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-sm font-bold text-slate-900 font-mono-numbers">
                        {forecast.dailySalesVelocity} {forecast.product.unit}/day
                      </span>

                      {/* Trend Badge */}
                      {forecast.salesTrend === 'ACCELERATING' && (
                        <span
                          title="Accelerating demand trend"
                          className="flex items-center text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded"
                        >
                          <TrendingUp className="w-3 h-3 mr-0.5" />
                          <span>+Trend</span>
                        </span>
                      )}
                      {forecast.salesTrend === 'DECELERATING' && (
                        <span
                          title="Decelerating demand trend"
                          className="flex items-center text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded"
                        >
                          <TrendingDown className="w-3 h-3 mr-0.5" />
                          <span>-Trend</span>
                        </span>
                      )}
                      {forecast.salesTrend === 'STABLE' && (
                        <span
                          title="Steady consumption rate"
                          className="flex items-center text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded"
                        >
                          <Minus className="w-3 h-3 mr-0.5" />
                          <span>Steady</span>
                        </span>
                      )}
                    </div>

                    {/* Mini 7-day sparkline bar visual */}
                    <div className="flex items-end gap-0.5 h-3 mt-1.5">
                      {forecast.historyPoints.map((qty, i) => {
                        const maxH = Math.max(...forecast.historyPoints, 1);
                        const pct = Math.max(15, Math.round((qty / maxH) * 100));
                        return (
                          <div
                            key={i}
                            title={`Day -${6 - i}: ${qty} sold`}
                            className={`w-1.5 rounded-xs ${
                              isCritical || isOutOfStock
                                ? 'bg-rose-400'
                                : isHigh
                                ? 'bg-amber-400'
                                : 'bg-blue-400'
                            }`}
                            style={{ height: `${pct}%` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Days to Zero Prediction */}
                <div className="min-w-[170px]">
                  <span className="text-[11px] text-slate-400 block font-medium">
                    Predicted Days to Zero
                  </span>
                  <div className="mt-0.5">
                    {isOutOfStock ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600 text-white font-bold text-xs">
                        <ShieldAlert className="w-3 h-3" />
                        <span>OUT OF STOCK</span>
                      </span>
                    ) : isCritical ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 font-bold text-xs">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          <span>Hits 0 in {forecast.daysToZero} days</span>
                        </span>
                        <span className="text-[10px] text-rose-600 font-medium block mt-0.5">
                          Depletes by {forecast.predictedStockoutDate}
                        </span>
                      </div>
                    ) : isHigh ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                          <span>Hits 0 in {forecast.daysToZero} days</span>
                        </span>
                        <span className="text-[10px] text-amber-700 font-medium block mt-0.5">
                          Depletes by {forecast.predictedStockoutDate}
                        </span>
                      </div>
                    ) : isMedium ? (
                      <div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                          <span>~{forecast.daysToZero} days</span>
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          {forecast.predictedStockoutDate}
                        </span>
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-semibold text-xs">
                        <span>Safe (&gt;14 days)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Suggested Restock Qty & 1-Click Action */}
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">
                      Suggested Restock
                    </span>
                    <span className="font-bold text-sm text-slate-900 font-mono-numbers block">
                      {forecast.suggestedRestockQty} {forecast.product.unit}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono-numbers">
                      {formatCurrency(forecast.estimatedRestockCost)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenRestock(forecast)}
                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                      isOutOfStock || isCritical
                        ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                        : isHigh
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-slate-900 hover:bg-slate-800 text-white'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Restock</span>
                  </button>
                </div>
              </div>
            );
          })}

          {filteredForecasts.length === 0 && (
            <div className="p-8 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No products match current filter.</p>
              <button
                type="button"
                onClick={() => {
                  setRiskFilter('ALL');
                  setSelectedCategory('ALL');
                  setSearchQuery('');
                }}
                className="mt-2 text-xs text-blue-600 font-bold hover:underline"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Interactive Quick Inward Restock Modal */}
      {restockModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="font-bold text-sm">Quick Inward Stock Replenishment</h3>
                  <p className="text-[11px] text-slate-400">
                    Velocity-Optimized Restock Order
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestockModalItem(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
              {restockSuccessMsg ? (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <p className="text-xs font-semibold">{restockSuccessMsg}</p>
                </div>
              ) : (
                <>
                  <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100">
                    <span className="font-bold text-sm text-blue-950 block">
                      {restockModalItem.product.name}
                    </span>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-blue-800">
                      <span>Current: <b>{restockModalItem.currentStock} {restockModalItem.product.unit}</b></span>
                      <span>•</span>
                      <span>Burn Rate: <b>{restockModalItem.dailySalesVelocity} /day</b></span>
                      <span>•</span>
                      <span>Runs out: <b>{restockModalItem.daysToZero} days</b></span>
                    </div>
                  </div>

                  {/* Quantity to Order */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Restock Quantity ({restockModalItem.product.unit}):
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        value={restockQtyInput}
                        onChange={(e) => setRestockQtyInput(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-bold font-mono-numbers focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRestockQtyInput(restockModalItem.suggestedRestockQty || 10)
                        }
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold whitespace-nowrap"
                      >
                        Use ML Suggestion
                      </button>
                    </div>
                  </div>

                  {/* Unit Purchase Cost */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Purchase Cost per unit (₹):
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={restockUnitCost}
                        onChange={(e) => setRestockUnitCost(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono-numbers focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Total Inward Amount:
                      </label>
                      <div className="px-3 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-900 font-mono-numbers">
                        {formatCurrency(restockQtyInput * restockUnitCost)}
                      </div>
                    </div>
                  </div>

                  {/* Supplier selection */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Assigned Supplier / Distributor:
                    </label>
                    <select
                      value={restockSupplierId}
                      onChange={(e) => setRestockSupplierId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white focus:outline-none"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.phone})
                        </option>
                      ))}
                      {suppliers.length === 0 && (
                        <option value="sup_general">Default Wholesaler</option>
                      )}
                    </select>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRestockModalItem(null)}
                      className="flex-1 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRestock}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Inward Stock</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
