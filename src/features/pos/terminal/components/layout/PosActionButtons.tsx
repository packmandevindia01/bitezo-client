import React from 'react';

interface PosActionButtonsProps {
  onClearCart: () => void;
  onCustomer: () => void;
  onWaiter: () => void;
  onSplit: () => void;
  onCombine: () => void;
  onRecall: () => void;
  onMore: () => void;
  isOrderEditing: boolean;
}

export const PosActionButtons = React.memo(function PosActionButtons({
  onClearCart,
  onCustomer,
  onWaiter,
  onSplit,
  onCombine,
  onRecall,
  onMore,
  isOrderEditing
}: PosActionButtonsProps) {
  return (
    <div className="grid grid-cols-7 gap-1 lg:gap-1.5 py-1 sm:py-1.5 lg:py-2 px-1.5 sm:px-3 lg:px-4 bg-white border-t border-slate-100 shrink-0">
      <button
        onClick={onClearCart}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
        tabIndex={-1}
      >
        Clear
      </button>
      <button
        onClick={onCustomer}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
        tabIndex={-1}
      >
        Customer
      </button>
      <button 
        onClick={onWaiter}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
      >
        Waiter
      </button>
      <button
        onClick={onSplit}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 px-0.5"
        disabled={!isOrderEditing}
      >
        Split
      </button>
      <button
        onClick={onCombine}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 px-0.5"
        disabled={!isOrderEditing}
      >
        Combine
      </button>
      <button
        onClick={onRecall}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
      >
        Recall
      </button>
      <button
        onClick={onMore}
        className="h-7 md:h-8 lg:h-9 rounded bg-[#f37021] hover:bg-[#e0661a] hover:-translate-y-0.5 hover:shadow-md text-white text-[7.5px] sm:text-[8.5px] lg:text-[10px] font-bold uppercase transition-all duration-200 active:scale-95 active:translate-y-0 shadow-sm px-0.5"
      >
        More
      </button>
    </div>
  );
});
