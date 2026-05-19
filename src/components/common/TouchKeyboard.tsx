import React, { useState, useEffect, useRef } from "react";
import { X, Delete, ChevronUp, Space, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import { handleFocusNextInput } from "../../utils/keyboard";

interface TouchKeyboardProps {
  onInput?: (value: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
  onClose?: () => void;
  layout?: "qwerty" | "numeric" | "symbols";
  size?: "sm" | "md";
  embedded?: boolean;
}

export const TouchKeyboard = ({
  onInput,
  onBackspace,
  onClear,
  onClose,
  layout: initialLayout,
  size = "md",
  embedded = false,
}: TouchKeyboardProps) => {
  const [currentLayout, setCurrentLayout] = useState<"qwerty" | "numeric" | "symbols">(
    initialLayout || "qwerty"
  );
  const [isCaps, setIsCaps] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});

  const backspaceTimeoutRef = useRef<any>(null);
  const backspaceIntervalRef = useRef<any>(null);

  // 1. Intelligent Auto-Layout Detection based on focused Input Field attributes
  useEffect(() => {
    const handleFocusChange = () => {
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.getAttribute("role") === "combobox")
      ) {
        const name = (activeEl.getAttribute("name") || activeEl.id || activeEl.getAttribute("placeholder") || "").toLowerCase();
        const type = (activeEl.getAttribute("type") || "").toLowerCase();
        const inputMode = (activeEl.getAttribute("inputmode") || "").toLowerCase();

        // Keywords associated with numbers, codes, quantities, and cash
        const isNumField =
          type === "number" ||
          type === "tel" ||
          inputMode === "numeric" ||
          inputMode === "tel" ||
          /\b(no|mobile|phone|road|block|flat|building|qty|quantity|price|cost|amount|vat|disc|discount|rate|total|balance)\b/i.test(name);

        if (isNumField) {
          setCurrentLayout("numeric");
        } else {
          setCurrentLayout("qwerty");
        }
      }
    };

    window.addEventListener("focusin", handleFocusChange);
    handleFocusChange(); // Check immediately on mount

    return () => {
      window.removeEventListener("focusin", handleFocusChange);
    };
  }, []);

  // Global listener for physical keydown events to intercept physical "Enter"
  useEffect(() => {
    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
        const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");
        
        // Exclude searchable select inputs, dropdown portals, and search filters from auto-focus navigation
        const placeholder = (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) 
          ? (activeEl.placeholder || "").toLowerCase() 
          : "";
        const isSearchSelectInput = activeEl && (
          activeEl.closest(".select-portal-content") ||
          placeholder.includes("search") ||
          placeholder.includes("filter") ||
          activeEl.getAttribute("role") === "combobox"
        );

        // Only intercept if we are currently typing inside an input/textarea inside the active modal/form
        if (isInput && !activeEl.readOnly && !activeEl.disabled && !isSearchSelectInput) {
          // If it's a textarea, let it normal enter (newline) unless Shift is pressed
          if (activeEl.tagName === "TEXTAREA" && !e.shiftKey) {
            return;
          }
          
          e.preventDefault();
          e.stopPropagation();
          
          // Smart focus navigation
          handleFocusNextInput(activeEl);
        }
      }
    };

    window.addEventListener("keydown", handlePhysicalKeyDown, true); // Intercept in capture phase
    return () => {
      window.removeEventListener("keydown", handlePhysicalKeyDown, true);
    };
  }, []);

  // Keyboard Layout Configurations
  const qwertyLayout = [
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "."],
    ["z", "x", "c", "v", "b", "n", "m", "Enter"],
    ["123", "Space", "Back Space", "Close"],
  ];

  const symbolLayout = [
    ["[", "]", "{", "}", "(", ")", "<", ">", "_", "-"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "+", "="],
    ["~", "`", "|", "\\", ":", ";", "\"", "'", "?", "/"],
    ["ABC", "Space", "Back Space", "Close"],
  ];

  const numericLayout = [
    ["7", "8", "9", "Back Space"],
    ["4", "5", "6", "Clear"],
    ["1", "2", "3", "Enter"],
    ["0", ".", "ABC", "Close"],
  ];

  // Note: handleFocusNextInput is now imported from src/utils/keyboard.ts to ensure consistent behavior across inputs and dropdowns.

  // Centralized action handlers
  const handleBackspaceAction = () => {
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (!isInput) {
      onBackspace?.();
      return;
    }

    const start = activeEl.selectionStart ?? 0;
    const end = activeEl.selectionEnd ?? 0;
    const val = activeEl.value;

    let newVal = val;
    let newCursorPos = start;

    if (start === end) {
      if (start > 0) {
        newVal = val.slice(0, start - 1) + val.slice(start);
        newCursorPos = start - 1;
      }
    } else {
      newVal = val.slice(0, start) + val.slice(end);
      newCursorPos = start;
    }

    triggerReactOnChange(activeEl, newVal, newCursorPos);
  };

  const handleClearAction = () => {
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (!isInput) {
      onClear?.();
      return;
    }

    triggerReactOnChange(activeEl, "", 0);
  };

  const handleEnterAction = () => {
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    if (activeEl) {
      // Exclude searchable select inputs, dropdown portals, and search filters from auto-focus navigation
      const placeholder = (activeEl instanceof HTMLInputElement || activeEl instanceof HTMLTextAreaElement) 
        ? (activeEl.placeholder || "").toLowerCase() 
        : "";
      const isSearchSelectInput = 
        activeEl.closest(".select-portal-content") ||
        placeholder.includes("search") ||
        placeholder.includes("filter") ||
        activeEl.getAttribute("role") === "combobox";

      if (isSearchSelectInput) {
        // Just fire the Enter key events to select highlighted item, do NOT shift focus
        const enterDown = new KeyboardEvent("keydown", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
        });
        activeEl.dispatchEvent(enterDown);

        const enterUp = new KeyboardEvent("keyup", {
          key: "Enter",
          code: "Enter",
          keyCode: 13,
          which: 13,
          bubbles: true,
        });
        activeEl.dispatchEvent(enterUp);
        return;
      }

      // Fire native Enter key events for forms & lookups
      const enterDown = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      activeEl.dispatchEvent(enterDown);

      const enterUp = new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
      });
      activeEl.dispatchEvent(enterUp);

      // Smart navigation to next field
      handleFocusNextInput(activeEl);
    }
  };

  // Helper to programmatically update React controlled input values and trigger standard onChange events
  const triggerReactOnChange = (activeEl: HTMLInputElement | HTMLTextAreaElement, newVal: string, newCursorPos: number) => {
    const setter =
      activeEl.tagName === "TEXTAREA"
        ? Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set
        : Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;

    if (setter) {
      setter.call(activeEl, newVal);
      // Dispatch standard input event to update React state
      const inputEvt = new Event("input", { bubbles: true });
      activeEl.dispatchEvent(inputEvt);
      // Dispatch change event in case listeners rely on it
      const changeEvt = new Event("change", { bubbles: true });
      activeEl.dispatchEvent(changeEvt);
    } else {
      activeEl.value = newVal;
    }

    // Retain focus and set precise cursor positioning
    activeEl.focus();
    setTimeout(() => {
      activeEl.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Core handler for key presses. Triggered onPointerDown to eliminate the 300ms mobile touch delay
  const handleKeyTouchStart = (key: string, event: React.PointerEvent) => {
    // CRITICAL: Prevent default behavior to keep focus on the active input element
    event.preventDefault();

    // Trigger fast visual key feedback
    setPressedKeys((prev) => ({ ...prev, [key]: true }));

    // Handle special long-press eraser for Backspace
    if (key === "Back" || key === "Back Space") {
      startBackspaceRepeater();
      return;
    }

    // Direct input targeting and cursor insertion
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (key === "Shift") {
      setIsCaps((c) => !c);
      return;
    }

    if (key === "123") {
      setCurrentLayout("numeric");
      return;
    }

    if (key === "ABC") {
      setCurrentLayout("qwerty");
      return;
    }

    if (key === "Symbols") {
      setCurrentLayout("symbols");
      return;
    }

    if (key === "Clear") {
      handleClearAction();
      return;
    }

    if (key === "Enter") {
      handleEnterAction();
      return;
    }

    if (key === "Close" || key === "Done") {
      onClose?.();
      return;
    }

    // Text character insertion
    if (!isInput) {
      // Fallback if no active input is detected
      const char = key === "Space" ? " " : isCaps ? key.toUpperCase() : key;
      onInput?.(char);
      return;
    }

    const start = activeEl.selectionStart ?? 0;
    const end = activeEl.selectionEnd ?? 0;
    const val = activeEl.value;

    const char = key === "Space" ? " " : isCaps ? key.toUpperCase() : key;
    const newVal = val.slice(0, start) + char + val.slice(end);
    const newCursorPos = start + char.length;

    triggerReactOnChange(activeEl, newVal, newCursorPos);

    // If shift was on, reset it after typing a letter (standard mobile keyboard layout behavior)
    if (isCaps && key !== "Space") {
      setIsCaps(false);
    }
  };

  const handleKeyTouchEnd = (key: string) => {
    // Clear visual active key states
    setTimeout(() => {
      setPressedKeys((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }, 80);

    if (key === "Back" || key === "Back Space") {
      stopBackspaceRepeater();
    }
  };

  // Backspace Long-Press Repeaters
  const startBackspaceRepeater = () => {
    handleBackspaceAction();
    stopBackspaceRepeater();

    backspaceTimeoutRef.current = setTimeout(() => {
      backspaceIntervalRef.current = setInterval(() => {
        handleBackspaceAction();
      }, 75); // Quick repeat interval for rapid erasing
    }, 450); // Initial hold delay
  };

  const stopBackspaceRepeater = () => {
    if (backspaceTimeoutRef.current) {
      clearTimeout(backspaceTimeoutRef.current);
      backspaceTimeoutRef.current = null;
    }
    if (backspaceIntervalRef.current) {
      clearInterval(backspaceIntervalRef.current);
      backspaceIntervalRef.current = null;
    }
  };

  // Clean timers on component unmount
  useEffect(() => {
    return () => stopBackspaceRepeater();
  }, []);

  // Determine current active layout array
  const activeRows =
    currentLayout === "numeric"
      ? numericLayout
      : currentLayout === "symbols"
      ? symbolLayout
      : qwertyLayout;

  const isCompact = size === "sm";
  const showHeader = !isCompact && !embedded;

  return (
    <div
      className={`
        w-full select-none transition-all duration-300 ease-out
        ${embedded ? "" : `
          bg-gradient-to-b from-[#2c1924] to-[#170c12]
          border border-white/10
          shadow-[0_20px_50px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,255,255,0.06)]
          ${isCompact ? "rounded-xl p-1.5" : "rounded-2xl p-3 sm:p-4"}
        `}
      `}
      style={{
        fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        touchAction: "none", // Prevent accidental double-tap browser zoom
      }}
    >
      {/* Upper Panel details / decoration */}
      {showHeader && (
        <div className="flex items-center justify-between mb-2.5 px-1 shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#ff5f57] opacity-80" />
              <span className="w-2 h-2 rounded-full bg-[#ffbd2e] opacity-80" />
              <span className="w-2 h-2 rounded-full bg-[#28ca41] opacity-80" />
            </div>
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-white/30 ml-1.5 flex items-center gap-1">
              <Sparkles size={8} className="text-amber-500/50 animate-pulse" />
              POS SMART KEYBOARD
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Status indicators */}
            <span className="text-[8px] font-black uppercase text-white/20 tracking-wider">
              Layout: {currentLayout}
            </span>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onClose?.();
              }}
              className="
                w-7 h-7 flex items-center justify-center rounded-lg
                bg-white/5 hover:bg-white/10 active:bg-white/20
                text-white/40 hover:text-white/80
                transition-all duration-150 border border-white/5
              "
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Grid of keys */}
      <div className={`flex flex-col ${isCompact ? "gap-1" : "gap-1.5 sm:gap-2"}`}>
        {activeRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5 w-full">
            {row.map((key) => {
              const isSpecial = ["Shift", "Back", "Back Space", "Clear", "Space", "Enter", "Close", "Symbols", "ABC", "123"].includes(key);
              const isActive = !!pressedKeys[key];
              const isShiftOn = key === "Shift" && isCaps;

              // Grid sizing configurations for standard POS layouts
              let flexClass = "flex-1";
              if (currentLayout !== "numeric") {
                if (key === "Shift" || key === "Back" || key === "Back Space" || key === "Clear") flexClass = "flex-[1.4]";
                if (key === "Space") flexClass = "flex-[4.5]";
                if (key === "Back Space") flexClass = "flex-[3]";
                if (key === "Enter") flexClass = "flex-[2.5]";
                if (key === "Close") flexClass = "flex-[1]";
                if (key === "123" || key === "ABC" || key === "Symbols") flexClass = "flex-[1.5]";
              } else {
                // Numeric layout adjustments
                if (key === "Back" || key === "Back Space" || key === "Clear" || key === "Enter") flexClass = "flex-[1.1]";
                if (key === "Close" || key === "ABC") flexClass = "flex-[1.1]";
              }

              // Height class matching standard touch billing counter ergonomic preferences
              const hClass = isCompact 
                ? "h-9" 
                : currentLayout === "numeric" 
                  ? "h-14 sm:h-16" 
                  : "h-11 sm:h-12.5 md:h-13.5";

              // Color styles matching the Backoffice Crimson/Maroon design rules
              let bgClass = "";
              let textClass = "";
              let borderClass = "";
              let shadowClass = "";

              if (isShiftOn) {
                bgClass = "bg-[#a6152f]";
                textClass = "text-white";
                borderClass = "border-[#cf1837]";
                shadowClass = "shadow-[0_2px_0_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.22)]";
              } else if (key === "Enter") {
                bgClass = isActive
                  ? "bg-[#8a1329]"
                  : "bg-gradient-to-b from-[#a6152f] to-[#800f22]";
                textClass = "text-white font-bold";
                borderClass = "border-[#c41634]/70";
                shadowClass = "shadow-[0_3px_0_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.22)]";
              } else if (key === "Close") {
                bgClass = isActive
                  ? "bg-[#1f121a]"
                  : "bg-gradient-to-b from-[#3b2231] to-[#2c1824]";
                textClass = "text-white/80 font-black";
                borderClass = "border-white/5";
                shadowClass = "shadow-[0_2px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.08)]";
              } else if (isSpecial) {
                bgClass = isActive
                  ? "bg-[#150a10]"
                  : "bg-gradient-to-b from-[#2e1c27] to-[#21131c]";
                textClass = "text-white/60 font-semibold";
                borderClass = "border-white/5";
                shadowClass = "shadow-[0_2px_0_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]";
              } else {
                // Alpha-numeric standard key
                bgClass = isActive
                  ? "bg-[#180e14]"
                  : "bg-gradient-to-b from-[#472a3e] to-[#361e2e]";
                textClass = "text-white/90";
                borderClass = "border-white/10";
                shadowClass = "shadow-[0_2.5px_0_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.1)]";
              }

              return (
                <button
                  key={key}
                  onPointerDown={(e) => handleKeyTouchStart(key, e)}
                  onPointerUp={() => handleKeyTouchEnd(key)}
                  onPointerLeave={() => handleKeyTouchEnd(key)}
                  className={`
                    ${flexClass} ${hClass}
                    min-w-0 select-none
                    flex items-center justify-center
                    rounded-xl border
                    ${bgClass} ${textClass}
                    ${shadowClass} ${borderClass}
                    transition-all duration-75
                    ${isActive ? "scale-95 translate-y-[2px]" : ""}
                    focus:outline-none focus:ring-0
                    cursor-pointer
                    overflow-hidden
                    ${isCompact ? "text-xs" : "text-sm sm:text-base"}
                  `}
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "none",
                  }}
                >
                  {key === "Back" || key === "Back Space" ? (
                    <div className="flex items-center gap-1.5 text-white/80">
                      <Delete
                        size={isCompact ? 14 : currentLayout === "numeric" ? 22 : 18}
                        strokeWidth={2.2}
                      />
                      {key === "Back Space" && !isCompact && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Back Space</span>
                      )}
                    </div>
                  ) : key === "Shift" ? (
                    <ChevronUp
                      size={isCompact ? 14 : 18}
                      strokeWidth={3}
                      className={isCaps ? "text-white animate-bounce" : "text-white/60"}
                    />
                  ) : key === "Space" ? (
                    <div className="flex items-center gap-1.5 text-white/40">
                      <div className="h-[2px] flex-1 max-w-[20px] rounded-full bg-white/10" />
                      <Space size={13} className="opacity-60" />
                      <div className="h-[2px] flex-1 max-w-[20px] rounded-full bg-white/10" />
                    </div>
                  ) : key === "Clear" ? (
                    <span className={`${isCompact ? "text-[8px]" : "text-[10px] sm:text-[11px]"} font-black tracking-wider uppercase text-amber-500/80`}>
                      Clear
                    </span>
                  ) : key === "Enter" ? (
                    <div className="flex items-center gap-1">
                      <CornerDownLeft size={isCompact ? 11 : 14} strokeWidth={2.5} />
                      <span className={`${isCompact ? "text-[9px]" : "text-[10px] sm:text-[11px]"} font-bold tracking-wider uppercase`}>
                        Enter
                      </span>
                    </div>
                  ) : key === "Close" ? (
                    <div className="flex items-center gap-1">
                      <ArrowRight size={isCompact ? 11 : 14} strokeWidth={2.5} />
                      <span className={`${isCompact ? "text-[9px]" : "text-[10px] sm:text-[11px]"} font-bold tracking-wider uppercase`}>
                        Hide
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`
                        ${isCompact ? "text-sm" : currentLayout === "numeric" ? "text-xl sm:text-2xl font-black" : "text-base sm:text-lg"}
                        font-bold tabular-nums leading-none
                      `}
                    >
                      {isCaps && !isSpecial ? key.toUpperCase() : key}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Zero-waste decorative bottom line */}
      {!isCompact && !embedded && (
        <div className="mt-2.5 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-[#a6152f]/30 to-transparent shrink-0" />
      )}
    </div>
  );
};