import { useState, useEffect, useRef } from "react";
import { menuApi } from "../../../../services/menuApi";
import { useCurrency } from "../../../../../../hooks/useCurrency";

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
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const prevRef = useRef<{ key: string | null; type: string | null }>({ key: null, type: null });

  const currentItem = cartItems.find(item => item.uniqueId === selectedKey);

  useEffect(() => {
    if (isOpen) {
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
        const res = await menuApi.getModifiers(undefined);
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
    const exists = selectedItems.find(si => si.id === item.id && si.typeId === activeTypeId);
    if (exists) {
      setSelectedItems(selectedItems.map(si => 
        (si.id === item.id && si.typeId === activeTypeId) ? { ...si, qty: si.qty + 1 } : si
      ));
    } else {
      const activeType = types.find(t => t.typeId === activeTypeId);
      const prefix = (type === 'modifiers' && activeType?.typeName?.trim()) 
        ? `${activeType.typeName.trim()} ` 
        : "";
      setSelectedItems([...selectedItems, { 
        ...item, 
        name: `${prefix}${item.name}`,
        qty: 1 
      }]);
    }
  };

  const handleIncrement = (uniqueKey: string) => {
    setSelectedItems(prev => prev.map(item => 
      `${item.id}-${item.typeId}` === uniqueKey ? { ...item, qty: item.qty + 1 } : item
    ));
  };

  const handleDecrement = (uniqueKey: string) => {
    setSelectedItems(prev => prev.map(item => {
      if (`${item.id}-${item.typeId}` === uniqueKey) {
        return { ...item, qty: Math.max(1, item.qty - 1) };
      }
      return item;
    }));
  };

  const handleRemove = (uniqueKey: string) => {
    setSelectedItems(prev => prev.filter(item => `${item.id}-${item.typeId}` !== uniqueKey));
    if (selectedSummaryId === uniqueKey as any) setSelectedSummaryId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop – no onClick, close via button only */}
      <div 
        className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" 
      />

      {/* Sliding Drawer */}
      <div className="fixed inset-y-0 right-0 z-[100] w-[95%] md:w-[88%] max-w-[1080px] bg-[#f8f9fb] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="bg-[#49293e] text-white px-5 py-3.5 flex items-center gap-4 shrink-0 shadow-lg">
          {/* Product info */}
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">
              Editing Product
            </span>
            <span className="text-sm font-black uppercase text-white leading-none truncate">
              {currentItem?.product.name || "Unknown Product"}
            </span>
          </div>

          {/* Title */}
          <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.15em] text-white/90 shrink-0">
            {type === 'modifiers' ? '⚙ Modifier List' : '✦ Extras List'}
          </h2>

          {/* Close */}
          <div className="flex-1 flex justify-end">
            <button 
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border border-white/20"
              tabIndex={-1}
            >
              <span>Close</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* Cart Item Rail */}
          <div className="w-full md:w-16 h-14 md:h-auto shrink-0 bg-[#49293e] flex md:flex-col items-center py-2 md:py-4 px-3 md:px-0 gap-2 md:gap-2.5 overflow-x-auto md:overflow-y-auto">
            <span className="hidden md:block text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Cart</span>
            {cartItems.map((item, index) => {
              const key = item.uniqueId;
              const isActive = key === selectedKey;
              return (
                <button
                  key={key}
                  onClick={() => onSelectRow(key)}
                  className={`w-10 h-10 rounded-xl font-black text-base flex items-center justify-center active:scale-95 transition-all shrink-0 ${
                    isActive 
                      ? "bg-[#ff9500] text-white shadow-lg shadow-[#ff9500]/30" 
                      : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                  }`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>

          {/* Category/Type Rail */}
          <div className="w-full md:w-44 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="hidden md:block px-3 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</span>
            </div>
            <div className="flex md:flex-col flex-1 overflow-x-auto md:overflow-y-auto p-2 gap-2 md:space-y-1.5">
              {types.length === 0 ? (
                <div className="flex items-center justify-center h-20 opacity-30">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">No Types</span>
                </div>
              ) : (
                types.map((t, index) => (
                  <button
                    key={t.typeId || index}
                    onClick={() => setActiveTypeId(t.typeId)}
                    className={`shrink-0 whitespace-nowrap md:whitespace-normal md:w-full h-10 md:h-auto px-4 md:py-3 md:px-2.5 text-[10px] font-black uppercase rounded-lg transition-all text-center leading-tight ${
                      activeTypeId === t.typeId 
                        ? "bg-[#49293e] text-white shadow-md shadow-[#49293e]/20" 
                        : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                    }`}
                  >
                    {t.typeName}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Item Grid */}
          <div className="flex-1 min-w-0 overflow-y-auto bg-[#f8f9fb] p-3 md:p-4">
            {loading ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-4 border-slate-200 border-t-[#49293e] rounded-full animate-spin" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="flex flex-col items-center gap-3 opacity-30">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#49293e" strokeWidth="1.5">
                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
                  </svg>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Items</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map((item, index) => {
                  const isSelected = selectedItems.find(si => si.id === item.id && si.typeId === activeTypeId);
                  return (
                    <button
                      key={item.id || index}
                      onClick={() => handleItemToggle(item)}
                      className={`relative h-[90px] md:h-[100px] rounded-xl text-[11px] font-black uppercase tracking-wide transition-all flex flex-col items-center justify-center text-center leading-tight px-2 border-2 active:scale-95 ${
                        isSelected 
                          ? "bg-[#49293e] border-[#49293e] text-white shadow-lg shadow-[#49293e]/20" 
                          : "bg-white border-slate-200 text-[#49293e] hover:border-[#49293e]/30 hover:shadow-md shadow-sm"
                      }`}
                    >
                      {/* Qty badge */}
                      {isSelected && isSelected.qty > 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#ff9500] text-white flex items-center justify-center text-[9px] font-black shadow-md border-2 border-white">
                          {isSelected.qty}
                        </div>
                      )}
                      {/* Selected checkmark */}
                      {isSelected && (
                        <div className="absolute top-1.5 left-1.5">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        </div>
                      )}
                      <span className="line-clamp-2 break-words">{item.name}</span>
                      {type === 'extras' && (
                        <span className={`text-[9px] font-bold mt-1 ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                          + {formatAmount(item.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Summary Panel */}
          <div className="w-full md:w-72 h-[40vh] md:h-auto shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden">
            
            {/* Action Bar */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 border-b border-slate-200 shrink-0">
              <button
                onClick={() => selectedSummaryId && handleDecrement(selectedSummaryId)}
                disabled={!selectedSummaryId}
                className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  selectedSummaryId ? "bg-[#49293e] text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
                <span className="text-[7px] font-black uppercase tracking-tighter">Minus</span>
              </button>
              <button
                onClick={() => selectedSummaryId && handleIncrement(selectedSummaryId)}
                disabled={!selectedSummaryId}
                className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  selectedSummaryId ? "bg-[#49293e] text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                <span className="text-[7px] font-black uppercase tracking-tighter">Plus</span>
              </button>
              <button
                onClick={() => selectedSummaryId && handleRemove(selectedSummaryId)}
                disabled={!selectedSummaryId}
                className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  selectedSummaryId ? "bg-red-500 text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                <span className="text-[7px] font-black uppercase tracking-tighter">Void</span>
              </button>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_60px] bg-slate-50 border-b border-slate-200 shrink-0">
              <div className="flex items-center justify-center py-2.5 border-r border-slate-200 text-[9px] font-black uppercase tracking-widest text-slate-400">Qty</div>
              <div className="flex items-center pl-3 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</div>
              <div className="flex items-center justify-center py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Total</div>
            </div>

            {/* Selected Items List */}
            <div className="flex-1 overflow-y-auto">
              {selectedItems.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2">
                      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                      <rect x="9" y="3" width="6" height="4" rx="1" />
                    </svg>
                  </div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-300">No Selections</p>
                </div>
              ) : (
                selectedItems.map((item) => {
                  const uniqueKey = `${item.id}-${item.typeId}`;
                  const isSelectedRow = selectedSummaryId === uniqueKey;
                  return (
                    <div 
                      key={uniqueKey} 
                      onClick={() => setSelectedSummaryId(isSelectedRow ? null : uniqueKey)}
                      className={`grid grid-cols-[40px_1fr_60px] items-center border-b border-slate-50 cursor-pointer transition-all ${
                        isSelectedRow ? "bg-[#49293e]/8 ring-1 ring-inset ring-[#49293e]/15" : "hover:bg-slate-50"
                      }`}
                    >
                      <div className={`flex items-center justify-center py-3.5 border-r border-slate-100 text-sm font-black ${isSelectedRow ? "text-[#ff9500]" : "text-slate-500"}`}>
                        {item.qty}
                      </div>
                      <div className="pl-3 py-2.5 flex flex-col min-w-0">
                        <span className={`text-[10px] font-black uppercase truncate leading-tight ${isSelectedRow ? "text-[#49293e]" : "text-slate-700"}`}>
                          {item.name}
                        </span>
                        {type === 'extras' && (
                          <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                            @ {formatAmount(item.price)}
                          </span>
                        )}
                      </div>
                      <div className={`flex items-center justify-center py-2.5 text-[10px] font-black ${isSelectedRow ? "text-[#49293e]" : "text-slate-800"}`}>
                        {type === 'extras' ? formatAmount(item.price * item.qty) : '—'}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-3 space-y-2 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={() => {
                  onDone(selectedItems);
                  onClose();
                }}
                className="w-full h-14 bg-[#ff9500] text-white font-black uppercase text-sm tracking-widest rounded-xl shadow-lg shadow-[#ff9500]/25 hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span>Save Changes</span>
              </button>
              <button
                onClick={onClose}
                className="w-full h-10 bg-slate-600 hover:bg-slate-700 text-white font-black uppercase text-[10px] tracking-widest rounded-xl active:scale-[0.98] transition-all"
                tabIndex={-1}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
