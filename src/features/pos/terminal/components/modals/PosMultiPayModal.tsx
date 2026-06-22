import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../../../../../hooks/useCurrency';
import { Modal, Button } from '../../../../../components/common';
import { Banknote, CreditCard, Wallet, XCircle, Delete } from 'lucide-react';

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
      <div className={`py-4 px-5 flex justify-between items-center text-white shrink-0 ${
        mode === 'cash' ? 'bg-gradient-to-r from-emerald-600 to-emerald-800' : mode === 'card' ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-purple-600 to-purple-800'
      }`}>
        <h2 className="text-sm font-black uppercase tracking-[0.15em] flex items-center gap-2">
          <Icon className="w-5 h-5 opacity-80" />
          {cfg.label} Payment
        </h2>
        <button type="button" onClick={onClose} className="opacity-60 hover:opacity-100 transition-opacity bg-black/10 hover:bg-black/20 p-1.5 rounded-full" tabIndex={-1}>
          <XCircle size={20} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="bg-white p-5 space-y-4">
        {/* Modern Input Display */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-end relative overflow-hidden shrink-0 shadow-inner">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Amount ({currencySymbol})
          </span>
          <div className="w-full flex items-center relative">
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
              className="w-full text-right text-4xl font-black text-slate-800 bg-transparent outline-none font-sans tracking-tight [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none placeholder:text-slate-300"
              placeholder="0.000"
            />
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="absolute left-0 text-slate-300 hover:text-red-500 transition-colors p-2"
                tabIndex={-1}
              >
                <Delete size={24} />
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Numpad Keys */}
        <div className="grid grid-cols-3 gap-2 shrink-0">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`
                h-14 rounded-2xl text-xl font-bold transition-all active:scale-95 shadow-sm border-2 flex items-center justify-center
                ${key === 'Back'
                  ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:border-red-300'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-400 hover:shadow'}
              `}
            >
              {key === 'Back' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="h-12 bg-white text-slate-500 border-2 border-slate-300 font-bold uppercase text-xs tracking-widest rounded-2xl active:scale-95 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-700 transition-all"
            tabIndex={-1}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value || parseFloat(value) <= 0}
            className={`h-12 text-white font-bold uppercase text-xs tracking-widest rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:grayscale ${
              mode === 'cash'
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_4px_15px_rgba(16,185,129,0.3)]'
                : mode === 'card'
                  ? 'bg-blue-500 hover:bg-blue-600 shadow-[0_4px_15px_rgba(59,130,246,0.3)]'
                  : 'bg-purple-500 hover:bg-purple-600 shadow-[0_4px_15px_rgba(168,85,247,0.3)]'
            }`}
          >
            Confirm
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

  const roundedPaid = Number(totalPaid.toFixed(decimalPart));
  const roundedDue = Number(totalDue.toFixed(decimalPart));

  const remaining  = Math.max(0, roundedDue - roundedPaid);
  const change     = Math.max(0, roundedPaid - roundedDue);
  const isComplete = roundedPaid >= roundedDue && roundedDue > 0;

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
                const paymentIdx = payments.findIndex(p => p.mode === mode);
                const payment = payments[paymentIdx];
                const hasPayment = !!payment;

                return (
                  <div key={mode} className="relative h-20">
                    <button
                      onClick={() => {
                        if (remaining > 0) {
                          setAmountModalMode(mode);
                        }
                      }}
                      disabled={remaining <= 0 && !hasPayment}
                      className={`w-full h-full flex flex-col items-center justify-center gap-1 rounded-xl border-2 text-[11px] font-bold uppercase tracking-widest transition-all ${
                        hasPayment
                          ? `${cfg.border} ${cfg.bg} text-slate-800`
                          : remaining <= 0
                            ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                            : `border-slate-300 bg-white hover:border-slate-400 active:scale-95 text-slate-600`
                      }`}
                    >
                      {hasPayment ? (
                        <>
                          <span className={`text-sm font-black ${cfg.color}`}>{formatAmount(payment.amount)}</span>
                          <span className="text-[9px] text-slate-500 uppercase flex items-center gap-1">
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <Icon className="w-6 h-6 mb-0.5" />
                          {cfg.label}
                        </>
                      )}
                    </button>

                    {hasPayment && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePayment(paymentIdx);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-sm transition-transform hover:scale-110"
                        title="Remove Payment"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
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
