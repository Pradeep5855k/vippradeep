import React, { useState } from 'react';
import {
  Printer,
  Share2,
  X,
  MessageCircle,
  FileText,
  CheckCircle2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Invoice, ShopSettings } from '../types';
import {
  formatCurrency,
  generateUpiQrUrl,
  printReceiptNow,
  shareViaWhatsApp,
} from '../services/printService';

interface ReceiptModalProps {
  invoice: Invoice | null;
  settings: ShopSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  invoice,
  settings,
  isOpen,
  onClose,
}) => {
  const [thermalWidth, setThermalWidth] = useState<'58mm' | '80mm'>(
    settings.thermalWidth || '80mm'
  );
  const [printSuccessMsg, setPrintSuccessMsg] = useState(false);

  if (!isOpen || !invoice) return null;

  const upiQrUrl = generateUpiQrUrl(
    settings.upiId,
    settings.shopName,
    invoice.grandTotal,
    invoice.invoiceNumber
  );

  const handlePrint = () => {
    printReceiptNow();
    setPrintSuccessMsg(true);
    setTimeout(() => setPrintSuccessMsg(false), 4000);
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(invoice, settings);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl flex flex-col my-auto max-h-[92vh] overflow-hidden">
        {/* Top Action Bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="font-semibold text-sm sm:text-base leading-tight">
                Bill Receipt #{invoice.invoiceNumber}
              </h3>
              <p className="text-[11px] text-slate-400">
                {invoice.date} · {invoice.time}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 58mm / 80mm Switcher */}
            <div className="hidden sm:flex items-center bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
              <button
                type="button"
                onClick={() => setThermalWidth('58mm')}
                className={`px-2.5 py-1 rounded-md transition ${
                  thermalWidth === '58mm'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                58 mm
              </button>
              <button
                type="button"
                onClick={() => setThermalWidth('80mm')}
                className={`px-2.5 py-1 rounded-md transition ${
                  thermalWidth === '80mm'
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                80 mm
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Receipt Preview Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/80 flex justify-center">
          {/* Printable Receipt Paper */}
          <div
            id="printable-receipt-area"
            style={{
              width: thermalWidth === '58mm' ? '300px' : '400px',
              maxWidth: '100%',
            }}
            className="bg-white text-slate-900 p-4 sm:p-5 shadow-md border border-slate-300 font-mono text-xs leading-relaxed transition-all"
          >
            {/* Header / Shop Details */}
            <div className="text-center border-b border-dashed border-slate-400 pb-3 mb-3">
              <h2 className="font-bold text-sm sm:text-base uppercase tracking-tight text-black">
                {settings.shopName}
              </h2>
              {settings.tagline && (
                <p className="text-[11px] text-slate-700">{settings.tagline}</p>
              )}
              <p className="text-[11px] text-slate-700 mt-1">{settings.address}</p>
              <p className="text-[11px] text-slate-800 font-semibold mt-0.5">
                Phone: {settings.phone}
              </p>
              {settings.gstin && (
                <p className="text-[11px] text-slate-800">
                  GSTIN: <span className="font-bold">{settings.gstin}</span>
                </p>
              )}
              {settings.fssaiNumber && (
                <p className="text-[10px] text-slate-600">
                  FSSAI Lic: {settings.fssaiNumber}
                </p>
              )}
            </div>

            {/* Bill Meta */}
            <div className="flex justify-between items-start text-[11px] mb-2 pb-2 border-b border-dashed border-slate-300">
              <div>
                <p>
                  <span className="font-bold">INVOICE:</span> {invoice.invoiceNumber}
                </p>
                <p>
                  <span className="font-bold">Date:</span> {invoice.date} {invoice.time}
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">
                  {invoice.paymentMethod}
                </span>
                {invoice.status !== 'COMPLETED' && (
                  <p className="text-amber-700 font-bold text-[10px] mt-0.5">
                    [{invoice.status}]
                  </p>
                )}
              </div>
            </div>

            {/* Customer Details if supplied */}
            {(invoice.customerName || invoice.customerPhone) && (
              <div className="text-[11px] bg-slate-50 p-2 rounded mb-2 border border-slate-200">
                <p>
                  <span className="font-bold">Customer:</span> {invoice.customerName || 'N/A'}
                </p>
                {invoice.customerPhone && (
                  <p>
                    <span className="font-bold">Phone:</span> +91 {invoice.customerPhone}
                  </p>
                )}
              </div>
            )}

            {/* Items Table */}
            <table className="w-full text-[11px] my-2 border-collapse">
              <thead>
                <tr className="border-b border-black text-left font-bold">
                  <th className="py-1">ITEM</th>
                  <th className="py-1 text-center">QTY</th>
                  <th className="py-1 text-right">RATE</th>
                  <th className="py-1 text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-slate-300">
                {invoice.items.map((item, idx) => (
                  <tr key={idx} className="py-1">
                    <td className="py-1.5 pr-1">
                      <div className="font-semibold text-slate-900 leading-tight">
                        {item.productName}
                      </div>
                      <div className="text-[10px] text-slate-600 flex items-center gap-1.5">
                        <span>GST: {item.taxRate}%</span>
                        {item.discountAmount > 0 && (
                          <span className="text-red-700 font-medium">
                            -₹{item.discountAmount.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-1.5 text-center whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-1.5 text-right font-mono-numbers whitespace-nowrap">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-1.5 text-right font-mono-numbers font-semibold whitespace-nowrap">
                      ₹{item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals & Tax Calculation Breakdown */}
            <div className="border-t border-black pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal (Items {invoice.items.length}):</span>
                <span className="font-mono-numbers">₹{invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.totalDiscount > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>Special Discount:</span>
                  <span className="font-mono-numbers">-₹{invoice.totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {settings.printTaxBreakdown && invoice.totalTax > 0 && (
                <div className="text-[10px] text-slate-700 bg-slate-50 p-1.5 rounded space-y-0.5 border border-slate-200">
                  <div className="flex justify-between">
                    <span>Taxable Amount:</span>
                    <span className="font-mono-numbers">₹{invoice.taxableAmount.toFixed(2)}</span>
                  </div>
                  {invoice.cgst > 0 && (
                    <div className="flex justify-between">
                      <span>CGST:</span>
                      <span className="font-mono-numbers">₹{invoice.cgst.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.sgst > 0 && (
                    <div className="flex justify-between">
                      <span>SGST:</span>
                      <span className="font-mono-numbers">₹{invoice.sgst.toFixed(2)}</span>
                    </div>
                  )}
                  {invoice.igst > 0 && (
                    <div className="flex justify-between">
                      <span>IGST:</span>
                      <span className="font-mono-numbers">₹{invoice.igst.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold border-t border-slate-200 pt-0.5">
                    <span>Total Tax:</span>
                    <span className="font-mono-numbers">₹{invoice.totalTax.toFixed(2)}</span>
                  </div>
                </div>
              )}

              {invoice.roundOff !== 0 && (
                <div className="flex justify-between text-[10px] text-slate-600">
                  <span>Round Off:</span>
                  <span className="font-mono-numbers">
                    {invoice.roundOff > 0 ? '+' : ''}₹{invoice.roundOff.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-bold text-sm sm:text-base border-t-2 border-b-2 border-black py-1.5 text-black">
                <span>GRAND TOTAL:</span>
                <span className="font-mono-numbers">{formatCurrency(invoice.grandTotal)}</span>
              </div>

              {/* Payment Details */}
              <div className="pt-1 text-[11px] space-y-0.5">
                <div className="flex justify-between">
                  <span>Paid via {invoice.paymentMethod}:</span>
                  <span className="font-mono-numbers">
                    ₹{invoice.amountReceived.toFixed(2)}
                  </span>
                </div>
                {invoice.balanceDue > 0 && (
                  <div className="flex justify-between font-bold text-red-700">
                    <span>Due Balance (Credit):</span>
                    <span className="font-mono-numbers">
                      ₹{invoice.balanceDue.toFixed(2)}
                    </span>
                  </div>
                )}
                {invoice.amountReceived > invoice.grandTotal && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Change Returned:</span>
                    <span className="font-mono-numbers">
                      ₹{(invoice.amountReceived - invoice.grandTotal).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic UPI QR Code for instant scan & pay */}
            {settings.upiId && upiQrUrl && (
              <div className="mt-4 pt-3 border-t border-dashed border-slate-400 text-center flex flex-col items-center">
                <p className="text-[10px] font-bold uppercase text-slate-800 mb-1">
                  Scan QR to Pay via PhonePe / GPay / Paytm
                </p>
                <img
                  src={upiQrUrl}
                  alt="UPI QR Code"
                  className="w-28 h-28 border border-slate-400 p-1 bg-white"
                />
                <p className="text-[9px] text-slate-600 mt-1">UPI ID: {settings.upiId}</p>
              </div>
            )}

            {/* Footer / Return Policy */}
            <div className="mt-4 pt-2 border-t border-dashed border-slate-400 text-center text-[10px] text-slate-700 leading-tight space-y-1">
              <p className="font-semibold">{settings.footerNote}</p>
              {settings.returnPolicyText && (
                <p className="text-[9px] text-slate-500 italic">
                  * {settings.returnPolicyText}
                </p>
              )}
              <p className="text-[9px] text-slate-400 pt-1">
                Generated by Billing Pro v1.0
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Actions Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 no-print shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleWhatsApp}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-emerald-700 active:scale-[0.98] transition shadow-sm"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Share WhatsApp</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-800 active:scale-[0.98] transition shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-300 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
