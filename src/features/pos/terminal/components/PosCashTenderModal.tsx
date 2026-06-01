import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../../../../hooks/useCurrency';
import { Modal, Button } from '../../../../components/common';
import { Banknote, XCircle, Delete } from 'lucide-react';

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
  const change = Math.max(0, numTendered - totalDue);
  const isSufficient = numTendered >= totalDue || totalDue <= 0;

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
    if (isSufficient) {
      onSubmit(numTendered, change);
    }
  };

  const setQuickAmount = (amount: number) => {
    setTenderedAmount(amount.toFixed(decimalPart));
    inputRef.current?.focus();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Cash Settlement" size="md">
      <form onSubmit={handleSubmit} className="space-y-2.5 py-1">
        {/* Top Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Total Due</span>
            <span className="text-lg font-black text-slate-700 tracking-tight">
              {formatAmount(totalDue)}
            </span>
          </div>
          <div className="bg-slate-50 p-2 rounded-xl border border-slate-100 flex flex-col items-center justify-center">
            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Amount Paid</span>
            <span className="text-lg font-black text-blue-600 tracking-tight">
              {formatAmount(numTendered)}
            </span>
          </div>
          <div className={`p-2 rounded-xl border-2 flex flex-col items-center justify-center transition-colors ${
            numTendered > 0 
              ? (isSufficient ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200') 
              : 'bg-slate-50 border-slate-100'
          }`}>
            <span className={`text-[8px] font-bold uppercase tracking-widest mb-0.5 ${
              numTendered > 0 ? (isSufficient ? 'text-emerald-600' : 'text-red-500') : 'text-slate-500'
            }`}>
              {numTendered > 0 && !isSufficient ? 'Short By' : 'Change'}
            </span>
            <span className={`text-lg font-black tracking-tight ${
              numTendered > 0 ? (isSufficient ? 'text-emerald-600' : 'text-red-500') : 'text-slate-400'
            }`}>
              {formatAmount(isSufficient ? change : totalDue - numTendered)}
            </span>
          </div>
        </div>

        {/* Large Input Display */}
        <div className="bg-[#1e293b] p-2.5 rounded-2xl shadow-md flex flex-col items-end relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">
            Amount Tendered ({currencySymbol})
          </span>
          <div className="w-full flex items-center relative pr-8">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min={0}
              value={tenderedAmount}
              onChange={e => {
                setShouldOverwrite(false);
                const val = e.target.value;
                if (val === '' || parseFloat(val) >= 0) setTenderedAmount(val);
              }}
              className="w-full text-right text-3xl font-black text-white bg-transparent outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="0.000"
            />
            {tenderedAmount && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute right-0 text-slate-400 hover:text-white transition-colors"
                tabIndex={-1}
              >
                <XCircle size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Numpad Keys */}
        <div className="grid grid-cols-3 gap-1.5 shrink-0">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`
                h-10 rounded-xl text-base font-black transition-all active:scale-90 shadow-sm border border-slate-400
                ${key === 'Back'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-white text-slate-700 hover:bg-slate-50'}
              `}
            >
              {key === 'Back' ? <Delete className="mx-auto" size={18} /> : key}
            </button>
          ))}
        </div>

        {/* Quick Amounts */}
        <div className="grid grid-cols-4 gap-1.5">
          {[5, 10, 20, 50].map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setQuickAmount(amt)}
              className="h-9 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 shadow-sm"
            >
              {amt}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2.5 border-t border-slate-100">
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1 h-10">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-pos-green hover:bg-pos-green-dark text-white font-bold h-10 uppercase tracking-widest shadow-premium disabled:opacity-50"
            disabled={!isSufficient || loading}
            loading={loading}
          >
            <Banknote className="w-5 h-5 mr-2" />
            Pay
          </Button>
        </div>
      </form>
    </Modal>
  );
};
