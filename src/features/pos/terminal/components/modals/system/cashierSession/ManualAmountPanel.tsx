import { Calculator } from "lucide-react";
import { getCurrencySymbol } from "../../../../../../../utils/currency";
import { useCurrency } from "../../../../../../../hooks/useCurrency";
import { isOpeningMode } from "./cashierSessionModes";
import { SessionKeypad } from "./SessionKeypad";
import { SessionActionButtons } from "./SessionActionButtons";
import type { CashierSession } from "./useCashierSession";

/** Default screen: type the total amount (keyboard or touch keypad). */
export const ManualAmountPanel = ({ session }: { session: CashierSession }) => {
  const { formatAmount } = useCurrency();
  const {
    mode, entryMode, setEntryMode, manualAmount, setManualAmount, setActiveField, totalAmount, registerInput, submitButtonRef,
    submitting, handleKeypadPress, showDenominations, handleSubmitPress, handleModalClose,
  } = session;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      {/* LEFT PANEL: Default Manual Typing Section */}
      <div className="flex-1 border border-slate-200 rounded-xl bg-slate-50/50 p-6 flex flex-col justify-between min-h-[460px] max-h-[500px] shadow-xs">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <span className="text-sm font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#49293e]"></span>
              Direct Manual Amount Entry
            </span>
          </div>

          <div className="my-6">
            <label className="block text-sm font-bold text-slate-600 mb-2 uppercase tracking-wide">
              {isOpeningMode(mode) ? "Opening Balance" : "Total Amount"} ({getCurrencySymbol()})
            </label>
            <div className="relative">
              <input
                ref={registerInput("TOTAL")}
                type="text"
                tabIndex={1}
                autoFocus={true}
                maxLength={15}
                className="w-full text-right text-5xl font-extrabold px-5 py-4 rounded-xl border border-slate-300 bg-white text-[#49293e] shadow-sm hover:border-slate-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] outline-none transition-all placeholder:text-slate-200"
                placeholder="0.000"
                value={entryMode === "MANUAL" ? manualAmount : formatAmount(totalAmount)}
                onFocus={(e) => {
                  setActiveField("TOTAL");
                  setEntryMode("MANUAL");
                  if (!manualAmount && totalAmount > 0) {
                    setManualAmount(totalAmount.toString());
                  }
                  e.target.select();
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (/^\d*\.?\d*$/.test(val) && val.length <= 15) {
                    setManualAmount(val);
                    setEntryMode("MANUAL");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !submitting) {
                    e.preventDefault();
                    submitButtonRef.current?.focus();
                  }
                }}
              />
            </div>
            <p className="text-xs font-medium text-slate-400 mt-2 text-right">
              Type using physical keyboard or tap touch keypad on the right
            </p>
          </div>
        </div>

        {/* Switch to Denominations Screen Button */}
        <div className="mt-auto pt-4 border-t border-slate-200">
          <button
            type="button"
            tabIndex={-1}
            onClick={showDenominations}
            className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl font-bold transition-all flex items-center justify-center gap-2.5 text-sm sm:text-base shadow-xs active:scale-[0.99] group"
          >
            <Calculator size={20} className="text-[#49293e] group-hover:scale-110 transition-transform" />
            <span>Switch Denomination</span>
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: Touch Keypad and Action Buttons */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col justify-between gap-4">
        <SessionKeypad onPress={handleKeypadPress} disabled={submitting} />
        <SessionActionButtons
          mode={mode}
          submitting={submitting}
          submitButtonRef={submitButtonRef}
          submitTabIndex={2}
          onSubmit={handleSubmitPress}
          onClose={handleModalClose}
        />
      </div>
    </div>
  );
};
