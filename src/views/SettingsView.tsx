import React, { useState, useEffect, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Store,
  Shield,
  Download,
  Upload,
  Lock,
  Printer,
  QrCode,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { storage } from '../services/storageService';
import { ShopSettings } from '../types';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<ShopSettings>(storage.getSettings());
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setSettings(storage.getSettings());
  }, []);

  const handleChange = (field: keyof ShopSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    storage.updateSettings(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Export JSON file
  const handleExportJSON = () => {
    const jsonStr = storage.exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `billing_pro_backup_${timestamp}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Import JSON file
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const confirmed = window.confirm(
      'Warning: Restoring data will overwrite your current inventory, invoices, and customers. Are you sure you wish to proceed?'
    );
    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const result = storage.importDatabaseJSON(text);
        if (result.success) {
          setSettings(storage.getSettings());
          setRestoreStatus('✓ Database successfully restored from backup file.');
        } else {
          setRestoreStatus('✗ Error: ' + result.message);
        }
      } catch (err: any) {
        setRestoreStatus('✗ Failed to read file: ' + err.message);
      }
      setTimeout(() => setRestoreStatus(null), 5000);
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all records to standard demo grocery catalog and sample records?')) {
      storage.resetToDemoData();
      setSettings(storage.getSettings());
      setRestoreStatus('✓ Reset to sample demo grocery catalog complete.');
      setTimeout(() => setRestoreStatus(null), 4000);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('WARNING: Are you sure you want to erase all data? This cannot be undone.')) {
      storage.clearAllData();
      setSettings(storage.getSettings());
      setRestoreStatus('✓ All data wiped cleanly.');
      setTimeout(() => setRestoreStatus(null), 4000);
    }
  };

  return (
    <div className="space-y-4 pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            <span>Shop Configuration & Security</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure business profile, GSTIN, thermal printer preferences, PIN lock and backups
          </p>
        </div>

        {savedSuccess && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
            <CheckCircle2 className="w-4 h-4" />
            <span>Saved!</span>
          </span>
        )}
      </div>

      {restoreStatus && (
        <div
          className={`p-3 rounded-2xl text-xs font-semibold ${
            restoreStatus.startsWith('✓')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {restoreStatus}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Shop Profile Section */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span>Shop & Tax Identification</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Shop / Store Name *
              </label>
              <input
                type="text"
                required
                value={settings.shopName}
                onChange={(e) => handleChange('shopName', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tagline / Subtitle
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => handleChange('tagline', e.target.value)}
                placeholder="e.g. Fresh Groceries & Provisions"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">
                Shop Address (Printed on Invoices) *
              </label>
              <input
                type="text"
                required
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Mobile / Phone Number *
              </label>
              <input
                type="text"
                required
                value={settings.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                GSTIN Number (Optional)
              </label>
              <input
                type="text"
                value={settings.gstin}
                onChange={(e) => handleChange('gstin', e.target.value)}
                placeholder="29AABCS1429B1Z2"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                FSSAI License Number (Optional)
              </label>
              <input
                type="text"
                value={settings.fssaiNumber}
                onChange={(e) => handleChange('fssaiNumber', e.target.value)}
                placeholder="11223344556677"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Shop UPI ID (for Dynamic QR on Receipts)
              </label>
              <input
                type="text"
                value={settings.upiId}
                onChange={(e) => handleChange('upiId', e.target.value)}
                placeholder="e.g. storename@okaxis"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
              />
            </div>
          </div>
        </div>

        {/* Invoice & Thermal Printing Preferences */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Thermal Bill & Invoice Preferences</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs sm:text-sm">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                value={settings.invoicePrefix}
                onChange={(e) => handleChange('invoicePrefix', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Next Invoice Number
              </label>
              <input
                type="number"
                value={settings.nextInvoiceNumber}
                onChange={(e) => handleChange('nextInvoiceNumber', parseInt(e.target.value) || 1001)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Thermal Printer Paper Width
              </label>
              <select
                value={settings.thermalWidth}
                onChange={(e) => handleChange('thermalWidth', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
              >
                <option value="58mm">58 mm (Small Mobile / Bluetooth POS)</option>
                <option value="80mm">80 mm (Counter Desktop Thermal)</option>
              </select>
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Receipt Footer Note
              </label>
              <input
                type="text"
                value={settings.footerNote}
                onChange={(e) => handleChange('footerNote', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">
                Store Return Policy Text
              </label>
              <input
                type="text"
                value={settings.returnPolicyText}
                onChange={(e) => handleChange('returnPolicyText', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Security & PIN Lock */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
            <Lock className="w-4 h-4 text-blue-600" />
            <span>App Lock & Counter Security</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm items-center">
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <input
                type="checkbox"
                id="enablePinLock"
                checked={settings.enablePinLock}
                onChange={(e) => handleChange('enablePinLock', e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <label htmlFor="enablePinLock" className="font-semibold text-slate-800 cursor-pointer">
                Enable 4-digit Security PIN Lock
              </label>
            </div>

            {settings.enablePinLock && (
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  4-Digit Security PIN
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={settings.appPin}
                  onChange={(e) => handleChange('appPin', e.target.value)}
                  className="w-32 px-3 py-2 border border-slate-300 rounded-xl font-mono-numbers text-center text-lg tracking-widest font-bold"
                />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-md transition"
        >
          Save All Settings
        </button>
      </form>

      {/* Backup & Restore Panel */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-2">
          <Download className="w-4 h-4 text-blue-600" />
          <span>Manual Backup & Restore Data</span>
        </h3>
        <p className="text-xs text-slate-500">
          Download your full database to a JSON file or restore from a previous backup without cloud subscriptions.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export Backup (JSON)</span>
          </button>

          <label className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer transition">
            <Upload className="w-4 h-4 text-blue-600" />
            <span>Restore Backup File</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-semibold transition ml-auto"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reload Demo Data</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-xs font-semibold transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset All</span>
          </button>
        </div>
      </div>
    </div>
  );
};
