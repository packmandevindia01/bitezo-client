import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, 
  Printer, 
  BarChart3, 
  Monitor, 
  LayoutGrid, 
  ExternalLink,
  Shield
} from 'lucide-react';
import { Modal } from '../../../../../../components/common';
import { t } from '../../../../utils/posLocalization';
import { isDefaultEmployeeActive } from '../../../../utils/defaultEmployee';

interface PosPreSessionMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: () => void;
  requestAuthorization?: (options: any) => void;
}

interface PreSessionActionItem {
  id: string;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  requiresAuth?: boolean;
  permissionId?: number;
  actionLabel?: string;
}

const PRE_SESSION_ITEMS: PreSessionActionItem[] = [
  {
    id: 'report',
    label: 'POS REPORT',
    icon: BarChart3,
    iconBg: 'bg-orange-50',
    iconColor: 'text-orange-600',
    requiresAuth: true,
    permissionId: 26,
    actionLabel: 'Report',
  },
  {
    id: 'configuration',
    label: 'POS CONFIGURATION',
    icon: Settings,
    iconBg: 'bg-indigo-50',
    iconColor: 'text-indigo-600',
  },
  {
    id: 'printer',
    label: 'PRINTER SETTINGS',
    icon: Printer,
    iconBg: 'bg-cyan-50',
    iconColor: 'text-cyan-600',
    requiresAuth: true,
    permissionId: 25,
    actionLabel: 'Printer',
  },
  {
    id: 'backoffice',
    label: 'BACKOFFICE',
    icon: Monitor,
    iconBg: 'bg-blue-50',
    iconColor: 'text-blue-600',
  },
];

export const PosPreSessionMoreModal: React.FC<PosPreSessionMoreModalProps> = ({
  isOpen,
  onClose,
  onOpenReport,
  requestAuthorization,
}) => {
  const navigate = useNavigate();
  const isDefaultEmployee = isDefaultEmployeeActive();

  if (!isOpen) return null;

  const handleActionClick = (item: PreSessionActionItem) => {
    const executeAction = () => {
      onClose();
      if (item.id === 'report') {
        onOpenReport();
      } else if (item.id === 'configuration') {
        navigate('/pos/configuration', { state: { fromPreSession: true } });
      } else if (item.id === 'printer') {
        navigate('/pos/more', { state: { fromPreSession: true } });
      } else if (item.id === 'backoffice') {
        window.open('/?system=backoffice', '_blank');
      }
    };

    if (item.requiresAuth && !isDefaultEmployee && requestAuthorization) {
      onClose();
      requestAuthorization({
        actionLabel: item.actionLabel || item.label,
        permissionId: item.permissionId,
        onAuthorized: executeAction,
      });
      return;
    }

    executeAction();
  };

  const customHeader = (
    <div className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-xl bg-[#49293e]/10 text-[#49293e] flex items-center justify-center shadow-2xs">
        <LayoutGrid size={18} strokeWidth={2.2} />
      </div>
      <div>
        <h2 className="text-sm font-bold text-slate-900 leading-tight">
          {t("Pre-Session Tools & Setup")}
        </h2>
      </div>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customHeader}
      size="lg"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-1">
        {PRE_SESSION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleActionClick(item)}
              className="group relative flex items-center gap-3.5 p-3.5 rounded-2xl border border-slate-200/80 bg-white hover:border-[#49293e]/40 hover:bg-gradient-to-r hover:from-white hover:to-[#49293e]/5 hover:shadow-xs active:scale-[0.98] transition-all text-left w-full cursor-pointer shadow-2xs"
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${item.iconBg} ${item.iconColor} transition-transform group-hover:scale-105 shadow-xs border border-black/5`}
              >
                <Icon size={20} strokeWidth={2} />
              </div>

              <div className="flex-1 min-w-0 flex items-center justify-between gap-1">
                <span className="text-xs font-black text-slate-800 group-hover:text-[#49293e] tracking-tight truncate leading-tight">
                  {t(item.label)}
                </span>
                {item.requiresAuth && !isDefaultEmployee && (
                  <span
                    className="shrink-0 flex items-center gap-1 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200/60 rounded px-1.5 py-0.5"
                    title="Manager approval required"
                  >
                    <Shield size={9} strokeWidth={2.5} />
                    PIN
                  </span>
                )}
                {item.id === 'backoffice' && (
                  <span className="shrink-0 text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={13} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
};
