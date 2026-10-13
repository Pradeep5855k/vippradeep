import { Invoice, ShopSettings } from '../types';

export function formatCurrency(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function generateUpiQrUrl(upiId: string, shopName: string, amount: number, invoiceNumber: string): string {
  if (!upiId) return '';
  const cleanUpi = upiId.trim();
  const cleanName = encodeURIComponent(shopName.trim());
  const upiUri = `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${amount.toFixed(2)}&tr=${invoiceNumber}&tn=Bill_${invoiceNumber}&cu=INR`;
  // Using public high-availability QR image endpoint
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUri)}`;
}

export function generateWhatsAppMessage(invoice: Invoice, settings: ShopSettings): string {
  const itemsText = invoice.items
    .map(
      (item, idx) =>
        `${idx + 1}. ${item.productName} (${item.quantity} ${item.unit}) - ${formatCurrency(item.lineTotal)}`
    )
    .join('\n');

  const paymentStatus =
    invoice.paymentMethod === 'CREDIT'
      ? `Payment: PENDING CREDIT (Khata) - Due: ${formatCurrency(invoice.balanceDue || invoice.grandTotal)}`
      : `Payment: ${invoice.paymentMethod} (Received: ${formatCurrency(invoice.amountReceived)})`;

  return (
    `*${settings.shopName.toUpperCase()}*\n` +
    `${settings.address}\n` +
    `Ph: ${settings.phone}${settings.gstin ? ' | GST: ' + settings.gstin : ''}\n\n` +
    `*INVOICE: ${invoice.invoiceNumber}*\n` +
    `Date: ${invoice.date} ${invoice.time}\n` +
    `${invoice.customerName ? 'Customer: ' + invoice.customerName + ' (' + (invoice.customerPhone || '') + ')\n' : ''}` +
    `--------------------------------\n` +
    `${itemsText}\n` +
    `--------------------------------\n` +
    `Subtotal: ${formatCurrency(invoice.subtotal)}\n` +
    (invoice.totalDiscount > 0 ? `Discount: -${formatCurrency(invoice.totalDiscount)}\n` : '') +
    (invoice.totalTax > 0 ? `GST Tax: ${formatCurrency(invoice.totalTax)}\n` : '') +
    `*GRAND TOTAL: ${formatCurrency(invoice.grandTotal)}*\n` +
    `${paymentStatus}\n` +
    `--------------------------------\n` +
    `${settings.footerNote || 'Thank you for shopping with us!'}\n` +
    (settings.upiId ? `Pay online via UPI: ${settings.upiId}` : '')
  );
}

export function shareViaWhatsApp(invoice: Invoice, settings: ShopSettings) {
  const text = generateWhatsAppMessage(invoice, settings);
  let url = '';
  const phone = invoice.customerPhone ? invoice.customerPhone.replace(/[^0-9]/g, '') : '';
  
  if (phone && phone.length === 10) {
    url = `https://wa.me/91${phone}?text=${encodeURIComponent(text)}`;
  } else if (phone && phone.length > 10) {
    url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  } else {
    // Open WhatsApp generic share intent
    url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  }

  // Open in new window or Android intent
  window.open(url, '_blank');
}

export function printReceiptNow() {
  window.print();
}
