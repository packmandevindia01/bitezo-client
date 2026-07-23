import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Trash2, Plus, RefreshCcw, Pencil, ArrowLeft } from 'lucide-react';
import { Button, ConfirmDialog, Loader, SearchableSelect } from '../../../../components/common';
import { useToast } from '../../../../app/providers/useToast';
import { lockProductService } from '../services/lockProductService';
import type { LockedProduct } from '../types';

const LockItemPage: React.FC = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [lockUntil, setLockUntil] = useState('');
  const [items, setItems] = useState<LockedProduct[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deleteCandidate, setDeleteCandidate] = useState<LockedProduct | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    void fetchLockedProducts();
    void fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await lockProductService.getProducts();
      setProducts(data);
    } catch (error: any) {
      console.error("Failed to load products via lock-product API:", error);
      showToast("Failed to load products for locking", "error");
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
    label: p.productName || p.name || "",
    value: String(p.productId || p.id || "")
  }));

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
            <h1 className="text-lg font-black text-[#49293e] tracking-widest uppercase">POS Product Locking</h1>
            <p className="text-xs text-slate-400 font-medium tracking-wider uppercase">Inventory Control</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 lg:p-6 max-w-7xl mx-auto w-full flex flex-col gap-4 overflow-hidden">
        
        {/* Form Section */}
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm shrink-0">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            
            {/* Product Column */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px] w-full">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                Select Product
              </label>
              <SearchableSelect
                options={productOptions}
                value={selectedProductId}
                onChange={(val) => setSelectedProductId(val)}
                placeholder="Type to search product..."
                disabled={isSaving}
                autoFocus
              />
            </div>
            
            {/* Lock Until Column */}
            <div className="flex flex-col gap-1.5 flex-1 min-w-[250px] w-full">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 ml-1">
                Lock Until
              </label>
              <div className="flex flex-col gap-2">
                <div className="relative group">
                  <input
                    type="datetime-local"
                    value={lockUntil}
                    onChange={(e) => setLockUntil(e.target.value)}
                    className="w-full h-[42px] bg-white border border-slate-200 rounded-lg px-4 shadow-sm text-sm font-medium focus:ring-2 focus:ring-[#49293e]/10 focus:border-[#49293e] transition-all outline-none disabled:bg-slate-50 disabled:text-slate-400"
                    disabled={isSaving}
                  />
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

            {/* Action Column */}
            <div className="flex flex-col gap-1.5 shrink-0 w-full md:w-auto">
              <label className="text-[11px] font-bold uppercase tracking-wider text-transparent ml-1 hidden md:block">
                Action
              </label>
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
        <div className="bg-white p-4 lg:p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col flex-1 overflow-hidden min-h-0 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#49293e]/5 text-[#49293e] rounded-lg">
                <Lock size={20} />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
                Active Locked Products ({items.length})
              </h3>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button 
                type="button"
                onClick={() => void fetchLockedProducts()}
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
                <Loader text="Loading locks..." />
              </div>
            ) : items.length === 0 ? (
              <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 py-10">
                <div className="w-16 h-16 bg-white shadow-sm border border-slate-100 rounded-full flex items-center justify-center mb-4">
                  <Lock size={24} strokeWidth={1.5} className="opacity-40" />
                </div>
                <p className="text-sm font-bold uppercase tracking-widest text-slate-500">No active locks found</p>
                <p className="text-xs font-medium text-slate-400 mt-2">Add a product to the lock list to restrict sales</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] border-collapse text-left bg-white">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 z-10">
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
                        <div className="flex items-center justify-end gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all">
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
    </div>
  );
};

export default LockItemPage;
