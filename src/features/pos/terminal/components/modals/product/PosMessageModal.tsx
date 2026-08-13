import React, { useState, useEffect, useRef } from "react";
import { Modal } from "../../../../../../components/common";
import { X, Search } from "lucide-react";
import { menuApi } from "../../../../services/menuApi";

interface CartItem {
  uniqueId: string;
  productId: number;
  variantName?: string;
  product?: {
    name: string;
  };
  messages?: { id?: number; name: string }[];
}

interface PosMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  selectedKey: string | null;
  onSelectRow?: (key: string) => void;
  initialSelections: any[];
  onDone: (selections: any[]) => void;
}

export const PosMessageModal: React.FC<PosMessageModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  selectedKey,
  initialSelections,
  onDone,
}) => {
  const [presets, setPresets] = useState<{ id: number; name: string }[]>([]);
  const [text, setText] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = cartItems.find((item) => item.uniqueId === selectedKey);
  const itemName = currentItem?.product?.name || "OPEN ITEM";

  useEffect(() => {
    if (isOpen) {
      const initial = (initialSelections || [])
        .map((s: any) => (typeof s === "string" ? s : s.name))
        .join(", ");
      setText(initial || "");
      setIsDropdownOpen(false);
      setHighlightedIndex(-1);
      fetchPresets();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.setSelectionRange(inputRef.current.value.length, inputRef.current.value.length);
        }
      }, 150);
    }
  }, [isOpen, selectedKey, initialSelections]);

  const fetchPresets = async () => {
    try {
      const data = await menuApi.getMessages();
      setPresets(data);
    } catch (err) {
      console.error("[PosMessageModal] Failed to fetch presets:", err);
    }
  };

  // Filtered matching suggestions
  const suggestions = presets.filter((p) =>
    !text.trim() || p.name.toLowerCase().includes(text.toLowerCase().trim())
  );

  const handleKeyPress = (char: string) => {
    if (!inputRef.current) return;
    const start = inputRef.current.selectionStart ?? text.length;
    const end = inputRef.current.selectionEnd ?? text.length;
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
    const end = inputRef.current.selectionEnd ?? text.length;

    let newText = text;
    let newPos = start;

    if (start === end) {
      if (start > 0) {
        newText = text.slice(0, start - 1) + text.slice(end);
        newPos = start - 1;
      }
    } else {
      newText = text.slice(0, start) + text.slice(end);
      newPos = start;
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
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.setSelectionRange(suggestionName.length, suggestionName.length);
    }
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onDone([]);
      onClose();
      return;
    }

    // Save as preset message if it's new
    const existing = presets.find((p) => p.name.toLowerCase() === trimmed.toLowerCase());
    if (!existing) {
      try {
        menuApi.createMessage(trimmed);
      } catch (e) {
        console.error("Failed to auto-save preset:", e);
      }
    }

    // Format and return
    onDone([{ id: 1, name: trimmed }]);
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
      setHighlightedIndex((prev) => (prev + 1 < suggestions.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Escape") {
      if (isDropdownOpen) {
        setIsDropdownOpen(false);
      } else {
        onClose();
      }
    }
  };

  // Keyboard layout definition matching user screenshot
  const row1 = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const row2 = ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"];
  const row3 = ["A", "S", "D", "F", "G", "H", "J", "K", "L", "."];
  const row4Letters = ["Z", "X", "C", "V", "B", "N", "M"];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="xl"
      noPadding
      showClose={false}
      className="border-2 border-[#1a233a] shadow-2xl rounded-none overflow-hidden max-w-[840px] w-[95%]"
    >
      <div ref={containerRef} className="bg-[#eef1f6] select-none flex flex-col">
        
        {/* Top Header Bar */}
        <div className="bg-[#1a233a] text-white h-12 px-4 flex justify-between items-center shrink-0 border-b border-black/20">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-black">■</span>
            <span className="text-sm font-black uppercase tracking-wider text-white truncate max-w-[280px]">
              {itemName}
            </span>
          </div>

          <h2 className="text-base font-black uppercase tracking-[0.15em] text-white">
            MESSAGES
          </h2>

          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-white/90 hover:text-white font-black text-xl hover:bg-white/10 rounded transition-colors cursor-pointer"
            tabIndex={-1}
            title="Close"
          >
            <X size={22} strokeWidth={3} />
          </button>
        </div>

        {/* Input Area with Autocomplete Dropdown */}
        <div className="p-4 bg-[#eef1f6] relative">
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={text}
              placeholder="Type message or select below..."
              onChange={(e) => {
                setText(e.target.value);
                setIsDropdownOpen(true);
                setHighlightedIndex(-1);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              onKeyDown={handleKeyDown}
              className="w-full h-12 px-4 border-2 border-[#5c8ab5] bg-white text-lg font-bold text-center text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1a233a] shadow-inner"
            />
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  setIsDropdownOpen(true);
                  inputRef.current?.focus();
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Autocomplete Suggestions Dropdown */}
          {isDropdownOpen && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 top-[68px] z-50 bg-white border-2 border-[#1a233a] shadow-2xl max-h-48 overflow-y-auto">
              <div className="px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between items-center">
                <span>Matching Previous Messages ({suggestions.length})</span>
                <span>Click to fill</span>
              </div>
              {suggestions.map((item, idx) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSuggestion(item.name)}
                  className={`w-full px-4 py-2.5 text-left text-sm font-bold flex items-center justify-between transition-colors border-b border-slate-100 last:border-0 cursor-pointer ${
                    highlightedIndex === idx
                      ? "bg-[#1a233a] text-white"
                      : "text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{item.name}</span>
                  <Search size={14} className={highlightedIndex === idx ? "text-white/60" : "text-slate-400"} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Dedicated Touch Keyboard (Exact Match to Screenshot) */}
        <div className="px-4 pb-4 space-y-2">
          
          {/* Row 1: Numbers 0 to 9 */}
          <div className="grid grid-cols-10 gap-1.5">
            {row1.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="h-12 sm:h-13 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base sm:text-lg flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm"
                tabIndex={-1}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 2: Q to P */}
          <div className="grid grid-cols-10 gap-1.5">
            {row2.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="h-12 sm:h-13 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base sm:text-lg flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm"
                tabIndex={-1}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 3: A to L and Dot */}
          <div className="grid grid-cols-10 gap-1.5">
            {row3.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="h-12 sm:h-13 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base sm:text-lg flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm"
                tabIndex={-1}
              >
                {char}
              </button>
            ))}
          </div>

          {/* Row 4: Z to M + Enter + BackSpace */}
          <div className="grid grid-cols-10 gap-1.5">
            {row4Letters.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                className="col-span-1 h-12 sm:h-13 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-base sm:text-lg flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm"
                tabIndex={-1}
              >
                {char}
              </button>
            ))}

            {/* Enter Button (Spans 2 columns, dark navy) */}
            <button
              type="button"
              onClick={handleSubmit}
              className="col-span-2 h-12 sm:h-13 bg-[#1a233a] hover:bg-[#121929] active:bg-[#0c101b] text-white font-black text-sm sm:text-base flex items-center justify-center shadow-md active:scale-[0.97] transition-all cursor-pointer border border-[#1a233a] rounded-sm"
              tabIndex={-1}
            >
              Enter
            </button>

            {/* Back Space Button (Spans 1 column) */}
            <button
              type="button"
              onClick={handleBackspace}
              className="col-span-1 h-12 sm:h-13 bg-[#f8f9fb] hover:bg-white active:bg-slate-200 border border-[#cbd5e1] text-[#1e293b] font-bold text-[11px] sm:text-xs leading-tight flex flex-col items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer rounded-sm p-0.5"
              tabIndex={-1}
            >
              <span>Back</span>
              <span>Space</span>
            </button>
          </div>

          {/* Row 5: Full Width Space Bar */}
          <div>
            <button
              type="button"
              onClick={() => handleKeyPress(" ")}
              className="w-full h-11 sm:h-12 bg-[#e2e8f0] hover:bg-white active:bg-slate-300 border border-[#cbd5e1] text-slate-400 font-bold text-xs flex items-center justify-center shadow-sm active:scale-[0.99] transition-all cursor-pointer rounded-sm"
              tabIndex={-1}
              title="Space"
            >
              <span className="text-[11px] tracking-widest uppercase opacity-40">Space</span>
            </button>
          </div>

        </div>

      </div>
    </Modal>
  );
};
