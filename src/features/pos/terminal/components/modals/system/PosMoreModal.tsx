import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Printer, 
  BarChart3, 
  Banknote, 
  LogOut, 
  UtensilsCrossed, 
  Users, 
  Monitor, 
  Gift, 
  CheckCircle2, 
  Lock, 
  Sparkles,
  Shield,
  LayoutGrid,
  ExternalLink
} from 'lucide-react';
import { Modal } from '../../../../../../components/common';

interface PosMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCashierOut: () => void;
  onCustomerMaster: () => void;
  onItemComplimentary: () => void;
  onBillComplimentary: () => void;
  onSettledOrders: () => void;
  onReport: () => void;
  requestAuthorization: (options: any) => void;
}

interface ActionItem {
  label: string;
  description: string;
  icon: React.ElementType;
  action: string;
  iconBg: string;
  iconColor: string;
  requiresAuth?: boolean;
}

const ORDER_ITEMS: ActionItem[] = [
  { 
    label: 'SETTLED ORDERS', 
    description: 'View and reprint settled invoices', 
    icon: CheckCircle2, 
    action: 'settledOrders',
    iconBg: 'bg-[#49293e]/10',
    iconColor: 'text-[#49293e]',
    requiresAuth: true
  },
  { 
    label: 'CUSTOMER MASTER', 
    description: 'Search or add customer accounts', 
    icon: Users, 
    action: 'customerMaster',
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600'
  },
  { 
    label: 'SET MENU DINE-IN', 
    description: 'Floor plan & dining table orders', 
    icon: UtensilsCrossed, 
    action: 'setMenuDineIn',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600'
  },
];

const CASHIER_ITEMS: ActionItem[] = [
  { 
    label: 'PAY IN / PAY OUT', 
    description: 'Petty cash drawer float & payout', 
    icon: Banknote, 
    action: 'payInOut',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    requiresAuth: true
  },
  { 
    label: 'CASHIER OUT', 
    description: 'Close register & count shift drawer', 
    icon: LogOut, 
    action: 'cashierOut',
    iconBg: 'bg-red-50',
    iconColor: 'text-red-500'
  },
  { 
    label: 'SHIFT REPORT', 
    description: 'Daily sales summaries & Z-Report', 
    icon: BarChart3, 
    action: 'report',
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    requiresAuth: true
  },
];

const DISCOUNT_ITEMS: ActionItem[] = [
  { 
    label: 'ITEM COMPLIMENTARY', 
    description: 'Mark selected order item as 100% off', 
    icon: Gift, 
    action: 'itemComp',
    iconBg: 'bg-emerald-50',
    iconColor: 'text-emerald-600'
  },
  { 
    label: 'BILL COMPLIMENTARY', 
    description: 'Apply 100% complimentary to bill', 
    icon: Sparkles, 
    action: 'billComp',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600'
  },
  { 
    label: 'LOCK PRODUCTS', 
    description: 'Temporarily 86 out-of-stock menu items', 
    icon: Lock, 
    action: 'lock',
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-700',
    requiresAuth: true
  },
];

const SYSTEM_ITEMS: ActionItem[] = [
  { 
    label: 'BACK OFFICE', 
    description: 'Open full backoffice management portal', 
    icon: Monitor, 
    action: 'backoffice',
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  { 
    label: 'POS CONFIGURATION', 
    description: 'Terminal settings & operational rules', 
    icon: Settings, 
    action: 'configuration',
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600'
  },
  { 
    label: 'PRINTER SETTINGS', 
    description: 'Hardware receipt & kitchen printers', 
    icon: Printer, 
    action: 'printer',
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    requiresAuth: true
  },
];

interface SectionCardProps {
  title: string;
  badge: string;
  badgeColor: string;
  items: ActionItem[];
  onItemClick: (item: ActionItem) => void;
}

const SectionCard: React.FC<SectionCardProps> = ({ title, badge, badgeColor, items, onItemClick }) => (
  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-3 flex flex-col gap-2 shadow-2xs">
    <div className="flex items-center justify-between pb-1 border-b border-slate-200/60">
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${badgeColor}`} />
        <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
          {title}
        </h3>
      </div>
      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
        {badge}
      </span>
    </div>
    <div className="grid grid-cols-1 gap-1.5">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.label}
            type="button"
            onClick={() => onItemClick(item)}
            className="group relative flex items-center gap-3 p-2 rounded-xl border border-slate-200/70 bg-white hover:border-[#49293e]/40 hover:bg-gradient-to-r hover:from-white hover:to-[#49293e]/5 hover:shadow-xs active:scale-[0.98] transition-all duration-150 text-left w-full cursor-pointer"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor} transition-transform group-hover:scale-105 shadow-xs border border-black/5`}>
              <Icon size={18} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-800 group-hover:text-[#49293e] tracking-tight truncate leading-tight">
                  {item.label}
                </span>
                {item.requiresAuth && (
                  <span className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 rounded px-1 py-0.2" title="Manager approval required">
                    <Shield size={9} strokeWidth={2.5} />
                    PIN
                  </span>
                )}
                {item.action === 'backoffice' && (
                  <span className="shrink-0 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={12} />
                  </span>
                )}
              </div>
              <p className="text-[9.5px] text-slate-400 font-medium leading-tight mt-0.5 truncate">
                {item.description}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  </div>
);

export const PosMoreModal: React.FC<PosMoreModalProps> = ({ 
  isOpen, 
  onClose, 
  onCashierOut, 
  onCustomerMaster,
  onItemComplimentary,
  onBillComplimentary,
  onSettledOrders,
  onReport,
  requestAuthorization
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleItemClick = (item: ActionItem) => {
    if (item.action === 'printer') {
      requestAuthorization({
        actionLabel: "Printer",
        permissionId: 25,
        onAuthorized: () => {
          onClose();
          navigate('/pos/more');
        }
      });
      return;
    }
    if (item.action === 'configuration') {
      onClose();
      navigate('/pos/configuration');
      return;
    }
    if (item.action === 'lock') {
      requestAuthorization({
        actionLabel: "Lock Products",
        permissionId: 18,
        onAuthorized: () => {
          onClose();
          navigate('/pos/lock-item');
        }
      });
      return;
    }
    if (item.action === 'setMenuDineIn') {
      onClose();
      navigate('/pos/dine-in');
      return;
    }
    if (item.action === 'payInOut') {
      requestAuthorization({
        actionLabel: "Pay In Out",
        permissionId: 22,
        onAuthorized: () => {
          onClose();
          navigate('/pos/pay-in-out');
        }
      });
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

  const customHeader = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#49293e]/10 text-[#49293e] flex items-center justify-center shadow-2xs">
        <LayoutGrid size={18} strokeWidth={2.2} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900 leading-tight">Configuration & Operations</h2>
        <p className="text-[10.5px] text-slate-400 font-medium">Quick actions, cashier shift tools, hardware & backoffice controls</p>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      size="2xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-0.5">
        {/* Top Left: Sales & Customers */}
        <SectionCard
          title="Sales & Customers"
          badge="Orders & Dining"
          badgeColor="bg-[#49293e]"
          items={ORDER_ITEMS}
          onItemClick={handleItemClick}
        />

        {/* Top Right: Cashier & Register */}
        <SectionCard
          title="Cashier & Register"
          badge="Shift Services"
          badgeColor="bg-amber-500"
          items={CASHIER_ITEMS}
          onItemClick={handleItemClick}
        />

        {/* Bottom Left: Discounts & Perks */}
        <SectionCard
          title="Discounts & Inventory"
          badge="Offers & 86"
          badgeColor="bg-emerald-500"
          items={DISCOUNT_ITEMS}
          onItemClick={handleItemClick}
        />

        {/* Bottom Right: System & Hardware */}
        <SectionCard
          title="System & Administration"
          badge="Setup & Devices"
          badgeColor="bg-indigo-500"
          items={SYSTEM_ITEMS}
          onItemClick={handleItemClick}
        />
      </div>
    </Modal>
  );
};
