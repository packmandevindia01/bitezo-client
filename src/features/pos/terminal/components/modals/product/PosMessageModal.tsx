import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../../../../../../components/common";
import { X, Search } from "lucide-react";
import { menuApi } from "../../../../services/menuApi";
import { useCurrency } from "../../../../../../hooks/useCurrency";

type ExtrasItem   = { id: number; name: string; price: number; qty: number; typeId: number };
type ModifierItem = { id: number; name: string; qty: number; typeId: number };
type MessageItem  = { id?: number; name: string; qty?: number };

interface CartItem {
  uniqueId: string;
  productId: number;
  variantName?: string;
  product?: { name: string };
  messages?: MessageItem[];
}

interface PosMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  selectedKey: string | null;
  onSelectRow?: (key: string) => void;
  initialExtras: ExtrasItem[];
  initialModifiers: ModifierItem[];
  initialMessages: MessageItem[];
  onDone: (extras: ExtrasItem[], modifiers: ModifierItem[], messages: MessageItem[]) => void;
}

export const PosMessageModal: React.FC<PosMessageModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  selectedKey,
  initialExtras,
  initialModifiers,
  initialMessages,
  onDone,
}) => {
  const { formatAmount } = useCurrency();
  const [presets, setPresets] = useState<{ id: number; name: string }[]>([]);
  const [text, setText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Three independent selection arrays
  const [extrasSelections,    setExtrasSelections]    = useState<ExtrasItem[]>([]);
  const [modifiersSelections, setModifiersSelections] = useState<ModifierItem[]>([]);
  const [messagesSelections,  setMessagesSelections]  = useState<MessageItem[]>([]);

  const currentItem = cartItems.find(item => item.uniqueId === selectedKey);
  const itemName = currentItem?.product?.name || "OPEN ITEM";

  useEffect(() => {
    if (isOpen) {
      const initial = (initialMessages || [])
        .map((s: any) => (typeof s === "string" ? s : s.name))
        .join(", ");
      setText(initial || "");
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      setExtrasSelections(initialExtras || []);
      setModifiersSelections(initialModifiers || []);
      setMessagesSelections(initialMessages || []);
      fetchPresets();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 150);
    }
  }, [isOpen, selectedKey]);

  const fetchPresets = async () => {
    try {
      const data = await menuApi.getMessages();
      setPresets(data);
    } catch (err) {
      console.error("[PosMessageModal] Failed to fetch presets:", err);
    }
  };

  const suggestions = presets.filter(p =>
    text.trim() &&
    p.name.toLowerCase().includes(text.toLowerCase().trim()) &&
    p.name.toLowerCase().trim() !== text.toLowerCase().trim()
  );

  const handleKeyPress = (char: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart ?? text.length;
    const end   = inputRef.current.selectionEnd ?? text.length;
    const newText = text.slice(0, start) + char.toLowerCase() + text.slice(end);
    setText(newText);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(start + 1, start + 1);
      }
    }, 0);
  };

  const handleBackspace = () => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart ?? text.length;
    const end   = inputRef.current.selectionEnd ?? text.length;
    let newText = text, newPos = start;
    if (start === end) {
      if (start > 0) { newText = text.slice(0, start - 1) + text.slice(end); newPos = start - 1; }
    } else {
      newText = text.slice(0, start) + text.slice(end); newPos = start;
    }
    setText(newText);
    setIsDropdownOpen(true);
    setHighlightedIndex(-1);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleSelectSuggestion = (suggestionName: string) => {
    setText(suggestionName);
    setIsDropdownOpen(false);
    setHighlightedIndex(-1);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(suggestionName.length, suggestionName.length);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    // Build final messages list
    let finalMessages: MessageItem[] = messagesSelections;
    if (trimmed) {
      // Check if it already exists in presets — reuse its real ID
      const existing = presets.find(p => p.name.toLowerCase() === trimmed.toLowerCase());
      let resolvedId: number | undefined;
      if (existing) {
        resolvedId = existing.id;
      } else {
        // Create it and get the real ID back so modifierId is valid when order is submitted
        try {
          const created = await menuApi.createMessage(trimmed);
          resolvedId = created?.id;
          // Refresh presets so it shows up next time
          fetchPresets();
        } catch (e) {
          console.error("Failed to auto-save preset:", e);
        }
      }
      finalMessages = [{ id: resolvedId, name: trimmed }];
    }
    onDone(extrasSelections, modifiersSelections, finalMessages);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (isDropdownOpen && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSelectSuggestion(suggestions[highlightedIndex].name);
      } else {
        handleSubmit();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isDropdownOpen) setIsDropdownOpen(true);
      setHighlightedIndex(prev => (prev + 1 < suggestions.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      if (isDropdownOpen) setIsDropdownOpen(false);
      else onClose();
    }
  };

  // ── Remove helpers (always active in Messages modal too) ──────────────────
  const removeExtra    = (uniqueKey: string) => setExtrasSelections(prev => prev.filter(i => `${i.id}-${i.typeId}` !== uniqueKey));
  const removeModifier = (uniqueKey: string) => setModifiersSelections(prev => prev.filter(i => `${i.id}-${i.typeId}` !== uniqueKey));
  const removeMessage  = (name: string)       => {
    setMessagesSelections(prev => prev.filter(m => m.name !== name));
    if (text === name) setText("");
  };

  const totalCustomisations = extrasSelections.length + modifiersSelections.length + messagesSelections.length;

  // Keyboard rows
  const row1 = ["0","1","2","3","4","5","6","7","8","9"];
  const row2 = ["Q","W","E","R","T","Y","U","I","O","P"];
  const row3 = ["A","S","D","F","G","H","J","K","L","."];
  const row4Letters = ["Z","X","C","V","B","N","M"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      noPadding
      showClose={false}
      className="border-2 border-[#1a233a] shadow-2xl rounded-none overflow-hidden max-w-[1020px] w-[98%]"
    >
      <div className="bg-[#eef1f6] select-none flex flex-col md:flex-row" style={{ maxHeight: "92vh" }}>

        {/* ── Left: Keyboard Panel ─────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-[#1a233a] text-white h-12 px-4 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-black">■</span>
              <span className="text-sm font-black uppercase tracking-wider text-white truncate max-w-[240px]">{itemName}</span>
            </div>
            <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">MESSAGES</h2>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer" tabIndex={-1}>
              <X size={22} strokeWidth={3} />
            </button>
          </div>

          {/* Input + Suggestion */}
          <div className="p-4 pb-2 bg-[#eef1f6]">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={text}
                placeholder="Type message..."
                onChange={e => { setText(e.target.value); setIsDropdownOpen(true); setHighlightedIndex(-1); }}
                onFocus={() => { if (text.trim()) setIsDropdownOpen(true); }}
                onKeyDown={handleKeyDown}
                className="w-full h-12 px-4 border-2 border-[#5c8ab5] bg-white text-lg font-bold text-center text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1a233a] shadow-inner"
              />
              {text && (
                <button type="button" onClick={() => { setText(""); setIsDropdownOpen(false); inputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer">
                  <X size={18} />
                </button>
              )}
            </div>

            {/* In-flow suggestion bar */}
            {isDropdownOpen && suggestions.length > 0 && (
              <div className="mt-2 bg-white border border-[#1a233a] shadow-sm">
                <div className="px-3 py-1 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between items-center">
                  <span>Matching Previous Messages</span>
                  <span className="text-[9px] text-[#ff9500] font-bold">Tap to select & fill</span>
                </div>
                <div className="max-h-24 overflow-y-auto divide-y divide-slate-100">
                  {suggestions.slice(0, 2).map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectSuggestion(item.name)}
                      className={`w-full px-4 py-2 text-left text-sm font-bold flex items-center justify-between transition-colors cursor-pointer ${
                        highlightedIndex === idx ? "bg-[#1a233a] text-white" : "text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <span>{item.name}</span>
                      <Search size={14} className={highlightedIndex === idx ? "text-white/60" : "text-slate-400"} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Touch Keyboard */}
          <div className="px-4 pb-4 pt-2 space-y-2">
            {/* Numbers */}
            <div className="grid grid-cols-10 gap-1.5">
              {row1.map(char => (
                <button key={char} type="button" onClick={() => handleKeyPress(char)} tabIndex={-1}
                  className="h-11 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm">
                  {char}
                </button>
              ))}
            </div>
            {/* Q–P */}
            <div className="grid grid-cols-10 gap-1.5">
              {row2.map(char => (
                <button key={char} type="button" onClick={() => handleKeyPress(char)} tabIndex={-1}
                  className="h-11 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm">
                  {char}
                </button>
              ))}
            </div>
            {/* A–. */}
            <div className="grid grid-cols-10 gap-1.5">
              {row3.map(char => (
                <button key={char} type="button" onClick={() => handleKeyPress(char)} tabIndex={-1}
                  className="h-11 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm">
                  {char}
                </button>
              ))}
            </div>
            {/* Z–M + Enter + BackSpace */}
            <div className="grid grid-cols-10 gap-1.5">
              {row4Letters.map(char => (
                <button key={char} type="button" onClick={() => handleKeyPress(char)} tabIndex={-1}
                  className="col-span-1 h-11 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm">
                  {char}
                </button>
              ))}
              <button type="button" onClick={handleSubmit} tabIndex={-1}
                className="col-span-2 h-11 bg-[#1a233a] hover:bg-[#121929] text-white font-black text-sm flex items-center justify-center shadow-md active:scale-[0.97] transition-all cursor-pointer border border-[#1a233a] rounded-sm">
                Enter
              </button>
              <button type="button" onClick={handleBackspace} tabIndex={-1}
                className="col-span-1 h-11 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-[10px] leading-tight flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm p-0.5">
                <span>Back</span><span>Space</span>
              </button>
            </div>
            {/* Space */}
            <button type="button" onClick={() => handleKeyPress(" ")} tabIndex={-1}
              className="w-full h-10 bg-[#e2e8f0] hover:bg-white border border-[#cbd5e1] text-slate-400 font-bold text-xs flex items-center justify-center shadow-sm transition-all cursor-pointer rounded-sm">
              <span className="text-[11px] tracking-widest uppercase opacity-40">Space</span>
            </button>
          </div>
        </div>

        {/* ── Right Panel: Unified Customisations Summary ─────────────────── */}
        <div className="w-full md:w-64 shrink-0 bg-white border-t md:border-t-0 md:border-l border-slate-200 flex flex-col overflow-hidden">

          {/* Header */}
          <div className="px-3 py-2.5 bg-[#1a233a] shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-white/80">Customisations</span>
              <span className="text-[10px] font-black bg-[#ff9500] text-white rounded-full px-2 py-0.5">{totalCustomisations}</span>
            </div>
          </div>

          {/* Summary list */}
          <div className="flex-1 overflow-y-auto">

            {/* ── Extras ── */}
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
                  return (
                    <div key={uniqueKey} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition-all">
                      <span className="text-sm font-black min-w-[20px] text-center text-slate-400">{item.qty}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black uppercase truncate text-slate-700">{item.name}</p>
                        <p className="text-[8px] font-bold text-slate-400">@ {formatAmount(item.price)}</p>
                      </div>
                      <button onClick={() => removeExtra(uniqueKey)}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95" title="Remove">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Modifiers ── */}
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
                  return (
                    <div key={uniqueKey} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition-all">
                      <span className="text-sm font-black min-w-[20px] text-center text-slate-400">{item.qty}</span>
                      <p className="flex-1 text-[10px] font-black uppercase truncate text-slate-700">{item.name}</p>
                      <button onClick={() => removeModifier(uniqueKey)}
                        className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95" title="Remove">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* ── Messages ── */}
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
                messagesSelections.map(msg => (
                  <div key={`msg-${msg.name}`} className="flex items-center gap-2 px-3 py-2 border-b border-slate-50 hover:bg-slate-50 transition-all">
                    <p className="flex-1 text-[10px] font-black uppercase truncate text-purple-800">💬 {msg.name}</p>
                    <button onClick={() => removeMessage(msg.name)}
                      className="w-6 h-6 rounded-full bg-red-100 hover:bg-red-500 text-red-500 hover:text-white flex items-center justify-center transition-all shrink-0 active:scale-95" title="Remove">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>

      </div>
    </Modal>
  );
};
