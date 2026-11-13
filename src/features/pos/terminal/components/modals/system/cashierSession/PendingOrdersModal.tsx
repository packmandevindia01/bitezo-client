import { Loader2, AlertTriangle, CheckCircle2, SkipForward } from "lucide-react";
import { Modal } from "../../../../../../../components/common";

interface PendingOrdersModalProps {
  isOpen: boolean;
  isSettling: boolean;
  submitting: boolean;
  /** true = settle all pending orders first; either way the day is closed. */
  onChoose: (shouldSettle: boolean) => void;
}

/** Closing the day found unsettled orders: settle them all, or skip. The cashier must choose. */
export const PendingOrdersModal = ({ isOpen, isSettling, submitting, onChoose }: PendingOrdersModalProps) => {
  if (!isOpen) return null;
  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {/* Intentionally blocked — cashier must choose */}}
      title="Pending Orders Found"
      size="sm"
    >
      <div className="flex flex-col items-center gap-5 py-2">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-amber-200 flex items-center justify-center">
          <AlertTriangle size={32} className="text-amber-500" />
        </div>

        {/* Message */}
        <div className="text-center px-2">
          <h3 className="text-base font-black text-slate-800 mb-1">Unsettled Orders Detected</h3>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            There are pending orders for today that haven't been settled yet.
            Do you want to <span className="font-bold text-[#49293e]">settle all pending orders</span> before closing the day?
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-1">
          <button
            type="button"
            onClick={() => onChoose(true)}
            disabled={isSettling || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-[#49293e] hover:bg-[#382030] text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-md disabled:opacity-60"
          >
            {isSettling ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            {isSettling ? "Settling..." : "Settle All & Close Day"}
          </button>

          <button
            type="button"
            onClick={() => onChoose(false)}
            disabled={isSettling || submitting}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-all active:scale-95 border border-slate-300 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <SkipForward size={16} />
            )}
            Skip & Close Day
          </button>
        </div>

        <p className="text-[11px] text-slate-400 font-medium text-center">
          Either way, the business day will be closed after your choice.
        </p>
      </div>
    </Modal>
  );
};
