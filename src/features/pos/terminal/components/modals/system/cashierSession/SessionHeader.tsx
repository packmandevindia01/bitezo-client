import { LogIn, LogOut, Moon, LayoutGrid } from "lucide-react";
import { MODE_CONFIG, isOpeningMode } from "./cashierSessionModes";
import type { CashierSession } from "./useCashierSession";

/** Top of the cashier session window: title, opening / closing date, Shift / Day tabs and More. */
export const SessionHeader = ({ session }: { session: CashierSession }) => {
  const { mode, cashierStatus, closeTab, selectTab, selectedDate, setSelectedDate, setShowPreSessionMore } = session;
  const cfg = mode ? MODE_CONFIG[mode] : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-200">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-inner shrink-0" style={{ backgroundColor: cfg?.bgColor, color: cfg?.color }}>
          {cfg?.icon}
        </div>
        <div>
          <h2 className="text-2xl font-black text-[#49293e] tracking-tight">{cfg?.label}</h2>
          <p className="text-sm font-medium text-slate-500">
            {mode === "CLOSE_DAY"
              ? "Confirm Day End"
              : "Count your cash to proceed with session."}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Opening Date prominently placed at the very top */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 px-3 py-2 rounded-xl text-slate-700 shadow-2xs focus-within:border-[#49293e] hover:border-slate-400 transition-all cursor-pointer">
          <span className="text-xs font-bold text-slate-500 mr-0.5 uppercase tracking-wide">
            {isOpeningMode(mode) ? "Opening Date:" : "Closing Date:"}
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-transparent text-sm font-bold text-[#49293e] outline-none cursor-pointer"
          />
        </div>

        {(!cashierStatus?.isDayClosed) && (
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200 self-start sm:self-center gap-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => selectTab("SHIFT")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-all ${
                closeTab === "SHIFT"
                  ? "bg-blue-600 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-blue-600 hover:bg-slate-200/60 font-semibold"
              }`}
            >
              {cashierStatus?.isShiftClosed ? (
                <LogIn size={15} className={closeTab === "SHIFT" ? "text-white" : "text-blue-500"} />
              ) : (
                <Moon size={15} className={closeTab === "SHIFT" ? "text-white" : "text-blue-500"} />
              )}
              <span>{cashierStatus?.isShiftClosed ? "Open Shift" : "Close Shift"}</span>
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={() => selectTab("DAY")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-bold rounded-lg transition-all ${
                closeTab === "DAY"
                  ? "bg-emerald-600 text-white shadow-xs font-extrabold"
                  : "text-slate-600 hover:text-emerald-600 hover:bg-slate-200/60 font-semibold"
              }`}
            >
              <LogOut size={15} className={closeTab === "DAY" ? "text-white" : "text-emerald-500"} />
              <span>Close Day</span>
            </button>
          </div>
        )}

        {isOpeningMode(mode) && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPreSessionMore(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 hover:border-[#49293e]/40 hover:text-[#49293e] shadow-2xs transition-all cursor-pointer"
            title="Access reports, configuration, printers, and backoffice"
          >
            <LayoutGrid size={15} className="text-[#49293e]" />
            <span>More</span>
          </button>
        )}
      </div>
    </div>
  );
};
