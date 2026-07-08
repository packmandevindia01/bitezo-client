import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  ArrowLeft,
  Trash2,
  Pencil,
  Plus
} from 'lucide-react';
import { ConfirmDialog, RecordTableCard, SearchBar, Button } from '../../../../components/common';
import { type PayInOutItem } from '../services/payInOutService';
import { useToast } from '../../../../app/providers/useToast';
import { useCurrency } from '../../../../hooks/useCurrency';
import { PayInOutFormModal, type PayInOutFormData } from '../components/PayInOutFormModal';
import { 
  useCashierStatus, 
  usePaymodesForCounter, 
  usePayInOutTransactions, 
  usePayInOutDetails, 
  usePayInOutMutations 
} from '../hooks/usePayInOutQueries';

const PayInOutPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { formatAmount, currencySymbol } = useCurrency();

  // Search Filters
  const [searchFromDate, setSearchFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().split('T')[0];
  });
  const [searchToDate, setSearchToDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchInOut, setSearchInOut] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [cancelId, setCancelId] = useState<number | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: cashierStatus } = useCashierStatus();
  const { data: paymodesData = [] } = usePaymodesForCounter();
  const { data: items = [], isLoading } = usePayInOutTransactions(searchFromDate, searchToDate, searchQuery);
  
  // Fetch details only when editing
  const { data: editingData } = usePayInOutDetails(editingId);
  
  const { createTransaction, updateTransaction, cancelTransaction } = usePayInOutMutations();

  const paymodes = useMemo(() => {
    return paymodesData.map(p => ({ value: p.paymodeId.toString(), label: p.paymodeName }));
  }, [paymodesData]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      if (searchInOut !== 'ALL' && item.inOut !== searchInOut) return false;
      return true;
    });
  }, [items, searchInOut]);

  const handleEdit = (item: PayInOutItem) => {
    setEditingId(item.transId);
    setIsFormModalOpen(true);
  };

  const handleSave = (data: PayInOutFormData) => {
    if (!cashierStatus || cashierStatus.isDayClosed || cashierStatus.isShiftClosed) {
      showToast("No active cashier session found. Please open a session first.", "error");
      return;
    }

    if (editingId) {
      updateTransaction.mutate({
        id: editingId,
        data: {
          transId: editingId,
          inOut: data.type,
          voucherDate: new Date(data.date).toISOString(),
          description: data.description,
          amount: Number(data.amount),
          paymodeId: data.paymodeId,
          updatedAt: new Date().toISOString()
        }
      }, {
        onSuccess: () => {
          showToast("Transaction updated successfully", "success");
          setIsFormModalOpen(false);
          setEditingId(null);
        },
        onError: (error: any) => {
          showToast(error.message || "Failed to save transaction", "error");
        }
      });
    } else {
      createTransaction.mutate({
        inOut: data.type,
        voucherDate: new Date(data.date).toISOString(),
        description: data.description,
        amount: Number(data.amount),
        paymodeId: data.paymodeId,
        dayId: cashierStatus.dayId,
        shiftId: cashierStatus.shiftId,
        createdAt: new Date().toISOString()
      }, {
        onSuccess: () => {
          showToast("Transaction saved successfully", "success");
          setIsFormModalOpen(false);
          setEditingId(null);
        },
        onError: (error: any) => {
          showToast(error.message || "Failed to save transaction", "error");
        }
      });
    }
  };

  const handleCancel = (transId: number) => {
    setCancelId(transId);
  };

  const confirmCancel = () => {
    if (cancelId === null) return;
    cancelTransaction.mutate(cancelId, {
      onSuccess: () => {
        showToast("Transaction cancelled successfully", "success");
        setCancelId(null);
      },
      onError: (error: any) => {
        showToast(error.message || "Failed to cancel transaction", "error");
        setCancelId(null);
      }
    });
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
        
        {/* Filter Header (Rule 6a) */}
        <div className="flex flex-col xl:flex-row gap-4 mb-4 justify-between items-end shrink-0">
          <div className="flex flex-wrap gap-3 items-end flex-1">
            <div className="w-full sm:w-40">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">From Date</label>
              <input
                type="date"
                value={searchFromDate}
                onChange={(e) => setSearchFromDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">To Date</label>
              <input
                type="date"
                value={searchToDate}
                onChange={(e) => setSearchToDate(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all"
              />
            </div>
            <div className="w-full sm:w-40">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Type</label>
              <select
                value={searchInOut}
                onChange={(e) => setSearchInOut(e.target.value as any)}
                className="w-full h-10 px-3 text-sm rounded-md border border-gray-300 bg-white focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 outline-none transition-all cursor-pointer"
              >
                <option value="ALL">All Types</option>
                <option value="IN">IN (Pay In)</option>
                <option value="OUT">OUT (Pay Out)</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px] max-w-sm">
              <SearchBar 
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search pay in / out..."
              />
            </div>
          </div>
          
          <Button 
            icon={<Plus size={18} />}
            onClick={() => {
              setEditingId(null);
              setIsFormModalOpen(true);
            }}
          >
            Add New
          </Button>
        </div>

        <RecordTableCard
          title="Pay In / Out Transactions"
          rowKey="transId"
          data={filteredItems}
          loading={isLoading}
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
                    className="inline-flex rounded-lg p-2 text-[#49293e] hover:bg-[#49293e]/10 transition-colors"
                    title="Edit transaction"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => handleCancel(row.transId)}
                    className="inline-flex rounded-lg p-2 text-red-500 hover:bg-red-50 transition-colors"
                    title="Cancel transaction"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            }
          ]}
        />
      </div>

      {/* Form Modal */}
      <PayInOutFormModal
        isOpen={isFormModalOpen}
        onClose={() => {
          setIsFormModalOpen(false);
          setEditingId(null);
        }}
        onSubmit={handleSave}
        initialData={editingId ? editingData : null}
        paymodes={paymodes}
        isSaving={createTransaction.isPending || updateTransaction.isPending}
      />

      <ConfirmDialog
        isOpen={cancelId !== null}
        title="Cancel Transaction"
        message="Are you sure you want to cancel this transaction?"
        confirmLabel="Yes, Cancel"
        cancelLabel="No, Keep"
        confirmVariant="danger"
        loading={cancelTransaction.isPending}
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  );
};

export default PayInOutPage;

