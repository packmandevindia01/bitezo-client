import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Save, 
  RotateCcw,
  RefreshCcw,
  Receipt,
  XCircle
} from 'lucide-react';
import { Modal, Button, FormInput, SelectInput, Loader } from '../../../../components/common';
import { payInOutService, type PayInOutItem } from '../services/payInOutService';
import { paymodeService } from '../../../general/paymode/services/paymodeService';
import { cashierLogService } from '../../cashier/services/cashierLogService';
import { useToast } from '../../../../app/providers/useToast';
import { useCurrency } from '../../../../hooks/useCurrency';

interface PayInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PayInOutModal: React.FC<PayInOutModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const { formatAmount } = useCurrency();

  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [vchNo, setVchNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymodeId, setPaymodeId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [items, setItems] = useState<PayInOutItem[]>([]);
  const [paymodes, setPaymodes] = useState<{ value: string; label: string }[]>([]);
  const [cashierStatus, setCashierStatus] = useState<any>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
      const counterId = Number(localStorage.getItem("systemCounterId")) || 0;
      const status = await cashierLogService.checkStatus(branchId, counterId);
      setCashierStatus(status.cashierInStatus);
    } catch (error) {
      console.error("Failed to fetch cashier status", error);
    }
  }, []);

  const fetchPaymodes = useCallback(async () => {
    try {
      const counterId = Number(localStorage.getItem("systemCounterId")) || 1;
      const data = await paymodeService.listByCounter(counterId);
      setPaymodes(data.map(p => ({ value: p.paymodeId.toString(), label: p.paymodeName })));
      if (data.length > 0) setPaymodeId(data[0].paymodeId.toString());
    } catch (error) {
      console.error("Failed to fetch paymodes", error);
    }
  }, []);

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 7);
      const data = await payInOutService.list({
        fromDate: fromDate.toISOString(),
        toDate: new Date().toISOString(),
        description: searchQuery || undefined
      });
      setItems(data.data || []);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery]);

  const fetchVoucherNumber = useCallback(async () => {
    try {
      const response = await payInOutService.getVoucherNumber();
      if (response.data && response.data.vchNo) {
        setVchNo(response.data.vchNo.toString());
      }
    } catch (error) {
      console.error("Failed to fetch voucher number", error);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      fetchPaymodes();
      fetchTransactions();
      fetchVoucherNumber();
    }
  }, [isOpen, fetchStatus, fetchPaymodes, fetchTransactions, fetchVoucherNumber]);

  const handleClear = () => {
    setVchNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    if (paymodes.length > 0) setPaymodeId(paymodes[0].value);
    fetchVoucherNumber();
  };

  const handleSave = async () => {
    if (!description || !amount || !paymodeId) {
      showToast("Please fill all required fields", "warning");
      return;
    }

    if (!cashierStatus || cashierStatus.isDayClosed || cashierStatus.isShiftClosed) {
      showToast("No active cashier session found.", "error");
      return;
    }

    setIsSaving(true);
    try {
      await payInOutService.create({
        inOut: type,
        voucherDate: new Date(date).toISOString(),
        description,
        amount: Number(amount),
        paymodeId: Number(paymodeId),
        dayId: cashierStatus.dayId,
        shiftId: cashierStatus.shiftId,
        createdAt: new Date().toISOString()
      });
      showToast("Transaction saved successfully", "success");
      handleClear();
      fetchTransactions();
    } catch (error: any) {
      showToast(error.message || "Failed to save transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = async (transId: number) => {
    if (!window.confirm("Are you sure you want to cancel this transaction?")) return;
    
    try {
      await payInOutService.cancel(transId);
      showToast("Transaction cancelled successfully", "success");
      fetchTransactions();
    } catch (error: any) {
      showToast(error.message || "Failed to cancel transaction", "error");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pay In / Out"
      size="xl"
    >
      <div className="space-y-6">
        
        {/* Form Section */}
        <div className="bg-slate-50/50 p-6 rounded-[24px] border border-slate-100 shadow-inner">
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${
                  type === 'IN' 
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowDownLeft size={16} />
                In
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-bold tracking-widest uppercase transition-all ${
                  type === 'OUT' 
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowUpRight size={16} />
                Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="VCH NO"
              value={vchNo}
              onChange={(e) => setVchNo(e.target.value)}
              placeholder="Auto Generated"
              disabled
            />
            <FormInput
              label="DATE"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="md:col-span-2">
              <FormInput
                label="DESCRIPTION"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
              />
            </div>
            <FormInput
              label="AMOUNT"
              type="number"
              value={amount}
              maxLength={10}
              onChange={(e) => {
                const val = e.target.value;
                if (val.length <= 10) {
                  setAmount(val);
                }
              }}
              placeholder="0.00"
            />
            <SelectInput
              label="PAYMODE"
              value={paymodeId}
              onChange={(e) => setPaymodeId(e.target.value)}
              options={paymodes}
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button 
              variant="secondary"
              onClick={handleClear}
              className="px-6 h-[42px] text-xs font-bold uppercase tracking-widest text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            >
              <RotateCcw size={16} className="mr-2" />
              Clear
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className={`px-8 h-[46px] rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg ${
                type === 'IN' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              }`}
            >
              {isSaving ? <Loader size="sm" /> : <Save size={16} className="mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* List Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
            <div className="relative max-w-sm w-full group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#49293e] transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search by Date, In/Out..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                List Pay In / Out
              </h3>
              <button 
                type="button"
                onClick={fetchTransactions}
                className="p-1.5 text-slate-400 hover:text-[#49293e] transition-colors"
                title="Refresh list"
              >
                <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          <div className="min-h-[250px] max-h-[350px] overflow-y-auto border border-slate-200 rounded-[24px] bg-white shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="h-[250px] flex items-center justify-center">
                <Loader text="Loading records..." />
              </div>
            ) : items.length === 0 ? (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-300">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={32} strokeWidth={1.5} className="opacity-20" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No records found</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left">
                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.transId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.inOut === 'IN' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {item.inOut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">
                        {formatAmount(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCancel(item.transId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <XCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default PayInOutModal;

