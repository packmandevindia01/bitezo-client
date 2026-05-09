import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Printer, 
  LayoutGrid, 
  Lock, 
  BarChart, 
  Shield, 
  DollarSign, 
  Archive, 
  FileText,
  History,
  Search,
  ArrowLeftRight,
  LogOut,
  UtensilsCrossed,
} from 'lucide-react';
import { Modal } from '../../../../components/common';

interface PosMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashierOut: () => void;
}

const MORE_ITEMS = [
  { label: 'CONFIGURATION', icon: Settings },
  { label: 'REPORT', icon: BarChart },
  { label: 'PRIVILEGES', icon: Shield },
  { label: 'PRINTER', icon: Printer, action: 'printer' },
  { label: 'LOCK ITEM', icon: Lock, action: 'lock' },
  { label: 'CASH DRAWER', icon: Archive },
  { label: 'CHARGES', icon: DollarSign },
  { label: 'PAY IN / OUT', icon: ArrowLeftRight, action: 'payInOut' },
  { label: 'CASHIER OUT', icon: LogOut, action: 'cashierOut' },
];

const ORDER_ITEMS = [
  { label: 'ORDER HISTORY', icon: History },
  { label: 'ACTIVE ORDERS', icon: FileText },
  { label: 'TABLE STATUS', icon: LayoutGrid },
  { label: 'CUSTOMER SEARCH', icon: Search },
  { label: 'SET MENU DINE IN', icon: UtensilsCrossed, action: 'setMenuDineIn' },
];

const PosMoreModal: React.FC<PosMoreModalProps> = ({ isOpen, onClose, onCashierOut }) => {
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
    if (item.action === 'cashierOut') {
      onClose();
      onCashierOut();
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
      <div className="space-y-8">
        {/* Order Section */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
            Order Management
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {ORDER_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-gray-100 text-[#49293e] p-6 rounded-xl flex flex-col items-center justify-center gap-3 transition-all active:scale-95 shadow-sm hover:border-[#49293e] hover:bg-[#49293e]/5 group"
              >
                <item.icon className="w-8 h-8 text-[#49293e] opacity-70 group-hover:opacity-100 transition-all" strokeWidth={1.5} />
                <span className="text-xs font-bold tracking-wider text-center uppercase">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Configuration Grid */}
        <div>
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-4">
            System Configuration
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {MORE_ITEMS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleItemClick(item)}
                className="bg-white border-2 border-gray-100 text-[#49293e] h-28 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] rounded-xl hover:border-[#49293e] hover:bg-[#49293e]/5 shadow-sm group"
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

export default PosMoreModal;
