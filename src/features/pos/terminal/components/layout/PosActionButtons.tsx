import React from 'react';
import { Lock } from 'lucide-react';
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
  return (
    <div className="grid grid-cols-7 gap-1 lg:gap-1.5 py-1 sm:py-1.5 lg:py-2 px-1.5 sm:px-3 lg:px-4 bg-white border-t border-slate-100 shrink-0">
      <button
        onClick={onClearCart}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
        tabIndex={-1}
      >
        {t("Clear")}
      </button>
      <button
        onClick={onCustomer}
        className={`h-7 md:h-8 lg:h-9 rounded text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5 relative flex items-center justify-center gap-0.5 ${
          isCustomerLocked
            ? 'bg-[#d95f16] hover:bg-[#c45310]'
            : selectedCustomerName && selectedCustomerId && Number(selectedCustomerId) !== 1
            ? 'bg-[#d95f16] hover:bg-[#c45310] ring-1 ring-white/40'
            : 'bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md'
        }`}
        title={
          isCustomerLocked
            ? 'Customer locked to configured Post Account'
            : selectedCustomerName && selectedCustomerId && Number(selectedCustomerId) !== 1
            ? `Assigned Customer: ${selectedCustomerName}`
            : t('Select Customer')
        }
        tabIndex={-1}
      >
        {isCustomerLocked && <Lock size={10} className="shrink-0" />}
        <span className="truncate max-w-full flex items-center justify-center gap-1">
          {selectedCustomerName && selectedCustomerId && Number(selectedCustomerId) !== 1 ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs"></span>
              <span className="truncate max-w-[55px] sm:max-w-[75px]">{t(selectedCustomerName)}</span>
            </>
          ) : (
            t('Customer')
          )}
        </span>
      </button>
      <button 
        onClick={onWaiter}
        className={`h-7 md:h-8 lg:h-9 rounded text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5 relative flex items-center justify-center gap-0.5 ${
          selectedWaiterName
            ? 'bg-[#d95f16] hover:bg-[#c45310] ring-1 ring-white/40'
            : 'bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md'
        }`}
        title={selectedWaiterName ? `${t('Assigned Waiter')}: ${t(selectedWaiterName)}` : t('Select Waiter')}
      >
        <span className="truncate max-w-full flex items-center justify-center gap-1">
          {selectedWaiterName ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 shadow-xs"></span>
              <span className="truncate max-w-[55px] sm:max-w-[75px]">{t(selectedWaiterName)}</span>
            </>
          ) : (
            t('Waiter')
          )}
        </span>
      </button>
      <button
        onClick={onSplit}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 px-0.5"
        disabled={!isOrderEditing}
      >
        {t("Split")}
      </button>
      <button
        onClick={onCombine}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 px-0.5"
        disabled={!isOrderEditing}
      >
        {t("Combine")}
      </button>
      <button
        onClick={onRecall}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
      >
        {t("Recall")}
      </button>
      <button
        onClick={onMore}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
      >
        {t("More")}
      </button>
    </div>
  );
});
