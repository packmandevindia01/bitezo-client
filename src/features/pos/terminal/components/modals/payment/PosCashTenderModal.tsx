import * as React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useCurrency } from '../../../../../../hooks/useCurrency';
import { Modal } from '../../../../../../components/common';
import { XCircle, Delete, Check } from 'lucide-react';
import { NewGenCashIcon } from './PosMultiPayModal';
import { t } from '../../../../utils/posLocalization';

interface PosCashTenderModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  onSubmit: (tenderedAmount: number, change: number) => void;
  loading?: boolean;
}

export const PosCashTenderModal: React.FC<PosCashTenderModalProps> = ({
  isOpen,
  onClose,
  totalDue,
  onSubmit,
  loading
}) => {
  const { formatAmount, currencySymbol, decimalPart } = useCurrency();
  const [tenderedAmount, setTenderedAmount] = useState<string>("");
  const [shouldOverwrite, setShouldOverwrite] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTenderedAmount(totalDue > 0 ? totalDue.toFixed(decimalPart) : "");
      setShouldOverwrite(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, totalDue, decimalPart]);

  const numTendered = parseFloat(tenderedAmount) || 0;
  const roundedTendered = Number(numTendered.toFixed(decimalPart));
  const roundedDue = Number(totalDue.toFixed(decimalPart));

  const change = Math.max(0, roundedTendered - roundedDue);
  // Rule: Do not allow underpayment in single Cash mode. Minimum allowed is totalDue.
  const isSufficient = roundedTendered >= roundedDue && roundedDue > 0;

  const handleKeyPress = (key: string) => {
    if (key === 'Back') {
      if (shouldOverwrite) {
        setTenderedAmount('');
        setShouldOverwrite(false);
      } else {
        setTenderedAmount(prev => prev.slice(0, -1));
      }
      inputRef.current?.focus();
      return;
    }

    setShouldOverwrite(false);

    if (key === '.') {
      setTenderedAmount(prev => {
        if (shouldOverwrite) return '0.';
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
      inputRef.current?.focus();
      return;
    }

    // Append digit
    setTenderedAmount(prev => {
      if (shouldOverwrite) return key;
      return prev + key;
    });
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setTenderedAmount('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSufficient && !loading) {
      onSubmit(numTendered, change);
    }
  };

  const setQuickAmount = (amount: number) => {
    setTenderedAmount(amount.toFixed(decimalPart));
    setShouldOverwrite(false);
    inputRef.current?.focus();
  };

  const quickAmounts = useMemo(() => {
    const baseDenominations = [5, 10, 20, 50, 100, 200, 500];
    const filtered = baseDenominations.filter(amt => amt > totalDue);
    if (filtered.length >= 3) return filtered.slice(0, 3);
    const nextRound = Math.ceil(totalDue / 10) * 10;
    const candidates = [nextRound, nextRound + 5, nextRound + 10, nextRound + 20].filter(v => v > totalDue);
    const deduped = Array.from(new Set(candidates));
    return deduped.slice(0, 3);
  }, [totalDue]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="max-w-[380px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className="py-4 px-5 flex justify-between items-center text-white shrink-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2.5 font-['Outfit']">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <NewGenCashIcon className="w-5 h-5 text-white" />
          </div>
          {t("Cash Settlement")}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="opacity-70 hover:opacity-100 transition-opacity bg-black/15 hover:bg-black/25 p-1.5 rounded-full cursor-pointer"
          tabIndex={-1}
        >
          <XCircle size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-5 space-y-4 font-['Outfit']">
        {/* Top Summary Cards */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center shadow-xs">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t("Total Due")}</span>
            <span className="text-sm sm:text-base font-black text-slate-800 tracking-tight">
              {formatAmount(totalDue)}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 flex flex-col items-center justify-center shadow-xs">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{t("Amount Paid")}</span>
            <span className="text-sm sm:text-base font-black text-blue-600 tracking-tight">
              {formatAmount(numTendered)}
            </span>
          </div>
          <div className={`p-2.5 rounded-2xl border-2 flex flex-col items-center justify-center shadow-xs transition-colors ${
            numTendered > 0 
              ? (isSufficient ? 'bg-emerald-50 border-emerald-300' : 'bg-rose-50 border-rose-300') 
              : 'bg-slate-50 border-slate-200/80'
          }`}>
            <span className={`text-[9px] font-black uppercase tracking-widest mb-0.5 ${
              numTendered > 0 ? (isSufficient ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-400'
            }`}>
              {t(numTendered > 0 && !isSufficient ? 'Short By' : 'Change')}
            </span>
            <span className={`text-sm sm:text-base font-black tracking-tight ${
              numTendered > 0 ? (isSufficient ? 'text-emerald-700' : 'text-rose-600') : 'text-slate-400'
            }`}>
              {formatAmount(isSufficient ? change : Math.max(0, totalDue - numTendered))}
            </span>
          </div>
        </div>

        {/* Underpayment Warning Note */}
        {numTendered > 0 && !isSufficient && (
          <div className="text-center text-[11px] font-bold text-rose-600 bg-rose-50 py-1.5 px-3 rounded-xl border border-rose-200">
            {t("Amount cannot be less than total due. Use MultiPay for split payments.")}
          </div>
        )}

        {/* Modern Amount Input Display */}
        <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl flex flex-col items-end relative overflow-hidden shrink-0 shadow-inner">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-['Outfit']">
            {t("Amount Tendered")} ({currencySymbol})
          </span>
          <div className="w-full flex items-center relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={tenderedAmount}
              onChange={e => {
                setShouldOverwrite(false);
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length > 1) return;
                if (val === '' || parseFloat(val) >= 0) setTenderedAmount(val);
              }}
              className="w-full text-right text-3xl font-black text-slate-900 bg-transparent outline-none font-['Outfit'] tracking-tight tabular-nums placeholder:text-slate-300"
              placeholder={`0.${'0'.repeat(decimalPart)}`}
            />
            {tenderedAmount && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-0 text-slate-300 hover:text-rose-500 transition-colors p-1.5 cursor-pointer"
                tabIndex={-1}
              >
                <Delete size={22} />
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Numpad Keys */}
        <div className="grid grid-cols-3 gap-2 shrink-0 font-['Outfit']">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`
                h-12 rounded-2xl text-xl font-black font-['Outfit'] transition-all active:scale-95 shadow-xs border-2 flex items-center justify-center select-none cursor-pointer
                ${key === 'Back'
                  ? 'bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100 hover:border-rose-300'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow'}
              `}
            >
              {key === 'Back' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Quick Amount Chips */}
        <div className="grid grid-cols-4 gap-1.5 shrink-0 font-['Outfit']">
          <button
            type="button"
            onClick={() => setQuickAmount(totalDue)}
            className="h-10 bg-emerald-50 border-2 border-emerald-200 text-emerald-800 rounded-xl text-xs font-black hover:bg-emerald-100 transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
          >
            {t("Exact")}
          </button>
          {quickAmounts.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setQuickAmount(amt)}
              className="h-10 bg-white border-2 border-slate-200 rounded-xl text-xs font-extrabold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-xs flex items-center justify-center cursor-pointer"
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 shrink-0 font-['Outfit']">
          <button
            type="button"
            onClick={onClose}
            className="h-12 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black uppercase text-xs tracking-wider rounded-2xl active:scale-95 shadow-[0_4px_14px_rgba(244,63,94,0.35)] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            tabIndex={-1}
          >
            <XCircle size={16} />
            {t("Cancel")}
          </button>
          <button
            type="submit"
            disabled={!isSufficient || loading}
            className="h-12 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-700 hover:to-teal-700 text-white font-black uppercase text-xs tracking-wider rounded-2xl active:scale-[0.98] shadow-[0_4px_14px_rgba(16,185,129,0.35)] transition-all flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer"
          >
            <Check size={16} className="stroke-[3]" />
            {loading ? t("Processing...") : t("Pay")}
          </button>
        </div>
      </form>
    </Modal>
  );
};
