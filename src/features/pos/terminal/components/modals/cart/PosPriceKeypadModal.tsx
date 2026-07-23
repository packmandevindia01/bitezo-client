import React from "react";
import { Modal } from "../../../../../../components/common";
import { XCircle, Check } from "lucide-react";
import { formatCurrency } from "../../../../../../utils/formatters";

interface PosPriceKeypadModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue?: string;
  currentSelectedItem: any;
  handleApplyPrice: (val: string) => void;
}

export const PosPriceKeypadModal: React.FC<PosPriceKeypadModalProps> = ({
  isOpen,
  onClose,
  initialValue = "",
  currentSelectedItem,
  handleApplyPrice
}) => {
  const [internalValue, setInternalValue] = React.useState(initialValue);

  React.useEffect(() => {
    if (isOpen) {
      setInternalValue(initialValue);
    }
  }, [isOpen, initialValue]);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="w-[90vw] max-w-[400px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Manual Price</h2>
        <button onClick={onClose} className="opacity-60 hover:opacity-100" tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <div className="bg-[#f8fafc] p-4 sm:p-5 space-y-4 sm:space-y-5">
        <div className="bg-[#1e293b] p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl flex flex-col items-end relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#ff9500]" />
          <div className="w-full flex justify-between items-center mb-1">
            <span className="text-[8px] sm:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Override Price</span>
            <span className="text-[8px] sm:text-[9px] font-black text-[#ff9500] uppercase">Original: {formatCurrency(currentSelectedItem?.product.price || 0)}</span>
          </div>
          <input
            type="text"
            autoFocus
            inputMode="none"
            value={internalValue}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                setInternalValue(val);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleApplyPrice(internalValue);
              }
            }}
            placeholder="0"
            className="w-full bg-transparent text-right text-3xl sm:text-4xl font-black text-white font-mono outline-none border-none p-0 focus:ring-0 focus:outline-none placeholder:text-white/30"
          />
        </div>

        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {[
            "1", "2", "3", "Back",
            "4", "5", "6", "7",
            "8", "9", "0", ".",
            "Clear",
          ].map((btn) => {
            return (
              <button
                key={btn}
                onClick={() => {
                  if (btn === "Clear") setInternalValue("");
                  else if (btn === "Back") setInternalValue(prev => prev.slice(0, -1));
                  else if (btn === ".") {
                    if (!internalValue.includes(".")) setInternalValue(prev => prev + ".");
                  } else {
                    if (internalValue.length < 10) {
                      const next = `${internalValue}${btn}`;
                      setInternalValue(next.slice(0, 10));
                    }
                  }
                }}
                className={`
                  h-14 rounded-xl sm:rounded-2xl text-xl sm:text-2xl font-black transition-all active:scale-90 shadow-sm border border-slate-400
                  ${btn === 'Clear'
                    ? "bg-red-50 text-red-600 border-red-400"
                    : btn === 'Back'
                      ? "bg-slate-100 text-slate-700 border-slate-300"
                      : "bg-white text-slate-700 hover:bg-slate-50"}
                  ${btn === 'Clear' ? "col-span-4" : ""}
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
            className="h-14 bg-white text-slate-500 border border-slate-200 font-black uppercase text-xs tracking-widest rounded-xl sm:rounded-2xl active:scale-95 transition-all"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            onClick={() => handleApplyPrice(internalValue)}
            className="h-14 bg-[#49293e] text-white font-black uppercase text-xs sm:text-sm tracking-widest rounded-xl sm:rounded-2xl shadow-[0_4px_15px_rgba(73,41,62,0.3)] hover:bg-[#3a2132] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check size={16} strokeWidth={3} />
            Update Price
          </button>
        </div>
      </div>
    </Modal>
  );
};
