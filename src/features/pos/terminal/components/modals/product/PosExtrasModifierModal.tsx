import { useState, useEffect, useRef } from "react";
import { menuApi } from "../../../../services/menuApi";
import { useCurrency } from "../../../../../../hooks/useCurrency";

interface CartItem {
  uniqueId: string;
  productId: number;
  variantName?: string;
  quantity?: number;
  product: { name: string };
}

export type ExtrasItem    = { id: number; name: string; price: number; qty: number; typeId: number };
export type ModifierItem  = { id: number; name: string; qty: number; typeId: number; typeName?: string };
export type MessageItem   = { id?: number; name: string; qty?: number };

interface PosExtrasModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'extras' | 'modifiers';
  cartItems: CartItem[];
  selectedKey: string | null;
  onSelectRow: (key: string) => void;
  initialExtras: ExtrasItem[];
  initialModifiers: ModifierItem[];
  initialMessages: MessageItem[];
  onDone: (extras: ExtrasItem[], modifiers: ModifierItem[], messages: MessageItem[]) => void;
}

export const PosExtrasModifierModal = ({
  isOpen,
  onClose,
  type,
  cartItems,
  selectedKey,
  onSelectRow,
  initialExtras,
  initialModifiers,
  initialMessages,
  onDone,
}: PosExtrasModifierModalProps) => {
  const { formatAmount } = useCurrency();

  // Available types/categories from API
  const [types, setTypes] = useState<any[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
  // Items in the add-grid (left side)
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Three independent selection arrays (right panel)
  const [extrasSelections,    setExtrasSelections]    = useState<ExtrasItem[]>([]);
  const [modifiersSelections, setModifiersSelections] = useState<ModifierItem[]>([]);
  const [messagesSelections,  setMessagesSelections]  = useState<MessageItem[]>([]);

  // Which row is highlighted in the right panel (for qty +/−)
  const [selectedSummaryId,   setSelectedSummaryId]   = useState<string | null>(null);
  const [selectedSummaryType, setSelectedSummaryType] = useState<'extras' | 'modifiers' | null>(null);

  const prevRef = useRef<{ key: string | null; type: string | null }>({ key: null, type: null });
  const currentItem = cartItems.find(item => item.uniqueId === selectedKey);

  // ── Init on open ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      if (prevRef.current.key !== selectedKey || prevRef.current.type !== type) {
        fetchTypes();
        setExtrasSelections(initialExtras || []);
        setModifiersSelections(initialModifiers || []);
        setMessagesSelections(initialMessages || []);
        setSelectedSummaryId(null);
        setSelectedSummaryType(null);
        prevRef.current = { key: selectedKey, type };
      }
    } else {
      setTypes([]);
      setActiveTypeId(null);
      setItems([]);
      setExtrasSelections([]);
      setModifiersSelections([]);
      setMessagesSelections([]);
      setSelectedSummaryId(null);
      setSelectedSummaryType(null);
      prevRef.current = { key: null, type: null };
    }
  }, [isOpen, type, selectedKey]);

  useEffect(() => {
    if (isOpen) fetchItems();
  }, [isOpen, type, activeTypeId]);

  // ── API fetchers ────────────────────────────────────────────────────────────
  const fetchTypes = async () => {
    try {
      const data = type === 'extras'
        ? await menuApi.getExtraTypes()
        : await menuApi.getModifierTypes();
      const normalized = data.map((t: any) => ({
        ...t,
        typeId: t.typeId || t.id || Math.random(),
      }));
      setTypes(normalized);
      if (normalized.length > 0) setActiveTypeId(normalized[0].typeId);
    } catch (err) { console.error(err); }
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const getName = (obj: any) =>
        obj.extraName || obj.modifierName || obj.name || obj.itemName || obj.description ||
        obj.ExtraName || obj.ModifierName || obj.Name ||
        Object.entries(obj).find(([k]) => k.toLowerCase().includes("name"))?.[1] || "Unknown";

      if (type === 'extras') {
        const res = await menuApi.getExtras(activeTypeId || undefined);
        setItems((res.extras || []).map((e: any) => ({
          ...e,
          id:    e.extrasId ?? e.extraId ?? e.id ?? e.extraID ?? e.ID ?? Math.random(),
          name:  getName(e),
          price: e.price || 0,
          typeId: activeTypeId || 0,
        })));
      } else {
        const res = await menuApi.getModifiers(undefined);
        setItems((res.modifier || []).map((m: any) => ({
          ...m,
          id:    m.modifierId ?? m.modifiersId ?? m.id ?? m.modifierID ?? m.ID ?? Math.random(),
          name:  getName(m),
          typeId: activeTypeId || 0,
        })));
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ── Left-grid: ADD logic (only for the current modal type) ─────────────────
  const handleItemToggle = (item: any) => {
    if (type === 'extras') {
      const exists = extrasSelections.find(si => si.id === item.id && si.typeId === activeTypeId);
      if (exists) {
        setExtrasSelections(prev =>
          prev.map(si => (si.id === item.id && si.typeId === activeTypeId) ? { ...si, qty: si.qty + 1 } : si)
        );
      } else {
        setExtrasSelections(prev => [...prev, { ...item, qty: 1 }]);
      }
    } else {
      const exists = modifiersSelections.find(si => si.id === item.id && si.typeId === activeTypeId);
      if (exists) {
        setModifiersSelections(prev =>
          prev.map(si => (si.id === item.id && si.typeId === activeTypeId) ? { ...si, qty: si.qty + 1 } : si)
        );
      } else {
        const activeType = types.find(t => t.typeId === activeTypeId);
        const prefix = activeType?.typeName?.trim() ? `${activeType.typeName.trim()} ` : "";
        setModifiersSelections(prev => [...prev, { ...item, name: `${prefix}${item.name}`, qty: 1 }]);
      }
    }
  };

  // ── Right-panel qty control (only for matching type) ───────────────────────
  const canQty = selectedSummaryType === type;

  const handleIncrement = () => {
    if (!canQty || !selectedSummaryId) return;
    if (type === 'extras') {
      setExtrasSelections(prev =>
        prev.map(item => `${item.id}-${item.typeId}` === selectedSummaryId ? { ...item, qty: item.qty + 1 } : item)
      );
    } else {
      setModifiersSelections(prev =>
        prev.map(item => `${item.id}-${item.typeId}` === selectedSummaryId ? { ...item, qty: item.qty + 1 } : item)
      );
    }
  };

  const handleDecrement = () => {
    if (!canQty || !selectedSummaryId) return;
    if (type === 'extras') {
      setExtrasSelections(prev =>
        prev.map(item =>
          `${item.id}-${item.typeId}` === selectedSummaryId ? { ...item, qty: Math.max(1, item.qty - 1) } : item
        )
      );
    } else {
      setModifiersSelections(prev =>
        prev.map(item =>
          `${item.id}-${item.typeId}` === selectedSummaryId ? { ...item, qty: Math.max(1, item.qty - 1) } : item
        )
      );
    }
  };

  // ── Right-panel: REMOVE — works for all types from any modal ──────────────
  const removeExtra    = (uniqueKey: string) => {
    setExtrasSelections(prev => prev.filter(i => `${i.id}-${i.typeId}` !== uniqueKey));
    if (selectedSummaryId === uniqueKey) { setSelectedSummaryId(null); setSelectedSummaryType(null); }
  };
  const removeModifier = (uniqueKey: string) => {
    setModifiersSelections(prev => prev.filter(i => `${i.id}-${i.typeId}` !== uniqueKey));
    if (selectedSummaryId === uniqueKey) { setSelectedSummaryId(null); setSelectedSummaryType(null); }
  };
  const removeMessage  = (name: string) => {
    setMessagesSelections(prev => prev.filter(m => m.name !== name));
    if (selectedSummaryId === `msg-${name}`) { setSelectedSummaryId(null); setSelectedSummaryType(null); }
  };

  const handleSave = () => {
    onDone(extrasSelections, modifiersSelections, messagesSelections);
    onClose();
  };

  if (!isOpen) return null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  const isExtrasGridSelected  = (item: any) => !!extrasSelections.find(si => si.id === item.id && si.typeId === activeTypeId);
  const isModifierGridSelected = (item: any) => !!modifiersSelections.find(si => si.id === item.id && si.typeId === activeTypeId);
  const getGridBadgeQty = (item: any) =>
    type === 'extras'
      ? extrasSelections.find(si => si.id === item.id && si.typeId === activeTypeId)?.qty
      : modifiersSelections.find(si => si.id === item.id && si.typeId === activeTypeId)?.qty;

  const totalCustomisations = extrasSelections.length + modifiersSelections.length + messagesSelections.length;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Sliding Drawer */}
      <div className="fixed inset-y-0 right-0 z-[100] w-[95%] md:w-[88%] max-w-[1080px] bg-[#f8f9fb] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="bg-[#49293e] text-white px-5 py-3.5 flex items-center gap-4 shrink-0 shadow-lg">
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">Editing Product</span>
            <span className="text-sm font-black uppercase text-white leading-none truncate">
              {currentItem?.product.name || "Unknown Product"}
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black uppercase tracking-[0.15em] text-white/90 shrink-0">
            {type === 'modifiers' ? '⚙ Modifier List' : '✦ Extras List'}
          </h2>
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
                    isActive ? "bg-[#ff9500] text-white shadow-lg shadow-[#ff9500]/30" : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
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

          {/* Item Grid (ADD — only for the matching type) */}
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
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Items</span>
                </div>
              </div>
            ) : (
              <div className="grid gap-2 md:gap-2.5 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {items.map((item, index) => {
                  const isSelected = type === 'extras' ? isExtrasGridSelected(item) : isModifierGridSelected(item);
                  const badgeQty = getGridBadgeQty(item);
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
                      {badgeQty && badgeQty > 0 && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#ff9500] text-white flex items-center justify-center text-[9px] font-black shadow-md border-2 border-white">
                          {badgeQty}
                        </div>
                      )}
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

          {/* ─── Right Panel: Unified Customisations Summary ─────────────────── */}
          <div className="w-full md:w-72 h-[45vh] md:h-auto shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden">

            {/* Product Name Header */}
            <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b] px-3 py-2.5 shrink-0 border-b border-[#153050]">
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/40 leading-none mb-1">Editing</p>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-black uppercase text-white leading-tight truncate tracking-wide flex-1">
                  {currentItem?.product.name || "Unknown Product"}
                </p>
                {currentItem?.quantity !== undefined && (
                  <div className="shrink-0 flex flex-col items-center bg-white/15 border border-white/20 rounded-lg px-2 py-1 min-w-[36px]">
                    <span className="text-base font-black text-white leading-none">{currentItem.quantity}</span>
                    <span className="text-[7px] font-black text-white/50 uppercase tracking-widest leading-none mt-0.5">Qty</span>
                  </div>
                )}
              </div>
            </div>

            {/* Action Bar — qty controls, only for matching type */}
            <div className="grid grid-cols-3 gap-1 p-2 bg-slate-50 border-b border-slate-200 shrink-0">
              {/* − */}
              <button
                onClick={handleDecrement}
                disabled={!canQty || !selectedSummaryId}
                title={!canQty ? `Qty only adjustable in the ${type} modal` : undefined}
                className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  canQty && selectedSummaryId ? "bg-[#49293e] text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14" /></svg>
                <span className="text-[7px] font-black uppercase tracking-tighter">Minus</span>
              </button>
              {/* + */}
              <button
                onClick={handleIncrement}
                disabled={!canQty || !selectedSummaryId}
                title={!canQty ? `Qty only adjustable in the ${type} modal` : undefined}
                className={`h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 transition-all active:scale-95 ${
                  canQty && selectedSummaryId ? "bg-[#49293e] text-white shadow-sm" : "bg-slate-100 text-slate-300 cursor-not-allowed"
                }`}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 5v14M5 12h14" /></svg>
                <span className="text-[7px] font-black uppercase tracking-tighter">Plus</span>
              </button>
              {/* Total count badge */}
              <div className="h-11 rounded-lg flex flex-col items-center justify-center gap-0.5 bg-slate-100 border border-slate-200">
                <span className="text-lg font-black text-[#49293e] leading-none">{totalCustomisations}</span>
                <span className="text-[7px] font-black uppercase tracking-tighter text-slate-400">Total</span>
              </div>
            </div>

            {/* Summary list */}
            <div className="flex-1 overflow-y-auto">

              {/* ── Extras Section ── */}
              <div className="border-b border-slate-100">
                <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50/60 border-b border-blue-100/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-700">✦ Extras</span>
                  {extrasSelections.length > 0 && (
                    <span className="text-[9px] font-black bg-blue-600 text-white rounded-full px-1.5 py-0.5 leading-none">{extrasSelections.length}</span>
                  )}
                </div>
                {extrasSelections.length === 0 ? (
                  <div className="px-3 py-2 text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">None</div>
                ) : (
                  extrasSelections.map(item => {
                    const uniqueKey = `${item.id}-${item.typeId}`;
                    const isHighlighted = selectedSummaryId === uniqueKey;
                    return (
                      <div
                        key={uniqueKey}
                        onClick={() => {
                          if (isHighlighted) { setSelectedSummaryId(null); setSelectedSummaryType(null); }
                          else { setSelectedSummaryId(uniqueKey); setSelectedSummaryType('extras'); }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 cursor-pointer transition-all ${
                          isHighlighted ? "bg-[#49293e]/8 ring-1 ring-inset ring-[#49293e]/15" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className={`text-sm font-black min-w-[20px] text-center ${isHighlighted ? "text-[#ff9500]" : "text-slate-400"}`}>{item.qty}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] font-black uppercase truncate ${isHighlighted ? "text-[#49293e]" : "text-slate-700"}`}>{item.name}</p>
                          <p className="text-[8px] font-bold text-slate-400">@ {formatAmount(item.price)}</p>
                        </div>
                        <span className={`text-[10px] font-black shrink-0 ${isHighlighted ? "text-[#49293e]" : "text-slate-600"}`}>{formatAmount(item.price * item.qty)}</span>
                        {/* Remove × — always active */}
                        <button
                          onClick={e => { e.stopPropagation(); removeExtra(uniqueKey); }}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                          title="Remove"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Modifiers Section ── */}
              <div className="border-b border-slate-100">
                <div className="flex items-center justify-between px-3 py-1.5 bg-orange-50/60 border-b border-orange-100/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-orange-700">⚙ Modifiers</span>
                  {modifiersSelections.length > 0 && (
                    <span className="text-[9px] font-black bg-orange-500 text-white rounded-full px-1.5 py-0.5 leading-none">{modifiersSelections.length}</span>
                  )}
                </div>
                {modifiersSelections.length === 0 ? (
                  <div className="px-3 py-2 text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">None</div>
                ) : (
                  modifiersSelections.map(item => {
                    const uniqueKey = `${item.id}-${item.typeId}`;
                    const isHighlighted = selectedSummaryId === uniqueKey;
                    return (
                      <div
                        key={uniqueKey}
                        onClick={() => {
                          if (isHighlighted) { setSelectedSummaryId(null); setSelectedSummaryType(null); }
                          else { setSelectedSummaryId(uniqueKey); setSelectedSummaryType('modifiers'); }
                        }}
                        className={`flex items-center gap-2 px-3 py-2 border-b border-slate-50 cursor-pointer transition-all ${
                          isHighlighted ? "bg-[#49293e]/8 ring-1 ring-inset ring-[#49293e]/15" : "hover:bg-slate-50"
                        }`}
                      >
                        <span className={`text-sm font-black min-w-[20px] text-center ${isHighlighted ? "text-[#ff9500]" : "text-slate-400"}`}>{item.qty}</span>
                        <p className={`flex-1 text-[10px] font-black uppercase truncate ${isHighlighted ? "text-[#49293e]" : "text-slate-700"}`}>{item.name}</p>
                        <button
                          onClick={e => { e.stopPropagation(); removeModifier(uniqueKey); }}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                          title="Remove"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              {/* ── Messages Section ── */}
              <div>
                <div className="flex items-center justify-between px-3 py-1.5 bg-purple-50/60 border-b border-purple-100/60">
                  <span className="text-[9px] font-black uppercase tracking-widest text-purple-700">💬 Messages</span>
                  {messagesSelections.length > 0 && (
                    <span className="text-[9px] font-black bg-purple-600 text-white rounded-full px-1.5 py-0.5 leading-none">{messagesSelections.length}</span>
                  )}
                </div>
                {messagesSelections.length === 0 ? (
                  <div className="px-3 py-2 text-[9px] text-slate-300 italic font-bold uppercase tracking-widest">None</div>
                ) : (
                  messagesSelections.map(msg => {
                    const msgKey = `msg-${msg.name}`;
                    return (
                      <div
                        key={msgKey}
                        className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition-all"
                      >
                        <p className="flex-1 text-[10px] font-black uppercase truncate text-purple-800">💬 {msg.name}</p>
                        <button
                          onClick={() => removeMessage(msg.name)}
                          className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95"
                          title="Remove"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="p-3 space-y-2 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                onClick={handleSave}
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
