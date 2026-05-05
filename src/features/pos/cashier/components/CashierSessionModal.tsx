import React, { useState, useEffect, useMemo } from 'react';
import { 
  Modal, 
  Button 
} from '../../../../components/common';
import { cashierLogService } from '../services/cashierLogService';
import { fetchDenominations } from '../../../general/denomination/services/denominationService';
import type { DenominationItem } from '../../../general/denomination/types';
import { useToast } from '../../../../app/providers/useToast';
import { useCurrency } from '../../../../hooks/useCurrency';
import { LogIn, LogOut, Sun, Clock, Calculator } from 'lucide-react';

interface CashierSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: any;
  onSuccess: () => void;
  isFullPage?: boolean;
}

const CashierSessionModal: React.FC<CashierSessionModalProps> = ({ 
  isOpen, 
  onClose, 
  status, 
  onSuccess,
  isFullPage = false
}) => {
  const { showToast } = useToast();
  const { formatAmount } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [denoms, setDenoms] = useState<DenominationItem[]>([]);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const [openingBal, setOpeningBal] = useState<number>(0);
  const [closingBal, setClosingBal] = useState<number>(0);

  // Derived state: what action are we taking?
  const [activeTab, setActiveTab] = useState<'SHIFT' | 'DAY'>('SHIFT');

  const mode = useMemo(() => {
    if (!status) return null;
    if (status.isDayClosed) return 'OPEN_DAY';
    if (status.isShiftClosed) return 'OPEN_SHIFT';
    return activeTab === 'SHIFT' ? 'CLOSE_SHIFT' : 'CLOSE_DAY';
  }, [status, activeTab]);

  useEffect(() => {
    if (isOpen) {
      loadDenominations();
      setActiveTab('SHIFT');
    }
  }, [isOpen]);

  const loadDenominations = async () => {
    try {
      const data = await fetchDenominations();
      setDenoms(data);
      const initialCounts: Record<number, number> = {};
      data.forEach((d: DenominationItem) => {
        if (d.id) initialCounts[d.id] = 0;
      });
      setCounts(initialCounts);
    } catch (error) {
      console.error("Failed to load denominations", error);
    }
  };

  const handleCountChange = (id: number, count: string) => {
    const val = parseInt(count) || 0;
    setCounts(prev => ({ ...prev, [id]: val }));
  };

  const totalDenomAmount = useMemo(() => {
    return denoms.reduce((sum: number, d: DenominationItem) => {
      const count = counts[d.id || 0] || 0;
      return sum + (count * d.value);
    }, 0);
  }, [denoms, counts]);

  useEffect(() => {
    if (mode?.startsWith('OPEN')) {
      setOpeningBal(totalDenomAmount);
    } else {
      setClosingBal(totalDenomAmount);
    }
  }, [totalDenomAmount, mode]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // 1. Resolve IDs and ensure they aren't 0
      const userId = Number(localStorage.getItem('userId')) || status?.userId || 0;
      const branchId = Number(localStorage.getItem('systemBranchId')) || Number(localStorage.getItem('branchId')) || status?.branchId || 0;
      const counterId = Number(localStorage.getItem('systemCounterId')) || Number(localStorage.getItem('counterId')) || 1;
      
      if (!branchId || !userId) {
        throw new Error("Missing Branch or User configuration. Please re-login.");
      }

      const now = new Date();
      const isoString = now.toISOString();
      const dateOnly = isoString.split('T')[0] + 'T00:00:00Z'; // Clean date for transDate

      // 2. Filter and map denominations (only send those with counts > 0 if needed, or ensure all are numbers)
      const denominations = Object.entries(counts)
        .filter(([_, count]) => count >= 0) // Ensure no negative counts
        .map(([id, count]) => ({
          denominationId: Number(id),
          cashCount: Number(count)
        }));

      const payload = {
        startDate: isoString,
        transDate: dateOnly, // Many ERPs prefer midnight for transDate
        branchId,
        userId,
        counterId,
        openingBal: Number(openingBal),
        denominations
      };

      if (mode === 'OPEN_DAY') {
        await cashierLogService.openDay(payload);
        showToast("Business Day Opened Successfully", "success");
      } else if (mode === 'OPEN_SHIFT') {
        await cashierLogService.openShift({
          ...payload,
          dayId: status.dayId,
        });
        showToast("Shift Opened Successfully", "success");
      } else if (mode === 'CLOSE_SHIFT') {
        await cashierLogService.closeShift({
          dayId: status.dayId,
          shiftId: status.shiftId,
          closingBal: Number(closingBal),
          endDate: isoString,
          denominations
        });
        showToast("Shift Closed Successfully", "success");
      } else if (mode === 'CLOSE_DAY') {
        // Validation: Block Day Close if Shift is still active
        if (!status.isShiftClosed) {
          throw new Error("Cannot close Business Day while a Shift is still active. Please close all shifts first.");
        }

        await cashierLogService.closeDay({
          dayId: status.dayId,
          shiftId: status.shiftId,
          closingBal: Number(closingBal),
          endDate: isoString,
          denominations
        });
        showToast("Business Day Closed Successfully", "success");
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Cashier Action Error:", error);
      showToast(error.message || "Action failed. Check console for details.", "error");
    } finally {
      setLoading(false);
    }
  };

  const title = mode === 'OPEN_DAY' ? 'Open Business Day' : 
                mode === 'OPEN_SHIFT' ? 'Open Shift' : 
                mode === 'CLOSE_DAY' ? 'Close Business Day' :
                'Close Shift';

  const icon = mode?.startsWith('OPEN') ? <LogIn size={20} /> : <LogOut size={20} />;

  const content = (
    <div className={`space-y-6 ${isFullPage ? 'w-full max-w-2xl bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-slate-100' : ''}`}>
      {isFullPage && (
        <div className="text-center space-y-2 mb-8">
          <div className="inline-flex p-4 bg-slate-50 rounded-2xl text-[#49293e] mb-2">
            {icon}
          </div>
          <h2 className="text-3xl font-black text-[#49293e] tracking-tight uppercase italic">{title}</h2>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Cashier Session Management</p>
        </div>
      )}

      {/* Tab Switcher for Closing */}
      {!status?.isDayClosed && !status?.isShiftClosed && (
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('SHIFT')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'SHIFT' 
                ? 'bg-white text-[#49293e] shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Close Shift
          </button>
          <button
            onClick={() => setActiveTab('DAY')}
            className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${
              activeTab === 'DAY' 
                ? 'bg-white text-[#49293e] shadow-sm' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Close Day
          </button>
        </div>
      )}

      {/* Header for Full Page */}
      {isFullPage && (
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-[#49293e]/5 rounded-2xl flex items-center justify-center text-[#49293e]">
            {icon}
          </div>
          <div>
            <h1 className="text-2xl font-black text-[#49293e] tracking-tight">{title}</h1>
            <p className="text-sm text-slate-500 font-medium">Please verify your opening balance to start billing.</p>
          </div>
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white rounded-xl shadow-sm text-[#49293e]">
            {mode === 'OPEN_DAY' ? <Sun size={22} /> : <Clock size={22} />}
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Session Info</p>
            <p className="text-sm font-bold text-slate-700">
              {mode === 'OPEN_DAY' ? 'Start Business Day' : `Day ID: ${status?.dayId || 'N/A'}`}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Amount</p>
          <div className="relative group">
            <input
              type="number"
              value={mode?.startsWith('OPEN') ? openingBal : closingBal}
              onChange={(e) => {
                const val = Number(e.target.value);
                if (mode?.startsWith('OPEN')) setOpeningBal(val);
                else setClosingBal(val);
              }}
              className="text-2xl font-black text-[#49293e] tracking-tighter bg-white border border-slate-200 rounded-xl px-4 py-2 w-48 text-right focus:ring-4 focus:ring-[#49293e]/5 focus:border-[#49293e] outline-none transition-all shadow-sm"
              placeholder="0.00"
            />
            <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="bg-[#49293e] text-white text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">EDITABLE</div>
            </div>
          </div>
        </div>
      </div>

      {/* Denominations Table */}
      <div className="space-y-4">
        <h4 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400 flex items-center gap-2">
          <Calculator size={14} />
          Cash Breakdown
        </h4>
        
        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Denomination</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 w-36">Count</th>
                <th className="px-5 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {denoms.map((d) => {
                const count = counts[d.id || 0] || 0;
                const subtotal = count * d.value;
                return (
                  <tr key={d.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">{d.name}</span>
                        <span className="text-[10px] font-medium text-slate-400">Value: {formatAmount(d.value)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <input 
                        type="number"
                        min="0"
                        value={counts[d.id || 0] || ''}
                        onChange={(e) => handleCountChange(d.id!, e.target.value)}
                        placeholder="0"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-base font-bold focus:bg-white focus:ring-4 focus:ring-[#49293e]/5 focus:border-[#49293e] outline-none transition-all"
                      />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-sm font-black text-[#49293e]">{formatAmount(subtotal)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50/80">
              <tr>
                <td colSpan={2} className="px-5 py-5 text-sm font-bold text-slate-500 text-right uppercase tracking-widest">
                  Grand Total
                </td>
                <td className="px-5 py-5 text-right">
                  <span className="text-xl font-black text-[#49293e] tracking-tighter">
                    {formatAmount(totalDenomAmount)}
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        {!isFullPage && (
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
        )}
        <Button 
          onClick={handleSubmit} 
          loading={loading}
          className={`px-12 py-3 rounded-xl h-auto text-sm font-bold uppercase tracking-widest bg-[#49293e] hover:bg-[#3d2234] shadow-lg shadow-[#49293e]/20 ${isFullPage ? 'w-full' : ''}`}
        >
          {mode === 'OPEN_DAY' ? 'Confirm & Open Day' : mode === 'OPEN_SHIFT' ? 'Confirm & Open Shift' : 'Confirm Close'}
        </Button>
      </div>
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          {icon}
          <span>{title}</span>
        </div>
      }
      size="lg"
    >
      {content}
    </Modal>
  );
};

export default CashierSessionModal;
