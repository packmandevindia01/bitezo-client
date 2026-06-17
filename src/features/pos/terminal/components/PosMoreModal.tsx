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
  Banknote,
  LogOut,
  UtensilsCrossed,
  UserPlus,
  Monitor,
  Gift,
  CheckCircle,
  Lock,
} from 'lucide-react';
import { Modal } from '../../../../components/common';

interface PosMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashierOut: () => void;
  onCustomerMaster: () => void;
  onItemComplimentary: () => void;
  onBillComplimentary: () => void;
  onSettledOrders: () => void;
  onReport: () => void;
}

const ORDER_ITEMS = [
  { label: 'ORDER HISTORY', icon: History },
  { label: 'ACTIVE ORDERS', icon: FileText },
  { label: 'SETTLED', icon: CheckCircle, action: 'settledOrders' },
  { label: 'TABLE STATUS', icon: LayoutGrid },
  { label: 'CUSTOMER SEARCH', icon: Search },
  { label: 'CUSTOMER MASTER', icon: UserPlus, action: 'customerMaster' },
  { label: 'SET MENU DINE IN', icon: UtensilsCrossed, action: 'setMenuDineIn' },
];

const CASHIER_ITEMS = [
  { label: 'PAY IN / OUT', icon: Banknote, action: 'payInOut' },
  { label: 'CASHIER OUT', icon: LogOut, action: 'cashierOut', color: 'text-amber-500' },
];

const SYSTEM_ITEMS = [
  { label: 'BACK OFFICE', icon: Monitor, action: 'backoffice' },
  { label: 'CONFIGURATION', icon: Settings },
  { label: 'REPORT', icon: BarChart, action: 'report' },
  { label: 'PRINTER', icon: Printer, action: 'printer' },
  { label: 'LOCK PRODUCTS', icon: Lock, action: 'lock' },
];

const DISCOUNT_ITEMS = [
  { label: 'ITEM COMPLIMENTARY', icon: Gift, action: 'itemComp', color: 'text-emerald-500' },
  { label: 'BILL COMPLIMENTARY', icon: Gift, action: 'billComp', color: 'text-emerald-500' },
];

interface SectionProps {
  title: string;
  children: React.ReactNode;
}

const Section = ({ title, children }: SectionProps) => (
  <div>
    <h3 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
      <span className="w-5 h-px bg-slate-200 shrink-0" />
      {title}
    </h3>
    {children}
  </div>
);

interface ActionBtnProps {
  icon: React.ElementType;
  label: string;
  color?: string;
  height?: string;
  onClick: () => void;
}

const ActionBtn = ({ icon: Icon, label, color, height = 'h-20', onClick }: ActionBtnProps) => (
  <button
    onClick={onClick}
    className={`bg-white border-2 border-slate-100 ${height} rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all active:scale-[0.96] shadow-sm hover:border-[#49293e] hover:bg-[#49293e]/5 group w-full`}
  >
    <Icon
      className={`w-6 h-6 ${color || 'text-[#49293e]'} opacity-70 group-hover:opacity-100 transition-all`}
      strokeWidth={1.5}
    />
    <span className="text-[9px] font-black tracking-wider text-center uppercase leading-tight px-1 text-slate-600 group-hover:text-[#49293e]">
      {label}
    </span>
  </button>
);

export const PosMoreModal: React.FC<PosMoreModalProps> = ({ 
  isOpen, 
  onClose, 
  onCashierOut, 
  onCustomerMaster,
  onItemComplimentary,
  onBillComplimentary,
  onSettledOrders,
  onReport
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (item: { action?: string; label: string }) => {
    if (item.action === 'printer') {
      onClose();
      navigate('/pos/more');
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
      navigate('/pos/pay-in-out');
      return;
    }
    if (item.action === 'backoffice') {
      onClose();
      window.open('/?system=backoffice', '_blank');
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
    if (item.action === 'itemComp') {
      onClose();
      onItemComplimentary();
      return;
    }
    if (item.action === 'billComp') {
      onClose();
      onBillComplimentary();
      return;
    }
    if (item.action === 'settledOrders') {
      onClose();
      onSettledOrders();
      return;
    }
    if (item.action === 'report') {
      onClose();
      onReport();
      return;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuration & Orders"
      size="2xl"
    >
      {/*
        Layout strategy:
        - On mobile (< sm): 2-col grids, stacked sections
        - On sm+: side-by-side panels to save vertical space
        - On lg (POS 1024px+): all sections must fit in ~560px height (modal max-h)
        
        We use a 2-row grid on lg:
          Top row: Sales (6 items) spanning full width
          Bottom row: Discounts + Cashier + System side-by-side
      */}
      <div className="flex flex-col gap-2.5">

        {/* SALES & CUSTOMERS — full width, 6 cols on lg */}
        <Section title="Sales & Customers">
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {ORDER_ITEMS.map((item) => (
              <ActionBtn
                key={item.label}
                icon={item.icon}
                label={item.label}
                height="h-20"
                onClick={() => handleItemClick(item)}
              />
            ))}
          </div>
        </Section>

        {/* Bottom 3 sections: on lg they sit side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">

          {/* DISCOUNTS & COMPLIMENTARY */}
          <Section title="Discounts & Complimentary">
            <div className="grid grid-cols-2 gap-2.5">
              {DISCOUNT_ITEMS.map((item) => (
                <ActionBtn
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </Section>

          {/* CASHIER SERVICES */}
          <Section title="Cashier Services">
            <div className="grid grid-cols-2 gap-2.5">
              {CASHIER_ITEMS.map((item) => (
                <ActionBtn
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </Section>

          {/* SYSTEM & CONFIGURATION */}
          <Section title="System & Configuration">
            <div className="grid grid-cols-2 gap-2.5">
              {SYSTEM_ITEMS.map((item) => (
                <ActionBtn
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleItemClick(item)}
                />
              ))}
            </div>
          </Section>

        </div>
      </div>
    </Modal>
  );
};
