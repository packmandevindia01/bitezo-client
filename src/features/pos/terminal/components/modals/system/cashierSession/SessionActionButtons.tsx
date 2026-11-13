import type { Ref } from "react";
import { Loader2 } from "lucide-react";
import { MODE_CONFIG, isOpeningMode, type Mode } from "./cashierSessionModes";

interface SessionActionButtonsProps {
  mode: Mode | null;
  submitting: boolean;
  submitButtonRef: Ref<HTMLButtonElement>;
  /** Tab position of the submit button; Close follows it. */
  submitTabIndex: number;
  onSubmit: () => void;
  onClose: () => void;
}

/** Submit (Confirm & Open Day, Confirm Close Shift, ...) and Cancel / Close, side by side. */
export const SessionActionButtons = ({ mode, submitting, submitButtonRef, submitTabIndex, onSubmit, onClose }: SessionActionButtonsProps) => {
  const cfg = mode ? MODE_CONFIG[mode] : null;
  return (
    <div className="grid grid-cols-2 gap-2.5 shrink-0 pt-1">
      <button
        ref={submitButtonRef}
        type="button"
        tabIndex={submitTabIndex}
        onClick={onSubmit}
        disabled={submitting}
        className="py-3.5 px-4 rounded-xl font-bold text-white shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-1.5 text-sm outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#49293e]/50 disabled:opacity-50 text-center leading-tight"
        style={{ backgroundColor: cfg?.color || "#49293e" }}
      >
        {submitting ? <Loader2 size={18} className="animate-spin shrink-0" /> : cfg?.buttonLabel || "Submit"}
      </button>
      <button
        type="button"
        tabIndex={submitTabIndex + 1}
        onClick={onClose}
        disabled={submitting}
        className="py-3.5 px-4 bg-slate-700 hover:bg-slate-800 text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center justify-center text-sm disabled:opacity-50 text-center leading-tight"
      >
        {isOpeningMode(mode) ? "Cancel" : "Close"}
      </button>
    </div>
  );
};
