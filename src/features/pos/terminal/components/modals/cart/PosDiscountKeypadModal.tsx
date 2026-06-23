import React from "react";
import { Modal } from "../../../../../../components/common";
import { XCircle, Percent, Banknote, Check } from "lucide-react";
import { formatCurrency } from "../../../../../../utils/formatters";

interface PosDiscountKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  discountType: 'bill' | 'item';
  discountMode: 'percentage' | 'amount';
  setDiscountMode: (mode: 'percentage' | 'amount') => void;
  discountInputValue: string;
  setDiscountInputValue: React.Dispatch<React.SetStateAction<string>>;
  subtotal: number;
  currentItem: any;
  handleApplyDiscount: (val: string) => void;
}

export const PosDiscountKeypadModal: React.FC<PosDiscountKeypadModalProps> = ({
  isOpen,
  onClose,
  discountType,
  discountMode,
  setDiscountMode,
  discountInputValue,
  setDiscountInputValue,
  subtotal,
  currentItem,
  handleApplyDiscount
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className="bg-[#49293e] text-white py-3 px-4 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">{discountType === 'bill' ? 'BILL' : 'ITEM'} DISCOUNT</h2>
        <button onClick={onClose} className="opacity-60 hover:opacity-100" tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <div className="bg-[#f8fafc] p-3 space-y-3 overflow-hidden">
        {/* Elegant Mode Toggle */}
        <div className="flex p-1 bg-slate-200/60 rounded-2xl">
          <button 
            onClick={() => { setDiscountMode('percentage'); setDiscountInputValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${
              discountMode === 'percentage' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Percent size={14} strokeWidth={3} />
            Percentage
          </button>
          <button 
            onClick={() => { setDiscountMode('amount'); setDiscountInputValue(""); }}
            className={`flex-1 flex items-center justify-center gap-2 h-9 rounded-xl font-black text-[10px] sm:text-xs uppercase tracking-widest transition-all ${
              discountMode === 'amount' ? "bg-white text-[#49293e] shadow-md" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Banknote size={14} strokeWidth={3} />
            Amount
          </button>
        </div>

        {/* Premium Input Display */}
        <div className="bg-[#1e293b] p-3 rounded-2xl shadow-lg flex flex-col items-end relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
          <div className="w-full flex justify-between items-baseline mb-1">
            <span className="text-[9px] font-black text-[#ff9500] uppercase tracking-wider">
              {discountType === 'bill' 
                ? `Bill: ${formatCurrency(subtotal)}` 
                : currentItem 
                  ? `${currentItem.product.name.split(' - ')[0]}: ${formatCurrency(currentItem.amount)}` 
                  : 'Item Amount: 0.000'}
            </span>
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Enter reduction</span>
          </div>
          <div className="text-3xl font-black text-white font-mono flex items-baseline gap-2">
            {discountInputValue || "0"}
            <span className="text-base text-[#ff9500]">
              {discountMode === 'percentage' ? "%" : formatCurrency(0).split(" ")[0]}
            </span>
          </div>
        </div>

        {/* Clean Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "."].map((btn) => (
            <button
              key={btn}
              onClick={() => {
                if (btn === "Clear") setDiscountInputValue("");
                else if (btn === ".") {
                  if (!discountInputValue.includes(".")) setDiscountInputValue(prev => prev + ".");
                } else {
                  if (discountInputValue.length < 8) setDiscountInputValue(prev => prev + btn);
                }
              }}
              className={`
                h-11 rounded-xl text-lg font-black transition-all active:scale-90 shadow-sm border border-slate-400
                ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-400" : "bg-white text-slate-700 hover:bg-slate-50"}
              `}
            >
              {btn}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={onClose}
            className="h-11 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-all"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            onClick={() => handleApplyDiscount(discountInputValue)}
            className="h-11 bg-[#ff9500] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} />
            Apply Discount
          </button>
        </div>
      </div>
    </Modal>
  );
};
