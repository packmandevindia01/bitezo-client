import React from "react";
import { Modal } from "../../../../../../components/common";
import { XCircle, Receipt, Tag, ChevronRight } from "lucide-react";

interface PosDiscountChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  billDiscountValue: number;
  selectedKey: string | null;
  openDiscountInput: (type: 'bill' | 'item') => void;
  showToast: (msg: string, type: "success" | "error" | "warning") => void;
}

export const PosDiscountChoiceModal: React.FC<PosDiscountChoiceModalProps> = ({
  isOpen,
  onClose,
  billDiscountValue,
  selectedKey,
  openDiscountInput,
  showToast
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="max-w-[400px] border-none shadow-2xl rounded-2xl overflow-hidden"
    >
      <div className="bg-[#49293e] text-white py-4 px-6 flex justify-between items-center">
        <h2 className="text-lg font-black uppercase tracking-[0.1em]">Discount Type</h2>
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full" tabIndex={-1}>
          <XCircle size={24} />
        </button>
      </div>

      <div className="bg-white p-6 grid grid-cols-1 gap-4">
        <button
          onClick={() => openDiscountInput('bill')}
          className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#49293e] text-white flex items-center justify-center shadow-lg">
            <Receipt size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Whole Order</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Global Bill Reduction</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
        </button>

        <button
          onClick={() => {
            if (billDiscountValue > 0) {
              showToast("Cannot apply item discounts while a bill discount is active", "warning");
              return;
            }
            if (!selectedKey) {
              showToast("Please select an item in the cart first", "warning");
              return;
            }
            openDiscountInput('item');
          }}
          className="flex items-center gap-4 p-5 bg-slate-50 border-2 border-slate-100 hover:border-[#ff9500] hover:bg-white transition-all rounded-2xl group"
        >
          <div className="w-12 h-12 rounded-xl bg-[#ff9500] text-white flex items-center justify-center shadow-lg">
            <Tag size={24} />
          </div>
          <div className="flex-1 text-left">
            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight">Item Wise</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Specific Product Reduction</p>
          </div>
          <ChevronRight size={20} className="text-slate-300 group-hover:text-[#ff9500]" />
        </button>
      </div>
    </Modal>
  );
};
