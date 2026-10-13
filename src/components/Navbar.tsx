import React from 'react';
import {
  Store,
  ShoppingCart,
  PlusCircle,
  Truck,
  Receipt,
  Settings as SettingsIcon,
  Smartphone,
  Lock,
  Wifi,
  Sparkles,
} from 'lucide-react';
import { ShopSettings } from '../types';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  settings: ShopSettings;
  onLockApp?: () => void;
  lowStockCount: number;
  onOpen3DModal?: (model: 'pos' | 'scanner' | 'product') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  settings,
  onLockApp,
  lowStockCount,
  onOpen3DModal,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2.5 cursor-pointer shrink-0 select-none"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base sm:text-lg tracking-tight leading-none text-white whitespace-nowrap">
                {settings.shopName || 'Billing Pro'}
              </span>
              <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-200 border border-blue-700/50">
                POS
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate max-w-[200px] sm:max-w-xs mt-0.5">
              {settings.address || 'Offline Retail Billing System'}
            </p>
          </div>
        </div>

        {/* Center/Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Counter Billing Shortcut button */}
          <button
            type="button"
            onClick={() => onNavigate('billing')}
            className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm ${
              currentView === 'billing'
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span className="whitespace-nowrap">New Bill</span>
          </button>

          {/* Suppliers & Stock */}
          <button
            type="button"
            onClick={() => onNavigate('suppliers')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === 'suppliers'
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-4 h-4 text-blue-400" />
            <span>Suppliers</span>
          </button>

          {/* Returns & Expenses */}
          <button
            type="button"
            onClick={() => onNavigate('returns-expenses')}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === 'returns-expenses'
                ? 'bg-slate-800 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-amber-400" />
            <span>Returns & Expenses</span>
          </button>

          {/* 3D Hardware & Models Viewer */}
          {onOpen3DModal && (
            <button
              type="button"
              onClick={() => onOpen3DModal('pos')}
              className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-blue-300 hover:bg-slate-700 hover:text-white transition border border-blue-900/50"
              title="Interactive 3D POS Terminal & Laser Scanner Models"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>3D Models</span>
            </button>
          )}

          {/* Android APK & Kotlin Code Hub */}
          <button
            type="button"
            onClick={() => onNavigate('android-export')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition ${
              currentView === 'android-export'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white'
            }`}
            title="Native Android Kotlin Project & APK Guide"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Android APK</span>
          </button>

          {/* Settings */}
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className={`p-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition ${
              currentView === 'settings' ? 'bg-slate-800 text-white' : ''
            }`}
            title="Settings & Backup"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>

          {/* Lock App */}
          {settings.enablePinLock && onLockApp && (
            <button
              type="button"
              onClick={onLockApp}
              className="p-2 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition"
              title="Lock with PIN"
            >
              <Lock className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
