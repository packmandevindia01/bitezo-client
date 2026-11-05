import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { formatModifierLabel, rememberModifierTypes } from "../../../../utils/modifierLabel";
import { menuApi } from "../../../../services/menuApi";
import { useCurrency } from "../../../../../../hooks/useCurrency";
import { useAppSelector } from "../../../../../../app/hooks";

/**
 * Extras & Modifiers screen — one screen for the WHOLE bill.
 *
 * The right panel lists every cart line (qty / name / price / amount) with its extras, modifiers and
 * messages underneath. Tap a line to make it the target, tap an item in the grid to add it to that
 * line (tap again to remove). Extras ↔ Modifiers is a tab in the header. Changes for all lines are
 * kept as drafts and saved together with "Done" (only lines that changed are dispatched).
 */

interface CartLine {
  uniqueId: string;
  productId: number;
  variantName?: string;
  quantity?: number;
  price?: number;
  categoryId?: number;
  product?: { name: string; categoryId?: number };
  extras?: ExtrasItem[];
  modifiers?: ModifierItem[];
  messages?: MessageItem[];
}

export type ExtrasItem    = { id: number; name: string; price: number; qty: number; typeId: number };
export type ModifierItem  = { id: number; name: string; qty: number; typeId: number; typeName?: string };
export type MessageItem   = { id?: number; name: string; qty?: number };

type Mode = "extras" | "modifiers";

export interface LineCustomization {
  uniqueId: string;
  extras: ExtrasItem[];
  modifiers: ModifierItem[];
  messages: MessageItem[];
}

interface PosExtrasModifierModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Tab shown first (the button the cashier pressed). */
  type: Mode;
  cartItems: CartLine[];
  /** Cart line selected when the screen opens. */
  selectedKey: string | null;
  /** Keeps the cart selection in sync with the line chosen here. */
  onSelectRow: (key: string) => void;
  /** Called with every line whose customisations changed. */
  onDone: (changes: LineCustomization[]) => void;
}

const sameCustomization = (a: LineCustomization, b: LineCustomization) =>
  JSON.stringify([a.extras, a.modifiers, a.messages]) === JSON.stringify([b.extras, b.modifiers, b.messages]);

const getName = (obj: any) =>
  obj.extraName || obj.modifierName || obj.name || obj.itemName || obj.description ||
  obj.ExtraName || obj.ModifierName || obj.Name ||
  Object.entries(obj).find(([k]) => k.toLowerCase().includes("name"))?.[1] || "Unknown";

/** Keep only items mapped to the line's category (items without a category mapping are for all). */
const filterByCategory = (list: any[], categoryId?: number) => {
  if (!categoryId || list.length === 0) return list;
  const matches = (c: any) => (typeof c === "object" ? Number(c.id) : Number(c)) === categoryId;
  return list.filter((e: any) => {
    if (Array.isArray(e.categoryIds) && e.categoryIds.length > 0) return e.categoryIds.some(matches);
    if (Array.isArray(e.categories) && e.categories.length > 0) return e.categories.some(matches);
    if (e.categoryId !== undefined && e.categoryId !== null && Number(e.categoryId) > 0) {
      return Number(e.categoryId) === categoryId;
    }
    return true;
  });
};

const RemoveButton = ({ onClick, label }: { onClick: () => void; label: string }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-90"
    title={`Remove ${label}`}
    aria-label={`Remove ${label}`}
    tabIndex={-1}
  >
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
  </button>
);

export const PosExtrasModifierModal = ({
  isOpen,
  onClose,
  type,
  cartItems,
  selectedKey,
  onSelectRow,
  onDone,
}: PosExtrasModifierModalProps) => {
  const { formatAmount } = useCurrency();
  const productCache = useAppSelector((state: any) => state.pos?.productCache || {});

  const [mode, setMode] = useState<Mode>(type);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, LineCustomization>>({});
  const originalsRef = useRef<Record<string, LineCustomization>>({});

  const [types, setTypes] = useState<any[]>([]);
  const [activeTypeId, setActiveTypeId] = useState<number | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const lineRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const wasOpenRef = useRef(false);

  // ── Open / close: seed drafts from every cart line ─────────────────────────
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      const seeded: Record<string, LineCustomization> = {};
      cartItems.forEach((line) => {
        seeded[line.uniqueId] = {
          uniqueId: line.uniqueId,
          extras: [...(line.extras || [])],
          modifiers: [...(line.modifiers || [])],
          messages: [...(line.messages || [])],
        };
      });
      originalsRef.current = seeded;
      setDrafts(seeded);
      setMode(type);
      const startKey = cartItems.some((l) => l.uniqueId === selectedKey)
        ? selectedKey
        : cartItems[cartItems.length - 1]?.uniqueId ?? null;
      setActiveKey(startKey);
    }
    if (!isOpen && wasOpenRef.current) {
      setDrafts({});
      setTypes([]);
      setActiveTypeId(null);
      setItems([]);
      originalsRef.current = {};
    }
    wasOpenRef.current = isOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const activeLine = cartItems.find((l) => l.uniqueId === activeKey);
  const activeIndex = cartItems.findIndex((l) => l.uniqueId === activeKey);
  const activeDraft = activeKey ? drafts[activeKey] : undefined;

  const activeCategoryId: number | undefined = (() => {
    const id = activeLine?.product?.categoryId
      || (activeLine?.productId ? productCache[activeLine.productId]?.categoryId : undefined)
      || activeLine?.categoryId;
    return id && Number(id) > 0 ? Number(id) : undefined;
  })();

  // ── Types for the current tab ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setTypes([]);
    setActiveTypeId(null);
    setItems([]);
    (async () => {
      try {
        const data = mode === "extras" ? await menuApi.getExtraTypes() : await menuApi.getModifierTypes();
        if (cancelled) return;
        const normalized = (data || []).map((t: any) => {
          const typeId = t.typeId || t.id || Math.random();
          const typeName = String(t.typeName || t.name || t.modifierTypeName || "").trim();
          return { ...t, typeId, typeName, name: typeName };
        });
        setTypes(normalized);
        if (normalized.length > 0) setActiveTypeId(normalized[0].typeId);
      } catch (err) { console.error(err); }
    })();
    return () => { cancelled = true; };
  }, [isOpen, mode]);

  // ── Items for the type + the active line's category ────────────────────────
  useEffect(() => {
    if (!isOpen || activeTypeId === null) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        if (mode === "extras") {
          const res = await menuApi.getExtras(activeTypeId || undefined, activeCategoryId);
          if (cancelled) return;
          const list = filterByCategory(res.extras || [], activeCategoryId);
          setItems(list.map((e: any) => ({
            ...e,
            id: e.extrasId ?? e.extraId ?? e.id ?? e.extraID ?? e.ID ?? Math.random(),
            name: getName(e),
            price: e.price || 0,
            typeId: activeTypeId || 0,
          })));
        } else {
          const res = await menuApi.getModifiers(activeTypeId || undefined, activeCategoryId);
          if (cancelled) return;
          const list = filterByCategory(res.modifier || [], activeCategoryId);
          const activeType = types.find((t) => t.typeId === activeTypeId);
          const typeName = String(activeType?.typeName || activeType?.name || activeType?.modifierTypeName || "").trim();
          const mapped = list.map((m: any) => ({
            ...m,
            id: m.modifierId ?? m.modifiersId ?? m.id ?? m.modifierID ?? m.ID ?? Math.random(),
            name: getName(m),
            typeId: activeTypeId || 0,
            typeName,
          }));
          // Saved orders can come back without a type name — remember it per modifier id for previews / prints.
          rememberModifierTypes(mapped, typeName);
          setItems(mapped);
        }
      } catch (err) { console.error(err); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mode, activeTypeId, activeCategoryId]);

  // Keep the active line visible in the order panel.
  useEffect(() => {
    if (activeKey) lineRefs.current[activeKey]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeKey]);

  const selectLine = useCallback((key: string) => {
    setActiveKey(key);
    onSelectRow(key);
  }, [onSelectRow]);

  const updateDraft = (key: string, fn: (d: LineCustomization) => LineCustomization) =>
    setDrafts((prev) => (prev[key] ? { ...prev, [key]: fn(prev[key]) } : prev));

  // ── Grid tap: add to the active line, tap again to remove ──────────────────
  const isInActiveLine = (item: any) => {
    if (!activeDraft) return false;
    return mode === "extras"
      ? activeDraft.extras.some((x) => x.id === item.id)
      : activeDraft.modifiers.some((x) => x.id === item.id && x.typeId === activeTypeId);
  };

  const handleItemTap = (item: any) => {
    if (!activeKey) return;
    if (mode === "extras") {
      updateDraft(activeKey, (d) => d.extras.some((x) => x.id === item.id)
        ? { ...d, extras: d.extras.filter((x) => x.id !== item.id) }
        : { ...d, extras: [...d.extras, { ...item, qty: 1 }] });
    } else {
      const activeType = types.find((t) => t.typeId === activeTypeId);
      const typeName = String(activeType?.typeName || activeType?.name || activeType?.modifierTypeName || item.typeName || "").trim();
      updateDraft(activeKey, (d) => d.modifiers.some((x) => x.id === item.id && x.typeId === activeTypeId)
        ? { ...d, modifiers: d.modifiers.filter((x) => !(x.id === item.id && x.typeId === activeTypeId)) }
        : { ...d, modifiers: [...d.modifiers, { ...item, id: item.id, name: item.name, qty: 1, typeId: activeTypeId || item.typeId || 0, typeName }] });
    }
  };

  const changedLines = useMemo(
    () => Object.values(drafts).filter((d) => originalsRef.current[d.uniqueId] && !sameCustomization(d, originalsRef.current[d.uniqueId])),
    [drafts],
  );
  const changedKeys = useMemo(() => new Set(changedLines.map((d) => d.uniqueId)), [changedLines]);

  const handleDone = () => {
    if (changedLines.length > 0) onDone(changedLines);
    onClose();
  };

  // ── Keyboard: ↑ / ↓ move between cart lines, Esc closes ────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      // Capture phase + stopImmediatePropagation: the terminal's global shortcuts (usePosShortcuts) treat
      // Escape as "clear cart" — it must never reach them while this screen is open.
      if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); onClose(); return; }
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && cartItems.length > 0) {
        e.preventDefault();
        e.stopImmediatePropagation();
        const next = e.key === "ArrowDown"
          ? Math.min(cartItems.length - 1, activeIndex + 1)
          : Math.max(0, activeIndex - 1);
        const key = cartItems[next]?.uniqueId;
        if (key) selectLine(key);
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isOpen, cartItems, activeIndex, onClose, selectLine]);

  if (!isOpen) return null;

  const tabClass = (m: Mode) =>
    `h-9 px-4 sm:px-6 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all ${
      mode === m ? "bg-white text-[#49293e] shadow" : "text-white/70 hover:text-white hover:bg-white/10"
    }`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[90] bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" />

      {/* Drawer */}
      <div className="fixed inset-y-0 right-0 z-[100] w-full md:w-[94%] max-w-[1280px] bg-[#f8f9fb] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Header: title · Extras / Modifiers tabs · close */}
        <div className="bg-[#49293e] text-white px-4 sm:px-5 py-3 flex items-center gap-3 shrink-0 shadow-lg">
          <h2 className="flex-1 min-w-0 text-sm sm:text-base font-black uppercase tracking-[0.15em] text-white/90 truncate">
            Customise Order
          </h2>
          <div className="flex items-center gap-1 bg-white/10 rounded-xl p-1 shrink-0" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "extras"} className={tabClass("extras")} onClick={() => setMode("extras")}>
              ✦ Extras
            </button>
            <button type="button" role="tab" aria-selected={mode === "modifiers"} className={tabClass("modifiers")} onClick={() => setMode("modifiers")}>
              ⚙ Modifiers
            </button>
          </div>
          <div className="flex-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-lg bg-white/10 hover:bg-white/20 text-white font-black uppercase text-[10px] tracking-widest transition-all flex items-center gap-2 border border-white/20"
              tabIndex={-1}
            >
              <span className="hidden sm:inline">Close</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">

          {/* Type rail */}
          <div className="w-full md:w-40 shrink-0 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col overflow-hidden">
            <div className="hidden md:block px-3 py-2.5 border-b border-slate-100 bg-slate-50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">
                {mode === "extras" ? "Extra Types" : "Modifier Types"}
              </span>
            </div>
            <div className="flex md:flex-col flex-1 overflow-x-auto md:overflow-y-auto p-2 gap-2 md:gap-1.5">
              {types.length === 0 ? (
                <div className="flex items-center justify-center h-12 md:h-20 w-full opacity-40">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">No Types</span>
                </div>
              ) : (
                types.map((t, index) => (
                  <button
                    type="button"
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

          {/* Item grid */}
          <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
            {/* Target bar: which line a tap goes to */}
            <div className="shrink-0 px-3 md:px-4 py-2.5 bg-white border-b border-slate-200 flex items-center gap-2 min-w-0">
              <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 shrink-0">Adding to</span>
              {activeLine ? (
                <span className="min-w-0 inline-flex items-center gap-2 rounded-lg bg-[#ff9500] text-white px-3 py-1.5 shadow-sm">
                  <span className="text-[10px] font-black bg-white/25 rounded px-1.5 py-0.5 shrink-0">#{activeIndex + 1}</span>
                  <span className="text-[11px] font-black uppercase truncate">
                    {activeLine.product?.name || "Item"}{activeLine.variantName ? ` (${activeLine.variantName})` : ""}
                  </span>
                  <span className="text-[10px] font-black text-white/80 shrink-0">×{activeLine.quantity ?? 1}</span>
                </span>
              ) : (
                <span className="text-[11px] font-bold text-slate-400">Select a product on the right</span>
              )}
              <span className="hidden lg:inline ml-auto text-[9px] font-bold uppercase tracking-widest text-slate-300 shrink-0">
                Tap to add · tap again to remove · ↑ ↓ change product
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 md:p-4">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-slate-200 border-t-[#49293e] rounded-full animate-spin" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</span>
                  </div>
                </div>
              ) : items.length === 0 ? (
                <div className="flex h-full items-center justify-center opacity-40">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    No {mode === "extras" ? "extras" : "modifiers"} for this product
                  </span>
                </div>
              ) : (
                <div className="grid gap-2 md:gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {items.map((item, index) => {
                    const isSelected = isInActiveLine(item);
                    return (
                      <button
                        type="button"
                        key={item.id || index}
                        onClick={() => handleItemTap(item)}
                        disabled={!activeLine}
                        className={`relative h-[84px] md:h-[96px] rounded-xl text-[11px] font-black uppercase tracking-wide transition-all flex flex-col items-center justify-center text-center leading-tight px-2 border-2 active:scale-95 disabled:opacity-40 ${
                          isSelected
                            ? "bg-[#49293e] border-[#49293e] text-white shadow-lg shadow-[#49293e]/20"
                            : "bg-white border-slate-200 text-[#49293e] hover:border-[#49293e]/30 hover:shadow-md shadow-sm"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#ff9500] flex items-center justify-center">
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><path d="M20 6 9 17l-5-5" /></svg>
                          </div>
                        )}
                        <span className="line-clamp-2 break-words">{item.name}</span>
                        {mode === "extras" && (
                          <span className={`text-[10px] font-bold mt-1 ${isSelected ? "text-white/75" : "text-slate-400"}`}>
                            + {formatAmount(item.price)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Order panel: every cart line with its customisations */}
          <div className="w-full md:w-[340px] h-[42vh] md:h-auto shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden">
            <div className="bg-gradient-to-r from-[#1a3a5c] to-[#1e4d7b] px-3 py-2.5 shrink-0 flex items-center justify-between">
              <div>
                <p className="text-[8px] font-black uppercase tracking-[0.2em] text-white/50 leading-none mb-1">Order</p>
                <p className="text-[12px] font-black uppercase text-white leading-none">{cartItems.length} item{cartItems.length === 1 ? "" : "s"}</p>
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-white/50">Tap a product to select</span>
            </div>

            {/* Column header */}
            <div className="grid grid-cols-[28px_1fr_64px_72px] gap-1 px-3 py-1.5 bg-slate-50 border-b border-slate-200 text-[8px] font-black uppercase tracking-widest text-slate-400 shrink-0">
              <span>Qty</span><span>Description</span><span className="text-right">Price</span><span className="text-right">Amount</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              {cartItems.length === 0 ? (
                <div className="p-6 text-center text-[10px] font-black uppercase tracking-widest text-slate-300">Cart is empty</div>
              ) : cartItems.map((line, idx) => {
                const key = line.uniqueId;
                const d = drafts[key];
                const isActive = key === activeKey;
                const qty = line.quantity ?? 1;
                const price = Number(line.price ?? 0);
                const hasCustom = !!d && (d.extras.length + d.modifiers.length + d.messages.length) > 0;
                return (
                  <div
                    key={key}
                    ref={(el) => { lineRefs.current[key] = el; }}
                    onClick={() => selectLine(key)}
                    className={`border-b border-slate-100 border-l-4 cursor-pointer transition-colors ${
                      isActive ? "border-l-[#ff9500] bg-orange-50/70" : "border-l-transparent hover:bg-slate-50"
                    }`}
                  >
                    <div className="grid grid-cols-[28px_1fr_64px_72px] gap-1 items-center px-3 py-2">
                      <span className={`text-sm font-black ${isActive ? "text-[#ff9500]" : "text-slate-500"}`}>{qty}</span>
                      <span className="min-w-0 flex items-center gap-1.5">
                        <span className={`text-[11px] font-black uppercase truncate ${isActive ? "text-[#49293e]" : "text-slate-700"}`}>
                          {line.product?.name || "Item"}{line.variantName ? ` (${line.variantName})` : ""}
                        </span>
                        {changedKeys.has(key) && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-[#ff9500]" title="Changed (not saved yet)" />
                        )}
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 text-right">{formatAmount(price)}</span>
                      <span className="text-[10px] font-black text-slate-700 text-right">{formatAmount(price * qty)}</span>
                    </div>

                    {d && hasCustom && (
                      <div className="pb-2 pl-10 pr-3 space-y-1">
                        {d.extras.map((x) => (
                          <div key={`x-${x.id}-${x.typeId}`} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-[10px] font-bold uppercase text-blue-700 truncate">+ {x.name}</span>
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">{formatAmount(x.price * (x.qty || 1))}</span>
                            <RemoveButton label={x.name} onClick={() => updateDraft(key, (dd) => ({ ...dd, extras: dd.extras.filter((e) => !(e.id === x.id && e.typeId === x.typeId)) }))} />
                          </div>
                        ))}
                        {d.modifiers.map((m) => (
                          <div key={`m-${m.id}-${m.typeId}`} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-[10px] font-bold uppercase text-orange-700 truncate">* {formatModifierLabel(m.typeName, m.name)}</span>
                            <RemoveButton label={m.name} onClick={() => updateDraft(key, (dd) => ({ ...dd, modifiers: dd.modifiers.filter((e) => !(e.id === m.id && e.typeId === m.typeId)) }))} />
                          </div>
                        ))}
                        {d.messages.map((msg) => (
                          <div key={`n-${msg.name}`} className="flex items-center gap-2">
                            <span className="flex-1 min-w-0 text-[10px] font-bold uppercase text-purple-700 truncate">💬 {msg.name}</span>
                            <RemoveButton label={msg.name} onClick={() => updateDraft(key, (dd) => ({ ...dd, messages: dd.messages.filter((e) => e.name !== msg.name) }))} />
                          </div>
                        ))}
                      </div>
                    )}
                    {isActive && !hasCustom && (
                      <div className="pb-2 pl-10 pr-3 text-[9px] font-bold uppercase tracking-widest text-slate-300">
                        No extras or modifiers yet · line #{idx + 1}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 space-y-2 border-t border-slate-200 bg-slate-50 shrink-0">
              <button
                type="button"
                onClick={handleDone}
                className="w-full h-14 bg-[#ff9500] text-white font-black uppercase text-sm tracking-widest rounded-xl shadow-lg shadow-[#ff9500]/25 hover:bg-[#e68600] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                <span>Done{changedLines.length > 0 ? ` · ${changedLines.length} item${changedLines.length === 1 ? "" : "s"} changed` : ""}</span>
              </button>
              <button
                type="button"
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
