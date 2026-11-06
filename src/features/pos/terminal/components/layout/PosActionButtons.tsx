import React from 'react';
import { ConciergeBell, Combine, Eraser, History, Lock, MoreHorizontal, Split, User, type LucideIcon } from 'lucide-react';
import { t } from '../../../utils/posLocalization';

interface PosActionButtonsProps {
  onClearCart: () => void;
  onCustomer: () => void;
  onWaiter: () => void;
  onSplit: () => void;
  onCombine: () => void;
  onRecall: () => void;
  onMore: () => void;
  isOrderEditing: boolean;
  isCustomerLocked?: boolean;
  selectedWaiterName?: string | null;
  selectedCustomerName?: string | null;
  selectedCustomerId?: number | null;
}

interface ActionButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  disabled?: boolean;
  /** Something is assigned (customer, waiter): a darker shade so it stands out from the rest of the row. */
  active?: boolean;
  title?: string;
  tabIndex?: number;
  children: React.ReactNode;
}

/** Colours and animation: `.pos-action-btn` in index.css. */
const ActionButton = ({ icon: Icon, onClick, disabled, active, title, tabIndex, children }: ActionButtonProps) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    tabIndex={tabIndex}
    className={`pos-action-btn ${active ? 'pos-action-btn--active' : ''} h-7 md:h-8 lg:h-9 rounded-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase px-0.5 flex items-center justify-center gap-1 lg:gap-1.5 min-w-0`}
  >
    <Icon aria-hidden="true" strokeWidth={2.5} className="pos-action-icon hidden min-[480px]:block shrink-0 w-3 h-3 lg:w-3.5 lg:h-3.5" />
    <span className="truncate min-w-0 flex items-center justify-center gap-1">{children}</span>
  </button>
);

const AssignedName = ({ name }: { name: string }) => (
  <>
    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs"></span>
    <span className="truncate max-w-[55px] sm:max-w-[75px]">{t(name)}</span>
  </>
);

export const PosActionButtons = React.memo(function PosActionButtons({
  onClearCart,
  onCustomer,
  onWaiter,
  onSplit,
  onCombine,
  onRecall,
  onMore,
  isOrderEditing,
  isCustomerLocked,
  selectedWaiterName,
  selectedCustomerName,
  selectedCustomerId
}: PosActionButtonsProps) {
  const assignedCustomer = selectedCustomerName && selectedCustomerId && Number(selectedCustomerId) !== 1
    ? selectedCustomerName
    : null;

  return (
    <div className="grid grid-cols-7 gap-1 lg:gap-1.5 py-1 sm:py-1.5 lg:py-2 px-1.5 sm:px-3 lg:px-4 bg-white border-t border-slate-100 shrink-0">
      <ActionButton icon={Eraser} onClick={onClearCart} tabIndex={-1}>
        {t("Clear")}
      </ActionButton>
      <ActionButton
        icon={isCustomerLocked ? Lock : User}
        onClick={onCustomer}
        active={Boolean(isCustomerLocked || assignedCustomer)}
        title={
          isCustomerLocked
            ? 'Customer locked to configured Post Account'
            : assignedCustomer
            ? `Assigned Customer: ${assignedCustomer}`
            : t('Select Customer')
        }
        tabIndex={-1}
      >
        {assignedCustomer ? <AssignedName name={assignedCustomer} /> : t('Customer')}
      </ActionButton>
      <ActionButton
        icon={ConciergeBell}
        onClick={onWaiter}
        active={Boolean(selectedWaiterName)}
        title={selectedWaiterName ? `${t('Assigned Waiter')}: ${t(selectedWaiterName)}` : t('Select Waiter')}
      >
        {selectedWaiterName ? <AssignedName name={selectedWaiterName} /> : t('Waiter')}
      </ActionButton>
      <ActionButton icon={Split} onClick={onSplit} disabled={!isOrderEditing}>
        {t("Split")}
      </ActionButton>
      <ActionButton icon={Combine} onClick={onCombine} disabled={!isOrderEditing}>
        {t("Combine")}
      </ActionButton>
      <ActionButton icon={History} onClick={onRecall}>
        {t("Recall")}
      </ActionButton>
      <ActionButton icon={MoreHorizontal} onClick={onMore}>
        {t("More")}
      </ActionButton>
    </div>
  );
});
