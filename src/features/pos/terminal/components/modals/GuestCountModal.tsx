import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Users, Delete } from 'lucide-react';
import Modal from '../../../../../components/common/Modal';

interface GuestCountModalProps {
  isOpen: boolean;
  tableName: string;
  onConfirm: (guestCount: number) => void;
  onClose: () => void;
}

const NUMPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00'];

export const GuestCountModal: React.FC<GuestCountModalProps> = ({
  isOpen,
  tableName,
  onConfirm,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  // Reset + focus confirm button when modal opens (autofocus rule §1)
  useEffect(() => {
    if (isOpen) {
      setInput('');
      // Slight defer so the modal renders first
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleKey = useCallback((key: string) => {
    setInput(prev => {
      if (prev === '' && key === '0') return prev; // no leading zeros
      const next = prev + key;
      const val = parseInt(next, 10);
      if (val > 999) return prev; // cap at 999 guests
      return next;
    });
  }, []);

  const handleBackspace = useCallback(() => {
    setInput(prev => prev.slice(0, -1));
  }, []);

  const handleConfirm = useCallback(() => {
    const val = parseInt(input, 10);
    if (!val || val < 1) return;
    onConfirm(val);
  }, [input, onConfirm]);

  // Physical keyboard support (digits, Backspace, Enter) — §1 POS keyboard rule
  // Note: Escape is already handled by the parent Modal component
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      // Don't intercept Tab — let browser handle focus navigation (§2 Tab rule)
      if (e.key === 'Tab') return;
      if (e.key >= '0' && e.key <= '9') { e.preventDefault(); handleKey(e.key); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleBackspace(); }
      else if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, handleKey, handleBackspace, handleConfirm]);

  const guestCount = parseInt(input, 10) || 0;

  return (
    // Using the shared Modal component (§components reuse rule)
    // noPadding + className override for full custom interior
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      noPadding
      showClose={false}
      className="w-full max-w-[95vw] md:max-w-sm overflow-hidden rounded-3xl"
    >
      {/* Header */}
      <div className="bg-[#49293e] px-6 py-5 text-white text-center">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-3">
          <Users size={24} className="text-white" />
        </div>
        {/* §15 ERP Typography: h1 heading */}
        <h2 className="text-sm font-black uppercase tracking-[0.2em]">Number of Guests</h2>
        {/* §15 ERP label style */}
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/60 mt-0.5">
          Table: {tableName}
        </p>
      </div>

      {/* Display */}
      <div className="px-6 pt-5 pb-3 bg-white">
        <div className="flex items-center justify-between bg-slate-50 rounded-2xl px-5 py-3 border-2 border-slate-100">
          {/* §15 ERP label: text-[10px] font-bold uppercase tracking-widest text-slate-600 */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
            Guests
          </span>
          {/* §3 numeric display: right-aligned */}
          <span className="text-4xl font-black text-[#49293e] tracking-tighter min-w-[60px] text-right">
            {input === '' ? <span className="text-slate-200">0</span> : input}
          </span>
        </div>
      </div>

      {/* Numpad — §2 Tab navigation: tabIndex on each key */}
      <div className="px-6 pb-3 bg-white">
        <div className="grid grid-cols-3 gap-2">
          {NUMPAD_KEYS.map((key, i) => (
            <button
              key={key}
              tabIndex={i + 1}
              onClick={() => handleKey(key)}
              // §15 touch target: min 44px (h-14 = 56px ✓)
              className="h-14 rounded-2xl bg-slate-50 border-2 border-slate-100 text-[#49293e] text-lg font-black
                hover:bg-[#49293e] hover:text-white hover:border-[#49293e]
                focus:outline-none focus:ring-2 focus:ring-[#49293e]/40
                active:scale-95 transition-all duration-150"
            >
              {key}
            </button>
          ))}
          {/* Backspace — tabIndex after all digit keys */}
          <button
            tabIndex={NUMPAD_KEYS.length + 1}
            onClick={handleBackspace}
            aria-label="Backspace"
            className="h-14 rounded-2xl bg-red-50 border-2 border-red-100 text-red-500
              hover:bg-red-500 hover:text-white hover:border-red-500
              focus:outline-none focus:ring-2 focus:ring-red-400/40
              active:scale-95 transition-all duration-150 flex items-center justify-center"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>

      {/* Actions — §2 Tab: Cancel is tabIndex={-1} (destructive reset, §2 EXCEPTION), Confirm is primary */}
      <div className="px-6 pb-6 bg-white grid grid-cols-2 gap-3">
        <button
          tabIndex={-1}           // §2: "Clear/Reset/Cancel" buttons use tabIndex={-1}
          onClick={onClose}
          className="h-12 rounded-2xl bg-slate-100 text-slate-500 font-black text-sm uppercase tracking-widest
            hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-300
            active:scale-95 transition-all"
        >
          Cancel
        </button>
        <button
          ref={confirmBtnRef}
          tabIndex={NUMPAD_KEYS.length + 2} // last in Tab order — primary action (§2)
          onClick={handleConfirm}
          disabled={guestCount < 1}
          className="h-12 rounded-2xl bg-[#49293e] text-white font-black text-sm uppercase tracking-widest
            hover:bg-[#5c3450] focus:outline-none focus:ring-2 focus:ring-[#49293e]/50
            active:scale-95 transition-all
            disabled:opacity-40 disabled:cursor-not-allowed
            shadow-lg shadow-[#49293e]/30"
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
};
