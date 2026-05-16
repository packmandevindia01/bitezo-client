import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Printer, 
  LayoutGrid, 
  BarChart, 
  FileText,
  History,
  Search,
  ArrowLeftRight,
  LogOut,
  UtensilsCrossed,
  UserPlus,
  Monitor,
} from 'lucide-react';
import { Modal } from '../../../../components/common';

interface PosMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashierOut: () => void;
  onCustomerMaster: () => void;
}

const ORDER_ITEMS = [
  { label: 'ORDER HISTORY', icon: History },
  { label: 'ACTIVE ORDERS', icon: FileText },
  { label: 'TABLE STATUS', icon: LayoutGrid },
  { label: 'CUSTOMER SEARCH', icon: Search },
  { label: 'CUSTOMER MASTER', icon: UserPlus, action: 'customerMaster' },
  { label: 'SET MENU DINE IN', icon: UtensilsCrossed, action: 'setMenuDineIn' },
];

const CASHIER_ITEMS = [
  { label: 'PAY IN / OUT', icon: ArrowLeftRight, action: 'payInOut' },
  { label: 'CASHIER OUT', icon: LogOut, action: 'cashierOut', color: 'text-amber-500' },
];

const SYSTEM_ITEMS = [
  { label: 'BACK OFFICE', icon: Monitor, action: 'backoffice' },
  { label: 'CONFIGURATION', icon: Settings },
  { label: 'REPORT', icon: BarChart },
  { label: 'PRINTER', icon: Printer, action: 'printer' },
];

export const PosMoreModal: React.FC<PosMoreModalProps> = ({ isOpen, onClose, onCashierOut, onCustomerMaster }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (item: any) => {
    if (item.action === 'printer') {
      onClose();
      navigate('/pos/more'); // Navigates to the separate Printer Settings page
      return;
    }
    if (item.action === 'lock') {
      onClose();
      navigate('/pos/lock-item');
      return;
    }
    if (item.action === 'setMenuDineIn') {
      onClose();
      navigate('/pos/dine-in');
      return;
    }
    if (item.action === 'payInOut') {
      onClose();
      navigate('/cashier/out', { state: { activeTab: 'TRANSACTIONS' } });
      return;
    }
    if (item.action === 'backoffice') {
      onClose();
      localStorage.setItem("systemType", "backoffice");
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("userId");
      localStorage.removeItem("activeShift");
      navigate("/", { replace: true });
      return;
    }
    if (item.action === 'cashierOut') {
      onClose();
      onCashierOut();
      return;
    }
    if (item.action === 'customerMaster') {
      onClose();
      onCustomerMaster();
      return;
    }
    // All other items are just buttons, no navigation
  };


  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration & Orders"
      size="2xl"
    >
      <div className="space-y-10 py-2">
        {/* Order Section */}
        <div>
          <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-3">
            <span className="w-8 h-px bg-slate-200"></span>
            SALES & CUSTOMERS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {ORDER_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-slate-100 text-[#49293e] p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all active:scale-[0.96] shadow-sm hover:border-[#49293e] hover:bg-[#49293e]/5 group"
              >
                <item.icon className="w-8 h-8 text-[#49293e] opacity-70 group-hover:opacity-100 transition-all" strokeWidth={1.5} />
                <span className="text-[10px] font-black tracking-wider text-center uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Cashier Section */}
        <div>
          <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-3">
            <span className="w-8 h-px bg-slate-200"></span>
            CASHIER SERVICES
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {CASHIER_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-slate-100 text-[#49293e] h-28 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.96] rounded-2xl hover:border-[#49293e] hover:bg-[#49293e]/5 shadow-sm group"
              >
                <item.icon className={`w-8 h-8 ${item.color || 'text-[#49293e]'} opacity-80 group-hover:opacity-100 transition-all`} strokeWidth={2} />
                <span className="text-[10px] font-black tracking-widest text-center px-2 uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Section */}
        <div>
          <h3 className="text-[11px] font-extrabold text-slate-400 uppercase tracking-[0.25em] mb-4 flex items-center gap-3">
            <span className="w-8 h-px bg-slate-200"></span>
            SYSTEM & CONFIGURATION
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {SYSTEM_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-slate-100 text-[#49293e] h-28 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.96] rounded-2xl hover:border-[#49293e] hover:bg-[#49293e]/5 shadow-sm group"
              >
                <item.icon className="w-7 h-7 text-[#49293e] opacity-70 group-hover:opacity-100 transition-all" strokeWidth={1.5} />
                <span className="text-[10px] font-bold tracking-widest text-center px-2 uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};


