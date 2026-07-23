import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, FormInput, SelectInput, Loader } from '../../../../components/common';
import { TouchKeyboard } from '../../../../components/common/TouchKeyboard';
import { useCurrency } from '../../../../hooks/useCurrency';
import { usePayInOutVoucherNumber } from '../hooks/usePayInOutQueries';

const payInOutSchema = z.object({
  type: z.enum(['IN', 'OUT']),
  vchNo: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().min(1, "Amount is required").refine(val => Number(val) >= 0.01, "Amount must be greater than 0"),
  paymodeId: z.number().min(1, "Paymode is required")
});

export type PayInOutFormData = z.infer<typeof payInOutSchema>;

interface PayInOutFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: PayInOutFormData) => void;
  initialData?: any;
  paymodes: { value: string; label: string }[];
  isSaving: boolean;
}

export const PayInOutFormModal: React.FC<PayInOutFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  paymodes,
  isSaving
}) => {
  const { decimalPart } = useCurrency();
  const { data: voucherNumberStr } = usePayInOutVoucherNumber(isOpen && !initialData);

  const [isKeyboardEnabled, setIsKeyboardEnabled] = useState(window.innerWidth >= 768);
  const [showKeyboard, setShowKeyboard] = useState(window.innerWidth >= 768);
  const [isCompactViewport, setIsCompactViewport] = useState(false);


  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors }
  } = useForm<PayInOutFormData>({
    resolver: zodResolver(payInOutSchema),
    defaultValues: {
      type: 'IN',
      vchNo: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: (0).toFixed(decimalPart),
      paymodeId: paymodes.length > 0 ? Number(paymodes[0].value) : 1
    }
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset({
          type: initialData.inOut,
          vchNo: initialData.vchNo?.toString() || '',
          date: initialData.voucherDate?.split('T')[0] || new Date().toISOString().split('T')[0],
          description: initialData.description,
          amount: Number(initialData.amount).toFixed(decimalPart),
          paymodeId: initialData.paymodeId
        });
      } else {
        reset({
          type: 'IN',
          vchNo: voucherNumberStr?.toString() || '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: (0).toFixed(decimalPart),
          paymodeId: paymodes.length > 0 ? Number(paymodes[0].value) : 1
        });
      }
    }
  }, [isOpen, initialData, reset, paymodes, voucherNumberStr, decimalPart]);

  useEffect(() => {
    const updateViewportMode = () => {
      const mobile = window.innerWidth < 768;
      setIsCompactViewport(window.innerWidth < 1200 || window.innerHeight < 820);
      if (mobile && isKeyboardEnabled) {
        setIsKeyboardEnabled(false);
        setShowKeyboard(false);
      }
    };
    updateViewportMode();
    window.addEventListener("resize", updateViewportMode);
    return () => window.removeEventListener("resize", updateViewportMode);
  }, [isKeyboardEnabled]);

  const handleClear = () => {
    reset({
      type: 'IN',
      vchNo: voucherNumberStr?.toString() || '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: (0).toFixed(decimalPart),
      paymodeId: paymodes.length > 0 ? Number(paymodes[0].value) : 1
    });
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement> | React.MouseEvent<HTMLInputElement>) => {
    if (isKeyboardEnabled) {
      setShowKeyboard(true);
      // Ensure the element is scrolled into view after the keyboard pops up
      setTimeout(() => {
        if (e.target && e.target instanceof Element) {
          e.target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 150);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      noScroll
      noPadding
      className="!max-w-[95vw] w-[95vw] md:!max-w-[800px] md:w-[800px] !max-h-[95vh] h-[95vh] !rounded-none !m-0 bg-[#f8f9fa] flex flex-col shadow-none overflow-hidden z-[100]"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 h-full min-h-0 bg-slate-50">
        
        {/* Premium Header */}
        <div className="flex items-center justify-between bg-[#49293e] px-4 py-3 text-white shrink-0 border-b border-white/10 relative flex-wrap gap-4 shadow-md z-20">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            </div>
            <h2 className="text-sm font-black tracking-[0.2em] uppercase whitespace-nowrap">
              {initialData ? "Edit Transaction" : "Add Pay In / Out"}
            </h2>
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <button 
              type="button"
              onClick={() => {
                const newVal = !isKeyboardEnabled;
                setIsKeyboardEnabled(newVal);
                setShowKeyboard(newVal);
              }}
              className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all border ${
                isKeyboardEnabled 
                  ? "text-[#49293e] bg-white border-white hover:bg-slate-100 shadow-sm" 
                  : "text-white/70 bg-white/10 border-white/20 hover:bg-white/20"
              }`}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M11 19a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9ZM19 9h-7.5a3 3 0 0 0-3 3v1h10.5a3 3 0 0 0 3-3V9Z"/>
              </svg>
              {isKeyboardEnabled ? "Touch Keyboard" : "Native Keyboard"}
            </button>

            <div className="w-px h-6 bg-white/20 mx-1"></div>

            <Button 
              variant="secondary"
              onClick={handleClear}
              className="h-10 text-xs font-bold uppercase tracking-widest text-[#49293e] bg-white hover:bg-slate-100"
              tabIndex={-1}
            >
              Clear
            </Button>
            <Button 
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="h-10 text-xs font-bold uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 shadow-md border-none text-white"
            >
              {isSaving ? <Loader size="sm" /> : "Save"}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-1"
              tabIndex={-1}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 hide-scrollbar relative z-10">
          <div className="bg-white rounded-2xl p-5 md:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-200/60 max-w-[600px] mx-auto">
            <div className="grid gap-5 md:grid-cols-[120px_minmax(0,1fr)] md:items-center py-2">
        {/* TYPE Selection */}
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Type</span>
        <div className="flex gap-6 items-center py-2">
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-[#49293e] uppercase tracking-[0.1em] select-none">
            <input
              type="radio"
              value="IN"
              {...register('type')}
              className="w-4 h-4 text-[#49293e] focus:ring-[#49293e]/30 border-gray-300"
            />
            IN
          </label>
          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-[#49293e] uppercase tracking-[0.1em] select-none">
            <input
              type="radio"
              value="OUT"
              {...register('type')}
              className="w-4 h-4 text-[#49293e] focus:ring-[#49293e]/30 border-gray-300"
            />
            OUT
          </label>
        </div>

        {/* VCH NO */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Vch No</label>
        </div>
        <FormInput
          {...register('vchNo', {
             onChange: (e) => setValue('vchNo', e.target.value.toUpperCase().replace(/\s/g, ''))
          })}
          placeholder="Auto Generated"
          hideLabel
          disabled
          error={errors.vchNo?.message}
        />

        {/* DATE */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">Date <span className="text-red-500">*</span></label>
        </div>
        <FormInput
          type="date"
          {...register('date')}
          hideLabel
          error={errors.date?.message}
          inputMode={isKeyboardEnabled ? "none" : undefined}
          readOnly={isKeyboardEnabled}
        />

        {/* DESCRIPTION */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">Description <span className="text-red-500">*</span></label>
        </div>
        <FormInput
          {...register('description')}
          placeholder="Enter description..."
          hideLabel
          error={errors.description?.message}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          inputMode={isKeyboardEnabled ? "none" : undefined}
          readOnly={isKeyboardEnabled}
        />

        {/* AMOUNT */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">Amount <span className="text-red-500">*</span></label>
        </div>
        <FormInput
          type="number"
          {...register('amount')}
          placeholder={(0).toFixed(decimalPart)}
          step={Math.pow(10, -decimalPart).toString()}
          inputClassName="text-right font-black"
          hideLabel
          error={errors.amount?.message}
          onFocus={handleInputFocus}
          onClick={handleInputFocus}
          inputMode={isKeyboardEnabled ? "none" : undefined}
          readOnly={isKeyboardEnabled}
        />

        {/* PAYMODE */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">Paymode <span className="text-red-500">*</span></label>
        </div>
        <SelectInput
          {...register('paymodeId', { valueAsNumber: true })}
          options={paymodes}
          noMargin
          error={errors.paymodeId?.message}
        />
            </div>
          </div>
        </div>
        
        {/* Keyboard Section */}
        {showKeyboard && (
          <div className={`shrink-0 w-full bg-[#f8f9fa] mt-auto ${isCompactViewport ? "px-1 pb-1" : "px-3 lg:px-4 pb-2"} border-t border-slate-100`}>
            <div className={`w-full ${isCompactViewport ? "max-w-[900px]" : "max-w-[1000px]"} mx-auto bg-gradient-to-b from-[#faf8f9] to-[#f3edf0] border border-slate-300 shadow-[0_15px_40px_rgba(73,41,62,0.08)] rounded-2xl ${isCompactViewport ? "p-1" : "p-2 lg:p-2.5"}`}>
              <TouchKeyboard
                onClose={() => setShowKeyboard(false)}
                size={isCompactViewport ? "md" : "lg"}
                embedded={true}
              />
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
};
