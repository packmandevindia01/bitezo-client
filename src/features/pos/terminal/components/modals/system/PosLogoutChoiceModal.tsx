import React from "react";
import { Modal } from "../../../../../../components/common";
import { Moon, LogOut } from "lucide-react";

export interface PosLogoutChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectShiftEnd: () => void;
  onSelectDayEnd: () => void;
}

export const PosLogoutChoiceModal: React.FC<PosLogoutChoiceModalProps> = ({
  isOpen,
  onClose,
  onSelectShiftEnd,
  onSelectDayEnd,
}) => {
  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Logout"
      size="md"
    >
      <div className="py-2 flex flex-col gap-4">
        <p className="text-sm font-semibold text-slate-600 text-center">
          Choose an option to proceed:
        </p>

        <div className="grid grid-cols-2 gap-4">
          {/* Shift End */}
          <button
            type="button"
            autoFocus
            onClick={onSelectShiftEnd}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer group active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <Moon size={28} />
            </div>
            <div className="text-center">
              <span className="block text-base font-black text-slate-800 group-hover:text-blue-700">
                Shift End
              </span>
              <span className="block text-xs font-semibold text-slate-400 mt-0.5">
                Close shift register
              </span>
            </div>
          </button>

          {/* Day End */}
          <button
            type="button"
            onClick={onSelectDayEnd}
            className="flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100/60 hover:border-emerald-500 hover:shadow-md transition-all cursor-pointer group active:scale-95"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
              <LogOut size={28} />
            </div>
            <div className="text-center">
              <span className="block text-base font-black text-slate-800 group-hover:text-emerald-700">
                Day End
              </span>
              <span className="block text-xs font-semibold text-slate-400 mt-0.5">
                Close business day
              </span>
            </div>
          </button>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
};
