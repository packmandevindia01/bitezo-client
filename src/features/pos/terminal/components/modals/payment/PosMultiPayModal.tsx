import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useCurrency } from '../../../../../../hooks/useCurrency';
import { useToast } from '../../../../../../app/providers/useToast';
import { Modal } from '../../../../../../components/common';
import { Lock, XCircle, Delete, Check, Receipt, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { t } from '../../../../utils/posLocalization';

// ── Next-Gen FinTech Icons ──
export const NewGenCashIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 6.5C3 5.67 3.67 5 4.5 5h13c.83 0 1.5.67 1.5 1.5v1.5H3V6.5z" fill="currentColor" fillOpacity="0.08" strokeWidth="1.5" />
    <path d="M6 3.5h12c.83 0 1.5.67 1.5 1.5v1" strokeWidth="1.5" opacity="0.6" />
    <rect x="2" y="7" width="20" height="13" rx="2.5" fill="currentColor" fillOpacity="0.14" />
    <rect x="4" y="9" width="16" height="9" rx="1.5" strokeDasharray="1.5 1.5" strokeWidth="1.2" opacity="0.75" />
    <circle cx="12" cy="13.5" r="2.75" fill="currentColor" fillOpacity="0.22" />
    <path d="M12 11.6v3.8M10.8 12.4c.3-.3.8-.5 1.2-.5.8 0 1.5.4 1.5 1s-.7.8-1.5 1-1.5.4-1.5 1 .7 1 1.5 1c.5 0 1-.2 1.2-.5" strokeWidth="1.3" />
    <circle cx="5.5" cy="10.5" r="0.75" fill="currentColor" />
    <circle cx="18.5" cy="10.5" r="0.75" fill="currentColor" />
    <circle cx="5.5" cy="16.5" r="0.75" fill="currentColor" />
    <circle cx="18.5" cy="16.5" r="0.75" fill="currentColor" />
  </svg>
);

export const NewGenCardIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="4" width="20" height="16" rx="3" fill="currentColor" fillOpacity="0.14" />
    <path d="M2 8.5h20" strokeWidth="1.5" opacity="0.6" />
    <rect x="5" y="11.5" width="4.5" height="3.5" rx="0.8" fill="currentColor" fillOpacity="0.3" strokeWidth="1.2" />
    <path d="M7.25 11.5v3.5M5 13.25h4.5" strokeWidth="1" opacity="0.8" />
    <path d="M15 11a2.5 2.5 0 0 1 0 4.5" strokeWidth="1.5" />
    <path d="M17.5 9.5a4.5 4.5 0 0 1 0 7.5" strokeWidth="1.5" opacity="0.85" />
    <circle cx="15.5" cy="16.5" r="1.5" fill="currentColor" fillOpacity="0.25" strokeWidth="1" />
    <circle cx="18" cy="16.5" r="1.5" fill="currentColor" fillOpacity="0.15" strokeWidth="1" />
  </svg>
);

export const NewGenCreditIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h11A2.5 2.5 0 0 1 21 6.5v8a2.5 2.5 0 0 1-2.5 2.5H18" strokeWidth="1.5" opacity="0.5" />
    <rect x="3" y="7.5" width="16" height="12.5" rx="2.5" fill="currentColor" fillOpacity="0.14" />
    <path d="M3 11.5h16" strokeWidth="1.5" opacity="0.6" />
    <circle cx="11" cy="15" r="2.5" fill="currentColor" fillOpacity="0.22" strokeWidth="1.3" />
    <path d="M9.8 15l.8.8 1.6-1.6" strokeWidth="1.3" />
    <path d="M19.5 2.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5z" fill="currentColor" stroke="none" opacity="0.85" />
  </svg>
);

export const NewGenTestPayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M9 3h6M10 3v4.5L5.5 17c-.8 1.4.2 3 1.8 3h9.4c1.6 0 2.6-1.6 1.8-3L14 7.5V3" />
    <path d="M7 16l2.5-3.5h5L17 16c.3.5.1 1-.5 1h-9c-.6 0-.8-.5-.5-1z" fill="currentColor" fillOpacity="0.25" stroke="none" />
    <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="12" r="0.8" fill="currentColor" stroke="none" />
    <circle cx="11.5" cy="10" r="0.6" fill="currentColor" stroke="none" />
    <path d="M19 4l.4 1 1 .4-1 .4-.4 1-.4-1-1-.4 1-.4.4-1z" fill="currentColor" stroke="none" />
    <path d="M5 6l.3.8.8.3-.8.3-.3.8-.3-.8-.8-.3.8-.3.3-.8z" fill="currentColor" stroke="none" opacity="0.75" />
  </svg>
);

export const NewGenMobilePayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="2.5" width="14" height="19" rx="3" fill="currentColor" fillOpacity="0.14" />
    <path d="M10 5h4" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
    <path d="M10 9.5a2.5 2.5 0 0 1 4 0" strokeWidth="1.5" />
    <path d="M8.5 7.5a4.5 4.5 0 0 1 7 0" strokeWidth="1.5" opacity="0.7" />
    <rect x="9.5" y="12" width="5" height="4" rx="1" fill="currentColor" fillOpacity="0.22" strokeWidth="1.2" />
    <path d="M11 14h2" strokeWidth="1.2" />
    <path d="M10 19h4" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
  </svg>
);

export const NewGenDemoPayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="4" width="18" height="13" rx="2.5" fill="currentColor" fillOpacity="0.16" />
    <path d="M10 8.5l5 3-5 3v-6z" fill="currentColor" fillOpacity="0.3" strokeWidth="1.4" />
    <path d="M12 17v3M8 20h8" strokeWidth="1.6" />
    <circle cx="18" cy="7" r="1" fill="currentColor" stroke="none" />
  </svg>
);

export const NewGenDummyPayIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2.5" fill="currentColor" fillOpacity="0.16" />
    <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.28" strokeWidth="1.3" />
    <path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3" strokeWidth="1.4" />
  </svg>
);

export const NewGenDefaultIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="7" rx="7" ry="3.5" fill="currentColor" fillOpacity="0.22" />
    <path d="M5 7v4.5c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5V7" />
    <path d="M5 11.5V16c0 1.93 3.13 3.5 7 3.5s7-1.57 7-3.5v-4.5" />
    <path d="M12 5.5v3M10.5 7h3" strokeWidth="1.2" />
  </svg>
);

// ── Multi-Pay Types ──

export interface MultiPaymentLine {
  paymodeId: number | string;
  label: string;
  amount: number;
}

export interface TenderOption {
  id: number | string;
  label: string;
}

interface PosMultiPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalDue: number;
  onSubmit: (payments: MultiPaymentLine[], change: number) => void;
  loading?: boolean;
  customerId?: number;
  tenderOptions?: TenderOption[];
  disableCredit?: boolean;
}

// ── Curated Distinct Card Palettes (Non-Blended, Solid Signature FinTech Colors) ──
const CARD_PALETTE = [
  {
    cardGradient: 'bg-gradient-to-br from-[#0d9488] via-[#0f766e] to-[#115e59]', // Emerald / Teal (Theme 0)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(13,148,136,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(13,148,136,0.65)]',
    btnColor: 'bg-teal-500 hover:bg-teal-600 shadow-[0_4px_15px_rgba(13,148,136,0.35)]',
    headerGradient: 'bg-gradient-to-r from-teal-600 to-emerald-800',
    color: 'text-teal-600',
    bg: 'bg-teal-50/70',
    border: 'border-teal-400',
    badgeBg: 'bg-gradient-to-br from-teal-500/15 via-teal-500/20 to-emerald-500/25 text-teal-600 border border-teal-500/25 shadow-[0_4px_14px_rgba(13,148,136,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#7e22ce] via-[#6b21a8] to-[#3b0764]', // Royal Violet / Amethyst (Theme 1)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(126,34,206,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(126,34,206,0.65)]',
    btnColor: 'bg-purple-500 hover:bg-purple-600 shadow-[0_4px_15px_rgba(126,34,206,0.35)]',
    headerGradient: 'bg-gradient-to-r from-purple-600 to-purple-900',
    color: 'text-purple-600',
    bg: 'bg-purple-50/70',
    border: 'border-purple-400',
    badgeBg: 'bg-gradient-to-br from-purple-500/15 via-violet-500/20 to-fuchsia-500/25 text-purple-600 border border-purple-500/25 shadow-[0_4px_14px_rgba(168,85,247,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#2563eb] via-[#1d4ed8] to-[#1e1b4b]', // Cobalt Blue / Sapphire (Theme 2)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(37,99,235,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(37,99,235,0.65)]',
    btnColor: 'bg-blue-500 hover:bg-blue-600 shadow-[0_4px_15px_rgba(37,99,235,0.35)]',
    headerGradient: 'bg-gradient-to-r from-blue-600 to-blue-900',
    color: 'text-blue-600',
    bg: 'bg-blue-50/70',
    border: 'border-blue-400',
    badgeBg: 'bg-gradient-to-br from-blue-500/15 via-indigo-500/20 to-violet-500/25 text-blue-600 border border-blue-500/25 shadow-[0_4px_14px_rgba(59,130,246,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12]', // Warm Terracotta / Orange (Theme 3)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(234,88,12,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(234,88,12,0.65)]',
    btnColor: 'bg-orange-500 hover:bg-orange-600 shadow-[0_4px_15px_rgba(234,88,12,0.35)]',
    headerGradient: 'bg-gradient-to-r from-orange-600 to-amber-800',
    color: 'text-orange-600',
    bg: 'bg-amber-50/70',
    border: 'border-amber-400',
    badgeBg: 'bg-gradient-to-br from-amber-500/15 via-orange-500/20 to-rose-500/25 text-amber-600 border border-amber-500/25 shadow-[0_4px_14px_rgba(245,158,11,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#e11d48] via-[#be123c] to-[#4c0519]', // Ruby Crimson / Deep Red (Theme 4)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(225,29,72,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(225,29,72,0.65)]',
    btnColor: 'bg-rose-500 hover:bg-rose-600 shadow-[0_4px_15px_rgba(225,29,72,0.35)]',
    headerGradient: 'bg-gradient-to-r from-rose-600 to-rose-900',
    color: 'text-rose-600',
    bg: 'bg-rose-50/70',
    border: 'border-rose-400',
    badgeBg: 'bg-gradient-to-br from-rose-500/15 via-pink-500/20 to-rose-600/25 text-rose-600 border border-rose-500/25 shadow-[0_4px_14px_rgba(225,29,72,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#4f46e5] via-[#4338ca] to-[#1e1b4b]', // Electric Indigo / Iris (Theme 5)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(79,70,229,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(79,70,229,0.65)]',
    btnColor: 'bg-indigo-500 hover:bg-indigo-600 shadow-[0_4px_15px_rgba(79,70,229,0.35)]',
    headerGradient: 'bg-gradient-to-r from-indigo-600 to-indigo-900',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-400',
    badgeBg: 'bg-gradient-to-br from-indigo-500/15 via-indigo-500/20 to-violet-500/25 text-indigo-600 border border-indigo-500/25 shadow-[0_4px_14px_rgba(99,102,241,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#0284c7] via-[#0369a1] to-[#082f49]', // Vivid Ocean Cyan (Theme 6)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(2,132,199,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(2,132,199,0.65)]',
    btnColor: 'bg-cyan-500 hover:bg-cyan-600 shadow-[0_4px_15px_rgba(2,132,199,0.35)]',
    headerGradient: 'bg-gradient-to-r from-cyan-600 to-cyan-900',
    color: 'text-cyan-600',
    bg: 'bg-cyan-50/70',
    border: 'border-cyan-400',
    badgeBg: 'bg-gradient-to-br from-cyan-500/15 via-teal-500/20 to-blue-500/25 text-cyan-600 border border-cyan-500/25 shadow-[0_4px_14px_rgba(6,182,212,0.18)]',
  },
  {
    cardGradient: 'bg-gradient-to-br from-[#d97706] via-[#b45309] to-[#78350f]', // Amber Gold / Bronze (Theme 7)
    glowShadow: 'shadow-[0_16px_32px_-6px_rgba(217,119,6,0.45)] hover:shadow-[0_22px_38px_-4px_rgba(217,119,6,0.65)]',
    btnColor: 'bg-amber-500 hover:bg-amber-600 shadow-[0_4px_15px_rgba(217,119,6,0.35)]',
    headerGradient: 'bg-gradient-to-r from-amber-600 to-amber-900',
    color: 'text-amber-600',
    bg: 'bg-amber-50/70',
    border: 'border-amber-400',
    badgeBg: 'bg-gradient-to-br from-amber-500/15 via-orange-500/20 to-rose-500/25 text-amber-600 border border-amber-500/25 shadow-[0_4px_14px_rgba(245,158,11,0.18)]',
  },
];

const getModeConfig = (label: string = '', index: number = 0) => {
  const l = label.toLowerCase();

  // 1. Cash / COD -> Emerald / Teal (Theme 0)
  if (l.includes('cash') || l.includes('cod')) {
    return {
      icon: NewGenCashIcon,
      label,
      ...CARD_PALETTE[0],
    };
  }

  // 2. Card / Visa / Master / Knet / Debit / POS -> Cobalt Blue (Theme 2)
  if (l.includes('card') || l.includes('visa') || l.includes('master') || l.includes('knet') || l.includes('debit') || l.includes('pos')) {
    return {
      icon: NewGenCardIcon,
      label,
      ...CARD_PALETTE[2],
    };
  }

  // 3. Credit / Ledger / Customer Account -> Royal Violet (Theme 1)
  if (l.includes('credit') || l.includes('ledger') || l.includes('account')) {
    return {
      icon: NewGenCreditIcon,
      label,
      ...CARD_PALETTE[1],
    };
  }

  // 4. Test Pay -> Warm Terracotta Orange (Theme 3)
  if (l.includes('test')) {
    return {
      icon: NewGenTestPayIcon,
      label,
      ...CARD_PALETTE[3],
    };
  }

  // 5. Demo Pay -> Ruby Crimson Red (Theme 4)
  if (l.includes('demo')) {
    return {
      icon: NewGenDemoPayIcon,
      label,
      ...CARD_PALETTE[4],
    };
  }

  // 6. Dummy Pay -> Electric Indigo (Theme 5)
  if (l.includes('dummy')) {
    return {
      icon: NewGenDummyPayIcon,
      label,
      ...CARD_PALETTE[5],
    };
  }

  // 7. BenefitPay / Online / QR / Mobile -> Ocean Cyan (Theme 6)
  if (l.includes('benefit') || l.includes('online') || l.includes('qr') || l.includes('upi') || l.includes('apple') || l.includes('google') || l.includes('mobile') || l.includes('wallet') || l.includes('pay')) {
    return {
      icon: NewGenMobilePayIcon,
      label,
      ...CARD_PALETTE[6],
    };
  }

  // 8. Dynamic Fallback -> Cycle through palette based on index
  const theme = CARD_PALETTE[index % CARD_PALETTE.length];
  return {
    icon: NewGenDefaultIcon,
    label,
    ...theme,
  };
};

interface MultiPayAmountModalProps {
  isOpen: boolean;
  tender: TenderOption;
  remainingAmount: number;
  currencySymbol: string;
  decimalPart: number;
  onClose: () => void;
  onSubmit: (amount: number) => void;
}

const MultiPayAmountModal: React.FC<MultiPayAmountModalProps> = ({
  isOpen,
  tender,
  remainingAmount,
  currencySymbol,
  decimalPart,
  onClose,
  onSubmit,
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

  const cfg = getModeConfig(tender.label);
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
      <div className={`py-4 px-5 flex justify-between items-center text-white shrink-0 ${cfg.headerGradient}`}>
        <h2 className="text-sm font-black uppercase tracking-wider flex items-center gap-2.5 font-['Outfit']">
          <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5 text-white" />
          </div>
          {tender.label} Payment
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="opacity-70 hover:opacity-100 transition-opacity bg-black/15 hover:bg-black/25 p-1.5 rounded-full"
          tabIndex={-1}
        >
          <XCircle size={20} />
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="bg-white p-5 space-y-4 font-['Outfit']">
        {/* Modern Input Display */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col items-end relative overflow-hidden shrink-0 shadow-inner">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-['Outfit']">
            Amount ({currencySymbol})
          </span>
          <div className="w-full flex items-center relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="none"
              value={value}
              onChange={e => {
                setShouldOverwrite(false);
                const val = e.target.value.replace(/[^0-9.]/g, '');
                if ((val.match(/\./g) || []).length > 1) return;
                if (val === '' || parseFloat(val) >= 0) setValue(val);
              }}
              className="w-full text-right text-4xl font-black text-slate-900 bg-transparent outline-none font-['Outfit'] tracking-tight tabular-nums placeholder:text-slate-300"
              placeholder={`0.${'0'.repeat(decimalPart)}`}
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
        <div className="grid grid-cols-3 gap-2.5 shrink-0">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'Back'].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`
                h-14 rounded-2xl text-2xl font-black font-['Outfit'] transition-all active:scale-95 shadow-sm border-2 flex items-center justify-center select-none
                ${key === 'Back'
                  ? 'bg-red-50 text-red-500 border-red-200 hover:bg-red-100 hover:border-red-300'
                  : 'bg-white text-slate-800 border-slate-200 hover:bg-slate-50 hover:border-slate-300 hover:shadow'}
              `}
            >
              {key === 'Back' ? '⌫' : key}
            </button>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2 shrink-0 font-['Outfit']">
          <button
            type="button"
            onClick={onClose}
            className="h-12 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white font-black uppercase text-xs tracking-wider rounded-2xl active:scale-95 shadow-[0_4px_14px_rgba(244,63,94,0.35)] transition-all font-['Outfit'] flex items-center justify-center gap-1.5 cursor-pointer"
            tabIndex={-1}
          >
            <XCircle size={16} />
            Cancel
          </button>
          <button
            type="submit"
            disabled={!value || parseFloat(value) <= 0}
            className={`h-12 text-white font-black uppercase text-xs tracking-wider rounded-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed font-['Outfit'] cursor-pointer ${cfg.btnColor}`}
          >
            <Check size={16} className="stroke-[3]" />
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
  loading,
  customerId,
  tenderOptions = [],
  disableCredit = false,
}) => {
  const { formatAmount, currencySymbol, decimalPart } = useCurrency();
  const { showToast } = useToast();

  const [payments, setPayments] = useState<MultiPaymentLine[]>([]);
  const [selectedTender, setSelectedTender] = useState<TenderOption | null>(null);

  // Take only what comes from backend, filtering out multi pay (and credit if disabled)
  const availableTenders = React.useMemo(() => {
    const filtered = (tenderOptions || []).filter(t => {
      const lbl = (t.label || '').toLowerCase();
      if (lbl.includes('multi')) return false;
      if (disableCredit && lbl.includes('credit')) return false;
      return true;
    });

    const list = filtered.length > 0
      ? filtered
      : (disableCredit
          ? [
              { id: '1', label: 'Cash' },
              { id: '2', label: 'Card' }
            ]
          : [
              { id: '1', label: 'Cash' },
              { id: '2', label: 'Card' },
              { id: '3', label: 'Credit' }
            ]);

    // Ensure Cash is ALWAYS first priority
    return list.slice().sort((a, b) => {
      const aIsCash = String(a.id) === '1' || (a.label || '').toLowerCase().includes('cash');
      const bIsCash = String(b.id) === '1' || (b.label || '').toLowerCase().includes('cash');
      if (aIsCash && !bIsCash) return -1;
      if (!aIsCash && bIsCash) return 1;
      return Number(a.id) - Number(b.id);
    });
  }, [tenderOptions, disableCredit]);

  const totalPaid  = payments.reduce((sum, p) => sum + p.amount, 0);

  const roundedPaid = Number(totalPaid.toFixed(decimalPart));
  const roundedDue = Number(totalDue.toFixed(decimalPart));

  const remaining  = Math.max(0, roundedDue - roundedPaid);
  const change     = Math.max(0, roundedPaid - roundedDue);
  const isComplete = roundedPaid >= roundedDue && roundedDue > 0;

  useEffect(() => {
    if (isOpen) {
      setPayments([]);
      setSelectedTender(null);
    }
  }, [isOpen]);

  const handleAddPayment = (amount: number) => {
    if (selectedTender) {
      const tender = selectedTender;
      const label = (tender.label || '').toLowerCase();
      const isCash = label.includes('cash');
      const isCredit = label.includes('credit');

      if (isCredit && (!customerId || Number(customerId) === 1)) {
        showToast("Credit is not allowed for Cash Customer", "warning");
        setSelectedTender(null);
        return;
      }

      // Validation Rule: Non-Cash methods cannot cause an overpayment
      if (!isCash) {
        const potentialTotal = totalPaid + amount;
        if (Number(potentialTotal.toFixed(decimalPart)) > roundedDue) {
          showToast(`Overpayment is only allowed for Cash. Maximum allowed for ${tender.label} is ${formatAmount(remaining)}`, "error");
          return;
        }
      }

      setPayments(prev => {
        const existing = prev.findIndex(p => String(p.paymodeId) === String(tender.id));
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], amount: updated[existing].amount + amount };
          return updated;
        }
        return [...prev, { paymodeId: tender.id, label: tender.label, amount }];
      });
      setSelectedTender(null);
    }
  };

  const removePayment = (index: number) => {
    setPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (isComplete) onSubmit(payments, change);
  };

  const footer = (
    <div className="flex gap-4 w-full pt-2 font-['Outfit']">
      <button
        type="button"
        onClick={onClose}
        className="flex-1 h-15 sm:h-16 bg-gradient-to-r from-red-600 via-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black uppercase text-base sm:text-lg tracking-[0.2em] shadow-[0_8px_25px_-2px_rgba(220,38,38,0.55)] hover:shadow-[0_10px_32px_rgba(220,38,38,0.7)] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-2.5 cursor-pointer"
      >
        <XCircle size={22} className="stroke-[2.5] opacity-95" />
        Cancel
      </button>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!isComplete || loading}
        className={`flex-1 h-15 sm:h-16 font-black uppercase text-base sm:text-lg tracking-[0.2em] active:scale-[0.98] transition-all rounded-2xl flex items-center justify-center gap-2.5 ${
          !isComplete
            ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white opacity-45 cursor-not-allowed shadow-none'
            : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-white shadow-[0_8px_25px_-2px_rgba(16,185,129,0.5)] hover:shadow-[0_10px_32px_rgba(16,185,129,0.65)] hover:scale-[1.01] cursor-pointer'
        }`}
      >
        {loading ? (
          <span className="flex items-center gap-2.5">
            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <Check size={23} className="stroke-[3]" />
            Pay
          </>
        )}
      </button>
    </div>
  );

  const gridColsClass = availableTenders.length === 2 
    ? 'grid-cols-2' 
    : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          <div className="flex items-center gap-2.5 font-['Outfit']">
            <span className="text-xl font-extrabold text-slate-800 tracking-tight">
              Multi-Pay Settlement
            </span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 uppercase tracking-wider">
              Split Tender
            </span>
          </div>
        }
        size="2xl"
        className="!max-w-[1080px] w-full"
        footer={footer}
      >
        <div className="flex flex-col gap-4 py-1">

          {/* ── Summary Row (FinTech Luxury Stat Cards with Depth) ── */}
          <div className="grid grid-cols-3 gap-3.5 sm:gap-4 font-['Outfit']">

            {/* 1. Total Due */}
            <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#0f172a] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_12px_28px_-6px_rgba(15,23,42,0.35)] border border-slate-700/60 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/[0.04] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-slate-300 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border border-white/10">
                  <Receipt size={12} className="text-teal-400" /> Total Due
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-slate-400 uppercase tracking-widest">{currencySymbol}</span>
              </div>
              <div className="mt-2.5 sm:mt-3 relative z-10">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-sm">
                  {formatAmount(totalDue)}
                </span>
                <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
                  Invoice Amount
                </span>
              </div>
            </div>

            {/* 2. Total Paid */}
            <div className="bg-gradient-to-br from-[#1e40af] via-[#1d4ed8] to-[#172554] text-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_12px_28px_-6px_rgba(29,78,216,0.35)] border border-blue-400/40 relative overflow-hidden flex flex-col justify-between">
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/[0.05] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-blue-100 text-[10px] sm:text-[11px] font-black uppercase tracking-wider border border-white/15">
                  <CheckCircle2 size={12} className="text-cyan-300" /> Total Paid
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-blue-200/70 uppercase tracking-widest">{currencySymbol}</span>
              </div>
              <div className="mt-2.5 sm:mt-3 relative z-10">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-sm">
                  {formatAmount(totalPaid)}
                </span>
                {/* Real-time settlement progress bar */}
                <div className="w-full bg-black/25 h-1.5 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-300 h-full rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(103,232,249,0.8)]"
                    style={{ width: `${Math.min(100, (roundedPaid / (roundedDue || 1)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 3. Remaining or Change */}
            <div className={`rounded-2xl sm:rounded-3xl p-4 sm:p-5 border relative overflow-hidden flex flex-col justify-between transition-all duration-300 text-white ${
              remaining === 0
                ? change > 0
                  ? 'bg-gradient-to-br from-[#059669] via-[#047857] to-[#064e3b] shadow-[0_12px_28px_-6px_rgba(5,150,105,0.4)] border-emerald-400/50'
                  : 'bg-gradient-to-br from-[#059669] via-[#047857] to-[#064e3b] shadow-[0_12px_28px_-6px_rgba(5,150,105,0.4)] border-emerald-400/50'
                : 'bg-gradient-to-br from-[#ea580c] via-[#c2410c] to-[#7c2d12] shadow-[0_12px_28px_-6px_rgba(234,88,12,0.35)] border-amber-400/40'
            }`}>
              <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/[0.05] pointer-events-none" />
              <div className="flex items-center justify-between relative z-10">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 text-white text-[10px] sm:text-[11px] font-black uppercase tracking-wider border border-white/15">
                  {remaining === 0 && change > 0 ? (
                    <>
                      <Sparkles size={12} className="text-emerald-200" /> Change Due
                    </>
                  ) : remaining === 0 ? (
                    <>
                      <CheckCircle2 size={12} className="text-emerald-200" /> Settled
                    </>
                  ) : (
                    <>
                      <Clock size={12} className="text-amber-200" /> Remaining
                    </>
                  )}
                </span>
                <span className="text-[10px] sm:text-[11px] font-extrabold text-white/70 uppercase tracking-widest">{currencySymbol}</span>
              </div>
              <div className="mt-2.5 sm:mt-3 relative z-10">
                <span className="text-3xl sm:text-4xl font-black text-white tracking-tight tabular-nums drop-shadow-sm">
                  {formatAmount(remaining === 0 ? change : remaining)}
                </span>
                <span className="block text-[10px] sm:text-[11px] font-semibold text-white/70 tracking-wider uppercase mt-0.5">
                  {remaining === 0 && change > 0
                    ? 'Return to Customer'
                    : remaining === 0
                    ? 'Ready to Settle'
                    : 'Pending Balance'}
                </span>
              </div>
            </div>

          </div>

          {/* ── Payment Methods Grid ── */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-4 sm:p-5 space-y-3 font-['Outfit']">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Select Payment Method</span>
            </div>

            <div className={`grid ${gridColsClass} gap-3.5 sm:gap-4`}>
              {availableTenders.map((tender, index) => {
                const cfg = getModeConfig(tender.label, index);
                const paymentIdx = payments.findIndex(p => String(p.paymodeId) === String(tender.id));
                const payment = payments[paymentIdx];
                const hasPayment = !!payment;
                const isCash = (tender.label || '').toLowerCase().includes('cash');
                const isCredit = (tender.label || '').toLowerCase().includes('credit');
                const isCreditDisabled = isCredit && (!customerId || Number(customerId) === 1);
                const isDisabled = isCreditDisabled || (!isCash && remaining <= 0 && !hasPayment);
                const isMuted = isCreditDisabled || (isDisabled && !hasPayment);

                return (
                  <div key={String(tender.id)} className="relative h-28 sm:h-32 group">
                    <button
                      type="button"
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedTender(tender);
                      }}
                      disabled={isDisabled}
                      title={isCreditDisabled ? "Credit is disabled for Cash Customer" : undefined}
                      className={`w-full h-full relative overflow-hidden rounded-2xl p-4 sm:p-5 flex flex-col justify-between text-left transition-all duration-300 select-none ${
                        isCreditDisabled
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-60 shadow-none'
                          : hasPayment
                            ? `${cfg.cardGradient} ${cfg.glowShadow} ring-2 ring-white/90 shadow-2xl scale-[1.01]`
                            : isDisabled
                              ? 'bg-slate-200 text-slate-400 cursor-not-allowed opacity-50 shadow-none'
                              : `${cfg.cardGradient} ${cfg.glowShadow} hover:-translate-y-1 hover:scale-[1.01] active:scale-[0.98] cursor-pointer`
                      }`}
                    >
                      {/* Top Row: Payment Method Name */}
                      <div className="relative z-10 flex items-center justify-between w-full">
                        <span className={`text-base sm:text-lg font-black tracking-wide uppercase truncate block leading-tight ${
                          isMuted ? 'text-slate-500' : 'text-white drop-shadow-sm'
                        }`}>
                          {t(tender.label)}
                        </span>
                        {isCreditDisabled && (
                          <Lock size={15} className="text-slate-400 shrink-0" />
                        )}
                      </div>

                      {/* Bottom Row: Amount */}
                      <div className="relative z-10 flex items-baseline justify-between w-full">
                        <span className={`text-2xl sm:text-3xl font-black tracking-tight tabular-nums ${
                          isMuted ? 'text-slate-400' : 'text-white drop-shadow-md'
                        }`}>
                          {formatAmount(hasPayment ? payment.amount : 0)}
                        </span>
                        <span className={`text-xs sm:text-sm font-extrabold uppercase tracking-wider ${
                          isMuted ? 'text-slate-400' : 'text-white/80'
                        }`}>
                          {currencySymbol}
                        </span>
                      </div>
                    </button>

                    {/* Remove Payment Badge */}
                    {hasPayment && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removePayment(paymentIdx);
                        }}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full border-2 border-white flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-90 z-20 cursor-pointer"
                        title="Remove Payment"
                      >
                        <XCircle size={14} />
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
      {selectedTender && (
        <MultiPayAmountModal
          isOpen={selectedTender !== null}
          tender={selectedTender}
          remainingAmount={remaining}
          currencySymbol={currencySymbol}
          decimalPart={decimalPart}
          onClose={() => setSelectedTender(null)}
          onSubmit={handleAddPayment}
        />
      )}
    </>
  );
};
