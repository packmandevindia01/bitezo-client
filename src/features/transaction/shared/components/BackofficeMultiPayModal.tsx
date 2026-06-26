import React, { useState, useEffect, useRef, useCallback } from "react";
import { Modal, Button } from "../../../../components/common";
import { useCurrency } from "../../../../hooks/useCurrency";
import { useToast } from "../../../../app/providers/useToast";

interface PaymentLine {
  mode: string;
  paymodeId: number;
  amount: number;
}

interface BackofficeMultiPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  onSubmit: (payments: PaymentLine[]) => void;
  loading?: boolean;
  /** Paymodes from the parent's master API. When provided, no extra fetch is made. */
  paymodes?: { paymodeId: number; paymodeName: string }[];
}

interface PaymodeRow {
  paymodeId: number;
  paymodeName: string;
  inputValue: string;
}

export const BackofficeMultiPayModal: React.FC<BackofficeMultiPayModalProps> = ({
  isOpen,
  onClose,
  totalDue,
  onSubmit,
  loading,
  paymodes,
}) => {
  const { formatAmount, decimalPart } = useCurrency();
  const { showToast } = useToast();

  const [rows, setRows] = useState<PaymodeRow[]>([]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Build rows from the paymodes prop (passed from parent's master API).
  // Filter out any paymode whose name contains "multi" — no MultiPay inside MultiPay.
  useEffect(() => {
    if (!isOpen) return;
    const source = paymodes && paymodes.length > 0
      ? paymodes
      : [{ paymodeId: 1, paymodeName: "Cash" }, { paymodeId: 2, paymodeName: "Card" }];

    const builtRows: PaymodeRow[] = source
      .filter((p) => !p.paymodeName.toLowerCase().includes("multi"))
      .map((p) => ({
        paymodeId: p.paymodeId,
        paymodeName: p.paymodeName,
        inputValue: "",
      }));
    setRows(builtRows);
    setTimeout(() => inputRefs.current[0]?.focus(), 150);
  }, [isOpen, paymodes]);

  const totalPaid = rows.reduce((sum, r) => sum + (parseFloat(r.inputValue) || 0), 0);
  const roundedPaid = Number(totalPaid.toFixed(decimalPart));
  const roundedDue = Number(totalDue.toFixed(decimalPart));
  const balance = Number((roundedDue - roundedPaid).toFixed(decimalPart));
  const change = balance < 0 ? Math.abs(balance) : 0;
  const remaining = balance > 0 ? balance : 0;
  const isComplete = roundedPaid >= roundedDue && roundedDue > 0;

  const setRowValue = useCallback((idx: number, val: string) => {
    setRows(prev => {
      const updated = [...prev];
      updated[idx] = { ...updated[idx], inputValue: val };
      return updated;
    });
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next row, or submit if last
      const next = inputRefs.current[idx + 1];
      if (next) {
        next.focus();
        next.select();
      } else {
        handleSubmit();
      }
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleSubmit = () => {
    const activePayments = rows.filter(r => parseFloat(r.inputValue) > 0);

    if (activePayments.length === 0) {
      showToast("Please enter at least one payment amount", "error");
      return;
    }
    if (!isComplete) {
      showToast(`Balance remaining: ${formatAmount(remaining)}`, "error");
      return;
    }

    // Validate non-cash overpayment
    const cashNames = ["cash"];
    for (const r of activePayments) {
      if (!cashNames.includes(r.paymodeName.toLowerCase())) {
        const amt = parseFloat(r.inputValue);
        const otherTotal = activePayments
          .filter(x => x.paymodeId !== r.paymodeId)
          .reduce((sum, x) => sum + parseFloat(x.inputValue), 0);
        if (Number((otherTotal + amt).toFixed(decimalPart)) > roundedDue) {
          showToast(`Overpayment is only allowed for Cash. Reduce the amount for "${r.paymodeName}".`, "error");
          return;
        }
      }
    }

    onSubmit(
      activePayments.map(r => ({
        mode: r.paymodeName.toLowerCase(),
        paymodeId: r.paymodeId,
        amount: parseFloat(r.inputValue),
      }))
    );
  };

  const footer = (
    <div className="flex gap-2 w-full justify-end">
      <Button variant="secondary" onClick={onClose} className="px-8" tabIndex={-1}>
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        className="px-8 bg-[#49293e] text-white hover:bg-[#49293e]/90 font-bold"
        disabled={!isComplete || loading}
        loading={loading}
      >
        Submit
      </Button>
    </div>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="PAYMODE" size="sm" footer={footer}>
      <div className="space-y-3">

        {/* Amount & Balance Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</span>
            <span className="text-sm font-black text-gray-800 tabular-nums">{formatAmount(totalDue)}</span>
          </div>
          <div className={`rounded-lg px-4 py-2.5 flex items-center justify-between border transition-colors ${
            change > 0
              ? "bg-emerald-50 border-emerald-300"
              : remaining > 0
                ? "bg-amber-50 border-amber-300"
                : "bg-gray-50 border-gray-200"
          }`}>
            <span className={`text-xs font-semibold uppercase tracking-wide ${
              change > 0 ? "text-emerald-600" : remaining > 0 ? "text-amber-600" : "text-gray-500"
            }`}>
              {change > 0 ? "Change" : "Balance"}
            </span>
            <span className={`text-sm font-black tabular-nums ${
              change > 0 ? "text-emerald-600" : remaining > 0 ? "text-amber-600" : "text-gray-800"
            }`}>
              {formatAmount(change > 0 ? change : remaining)}
            </span>
          </div>
        </div>

        {/* Paymode Rows — spreadsheet style */}
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          {/* Header */}
          <div className="grid grid-cols-[1fr_140px] bg-[#49293e] text-white">
            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest">Paymode</div>
            <div className="px-4 py-2 text-[11px] font-bold uppercase tracking-widest text-right border-l border-white/20">Amount</div>
          </div>

          {/* Rows — scrollable so 10-12 methods don't push modal off-screen */}
          <div className="divide-y divide-gray-100 overflow-y-auto" style={{ maxHeight: "300px" }}>
            {rows.map((row, idx) => {
              const amt = parseFloat(row.inputValue) || 0;
              const hasValue = amt > 0;
              return (
                <div
                  key={row.paymodeId}
                  className={`grid grid-cols-[1fr_140px] items-center transition-colors ${hasValue ? "bg-[#49293e]/5" : "hover:bg-gray-50/60"}`}
                >
                  {/* Paymode label */}
                  <div className={`px-4 py-0.5 text-sm font-semibold select-none ${hasValue ? "text-[#49293e]" : "text-gray-700"}`}>
                    {row.paymodeName}
                  </div>

                  {/* Amount input */}
                  <div className="border-l border-gray-100">
                    <input
                      ref={el => { inputRefs.current[idx] = el; }}
                      type="number"
                      min="0"
                      step="any"
                      value={row.inputValue}
                      onChange={e => setRowValue(idx, e.target.value)}
                      onKeyDown={e => handleKeyDown(e, idx)}
                      onFocus={handleFocus}
                      tabIndex={idx + 1}
                      placeholder={(0).toFixed(decimalPart)}
                      className={`w-full h-9 px-3 text-sm text-right bg-transparent outline-none tabular-nums transition-colors
                        focus:bg-[#49293e]/10 focus:text-[#49293e] focus:font-semibold
                        [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none
                        ${hasValue ? "font-bold text-[#49293e]" : "text-gray-700"}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totals footer row */}
          <div className="grid grid-cols-[1fr_140px] border-t-2 border-[#49293e]/30 bg-[#49293e]/5">
            <div className="px-4 py-2 text-xs font-black text-[#49293e] uppercase tracking-widest">Total Paid</div>
            <div className="px-4 py-2 text-sm font-black text-[#49293e] text-right border-l border-[#49293e]/20 tabular-nums">
              {formatAmount(totalPaid)}
            </div>
          </div>
        </div>

      </div>
    </Modal>
  );
};
