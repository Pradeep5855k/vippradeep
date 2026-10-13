import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  Package,
  Users,
  BarChart3,
  Truck,
  Receipt,
  Settings,
  MoreHorizontal,
} from 'lucide-react';

interface BottomNavProps {
  currentView: string;
  onNavigate: (view: string) => void;
  lowStockCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onNavigate,
  lowStockCount = 0,
}) => {
  const [showMoreMenu, setShowMoreMenu] = React.useState(false);

  const mainTabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'billing', label: 'Billing', icon: ReceiptText, isPrimary: true },
    {
      id: 'products',
      label: 'Products',
      icon: Package,
      badge: lowStockCount > 0 ? lowStockCount : undefined,
    },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  return (
    <>
      {/* Pop-up More Drawer for secondary actions on mobile */}
      {showMoreMenu && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setShowMoreMenu(false)}
        >
          <div
            className="absolute bottom-16 inset-x-2 bg-white rounded-2xl p-3 shadow-2xl border border-slate-200 divide-y divide-slate-100"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pb-2">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-1">
                More Management Tools
              </div>
              <button
                onClick={() => {
                  onNavigate('suppliers');
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 text-sm font-semibold transition"
              >
                <Truck className="w-5 h-5 text-blue-600" />
                <span>Suppliers & Purchases</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('returns-expenses');
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 text-sm font-semibold transition"
              >
                <Receipt className="w-5 h-5 text-amber-600" />
                <span>Sales Returns & Shop Expenses</span>
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  onNavigate('android-export');
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 text-sm font-semibold transition"
              >
                <div className="w-5 h-5 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                  APK
                </div>
                <span>Android Source Code & APK</span>
              </button>
              <button
                onClick={() => {
                  onNavigate('settings');
                  setShowMoreMenu(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-800 text-sm font-semibold transition"
              >
                <Settings className="w-5 h-5 text-slate-600" />
                <span>Shop Settings & Backup</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Bottom Bar */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200/90 shadow-lg no-print">
        <div className="max-w-md mx-auto grid grid-cols-5 h-16 items-center px-1">
          {mainTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentView === tab.id;

            if (tab.isPrimary) {
              return (
                <div key={tab.id} className="flex justify-center items-center">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMoreMenu(false);
                      onNavigate(tab.id);
                    }}
                    className={`flex flex-col items-center justify-center w-12 h-12 -mt-4 rounded-2xl shadow-md transition-transform active:scale-90 ${
                      isActive
                        ? 'bg-blue-700 text-white ring-4 ring-blue-100'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    aria-label="Billing POS"
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                </div>
              );
            }

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setShowMoreMenu(false);
                  onNavigate(tab.id);
                }}
                className={`relative flex flex-col items-center justify-center h-full transition-colors ${
                  isActive
                    ? 'text-blue-700 font-bold'
                    : 'text-slate-500 hover:text-slate-900 font-medium'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>

                {/* Badge indicator */}
                {tab.badge !== undefined && (
                  <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-amber-500" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
