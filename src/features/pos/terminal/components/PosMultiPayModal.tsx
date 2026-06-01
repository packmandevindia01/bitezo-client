import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../../../../hooks/useCurrency';
import { Modal, Button } from '../../../../components/common';
import { Banknote, CreditCard, Wallet, Trash2, XCircle, Check, Delete } from 'lucide-react';

interface PaymentLine {
  mode: 'cash' | 'card' | 'credit';
  amount: number;
}

interface PosMultiPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  onSubmit: (payments: PaymentLine[], change: number) => void;
  loading?: boolean;
}

const MODE_CONFIG = {
  cash:   { icon: Banknote,   label: 'Cash',   color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-400' },
  card:   { icon: CreditCard, label: 'Card',   color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-400'    },
  credit: { icon: Wallet,     label: 'Credit', color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-400'  },
} as const;

interface MultiPayAmountModalProps {
  isOpen: boolean;
  mode: 'cash' | 'card' | 'credit';
  remainingAmount: number;
  currencySymbol: string;
  decimalPart: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}

const MultiPayAmountModal: React.FC<MultiPayAmountModalProps> = ({
  isOpen,
  mode,
  remainingAmount,
  currencySymbol,
  decimalPart,
  onClose,
  onSubmit
}) => {
  const [value, setValue] = useState<string>('');
  const [shouldOverwrite, setShouldOverwrite] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(remainingAmount > 0 ? remainingAmount.toFixed(decimalPart) : '');
      setShouldOverwrite(true);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, remainingAmount, decimalPart]);

  const cfg = MODE_CONFIG[mode];
  const Icon = cfg.icon;

  const handleKeyPress = (key: string) => {
    if (key === 'Back') {
      if (shouldOverwrite) {
        setValue('');
        setShouldOverwrite(false);
      } else {
        setValue(prev => prev.slice(0, -1));
      }
      inputRef.current?.focus();
      return;
    }

    setShouldOverwrite(false);

    if (key === '.') {
      setValue(prev => {
        if (shouldOverwrite) return '0.';
        if (prev.includes('.')) return prev;
        return prev + '.';
      });
      inputRef.current?.focus();
      return;
    }
    // Append digit
    setValue(prev => {
      if (shouldOverwrite) return key;
      return prev + key;
    });
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setValue('');
    inputRef.current?.focus();
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      onSubmit(parsed);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noPadding
      showClose={false}
      className="max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl"
    >
      <div className={`py-3 px-4 flex justify-between items-center text-white shrink-0 ${
        mode === 'cash' ? 'bg-emerald-700' : mode === 'card' ? 'bg-blue-700' : 'bg-purple-700'
      }`}>
        <h2 className="text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <Icon className="w-4 h-4" />
          Add {cfg.label} Payment
        </h2>
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100" tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="bg-[#f8fafc] p-3 space-y-2.5">
        {/* Large Input Display */}
        <div className="bg-[#1e293b] p-2.5 rounded-xl shadow-md flex flex-col items-end relative overflow-hidden shrink-0">
          <div className={`absolute top-0 left-0 w-1 h-full ${
            mode === 'cash' ? 'bg-emerald-500' : mode === 'card' ? 'bg-blue-500' : 'bg-purple-500'
          }`} />
          <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mb-0.5">
            Amount ({currencySymbol})
          </span>
          <div className="w-full flex items-center relative pr-8">
            <input
              ref={inputRef}
              type="number"
              step="any"
              min={0}
              value={value}
              onChange={e => {
                setShouldOverwrite(false);
                const val = e.target.value;
                if (val === '' || parseFloat(val) >= 0) setValue(val);
              }}
              className="w-full text-right text-3xl font-black text-white bg-transparent outline-none font-mono [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              placeholder="0.000"
            />
            {value && (
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2.5 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-10 bg-white text-slate-500 border border-slate-200 font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-95 transition-all"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value || parseFloat(value) <= 0}
            className={`h-10 text-white font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              mode === 'cash'
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
                : mode === 'card'
                  ? 'bg-blue-600 hover:bg-blue-700 shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                  : 'bg-purple-600 hover:bg-purple-700 shadow-[0_4px_15px_rgba(168,85,247,0.3)]'
            }`}
          >
            <Check size={18} strokeWidth={3} />
            Add Payment
          </button>
        </div>
      </form>
    </Modal>
  );
};

export const PosMultiPayModal: React.FC<PosMultiPayModalProps> = ({
  isOpen,
  onClose,
  totalDue,
  onSubmit,
  loading
}) => {
  const { formatAmount, currencySymbol, decimalPart } = useCurrency();

  const [payments, setPayments] = useState<PaymentLine[]>([]);
  const [amountModalMode, setAmountModalMode] = useState<'cash' | 'card' | 'credit' | null>(null);

  const totalPaid  = payments.reduce((sum, p) => sum + p.amount, 0);
  const remaining  = Math.max(0, totalDue - totalPaid);
  const change     = Math.max(0, totalPaid - totalDue);
  const isComplete = totalPaid >= totalDue && totalDue > 0;

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setAmountModalMode(null);
    }
  }, [isOpen]);

  const handleAddPayment = (amount: number) => {
    if (amountModalMode) {
      const mode = amountModalMode;
      setPayments(prev => {
        const existing = prev.findIndex(p => p.mode === mode);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], amount: updated[existing].amount + amount };
          return updated;
        }
        return [...prev, { mode, amount }];
      });
      setAmountModalMode(null);
    }
  };

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isComplete) onSubmit(payments, change);
  };

  const footer = (
    <div className="flex gap-2 w-full">
      <Button type="button" variant="secondary" onClick={onClose} className="flex-1 h-11">
        Cancel
      </Button>
      <Button
        onClick={handleSubmit}
        className="flex-1 h-11 bg-pos-green hover:bg-pos-green-dark text-white font-black uppercase tracking-widest shadow-premium disabled:opacity-50"
        disabled={!isComplete || loading}
        loading={loading}
      >
        Pay
      </Button>
    </div>
  );

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Multi-Pay Settlement" size="lg" footer={footer}>
        <div className="flex flex-col gap-3">

          {/* ── Summary Row ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-0.5">Total Due</span>
              <span className="text-xl font-black text-slate-800 tracking-tight">{formatAmount(totalDue)}</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 flex flex-col items-center">
              <span className="text-[9px] font-extrabold text-blue-400 uppercase tracking-widest mb-0.5">Total Paid</span>
              <span className="text-xl font-black text-blue-600 tracking-tight">{formatAmount(totalPaid)}</span>
            </div>
            <div className={`rounded-xl p-2.5 border-2 flex flex-col items-center transition-colors ${
              remaining === 0
                ? change > 0 ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'
                : 'bg-amber-50 border-amber-300'
            }`}>
              <span className={`text-[9px] font-extrabold uppercase tracking-widest mb-0.5 ${
                remaining === 0 ? (change > 0 ? 'text-emerald-600' : 'text-slate-400') : 'text-amber-600'
              }`}>
                {remaining === 0 && change > 0 ? 'Change' : 'Remaining'}
              </span>
              <span className={`text-xl font-black tracking-tight ${
                remaining === 0 ? (change > 0 ? 'text-emerald-600' : 'text-slate-700') : 'text-amber-600'
              }`}>
                {formatAmount(remaining === 0 ? change : remaining)}
              </span>
            </div>
          </div>

          {/* ── Add Payment Methods Grid ── */}
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2.5">
            <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Select Payment Method</span>

            <div className="grid grid-cols-3 gap-3">
              {(Object.keys(MODE_CONFIG) as Array<keyof typeof MODE_CONFIG>).map(mode => {
                const cfg = MODE_CONFIG[mode];
                const Icon = cfg.icon;
                const alreadyUsed = payments.some(p => p.mode === mode);
                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (remaining > 0) {
                        setAmountModalMode(mode);
                      }
                    }}
                    disabled={remaining <= 0}
                    className={`h-16 flex flex-col items-center justify-center gap-1 rounded-xl border-2 text-[11px] font-bold uppercase tracking-widest transition-all relative ${
                      remaining <= 0
                        ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : `border-slate-200 bg-white hover:border-slate-300 active:scale-95 text-slate-600`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {cfg.label}
                    {alreadyUsed && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Payment List ── */}
          <div className="space-y-1.5 max-h-[156px] overflow-y-auto pr-0.5 scrollbar-wide">
            {payments.length === 0 ? (
              <div className="h-12 flex items-center justify-center text-slate-300 text-xs font-bold italic border-2 border-dashed border-slate-100 rounded-xl">
                No payments added yet
              </div>
            ) : (
              payments.map((p, idx) => {
                const cfg = MODE_CONFIG[p.mode];
                const Icon = cfg.icon;
                return (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 bg-white border border-slate-100 rounded-xl shadow-sm">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-lg ${cfg.bg} flex items-center justify-center`}>
                        <Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-600">{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-base font-black text-slate-800">{formatAmount(p.amount)}</span>
                      <button
                        onClick={() => removePayment(idx)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </Modal>

      {/* ── Pop-up Entry Numpad Modal ── */}
      {amountModalMode && (
        <MultiPayAmountModal
          isOpen={amountModalMode !== null}
          mode={amountModalMode}
          remainingAmount={remaining}
          currencySymbol={currencySymbol}
          decimalPart={decimalPart}
          onClose={() => setAmountModalMode(null)}
          onSubmit={handleAddPayment}
        />
      )}
    </>
  );
};
