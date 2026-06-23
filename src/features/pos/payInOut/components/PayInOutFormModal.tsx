import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal, Button, FormInput, SelectInput, Loader } from '../../../../components/common';
import { useCurrency } from '../../../../hooks/useCurrency';

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
          vchNo: '',
          date: new Date().toISOString().split('T')[0],
          description: '',
          amount: (0).toFixed(decimalPart),
          paymodeId: paymodes.length > 0 ? Number(paymodes[0].value) : 1
        });
      }
    }
  }, [isOpen, initialData, reset, paymodes]);

  const handleClear = () => {
    reset({
      type: 'IN',
      vchNo: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      amount: (0).toFixed(decimalPart),
      paymodeId: paymodes.length > 0 ? Number(paymodes[0].value) : 1
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialData ? "Edit Transaction" : "Add Pay In / Out"}
      size="lg"
      footer={
        <div className="flex gap-3">
          <Button 
            variant="secondary"
            onClick={handleClear}
            className="px-6 h-10.5 text-xs font-bold uppercase tracking-widest"
            tabIndex={-1}
          >
            Clear
          </Button>
          <Button 
            onClick={handleSubmit(onSubmit)}
            disabled={isSaving}
            className="px-8 h-10.5 text-xs font-bold uppercase tracking-widest bg-[#49293e] hover:bg-[#3d2234] shadow-md shadow-[#49293e]/15"
          >
            {isSaving ? <Loader size="sm" /> : "Save"}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center py-2">
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
          placeholder="Enter voucher number..."
          hideLabel
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
        />

        {/* DESCRIPTION */}
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600 flex items-center gap-1">Description <span className="text-red-500">*</span></label>
        </div>
        <FormInput
          {...register('description')}
          placeholder="Enter description..."
          autoFocus
          hideLabel
          error={errors.description?.message}
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
      </form>
    </Modal>
  );
};
