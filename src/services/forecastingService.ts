/**
 * Billing Pro - Machine Learning & Statistical Sales Velocity Forecasting Engine
 * Analyzes historical sales velocity (EMA, linear regression trend, demand variance),
 * predicts exact days until stock depletion (days-to-zero), and generates
 * optimal restock suggestions using safety-stock buffer calculations.
 */

import { Product, Invoice } from '../types';

export type StockoutRisk = 'OUT_OF_STOCK' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'STABLE';
export type TrendDirection = 'ACCELERATING' | 'STABLE' | 'DECELERATING';

export interface ProductForecast {
  product: Product;
  currentStock: number;
  minStockAlert: number;
  
  // Velocity Metrics
  dailySalesVelocity: number; // units per day (blended ML rate)
  sevenDayTotalSold: number;
  thirtyDayTotalSold: number;
  salesTrend: TrendDirection;
  trendSlope: number; // rate of change in units/day^2
  
  // Volatility & Safety Buffer
  dailyStdDev: number; // demand volatility
  safetyStock: number; // buffer for 95% service level
  
  // Predictions
  daysToZero: number; // estimated days until stock hits 0
  predictedStockoutDate: string | null; // e.g. "15 Oct 2026" or null if stable
  riskLevel: StockoutRisk;
  healthScore: number; // 0 (critical) to 100 (optimal)
  
  // Recommended Restock
  suggestedRestockQty: number; // optimal batch to reorder
  estimatedRestockCost: number; // suggestedRestockQty * purchasePrice
  revenueAtRisk: number; // potential lost sales in rupees if stocked out
  
  // Historical velocity curve (last 7 days quantities for sparkline)
  historyPoints: number[];
}

export interface ForecastingConfig {
  historyWindowDays: 7 | 14 | 30; // window of sales history to train velocity on
  targetStockDays: number; // days of coverage to restock for (e.g. 14 days or 30 days)
  supplierLeadTimeDays: number; // days taken by supplier to deliver stock (e.g. 2-5 days)
  serviceLevelZ: number; // 1.645 = 95% service level confidence, 1.28 = 90%, 2.33 = 99%
}

export const DEFAULT_FORECAST_CONFIG: ForecastingConfig = {
  historyWindowDays: 14,
  targetStockDays: 14,
  supplierLeadTimeDays: 3,
  serviceLevelZ: 1.645, // 95% service level
};

/**
 * Calculates linear regression slope (m) and intercept (c) for series of (x, y) points
 * y = m*x + c
 */
function calculateLinearRegression(yValues: number[]): { slope: number; intercept: number } {
  const n = yValues.length;
  if (n <= 1) return { slope: 0, intercept: yValues[0] || 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i;
    const y = yValues[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Exponential Weighted Moving Average (EWMA)
 * Gives higher weighting to recent transactions to catch sudden market shifts
 */
function calculateEWMA(values: number[], alpha = 0.35): number {
  if (values.length === 0) return 0;
  let ewma = values[0];
  for (let i = 1; i < values.length; i++) {
    ewma = alpha * values[i] + (1 - alpha) * ewma;
  }
  return ewma;
}

/**
 * Main ML Forecasting Engine:
 * Analyzes all invoices within the specified training window, groups sales by product and calendar day,
 * trains velocity models, predicts depletion dates and computes optimal restock requirements.
 */
export function generateInventoryForecast(
  products: Product[],
  invoices: Invoice[],
  config: ForecastingConfig = DEFAULT_FORECAST_CONFIG
): ProductForecast[] {
  const now = Date.now();
  const windowDays = config.historyWindowDays;
  const cutoffTimestamp = now - windowDays * 86400000;

  // 1. Build calendar day buckets for the history window (e.g., past 14 days)
  const dayKeys: string[] = [];
  const dayIndices: Record<string, number> = {};
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().split('T')[0];
    dayKeys.push(key);
    dayIndices[key] = dayKeys.length - 1;
  }

  // 2. Map product sales per day: productId -> array of daily quantities
  const productDailySales: Record<string, number[]> = {};
  const productTotal7d: Record<string, number> = {};
  const productTotal30d: Record<string, number> = {};

  products.forEach((p) => {
    productDailySales[p.id] = new Array(windowDays).fill(0);
    productTotal7d[p.id] = 0;
    productTotal30d[p.id] = 0;
  });

  // Filter completed invoices
  const validInvoices = invoices.filter(
    (inv) => inv.status !== 'CANCELLED' && inv.timestamp >= cutoffTimestamp
  );

  validInvoices.forEach((inv) => {
    const invDateKey = inv.date;
    const dayIdx = dayIndices[invDateKey];

    inv.items.forEach((item) => {
      const pId = item.productId;
      if (!productDailySales[pId]) {
        productDailySales[pId] = new Array(windowDays).fill(0);
      }
      if (dayIdx !== undefined && dayIdx >= 0 && dayIdx < windowDays) {
        productDailySales[pId][dayIdx] += item.quantity;
      }

      // Aggregate window totals
      const ageDays = (now - inv.timestamp) / 86400000;
      if (ageDays <= 7) {
        productTotal7d[pId] = (productTotal7d[pId] || 0) + item.quantity;
      }
      if (ageDays <= 30) {
        productTotal30d[pId] = (productTotal30d[pId] || 0) + item.quantity;
      }
    });
  });

  // 3. Run predictive modeling per active product
  const forecasts: ProductForecast[] = products
    .filter((p) => !p.isArchived)
    .map((product) => {
      const dailyQuantities = productDailySales[product.id] || new Array(windowDays).fill(0);
      const totalUnitsSold = dailyQuantities.reduce((a, b) => a + b, 0);

      // Base Simple Moving Average
      const smaVelocity = totalUnitsSold / windowDays;

      // Exponential Weighted Moving Average (recency weighted)
      const ewmaVelocity = calculateEWMA(dailyQuantities, 0.35);

      // Linear regression trend over time
      const { slope } = calculateLinearRegression(dailyQuantities);

      // Determine trend direction
      let salesTrend: TrendDirection = 'STABLE';
      if (slope > 0.05) salesTrend = 'ACCELERATING';
      else if (slope < -0.05) salesTrend = 'DECELERATING';

      // Blended velocity: blend EWMA and SMA, with regression momentum adjustment
      // If trend is accelerating, velocity slightly adjusts upward to prevent stockouts
      let effectiveDailyVelocity = 0.65 * ewmaVelocity + 0.35 * smaVelocity + Math.max(0, slope * 1.5);

      // If the store is very new or items haven't sold yet in this specific period,
      // fallback to reasonable low velocity to prevent dividing by 0
      if (effectiveDailyVelocity < 0.05 && totalUnitsSold > 0) {
        effectiveDailyVelocity = 0.1;
      }

      // Standard deviation of daily demand (volatility)
      const mean = smaVelocity;
      const variance =
        dailyQuantities.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) /
        Math.max(1, windowDays - 1);
      const dailyStdDev = Math.sqrt(variance);

      // Safety Stock calculation: SS = Z * sigma * sqrt(LeadTime)
      const safetyStock = Math.ceil(
        config.serviceLevelZ * dailyStdDev * Math.sqrt(config.supplierLeadTimeDays)
      );

      // Days to Zero (Runout Days)
      let daysToZero = 999;
      let predictedStockoutDate: string | null = null;
      let riskLevel: StockoutRisk = 'STABLE';

      if (product.stock <= 0) {
        daysToZero = 0;
        riskLevel = 'OUT_OF_STOCK';
      } else if (effectiveDailyVelocity > 0) {
        daysToZero = Number((product.stock / effectiveDailyVelocity).toFixed(1));
        
        // Compute predicted depletion date
        const depletionTimestamp = now + daysToZero * 86400000;
        const depDate = new Date(depletionTimestamp);
        predictedStockoutDate = depDate.toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });

        if (daysToZero <= 3) {
          riskLevel = 'CRITICAL';
        } else if (daysToZero <= 7) {
          riskLevel = 'HIGH';
        } else if (daysToZero <= 14) {
          riskLevel = 'MEDIUM';
        } else {
          riskLevel = 'STABLE';
        }
      } else {
        // No velocity detected
        if (product.stock <= product.minStockAlert) {
          riskLevel = 'HIGH';
          daysToZero = 30;
        } else {
          riskLevel = 'STABLE';
          daysToZero = 999;
        }
      }

      // Reorder Quantity:
      // Target Stock Level = (effectiveDailyVelocity * (LeadTime + TargetStockDays)) + safetyStock
      const targetStockLevel = Math.max(
        product.minStockAlert,
        effectiveDailyVelocity * (config.supplierLeadTimeDays + config.targetStockDays) + safetyStock
      );

      let suggestedRestockQty = Math.max(0, Math.ceil(targetStockLevel - product.stock));
      
      // If product stock is already low or zero, ensure minimum buffer is suggested
      if (product.stock <= 0 && suggestedRestockQty === 0) {
        suggestedRestockQty = Math.max(10, product.minStockAlert * 2);
      }

      // Restock cost
      const estimatedRestockCost = Number((suggestedRestockQty * product.purchasePrice).toFixed(2));

      // Revenue at risk if item runs out
      const potentialStockoutDays = Math.max(0, Math.min(7, 7 - Math.floor(daysToZero)));
      const revenueAtRisk = Number(
        (potentialStockoutDays * effectiveDailyVelocity * product.sellingPrice).toFixed(2)
      );

      // Health Score (0 - 100):
      // Ratio of current stock to target stock buffer
      let healthScore = 100;
      if (product.stock <= 0) {
        healthScore = 0;
      } else if (targetStockLevel > 0) {
        healthScore = Math.min(100, Math.max(5, Math.round((product.stock / targetStockLevel) * 100)));
      }

      // History points: take last 7 days for the UI sparkline
      const historyPoints = dailyQuantities.slice(-7);

      return {
        product,
        currentStock: product.stock,
        minStockAlert: product.minStockAlert,
        dailySalesVelocity: Number(effectiveDailyVelocity.toFixed(2)),
        sevenDayTotalSold: productTotal7d[product.id] || 0,
        thirtyDayTotalSold: productTotal30d[product.id] || 0,
        salesTrend,
        trendSlope: Number(slope.toFixed(3)),
        dailyStdDev: Number(dailyStdDev.toFixed(2)),
        safetyStock,
        daysToZero,
        predictedStockoutDate,
        riskLevel,
        healthScore,
        suggestedRestockQty,
        estimatedRestockCost,
        revenueAtRisk,
        historyPoints,
      };
    });

  // Sort by urgency: OUT_OF_STOCK first, then CRITICAL, then HIGH, then days to zero ascending
  const riskPriority: Record<StockoutRisk, number> = {
    OUT_OF_STOCK: 0,
    CRITICAL: 1,
    HIGH: 2,
    MEDIUM: 3,
    STABLE: 4,
  };

  forecasts.sort((a, b) => {
    if (riskPriority[a.riskLevel] !== riskPriority[b.riskLevel]) {
      return riskPriority[a.riskLevel] - riskPriority[b.riskLevel];
    }
    return a.daysToZero - b.daysToZero;
  });

  return forecasts;
}

/**
 * Formats a clean WhatsApp Restock order text to send to distributors
 */
export function formatSupplierRestockWhatsApp(
  supplierName: string,
  shopName: string,
  forecasts: ProductForecast[]
): string {
  const urgentItems = forecasts.filter((f) => f.suggestedRestockQty > 0);
  if (urgentItems.length === 0) return '';

  let message = `*PURCHASE RESTOCK REQUIREMENT*\n`;
  message += `*From:* ${shopName}\n`;
  message += `*To:* ${supplierName || 'Distributor'}\n`;
  message += `*Date:* ${new Date().toLocaleDateString('en-IN')}\n\n`;
  message += `Please arrange delivery for the following items based on sales velocity:\n\n`;

  urgentItems.forEach((item, index) => {
    message += `${index + 1}. *${item.product.name}*\n`;
    message += `   • Needed: *${item.suggestedRestockQty} ${item.product.unit}*\n`;
    message += `   • Current Stock: ${item.currentStock} ${item.product.unit} (Depleting in ~${item.daysToZero}d)\n`;
  });

  const totalEstCost = urgentItems.reduce((sum, item) => sum + item.estimatedRestockCost, 0);
  message += `\n*Est. Value:* ₹${totalEstCost.toLocaleString('en-IN')}\n`;
  message += `Please confirm delivery timeline. Thank you!`;

  return encodeURIComponent(message);
}
