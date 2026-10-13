/**
 * Billing Pro - General Shop Billing Application
 * Designed for Grocery, Provision and Retail Stores in India
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { ReceiptModal } from './components/ReceiptModal';
import { PinLockModal } from './components/PinLockModal';
import { ThreeDHardwareModal } from './components/ThreeDHardwareModal';
import { DashboardView } from './views/DashboardView';
import { BillingView } from './views/BillingView';
import { ProductsView } from './views/ProductsView';
import { CustomersView } from './views/CustomersView';
import { SuppliersView } from './views/SuppliersView';
import { ReturnsExpensesView } from './views/ReturnsExpensesView';
import { ReportsView } from './views/ReportsView';
import { SettingsView } from './views/SettingsView';
import { AndroidExportView } from './views/AndroidExportView';
import { storage } from './services/storageService';
import { Invoice, ShopSettings } from './types';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [settings, setSettings] = useState<ShopSettings>(storage.getSettings());
  const [lowStockCount, setLowStockCount] = useState<number>(0);

  // Receipt Modal State
  const [activeReceipt, setActiveReceipt] = useState<Invoice | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // 3D Hardware & Product Model Modal State
  const [is3DModalOpen, setIs3DModalOpen] = useState(false);
  const [selected3DModel, setSelected3DModel] = useState<'pos' | 'scanner' | 'product'>('pos');
  const [selected3DProduct, setSelected3DProduct] = useState<{ name: string; price: number }>({
    name: 'Aashirvaad Chakki Atta 5kg',
    price: 275,
  });

  // PIN Security Lock
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    const updateMetrics = () => {
      const s = storage.getSettings();
      setSettings(s);
      const metrics = storage.getDashboardMetrics();
      setLowStockCount(metrics.lowStockAlerts);
    };

    updateMetrics();
    const unsub = storage.subscribe(updateMetrics);
    return unsub;
  }, []);

  const handleOpenReceipt = (invoice: Invoice) => {
    setActiveReceipt(invoice);
    setIsReceiptOpen(true);
  };

  const handleBillCompleted = (invoice: Invoice) => {
    setActiveReceipt(invoice);
    setIsReceiptOpen(true);
  };

  const handleOpen3DModal = (
    model: 'pos' | 'scanner' | 'product' = 'pos',
    name = 'Aashirvaad Chakki Atta 5kg',
    price = 275
  ) => {
    setSelected3DModel(model);
    setSelected3DProduct({ name, price });
    setIs3DModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top App Bar */}
      <Navbar
        currentView={currentView}
        onNavigate={setCurrentView}
        settings={settings}
        lowStockCount={lowStockCount}
        onLockApp={settings.enablePinLock ? () => setIsLocked(true) : undefined}
        onOpen3DModal={handleOpen3DModal}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6">
        {currentView === 'dashboard' && (
          <DashboardView
            onNavigate={setCurrentView}
            onOpenReceipt={handleOpenReceipt}
            onOpen3DModal={handleOpen3DModal}
          />
        )}

        {currentView === 'billing' && (
          <BillingView onBillCompleted={handleBillCompleted} />
        )}

        {currentView === 'products' && <ProductsView />}

        {currentView === 'customers' && (
          <CustomersView onOpenReceipt={handleOpenReceipt} />
        )}

        {currentView === 'suppliers' && <SuppliersView />}

        {currentView === 'returns-expenses' && <ReturnsExpensesView />}

        {currentView === 'reports' && <ReportsView />}

        {currentView === 'settings' && <SettingsView />}

        {currentView === 'android-export' && <AndroidExportView />}
      </main>

      {/* Android Bottom Navigation */}
      <BottomNav
        currentView={currentView}
        onNavigate={setCurrentView}
        lowStockCount={lowStockCount}
      />

      {/* 58mm / 80mm Thermal Receipt Modal */}
      <ReceiptModal
        invoice={activeReceipt}
        settings={settings}
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
      />

      {/* 3D Hardware & Product Inspection Modal */}
      <ThreeDHardwareModal
        isOpen={is3DModalOpen}
        onClose={() => setIs3DModalOpen(false)}
        initialModel={selected3DModel}
        productName={selected3DProduct.name}
        productPrice={selected3DProduct.price}
      />

      {/* PIN Lock Screen Modal */}
      {settings.enablePinLock && (
        <PinLockModal
          isLocked={isLocked}
          correctPin={settings.appPin || '1234'}
          onUnlock={() => setIsLocked(false)}
        />
      )}
    </div>
  );
}
