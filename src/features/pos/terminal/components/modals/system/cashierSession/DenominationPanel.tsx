import { ArrowLeft } from "lucide-react";
import { useCurrency } from "../../../../../../../hooks/useCurrency";
import { SessionKeypad } from "./SessionKeypad";
import { SessionActionButtons } from "./SessionActionButtons";
import type { CashierSession } from "./useCashierSession";

/** Second screen: count the cash note by note; the total is worked out. */
export const DenominationPanel = ({ session }: { session: CashierSession }) => {
  const { formatAmount } = useCurrency();
  const {
    mode, denoms, counts, entryMode, setEntryMode, activeField, setActiveField, totalAmount, inputRefs, registerInput, submitButtonRef,
    submitting, handleCountChange, handleKeypadPress, showManualEntry, handleSubmitPress, handleModalClose,
  } = session;

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-stretch">
      {/* LEFT PANEL: High-Density Denominations Data Grid */}
      <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden flex flex-col min-h-[460px] max-h-[500px]">
        {/* Table Column Headers */}
        <div className="flex items-center justify-between bg-slate-100 border-b border-slate-200 px-4 py-2.5 text-xs font-extrabold text-slate-600 uppercase tracking-wider shrink-0 select-none">
          <span className="w-24 text-left">Denom</span>
          <span className="w-32 text-right">Count</span>
          <span className="w-36 text-right">Amount</span>
        </div>

        {/* Scrollable Table Body with ultra-compact rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-0 custom-scrollbar">
          {denoms.length === 0 ? (
            <div className="py-16 text-center text-slate-400 font-medium text-sm">
              No denominations configured. Switch to Manual Entry on the right.
            </div>
          ) : (
            denoms.map((d, idx) => {
              const dId = d.id ?? 0;
              const isSel = activeField === dId && entryMode === "DENOM";
              const countVal = counts[dId] || 0;
              const rowAmt = countVal * d.value;

              return (
                <div
                  key={dId}
                  onClick={() => {
                    setActiveField(dId);
                    setEntryMode("DENOM");
                    inputRefs.current[dId]?.focus();
                  }}
                  className={`flex items-center justify-between px-4 py-1 transition-colors cursor-pointer ${
                    isSel
                      ? "bg-amber-50/50 hover:bg-amber-50"
                      : "bg-white hover:bg-slate-50/80"
                  }`}
                >
                  {/* Denom Label (Left Aligned per POS Rule 3) */}
                  <span className={`w-24 text-left font-extrabold text-sm shrink-0 select-none ${isSel ? "text-[#49293e]" : "text-slate-800"}`}>
                    {d.name} x
                  </span>

                  {/* Count Input (Right Aligned per POS Rule 3) */}
                  <div className="w-32 flex justify-end">
                    <input
                      ref={registerInput(dId)}
                      type="number"
                      min="0"
                      tabIndex={idx + 1}
                      autoFocus={idx === 0}
                      className={`w-28 h-[28px] text-right text-sm font-bold border rounded-lg px-2.5 outline-none transition-all ${
                        isSel
                          ? "bg-white border-[#49293e] text-[#49293e] ring-1 ring-[#49293e]"
                          : "bg-white border-slate-300 text-slate-800 hover:border-slate-400 focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]"
                      }`}
                      value={counts[dId] || ""}
                      onFocus={(e) => {
                        setActiveField(dId);
                        setEntryMode("DENOM");
                        e.target.select();
                      }}
                      onChange={(e) => handleCountChange(dId, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "ArrowDown") {
                          e.preventDefault();
                          const nextDenom = denoms[idx + 1];
                          if (nextDenom && nextDenom.id) {
                            inputRefs.current[nextDenom.id]?.focus();
                          } else {
                            submitButtonRef.current?.focus();
                          }
                        } else if (e.key === "ArrowUp") {
                          e.preventDefault();
                          if (idx > 0) {
                            const prevDenom = denoms[idx - 1];
                            if (prevDenom && prevDenom.id) {
                              inputRefs.current[prevDenom.id]?.focus();
                            }
                          }
                        }
                      }}
                      placeholder="0"
                    />
                  </div>

                  {/* Row Calculated Amount Box (Right Aligned per POS Rule 3) */}
                  <div className="w-36 text-right font-bold text-sm text-slate-700 truncate select-none pr-1">
                    {formatAmount(rowAmt)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Switch to Manual, Total Display, Keypad, and Action Buttons */}
      <div className="w-full lg:w-[320px] shrink-0 flex flex-col justify-between gap-4">
        {/* Switch back to Manual & Total Display */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            tabIndex={-1}
            onClick={showManualEntry}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-2xs active:scale-95"
          >
            <ArrowLeft size={16} className="text-[#49293e]" />
            <span>Back to Manual</span>
          </button>

          <div className="flex flex-col gap-1 bg-[#49293e]/5 border border-[#49293e]/20 rounded-xl p-3.5 shadow-2xs">
            <span className="text-xs font-bold text-[#49293e] uppercase tracking-wider">
              Calculated Total Amount
            </span>
            <div className="w-full text-right text-3xl font-extrabold px-3.5 py-1.5 rounded-lg bg-white text-[#49293e] border border-slate-300 select-none truncate">
              {formatAmount(totalAmount)}
            </div>
          </div>
        </div>

        <SessionKeypad onPress={handleKeypadPress} disabled={submitting} decimalAlwaysDisabled />
        <SessionActionButtons
          mode={mode}
          submitting={submitting}
          submitButtonRef={submitButtonRef}
          submitTabIndex={denoms.length + 2}
          onSubmit={handleSubmitPress}
          onClose={handleModalClose}
        />
      </div>
    </div>
  );
};
