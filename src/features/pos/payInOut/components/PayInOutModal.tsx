import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Search, 
  Save, 
  RotateCcw,
  RefreshCcw,
  Receipt
} from 'lucide-react';
import { Modal, Button, FormInput, SelectInput, Loader } from '../../../../components/common';

interface PayInOutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PayInOutModal: React.FC<PayInOutModalProps> = ({ isOpen, onClose }) => {
  const [type, setType] = useState<'IN' | 'OUT'>('IN');
  const [vchNo, setVchNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymode, setPaymode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dummy list state
  const [isLoading, setIsLoading] = useState(false);
  const items: any[] = [];

  const handleClear = () => {
    setVchNo('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setAmount('');
    setPaymode('');
  };

  const handleSave = () => {
    // Save logic
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
        <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-inner">
          <div className="flex justify-center mb-6">
            <div className="inline-flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
              <button
                type="button"
                onClick={() => setType('IN')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                  type === 'IN' 
                    ? 'bg-emerald-50 text-emerald-600 shadow-sm border border-emerald-100/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <ArrowDownLeft size={16} />
                In
              </button>
              <button
                type="button"
                onClick={() => setType('OUT')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${
                  type === 'OUT' 
                    ? 'bg-red-50 text-red-600 shadow-sm border border-red-100/50' 
                    : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 border border-transparent'
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
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <SelectInput
              label="PAYMODE"
              value={paymode}
              onChange={(e) => setPaymode(e.target.value)}
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'card', label: 'Card' },
                { value: 'bank', label: 'Bank Transfer' },
              ]}
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
              className={`px-8 h-[42px] text-xs font-bold uppercase tracking-widest shadow-lg ${
                type === 'IN' 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
              }`}
            >
              <Save size={16} className="mr-2" />
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
                onClick={() => setIsLoading(!isLoading)}
                className="p-1.5 text-slate-400 hover:text-[#49293e] transition-colors"
                title="Refresh list"
              >
                <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
          
          <div className="min-h-[250px] max-h-[350px] overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
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
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vch No</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {/* Map items here */}
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
