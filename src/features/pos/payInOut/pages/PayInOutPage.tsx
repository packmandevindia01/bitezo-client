import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeft,
  XCircle,
  Pencil
} from 'lucide-react';
import { Button, FormInput, SelectInput, Loader, ConfirmDialog, RecordTableCard, Modal } from '../../../../components/common';
import { payInOutService, type PayInOutItem } from '../services/payInOutService';
import { paymodeService } from '../../../general/paymode/services/paymodeService';
import { cashierLogService } from '../../cashier/services/cashierLogService';
import { useToast } from '../../../../app/providers/useToast';
import { useCurrency } from '../../../../hooks/useCurrency';

const PayInOutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { formatAmount, currencySymbol, decimalPart } = useCurrency();

  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [vchNo, setVchNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymodeId, setPaymodeId] = useState<string>('');
  
  // Search Filters
  const [searchFromDate, setSearchFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().split('T')[0];
  });
  const [searchToDate, setSearchToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchInOut, setSearchInOut] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [cancelId, setCancelId] = useState<number | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
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
      const fromD = new Date(searchFromDate);
      fromD.setHours(0, 0, 0, 0);
      const toD = new Date(searchToDate);
      toD.setHours(23, 59, 59, 999);

      const data = await payInOutService.list({
        fromDate: fromD.toISOString(),
        toDate: toD.toISOString(),
        description: searchQuery || undefined
      });
      setItems(data.data || []);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchFromDate, searchToDate, searchQuery]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchInOut !== 'ALL' && item.inOut !== searchInOut) return false;
      return true;
    });
  }, [items, searchInOut]);

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
    setEditingId(null);
  };

  useEffect(() => {
    if (isFormModalOpen) {
      setTimeout(() => document.getElementById('pay-desc')?.focus(), 100);
    }
  }, [isFormModalOpen]);

  const handleEdit = async (item: PayInOutItem) => {
    setIsLoading(true);
    try {
      const response = await payInOutService.getById(item.transId);
      const detail = response.data;
      setEditingId(item.transId);
      setType(detail.inOut);
      setVchNo(String(detail.vchNo || ''));
      setDate(detail.voucherDate.split('T')[0]);
      setDescription(detail.description);
      setAmount(String(detail.amount));
      setPaymodeId(String(detail.paymodeId));
      setIsFormModalOpen(true);
    } catch (error: any) {
      showToast("Failed to load details", "error");
    } finally {
      setIsLoading(false);
    }
  };

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
      if (editingId) {
        await payInOutService.update(editingId, {
          transId: editingId,
          inOut: type,
          voucherDate: new Date(date).toISOString(),
          description,
          amount: Number(amount),
          paymodeId: Number(paymodeId),
          updatedAt: new Date().toISOString()
        });
        showToast("Transaction updated successfully", "success");
      } else {
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
      }
      setIsFormModalOpen(false);
      handleClear();
      fetchTransactions();
    } catch (error: any) {
      showToast(error.message || "Failed to save transaction", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (transId: number) => {
    setCancelId(transId);
  };

  const confirmCancel = async () => {
    if (cancelId === null) return;
    setIsCancelling(true);
    try {
      await payInOutService.cancel(cancelId);
      showToast("Transaction cancelled successfully", "success");
      fetchTransactions();
    } catch (error: any) {
      showToast(error.message || "Failed to cancel transaction", "error");
    } finally {
      setIsCancelling(false);
      setCancelId(null);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
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
      <div className="flex-1 p-4 lg:p-6 max-w-[1600px] mx-auto w-full overflow-hidden flex flex-col">
        <RecordTableCard
          title="Pay In / Out"
          search={searchQuery}
          onSearchChange={setSearchQuery}
          rowKey="transId"
          data={filteredItems}
          loading={isLoading}
          actionLabel="+ Add Transaction"
          onAction={() => {
            setEditingId(null);
            handleClear();
            setIsFormModalOpen(true);
          }}
          extraActions={
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">From</span>
                <input
                  type="date"
                  value={searchFromDate}
                  onChange={(e) => setSearchFromDate(e.target.value)}
                  className="h-10.5 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 whitespace-nowrap">To</span>
                <input
                  type="date"
                  value={searchToDate}
                  onChange={(e) => setSearchToDate(e.target.value)}
                  className="h-10.5 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all"
                />
              </div>
              <div className="w-40">
                <select
                  value={searchInOut}
                  onChange={(e) => setSearchInOut(e.target.value as any)}
                  className="w-full h-10.5 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all cursor-pointer"
                >
                  <option value="ALL">All Types</option>
                  <option value="IN">IN (Pay In)</option>
                  <option value="OUT">OUT (Pay Out)</option>
                </select>
              </div>
            </div>
          }
          columns={[
            {
              header: "Type",
              accessor: "inOut",
              render: (row) => (
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  row.inOut === 'IN' 
                    ? 'bg-emerald-50 text-emerald-600' 
                    : 'bg-red-50 text-red-600'
                }`}>
                  {row.inOut === 'IN' ? <ArrowDownLeft size={12} /> : <ArrowUpRight size={12} />}
                  {row.inOut}
                </span>
              )
            },
            {
              header: "Date",
              accessor: "date",
              render: (row) => new Date(row.date).toLocaleDateString()
            },
            {
              header: "Vch No",
              accessor: "vchNo",
              render: (row) => <span className="font-mono text-slate-600 font-bold">{row.vchNo || "—"}</span>
            },
            {
              header: "Description",
              accessor: "description"
            },
            {
              header: `Amount (${currencySymbol})`,
              accessor: "amount",
              align: "right",
              render: (row) => <span className="font-black text-slate-900">{formatAmount(row.amount)}</span>
            },
            {
              header: "Actions",
              accessor: "transId",
              align: "center",
              render: (row) => (
                <div className="flex justify-center gap-2">
                  <button
                    onClick={() => handleEdit(row)}
                    className="p-1.5 text-slate-400 hover:text-[#49293e] hover:bg-[#49293e]/10 rounded-lg transition-all"
                    title="Edit transaction"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleCancel(row.transId)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Cancel transaction"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Form Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          handleClear();
        }}
        title={editingId ? "Edit Transaction" : "Add Pay In / Out"}
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
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 h-10.5 text-xs font-bold uppercase tracking-widest bg-[#49293e] hover:bg-[#3d2234] shadow-md shadow-[#49293e]/15"
            >
              {isSaving ? <Loader size="sm" /> : "Save"}
            </Button>
          </div>
        }
      >
        <div className="grid gap-4 md:grid-cols-[120px_minmax(0,1fr)] md:items-center py-2">
          
          {/* TYPE Selection (IN / OUT Radio) */}
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Type</span>
          <div className="flex gap-6 items-center py-2">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-[#49293e] uppercase tracking-[0.1em] select-none">
              <input
                type="radio"
                name="inOutType"
                checked={type === 'IN'}
                onChange={() => setType('IN')}
                className="w-4 h-4 text-[#49293e] focus:ring-[#49293e]/30 border-gray-300"
              />
              IN
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-black text-[#49293e] uppercase tracking-[0.1em] select-none">
              <input
                type="radio"
                name="inOutType"
                checked={type === 'OUT'}
                onChange={() => setType('OUT')}
                className="w-4 h-4 text-[#49293e] focus:ring-[#49293e]/30 border-gray-300"
              />
              OUT
            </label>
          </div>

          {/* VCH NO Row */}
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Vch No</label>
          <FormInput
            value={vchNo}
            onChange={(e) => setVchNo(e.target.value.toUpperCase().replace(/\s/g, ''))}
            placeholder="Enter voucher number..."
            hideLabel
          />

          {/* DATE Row */}
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Date</label>
          <FormInput
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            hideLabel
          />

          {/* DESCRIPTION Row */}
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Description</label>
          <FormInput
            id="pay-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter description..."
            autoFocus
            hideLabel
          />

          {/* AMOUNT Row */}
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Amount</label>
          <FormInput
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={(0).toFixed(decimalPart)}
            step={Math.pow(10, -decimalPart).toString()}
            inputClassName="text-right font-black"
            hideLabel
          />

          {/* PAYMODE Row */}
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Paymode</label>
          <SelectInput
            value={paymodeId}
            onChange={(e) => setPaymodeId(e.target.value)}
            options={paymodes}
            noMargin
          />

        </div>
      </Modal>

      <ConfirmDialog
        isOpen={cancelId !== null}
        title="Cancel Transaction"
        message="Are you sure you want to cancel this transaction?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep"
        confirmVariant="danger"
        loading={isCancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
};

export default PayInOutPage;

