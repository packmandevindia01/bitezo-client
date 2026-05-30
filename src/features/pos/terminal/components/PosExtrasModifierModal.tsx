import { useState, useEffect, useRef } from "react";
import { menuApi } from "../../services/menuApi";
import { useCurrency } from "../../../../hooks/useCurrency";

interface CartItem {
  uniqueId: string;
  productId: number;
  variantName?: string;
  product: {
    name: string;
  };
}

interface PosExtrasModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'extras' | 'modifiers';
  cartItems: CartItem[];
  selectedKey: string | null;
  onSelectRow: (key: string) => void;
  initialSelections: any[];
  onDone: (selections: any[]) => void;
}

export const PosExtrasModifierModal = ({ 
  isOpen, 
  onClose, 
  type, 
  cartItems,
  selectedKey,
  onSelectRow,
  initialSelections,
  onDone 
}: PosExtrasModifierModalProps) => {
  const { formatAmount } = useCurrency();
  const [types, setTypes] = useState<any[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSummaryId, setSelectedSummaryId] = useState<number | null>(null);
  const prevRef = useRef<{ key: string | null; type: string | null }>({ key: null, type: null });

  const currentItem = cartItems.find(item => item.uniqueId === selectedKey);

  useEffect(() => {
    if (isOpen) {
      // Only reset selections if we switched products or types
      if (prevRef.current.key !== selectedKey || prevRef.current.type !== type) {
        fetchTypes();
        setSelectedItems(initialSelections || []);
        prevRef.current = { key: selectedKey, type };
      }
    } else {
      setTypes([]);
      setActiveTypeId(null);
      setItems([]);
      setSelectedItems([]);
      prevRef.current = { key: null, type: null };
    }
  }, [isOpen, type, selectedKey, initialSelections]); 

  useEffect(() => {
    if (isOpen) {
      fetchItems();
    }
  }, [isOpen, type, activeTypeId]);

  const fetchTypes = async () => {
    try {
      const data = type === 'extras' ? await menuApi.getExtraTypes() : await menuApi.getModifierTypes();
      const normalized = data.map((t: any) => ({
        ...t,
        typeId: t.typeId || t.id || Math.random()
      }));
      setTypes(normalized);
      if (normalized.length > 0) {
        setActiveTypeId(normalized[0].typeId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const getNormalizedName = (obj: any) => {
        return obj.extraName || obj.modifierName || obj.name || obj.itemName || obj.description || 
               obj.ExtraName || obj.ModifierName || obj.Name ||
               Object.entries(obj).find(([k]) => k.toLowerCase().includes("name"))?.[1] || 
               "Unknown";
      };

      if (type === 'extras') {
        const res = await menuApi.getExtras(activeTypeId || undefined);
        const mapped = (res.extras || []).map((e: any) => ({
          ...e,
          id: e.extrasId ?? e.extraId ?? e.id ?? e.extraID ?? e.ID ?? Math.random(),
          name: getNormalizedName(e),
          price: e.price || 0,
          typeId: activeTypeId || 0
        }));
        setItems(mapped);
      } else {
        const res = await menuApi.getModifiers(activeTypeId || undefined);
        const mapped = (res.modifier || []).map((m: any) => ({
          ...m,
          id: m.modifierId ?? m.modifiersId ?? m.id ?? m.modifierID ?? m.ID ?? Math.random(),
          name: getNormalizedName(m),
          typeId: activeTypeId || 0
        }));
        setItems(mapped);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = (item: any) => {
    const exists = selectedItems.find(si => si.id === item.id);
    if (exists) {
      // If it exists, increment quantity instead of removing
      setSelectedItems(selectedItems.map(si => 
        si.id === item.id ? { ...si, qty: si.qty + 1 } : si
      ));
    } else {
      // If new, add with qty 1
      setSelectedItems([...selectedItems, { ...item, qty: 1 }]);
    }
  };

  const handleIncrement = (id: number) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === id ? { ...item, qty: item.qty + 1 } : item
    ));
  };

  const handleDecrement = (id: number) => {
    setSelectedItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, qty: Math.max(1, item.qty - 1) };
      }
      return item;
    }));
  };

  const handleRemove = (id: number) => {
    setSelectedItems(prev => prev.filter(item => item.id !== id));
    if (selectedSummaryId === id) setSelectedSummaryId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-[#e5e7eb] flex flex-col animate-in fade-in duration-200">
      {/* Full-Width Header */}
      <div className="bg-[#1e293b] text-white py-4 px-6 flex items-center shrink-0 shadow-lg">
        <div className="flex-1 flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none mb-1.5">Editing Product :</span>
            <span className="text-sm font-black uppercase text-white leading-none">
              {currentItem?.product.name || "Unknown Product"}
            </span>
          </div>
        </div>
        
        <h2 className="flex-1 text-center text-2xl font-black uppercase tracking-[0.3em] text-white drop-shadow-sm">
          {type === 'modifiers' ? 'MODIFIER LIST' : 'EXTRAS LIST'}
        </h2>
        
        <div className="flex-1 flex justify-end">
          <button 
            onClick={onClose}
            className="px-6 h-11 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black uppercase text-xs transition-all flex items-center gap-2 border border-white/20"
            tabIndex={-1}
          >
            <span>Close Screen</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div> 
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Left Rail: Cart Item Selector (1, 2, 3...) */}
        <div className="w-20 bg-[#1e293b] border-r border-slate-700 flex flex-col items-center py-6 gap-3 overflow-y-auto scrollbar-hide">
          <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Cart</span>
          {cartItems.map((item, index) => {
            const key = item.uniqueId;
            const isActive = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => onSelectRow(key)}
                className={`w-12 h-12 rounded-lg font-black text-lg flex items-center justify-center active:scale-95 transition-all shadow-md shrink-0 ${
                  isActive 
                    ? "bg-[#eb8127] text-white ring-4 ring-[#eb8127]/20" 
                    : "bg-[#334155] text-slate-400 hover:bg-[#475569] hover:text-white"
                }`}
              >
                {index + 1}
              </button>
            );
          })}
        </div>

        {/* Next Rail: Types */}
        <div className="w-52 bg-white/40 border-r border-slate-200 p-4 space-y-3 overflow-y-auto">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block text-center mb-4">Select Category</span>
          <div className="flex flex-col gap-2">
            {types.map((t, index) => (
              <button
                key={t.typeId || index}
                onClick={() => setActiveTypeId(t.typeId)}
                className={`w-full py-5 px-3 text-[11px] font-black uppercase rounded-xl shadow-sm transition-all text-center leading-tight border-2 ${
                  activeTypeId === t.typeId 
                    ? "bg-[#1e293b] border-[#1e293b] text-white ring-4 ring-[#1e293b]/10" 
                    : "bg-white border-transparent text-slate-600 hover:border-slate-200"
                }`}
              >
                {t.typeName}
              </button>
            ))}
          </div>
        </div>

        {/* Middle Grid: Items */}
        <div className="flex-1 p-8 overflow-y-auto bg-slate-100 relative">
          {/* Subtle Grid Pattern for 'Fill' */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#1e293b 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          
          {loading ? (
            <div className="flex h-full items-center justify-center relative z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-[#eb8127] rounded-full animate-spin" />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Fetching...</span>
              </div>
            </div>
          ) : (
            <div className={`
              grid gap-6 relative z-10
              ${items.length <= 4 ? "grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"}
            `}>
              {items.map((item, index) => {
                const isSelected = selectedItems.find(si => si.id === item.id);
                return (
                  <button
                    key={item.id || index}
                    onClick={() => handleItemToggle(item)}
                    className={`h-28 px-6 rounded-2xl shadow-lg text-[13px] font-black uppercase tracking-wide transition-all flex flex-col items-center justify-center text-center leading-tight border-4 ${
                      isSelected 
                        ? "bg-[#1e293b] border-[#1e293b] text-white ring-8 ring-[#1e293b]/10 scale-95" 
                        : "bg-[#a3bfa8] border-[#a3bfa8] text-[#1e293b] hover:bg-[#92ad97] hover:border-[#92ad97] active:scale-95"
                    }`}
                  >
                    {isSelected && isSelected.qty > 1 && (
                      <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#eb8127] text-white flex items-center justify-center text-xs font-black shadow-lg border-2 border-white ring-4 ring-[#eb8127]/20">
                        {isSelected.qty}
                      </div>
                    )}
                    <span className="mb-1">{item.name}</span>
                    {type === 'extras' && (
                      <span className={`text-[10px] font-black opacity-60 ${isSelected ? "text-white" : "text-[#1e293b]"}`}>
                        + {formatAmount(item.price)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Panel: Selected Summary */}
        <div className="w-80 bg-white border-l border-slate-200 flex flex-col overflow-hidden shadow-[-4px_0_15px_rgba(0,0,0,0.05)]">
          
          {/* Action Bar — Matching POS Style */}
          <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => selectedSummaryId && handleDecrement(selectedSummaryId)}
              disabled={!selectedSummaryId}
              className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 shadow-sm ${
                selectedSummaryId ? "bg-[#49293e] text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
              <span className="text-[7px] font-black uppercase tracking-tighter">Minus</span>
            </button>
            <button
              onClick={() => selectedSummaryId && handleIncrement(selectedSummaryId)}
              disabled={!selectedSummaryId}
              className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 shadow-sm ${
                selectedSummaryId ? "bg-[#49293e] text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
              <span className="text-[7px] font-black uppercase tracking-tighter">Plus</span>
            </button>
            <button
              onClick={() => selectedSummaryId && handleRemove(selectedSummaryId)}
              disabled={!selectedSummaryId}
              className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 shadow-sm ${
                selectedSummaryId ? "bg-red-500 text-white" : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
              <span className="text-[7px] font-black uppercase tracking-tighter">Void</span>
            </button>
          </div>

          {/* Summary Table Header */}
          <div className="grid grid-cols-[50px_1fr_70px] bg-white border-b border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <div className="flex items-center justify-center py-3 border-r border-slate-50">Qty</div>
            <div className="flex items-center pl-4 py-3">Item</div>
            <div className="flex items-center justify-center py-3">Total</div>
          </div>

          {/* Selected List */}
          <div className="flex-1 overflow-y-auto bg-white">
            {selectedItems.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center p-8 text-center opacity-20">
                <div className="w-16 h-16 border-2 border-dashed border-slate-400 rounded-full mb-4" />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">No Selections</p>
              </div>
            ) : (
              selectedItems.map((item) => {
                const isSelectedRow = selectedSummaryId === item.id;
                return (
                  <div 
                    key={item.id} 
                    onClick={() => setSelectedSummaryId(isSelectedRow ? null : item.id)}
                    className={`grid grid-cols-[50px_1fr_70px] items-center border-b border-slate-50 cursor-pointer transition-all ${
                      isSelectedRow ? "bg-[#49293e]/10 ring-1 ring-inset ring-[#49293e]/20" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className={`flex items-center justify-center py-4 border-r border-slate-50 text-sm font-black ${isSelectedRow ? "text-[#eb8127]" : "text-slate-400"}`}>
                      {item.qty}
                    </div>
                    <div className="pl-4 py-3 flex flex-col min-w-0">
                      <span className={`text-[11px] font-black uppercase truncate ${isSelectedRow ? "text-[#49293e]" : "text-slate-800"}`}>
                        {item.name}
                      </span>
                      {type === 'extras' && (
                        <span className="text-[9px] font-bold text-slate-400">
                          @ {formatAmount(item.price)}
                        </span>
                      )}
                    </div>
                    <div className={`flex items-center justify-center py-3 text-[11px] font-black ${isSelectedRow ? "text-[#49293e]" : "text-slate-900"}`}>
                      {type === 'extras' ? formatAmount(item.price * item.qty) : '-'}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Buttons */}
          <div className="p-4 space-y-2 bg-slate-50 border-t border-slate-200">
            <button
              onClick={() => {
                onDone(selectedItems);
                // In a real flow, we might save current selections and switch or close
                onClose();
              }}
              className="w-full h-16 bg-[#eb8127] text-white font-black uppercase text-lg rounded-xl shadow-[0_4px_15px_rgba(235,129,39,0.3)] hover:bg-[#d9731d] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <span>Save Changes</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="w-full h-12 bg-[#9c142c] text-white font-black uppercase text-xs rounded-xl shadow-md hover:bg-[#850f24] active:scale-[0.98] transition-all"
              tabIndex={-1}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


