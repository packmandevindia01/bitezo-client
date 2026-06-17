import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Plus, RefreshCcw, Pencil, Calendar } from 'lucide-react';



import { Modal, Button, ConfirmDialog, Loader, SearchableSelect } from '../../../../components/common';


import { useToast } from '../../../../app/providers/useToast';
import { lockProductService } from '../services/lockProductService';
import type { LockedProduct } from '../types';

export interface LockItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProductId?: string;
  onSuccess?: () => void;
}

const LockItemModal: React.FC<LockItemModalProps> = ({ isOpen, onClose, initialProductId, onSuccess }) => {
  const { showToast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lockUntil, setLockUntil] = useState('');
  const [items, setItems] = useState<LockedProduct[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LockedProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      if (initialProductId) {
        setSelectedProductId(initialProductId);
      } else {
        setSelectedProductId('');
      }
      setLockUntil('');
      void fetchLockedProducts();
      void fetchProducts();
    }
  }, [isOpen, initialProductId]);

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

    // Check if already locked
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
      if (initialProductId) onClose();
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
      if (initialProductId) onClose();
    } catch (error: any) {
      showToast(error.message || "Failed to remove lock", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEdit = (item: LockedProduct) => {
    setSelectedProductId(String(item.productId));
    // Convert ISO string to YYYY-MM-DDTHH:MM for datetime-local input
    try {
      const date = new Date(item.lockUntil);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      setLockUntil(`${year}-${month}-${day}T${hours}:${minutes}`);
    } catch {
      setLockUntil('');
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleString([], {
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
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="POS Product Locking"
        size="2xl"
        className="w-[95vw] max-w-none"
      >
        <div className="space-y-6">
          {/* Form Section */}
          <div className="bg-white p-6 sm:p-8 rounded-[2rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden">
            {/* Subtle background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#49293e]/[0.03] to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1.5fr_auto] gap-6 sm:gap-8 items-start relative z-10">
              
              {/* Product Column */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#49293e] shadow-[0_0_8px_rgba(73,41,62,0.4)]" />
                  Select Product
                </label>
                <div className="relative group/select drop-shadow-sm">
                  <SearchableSelect
                    options={productOptions}
                    value={selectedProductId}
                    onChange={(val) => setSelectedProductId(val)}
                    placeholder="Type to search product..."
                    disabled={isSaving}
                    autoFocus
                  />
                </div>
              </div>

              {/* Lock Until Column */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-1 flex items-center gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.4)] animate-pulse" />
                  Lock Until
                </label>
                <div className="flex flex-col gap-3.5">
                  <div className="relative group">
                    <input
                      type="datetime-local"
                      value={lockUntil}
                      onChange={(e) => setLockUntil(e.target.value)}
                      className="w-full h-[46px] bg-slate-50 border border-slate-200 rounded-xl px-4 shadow-sm text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[#49293e]/10 focus:border-[#49293e] focus:bg-white transition-all outline-none hover:border-slate-300 disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={isSaving}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-[#49293e] transition-colors">
                      <Calendar size={18} />
                    </div>
                  </div>
                  
                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-2">
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
                          const formatted = date.toISOString().slice(0, 16);
                          setLockUntil(formatted);
                        }}
                        className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-black text-slate-500 hover:border-[#49293e] hover:text-[#49293e] hover:bg-[#49293e]/5 hover:shadow-sm transition-all active:scale-95"
                      >
                        +{preset.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const date = new Date();
                        date.setHours(23, 59, 0, 0);
                        setLockUntil(date.toISOString().slice(0, 16));
                      }}
                      className="px-4 py-1.5 rounded-full border border-slate-200 bg-white text-[11px] font-black text-slate-500 hover:border-[#49293e] hover:text-[#49293e] hover:bg-[#49293e]/5 hover:shadow-sm transition-all active:scale-95"
                    >
                      End of Day
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Column */}
              <div className="flex flex-col gap-2.5">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-transparent ml-1 select-none hidden md:block">
                  Action
                </label>
                <Button 
                  onClick={handleAdd}
                  disabled={isSaving}
                  className="h-[46px] w-full md:w-auto px-8 bg-[#49293e] hover:bg-[#3d2234] shadow-lg shadow-[#49293e]/25 text-sm font-bold tracking-widest rounded-xl transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center"
                >
                  {isSaving ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" strokeWidth={2.5} />
                      {items.some(i => String(i.productId) === selectedProductId) ? 'UPDATE LOCK' : 'APPLY LOCK'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#49293e]/10 to-[#49293e]/5 flex items-center justify-center">
                   <Lock size={14} className="text-[#49293e]" />
                </div>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#49293e]">
                  Active Locks ({items.length})
                </h3>
              </div>
              <button 
                onClick={() => void fetchLockedProducts()}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:border-[#49293e] hover:text-[#49293e] hover:bg-[#49293e]/5 transition-all active:scale-95 shadow-sm"
                title="Refresh list"
              >
                <RefreshCcw size={12} className={isLoading ? "animate-spin" : ""} />
                Refresh
              </button>
            </div>
            
            <div className="min-h-[400px] max-h-[65vh] overflow-y-auto bg-slate-50/50 border border-slate-100 rounded-3xl p-4 shadow-inner custom-scrollbar">
              {isLoading ? (
                <div className="h-[250px] flex items-center justify-center">
                  <Loader text="Loading locks..." />
                </div>
              ) : items.length === 0 ? (
                <div className="h-[250px] flex flex-col items-center justify-center text-slate-300 bg-white rounded-2xl border border-dashed border-slate-200 shadow-sm mx-2">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Lock size={28} strokeWidth={1.5} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No active locks found</p>
                  <p className="text-[10px] font-semibold text-slate-400 mt-2 tracking-wider">Use the form above to lock a product</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {items.map((item) => (
                    <div 
                      key={item.productId} 
                      className="group bg-white rounded-xl border border-slate-200 p-3 shadow-sm hover:shadow-md hover:border-[#49293e]/30 transition-all duration-300 flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 border border-red-100">
                            <Lock size={16} className="text-red-400" />
                          </div>
                          <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-400 rounded-full border-2 border-white animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-black text-slate-700 leading-tight truncate" title={item.productName}>
                            {item.productName}
                          </h4>
                          <div className="mt-1 flex flex-col gap-0.5">
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                              Locked Until
                            </span>
                            <span className="text-[10px] font-bold text-red-500 truncate">
                              {formatDateTime(item.lockUntil)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-100/80">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-slate-50 border border-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-wider hover:bg-[#49293e] hover:text-white hover:border-[#49293e] transition-colors shadow-sm"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button 
                          onClick={() => setDeleteCandidate(item)}
                          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors shadow-sm"
                        >
                          <Trash2 size={12} /> Unlock
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>

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

export default LockItemModal;
