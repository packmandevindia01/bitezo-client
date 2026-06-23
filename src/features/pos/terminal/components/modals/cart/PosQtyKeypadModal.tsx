import React from "react";
import { Modal } from "../../../../../../components/common";
import { XCircle, Check } from "lucide-react";

interface PosQtyKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  qtyInputValue: string;
  setQtyInputValue: React.Dispatch<React.SetStateAction<string>>;
  currentSelectedItem: any;
  handleApplyQty: (val: string) => void;
}

export const PosQtyKeypadModal: React.FC<PosQtyKeypadModalProps> = ({
  isOpen,
  onClose,
  qtyInputValue,
  setQtyInputValue,
  currentSelectedItem,
  handleApplyQty
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Manual Quantity</h2>
        <button onClick={onClose} className="opacity-60 hover:opacity-100" tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <div className="bg-[#f8fafc] p-4 sm:p-6 space-y-4 sm:space-y-6 max-h-[85vh] overflow-y-auto">
        <div className="bg-[#1e293b] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#002b5c]" />
          <div className="w-full flex justify-between items-center mb-1">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Override Qty</span>
            <span className="text-[8px] sm:text-[9px] font-black text-[#002b5c] uppercase">Current: x{currentSelectedItem?.quantity || 1}</span>
          </div>
          <input
            type="text"
            autoFocus
            value={qtyInputValue}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[0-9]*$/.test(val)) {
                setQtyInputValue(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyQty(qtyInputValue);
              }
            }}
            placeholder="0"
            className="w-full bg-transparent text-right text-3xl sm:text-4xl font-black text-white font-mono outline-none border-none p-0 focus:ring-0 focus:outline-none placeholder:text-white/30"
          />
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Back"].map((btn) => {
            return (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "Clear") setQtyInputValue("");
                  else if (btn === "Back") setQtyInputValue(prev => prev.slice(0, -1));
                  else {
                    if (qtyInputValue.length < 5) setQtyInputValue(prev => prev + btn);
                  }
                }}
                className={`
                  h-10 sm:h-12 md:h-14 rounded-xl sm:rounded-2xl text-lg sm:text-xl font-black transition-all active:scale-90 shadow-sm border border-slate-400
                  ${btn === 'Clear' ? "bg-red-50 text-red-600 border-red-400" : btn === 'Back' ? "bg-slate-100 text-slate-700 border-slate-300" : "bg-white text-slate-700 hover:bg-slate-50"}
                `}
              >
                {btn === "Back" ? "⌫" : btn}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2 sm:gap-3 pt-1">
          <button
            onClick={onClose}
            className="h-12 sm:h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl sm:rounded-2xl active:scale-95 transition-all"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            onClick={() => handleApplyQty(qtyInputValue)}
            className="h-12 sm:h-14 bg-[#ff9500] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest rounded-xl sm:rounded-2xl shadow-[0_4px_15px_rgba(255,149,0,0.3)] hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} />
            Update Qty
          </button>
        </div>
      </div>
    </Modal>
  );
};
