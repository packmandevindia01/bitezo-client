import React, { useState, useEffect } from 'react';
import { Lock, Trash2, RefreshCcw, Pencil, Calendar, LayoutGrid, List } from 'lucide-react';
import { Button, ConfirmDialog, Loader, SearchableSelect } from '../../../../components/common';
import { useToast } from '../../../../app/providers/useToast';
import { lockProductService } from '../services/lockProductService';
import type { LockedProduct } from '../types';

export interface LockItemContentProps {
  initialProductId?: string;
  onSuccess?: () => void;
  onClose?: () => void; // Provided if the modal should close after adding/deleting
}

const toLocalISOString = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const LockItemContent: React.FC<LockItemContentProps> = ({ initialProductId, onSuccess, onClose }) => {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lockUntil, setLockUntil] = useState('');
  const [items, setItems] = useState<LockedProduct[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LockedProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data on mount / change
  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
    } else {
      setSelectedProductId('');
    }
    setLockUntil('');
    void fetchLockedProducts();
    void fetchProducts();
  }, [initialProductId]);

  const fetchProducts = async () => {
    try {
      const data = await lockProductService.getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error("Failed to load products via lock-product API:", error);
    }
  };

  const fetchLockedProducts = async () => {
    setIsLoading(true);
    try {
      const data = await lockProductService.list();
      setItems(data);
    } catch (error: any) {
      showToast(error.message || "Failed to load locked products", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedProductId || !lockUntil) {
      showToast("Please select a product and end time", "error");
      return;
    }

    const lockDate = new Date(lockUntil);
    if (lockDate <= new Date()) {
      showToast("Lock expiry time must be in the future", "error");
      return;
    }

    const existingLock = items.find(i => i.productId === Number(selectedProductId));
    const payload = {
      productId: Number(selectedProductId),
      lockUntil: new Date(lockUntil).toISOString(),
    };

    setIsSaving(true);
    try {
      if (existingLock) {
        await lockProductService.update(payload);
        showToast("Product lock updated successfully", "success");
      } else {
        await lockProductService.create(payload);
        showToast("Product locked successfully", "success");
      }
      
      setSelectedProductId('');
      setLockUntil('');
      void fetchLockedProducts();
      if (onSuccess) onSuccess();
      if (initialProductId && onClose) onClose();
    } catch (error: any) {
      showToast(error.message || "Failed to process lock", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    try {
      await lockProductService.remove(deleteCandidate.productId);
      showToast("Lock removed", "success");
      setDeleteCandidate(null);
      void fetchLockedProducts();
      if (onSuccess) onSuccess();
      if (initialProductId && onClose) onClose();
    } catch (error: any) {
      showToast(error.message || "Failed to remove lock", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: LockedProduct) => {
    setSelectedProductId(String(item.productId));
    try {
      const dateStr = (item.lockUntil.includes('Z') || item.lockUntil.includes('+')) ? item.lockUntil : item.lockUntil + 'Z';
      const date = new Date(dateStr);
      setLockUntil(toLocalISOString(date));
    } catch {
      setLockUntil('');
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      // Ensure we treat the server string correctly. If backend returns UTC without 'Z', append 'Z'.
      // If it already has 'Z' or '+', Date handles it.
      const dateStr = (isoString.includes('Z') || isoString.includes('+')) ? isoString : isoString + 'Z';
      return new Date(dateStr).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    } catch {
      return isoString;
    }
  };

  const productOptions = products.map(p => ({
    label: p.productName || p.name || "",
    value: String(p.productId || p.id || "")
  }));

  return (
    <>
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Side: Lock Form */}
        <div className="w-full md:w-[350px] lg:w-[400px] bg-white border-r border-slate-200 shrink-0 flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800 mb-6 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-800" />
              New Lock Configuration
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Target Product
                </label>
                <SearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  placeholder="Search to select..."
                  disabled={isSaving}
                  autoFocus={!initialProductId}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500 ml-1">
                  Lock Expiry Time
                </label>
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={lockUntil}
                    min={toLocalISOString(new Date())}
                    onChange={(e) => setLockUntil(e.target.value)}
                    className="w-full h-[46px] bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 focus:bg-white transition-all outline-none hover:border-slate-300"
                    disabled={isSaving}
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-slate-900 transition-colors">
                    <Calendar size={18} />
                  </div>
                </div>
                
                {/* Quick Presets */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    { label: '1h', mins: 60 },
                    { label: '4h', mins: 240 },
                    { label: '12h', mins: 720 },
                    { label: '24h', mins: 1440 }
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        const date = new Date();
                        date.setMinutes(date.getMinutes() + preset.mins);
                        setLockUntil(toLocalISOString(date));
                      }}
                      className="flex-1 min-w-[60px] py-2 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 hover:bg-slate-800 hover:text-white transition-all active:scale-95"
                    >
                      +{preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const date = new Date();
                      date.setHours(23, 59, 0, 0);
                      setLockUntil(toLocalISOString(date));
                    }}
                    className="w-full py-2 rounded-lg bg-slate-100 text-[10px] font-black text-slate-600 hover:bg-slate-800 hover:text-white transition-all active:scale-95 mt-1"
                  >
                    End of Day
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-200">
            <Button 
              onClick={handleAdd}
              disabled={isSaving}
              icon={<Lock size={16} />}
              className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold tracking-wider uppercase text-xs shadow-lg shadow-slate-900/20 flex items-center justify-center transition-all hover:-translate-y-0.5"
            >
              {isSaving ? <Loader size="sm" /> : (
                items.some(i => String(i.productId) === selectedProductId) ? 'Update Lock' : 'Apply Lock'
              )}
            </Button>
          </div>
        </div>

        {/* Right Side: Active Locks Grid */}
        <div className="flex-1 flex flex-col bg-[#f4f5f7] min-w-0 overflow-hidden">
          <div className="px-6 lg:px-8 py-5 flex items-center justify-between border-b border-slate-200/60 bg-white/50 backdrop-blur-sm shrink-0 z-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                 <Lock size={14} className="text-red-500" />
              </div>
              <h3 className="text-xs font-black uppercase tracking-[0.15em] text-slate-800">
                Active Restrictions ({items.length})
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-slate-100/50 p-1 rounded-xl border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Grid View"
                >
                  <LayoutGrid size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  title="Table View"
                >
                  <List size={14} />
                </button>
              </div>
              <button 
                onClick={() => void fetchLockedProducts()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:border-slate-400 hover:shadow-sm transition-all active:scale-95"
              >
                <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
            {isLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader text="Loading restrictions..." />
              </div>
            ) : items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                  <Lock size={32} strokeWidth={1.5} className="text-slate-300" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">System Clear</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-2 tracking-wider">No products are currently restricted.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 pb-20 md:pb-0">
                {items.map((item) => (
                  <div 
                    key={item.productId} 
                    className="group bg-white rounded-2xl p-4 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-red-500/5 hover:border-red-200 transition-all duration-300 flex flex-col"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-red-100/50 flex items-center justify-center border border-red-100">
                          <Lock size={18} className="text-red-500" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                      </div>
                      <div className="flex-1 min-w-0 pt-1">
                        <h4 className="text-sm font-bold text-slate-800 leading-tight truncate mb-1.5" title={item.productName}>
                          {item.productName}
                        </h4>
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-50 text-[10px] font-bold text-red-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          {formatDateTime(item.lockUntil)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-auto pt-4 border-t border-slate-50">
                      <button 
                        onClick={() => handleEdit(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 text-[11px] font-bold uppercase tracking-wider hover:bg-slate-900 hover:text-white transition-colors"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button 
                        onClick={() => setDeleteCandidate(item)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-red-50/50 border border-red-100 text-red-600 text-[11px] font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                      >
                        <Trash2 size={12} /> Unlock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/60 bg-white shadow-sm">
                <table className="w-full min-w-[600px] border-collapse bg-white">
                  <thead className="bg-slate-50 border-b border-slate-200/60">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">S.No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">Product</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Locked Until</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={item.productId} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400 text-center">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-700 text-left">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            {item.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500 text-center">
                          {formatDateTime(item.lockUntil)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 rounded-xl text-slate-400 hover:bg-slate-900 hover:text-white transition-all"
                              title="Edit Lock"
                            >
                              <Pencil size={16} />
                            </button>
                            <button 
                              onClick={() => setDeleteCandidate(item)}
                              className="p-2 rounded-xl text-red-400 hover:bg-red-500 hover:text-white transition-all"
                              title="Remove Lock"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteCandidate !== null}
        title="Remove Product Lock"
        message={`Are you sure you want to remove the lock for "${deleteCandidate?.productName}"? This will make the product available in the POS immediately.`}
        confirmLabel="Remove Lock"
        onConfirm={handleDelete}
        onCancel={() => setDeleteCandidate(null)}
        loading={isDeleting}
      />
    </>
  );
};

export default LockItemContent;
