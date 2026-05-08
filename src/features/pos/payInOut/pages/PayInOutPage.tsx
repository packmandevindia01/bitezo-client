import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Save, 
  RotateCcw,
  RefreshCcw,
  Receipt,
  ArrowLeft,
  XCircle
} from 'lucide-react';
import { Button, FormInput, SelectInput, Loader } from '../../../../components/common';
import { payInOutService, type PayInOutItem } from '../services/payInOutService';
import { paymodeService } from '../../../general/paymode/services/paymodeService';
import { cashierLogService } from '../../cashier/services/cashierLogService';
import { useToast } from '../../../../app/providers/useToast';
import { useCurrency } from '../../../../hooks/useCurrency';

const PayInOutPage: React.FC = () => {
  const navigate = useNavigate();
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
      showToast("Could not verify cashier session", "warning");
    }
  }, [showToast]);

  const fetchPaymodes = useCallback(async () => {
    try {
      const data = await paymodeService.list();
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
      fromDate.setDate(fromDate.getDate() - 7); // Last 7 days by default
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

  useEffect(() => {
    fetchStatus();
    fetchPaymodes();
    fetchTransactions();
  }, [fetchStatus, fetchPaymodes, fetchTransactions]);

  const handleClear = () => {
    setVchNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    if (paymodes.length > 0) setPaymodeId(paymodes[0].value);
  };

  useEffect(() => {
    // Ensure autofocus when switching tabs
    setTimeout(() => document.getElementById('pay-desc')?.focus(), 0);
  }, [type]);

  const handleSave = async () => {
    if (!description || !amount || !paymodeId) {
      showToast("Please fill all required fields", "warning");
      return;
    }

    if (!cashierStatus || cashierStatus.isDayClosed || cashierStatus.isShiftClosed) {
      showToast("No active cashier session found. Please open a session first.", "error");
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
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/pos', { state: { openMoreModal: true } })}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-lg font-black text-[#49293e] tracking-widest uppercase">Pay In / Out</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Cash Management</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4 overflow-hidden">
        
        {/* Form Section */}
        <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex justify-center mb-2">
            <div className="inline-flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 shadow-inner">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${
                  type === 'IN' 
                    ? 'bg-[#49293e] text-white shadow-sm shadow-[#49293e]/20' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <ArrowDownLeft size={18} />
                In
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg text-sm font-bold tracking-widest uppercase transition-all ${
                  type === 'OUT' 
                    ? 'bg-[#49293e] text-white shadow-sm shadow-[#49293e]/20' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 border border-transparent'
                }`}
              >
                <ArrowUpRight size={18} />
                Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-0 max-w-4xl mx-auto">
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
                id="pay-desc"
                label="DESCRIPTION"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter description..."
                autoFocus
              />
            </div>
            <FormInput
              label="AMOUNT"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <SelectInput
              label="PAYMODE"
              value={paymodeId}
              onChange={(e) => setPaymodeId(e.target.value)}
              options={paymodes}
            />
          </div>

          <div className="flex justify-end gap-3 mt-1 max-w-4xl mx-auto">
            <Button 
              variant="secondary"
              onClick={handleClear}
              className="px-8 h-[48px] text-xs font-bold uppercase tracking-widest"
            >
              <RotateCcw size={16} className="mr-2" />
              Clear
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-10 h-[48px] text-xs font-bold uppercase tracking-widest bg-[#49293e] hover:bg-[#3d2234] shadow-lg shadow-[#49293e]/20"
            >
              {isSaving ? <Loader size="sm" /> : <Save size={16} className="mr-2" />}
              Save
            </Button>
          </div>
        </div>

        {/* List Section */}
        <div className="bg-white p-3 lg:p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden min-h-0 gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#49293e]/5 text-[#49293e] rounded-lg">
                <Receipt size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
                List Pay In / Out
              </h3>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative w-full sm:w-80 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#49293e] transition-colors" size={16} />
                <input
                  type="text"
                  placeholder="Search by Date, In/Out..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e] outline-none transition-all"
                />
              </div>
              <button 
                type="button"
                onClick={fetchTransactions}
                className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-[#49293e] hover:border-[#49293e] hover:bg-[#49293e]/5 transition-all"
                title="Refresh list"
              >
                <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto border border-slate-100 rounded-xl bg-slate-50/50 min-h-0">
            {isLoading ? (
              <div className="h-full min-h-[200px] flex items-center justify-center">
                <Loader text="Loading records..." />
              </div>
            ) : items.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 py-10">
                <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Receipt size={24} strokeWidth={1.5} className="opacity-40" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No records found</p>
                <p className="text-xs font-medium text-slate-400 mt-2">Try adjusting your search criteria</p>
              </div>
            ) : (
              <table className="w-full border-collapse text-left bg-white">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vch No</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Actions</th>
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
                          {item.inOut === 'IN' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                          {item.inOut}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {new Date(item.date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-slate-900">
                        {item.vchNo}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-slate-600 max-w-xs truncate">
                        {item.description}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">
                        {formatAmount(item.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleCancel(item.transId)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Cancel transaction"
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
    </div>
  );
};

export default PayInOutPage;

