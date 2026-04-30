import React, { useState, useEffect } from 'react';
import { Lock, Trash2, Plus, RefreshCcw, Pencil, Calendar } from 'lucide-react';



import { Modal, Button, ConfirmDialog, Loader, SearchableSelect } from '../../../../components/common';


import { useToast } from '../../../../app/providers/useToast';
import { lockProductService } from '../services/lockProductService';
import { productService } from '../../../inventory/product/services/productService';
import type { ProductListItem } from '../../../inventory/product/types';
import type { LockedProduct, LockItemModalProps } from '../types';

const LockItemModal: React.FC<LockItemModalProps> = ({ isOpen, onClose }) => {
  const { showToast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lockUntil, setLockUntil] = useState('');
  const [items, setItems] = useState<LockedProduct[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LockedProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data on open
  useEffect(() => {
    if (isOpen) {
      void fetchLockedProducts();
      void fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const data = await productService.list();
      setProducts(data);
    } catch (error: any) {
      console.error("Failed to load products:", error);
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
    label: `${p.name} (${p.code})`,
    value: String(p.productId)
  }));


  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="POS Product Locking"
        size="xl"
      >
        <div className="space-y-6">
          {/* Form Section */}
          <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-inner">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-6 items-end">
              <div className="flex-1">
                <SearchableSelect
                  label="Select Product"
                  options={productOptions}
                  value={selectedProductId}
                  onChange={(val) => setSelectedProductId(val)}
                  placeholder="Type to search product..."
                  disabled={isSaving}
                />
              </div>

              
              <div className="space-y-1.5 flex-1 pb-4">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                  Lock Until
                </label>
                <div className="flex flex-col gap-2">

                  <div className="relative group">
                    <input
                      type="datetime-local"
                      value={lockUntil}
                      onChange={(e) => setLockUntil(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 shadow-sm text-sm font-medium focus:ring-2 focus:ring-[#49293e]/10 focus:border-[#49293e] transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
                      disabled={isSaving}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within:text-[#49293e] transition-colors">
                      <Calendar size={16} />
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
                        className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:border-[#49293e] hover:text-[#49293e] hover:bg-[#49293e]/5 transition-all active:scale-95"
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
                      className="px-3 py-1 rounded-lg border border-slate-200 bg-white text-[10px] font-bold text-slate-500 hover:border-[#49293e] hover:text-[#49293e] hover:bg-[#49293e]/5 transition-all active:scale-95"
                    >
                      End of Day
                    </button>
                  </div>
                </div>
              </div>

              <div className="pb-4">
                <Button 
                  onClick={handleAdd}
                  disabled={isSaving}
                  className="h-[42px] px-10 bg-[#49293e] hover:bg-[#3d2234] shadow-lg shadow-[#49293e]/20"
                >
                  {isSaving ? (
                    <Loader size="sm" />
                  ) : (
                    <>
                      <Plus size={18} className="mr-2" />
                      {items.some(i => String(i.productId) === selectedProductId) ? 'Update Lock' : 'Apply Lock'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* List Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
                Active Locked Products ({items.length})
              </h3>
              <button 
                onClick={() => void fetchLockedProducts()}
                className="p-1.5 text-slate-400 hover:text-[#49293e] transition-colors"
                title="Refresh list"
              >
                <RefreshCcw size={14} className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
            
            <div className="min-h-[300px] max-h-[450px] overflow-y-auto border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <Loader text="Loading locks..." />
                </div>
              ) : items.length === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-slate-300">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} strokeWidth={1.5} className="opacity-20" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No active locks found</p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">S.No</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Product</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Locked Until</th>
                      <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, index) => (
                      <tr key={item.productId} className="group hover:bg-[#49293e]/5 transition-all">
                        <td className="px-6 py-4 text-xs font-bold text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 font-bold text-slate-700">
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                            {item.productName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                          {formatDateTime(item.lockUntil)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 rounded-xl text-slate-400 hover:bg-[#49293e]/10 hover:text-[#49293e] transition-all"
                              title="Edit Lock"
                            >
                              <Pencil size={18} />
                            </button>
                            <button 
                              onClick={() => setDeleteCandidate(item)}
                              className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                              title="Remove Lock"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
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
