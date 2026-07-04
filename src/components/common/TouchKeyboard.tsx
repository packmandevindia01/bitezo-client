import React, { useState, useEffect, useRef } from "react";
import { X, Delete, ChevronUp, Space, ArrowRight, CornerDownLeft, Sparkles } from "lucide-react";
import { handleFocusNextInput } from "../../utils/keyboard";

interface TouchKeyboardProps {
  onInput?: (value: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
  onClose?: () => void;
  layout?: "qwerty" | "numeric" | "symbols";
  size?: "sm" | "md" | "lg";
  embedded?: boolean;
  hideCloseKey?: boolean;
  onEnter?: () => void;
}

export const TouchKeyboard = ({
  onInput,
  onBackspace,
  onClear,
  onClose,
  layout: initialLayout,
  size = "md",
  embedded = false,
  hideCloseKey = false,
  onEnter,
}: TouchKeyboardProps) => {
  const [currentLayout, setCurrentLayout] = useState<"qwerty" | "numeric" | "symbols">(
    initialLayout || "qwerty"
  );
  const [isCaps, setIsCaps] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const lastShiftTapRef = useRef<number>(0);
  const shiftLongPressTimeoutRef = useRef<any>(null);
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});

  const backspaceTimeoutRef = useRef<any>(null);
  const backspaceIntervalRef = useRef<any>(null);

  const lastActiveInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const lastSelectionStartRef = useRef<number>(0);
  const hasTypedInCurrentInputRef = useRef<boolean>(false);

  // Safe helper to read cursor selection coordinates to prevent Chrome DOMExceptions on type="email"/"number"
  const getSafeSelection = (inputEl: HTMLInputElement | HTMLTextAreaElement) => {
    try {
      const start = inputEl.selectionStart;
      const end = inputEl.selectionEnd;
      return {
        start: start !== null ? start : inputEl.value.length,
        end: end !== null ? end : inputEl.value.length,
        supported: true,
      };
    } catch (e) {
      return {
        start: inputEl.value.length,
        end: inputEl.value.length,
        supported: false,
      };
    }
  };

  // 1a. Track cursor position and active input to prevent layout-shift selection resets
  useEffect(() => {
    const handleGlobalFocusOrClick = (e: Event) => {
      const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
      if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA")) {
        const target = e.target as HTMLElement | null;
        if (target && !target.closest("[data-touch-keyboard='true']")) {
          const sel = getSafeSelection(activeEl);
          lastSelectionStartRef.current = sel.start;
          lastActiveInputRef.current = activeEl;
        }
      }
    };

    window.addEventListener("focusin", handleGlobalFocusOrClick, true);
    window.addEventListener("click", handleGlobalFocusOrClick, true);
    return () => {
      window.removeEventListener("focusin", handleGlobalFocusOrClick, true);
      window.removeEventListener("click", handleGlobalFocusOrClick, true);
    };
  }, []);

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
        const activeEl = document.activeElement as HTMLElement | null;
        const isInteractiveFormElement = activeEl && (
          activeEl.tagName === "INPUT" || 
          activeEl.tagName === "TEXTAREA" ||
          activeEl.tagName === "SELECT" ||
          activeEl.getAttribute("role") === "combobox"
        );
        
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

        // Only intercept if we are currently inside an interactive form element inside the active modal/form
        if (isInteractiveFormElement && !(activeEl as any).readOnly && !(activeEl as any).disabled && !isSearchSelectInput) {
          // If it's a textarea, let it normal enter (newline) if Shift is pressed
          if (activeEl.tagName === "TEXTAREA" && e.shiftKey) {
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
    ["Shift", "z", "x", "c", "v", "b", "n", "m", "Enter"],
    ["123", "Symbols", "Space", "Back Space", "Close"],
  ];

  const symbolLayout = [
    ["[", "]", "{", "}", "(", ")", "<", ">", "_", "-"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "+", "="],
    ["~", "`", "|", "\\", ":", ";", "\"", "'", "?", "/"],
    ["ABC", "123", "Space", "Back Space", "Close"],
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

    const sel = getSafeSelection(activeEl);
    const start = (sel.start === 0 && lastActiveInputRef.current === activeEl && lastSelectionStartRef.current > 0)
      ? lastSelectionStartRef.current
      : sel.start;
    const end = (sel.start === 0 && lastActiveInputRef.current === activeEl && lastSelectionStartRef.current > 0)
      ? lastSelectionStartRef.current
      : sel.end;
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

    lastSelectionStartRef.current = newCursorPos;
    lastActiveInputRef.current = activeEl;
    hasTypedInCurrentInputRef.current = true;

    triggerReactOnChange(activeEl, newVal, newCursorPos);
  };

  const handleClearAction = () => {
    const activeEl = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
    const isInput = activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA");

    if (!isInput) {
      onClear?.();
      return;
    }

    lastSelectionStartRef.current = 0;
    lastActiveInputRef.current = activeEl;
    hasTypedInCurrentInputRef.current = true;

    triggerReactOnChange(activeEl, "", 0);
  };

  const handleEnterAction = () => {
    if (onEnter) {
      onEnter();
      return;
    }
    
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
      try {
        activeEl.setSelectionRange(newCursorPos, newCursorPos);
      } catch (e) {
        // Ignore errors on inputs that do not support selection (like type="email" or type="number")
      }
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

    if (isInput) {
      if (lastActiveInputRef.current !== activeEl) {
        hasTypedInCurrentInputRef.current = false;
      }
    }

    if (key === "Shift") {
      const now = Date.now();
      const delay = now - lastShiftTapRef.current;
      lastShiftTapRef.current = now;

      if (delay < 350) {
        // Double tap: lock caps
        setIsCapsLock(true);
        setIsCaps(true);
      } else {
        if (isCapsLock) {
          setIsCapsLock(false);
          setIsCaps(false);
        } else {
          setIsCaps((c) => !c);
        }
      }

      if (shiftLongPressTimeoutRef.current) {
        clearTimeout(shiftLongPressTimeoutRef.current);
      }
      shiftLongPressTimeoutRef.current = setTimeout(() => {
        setIsCapsLock(true);
        setIsCaps(true);
        setPressedKeys((prev) => ({ ...prev, Shift: true }));
      }, 500);

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
      const char = key === "Space" ? " " : (isCaps || isCapsLock) ? key.toUpperCase() : key;
      onInput?.(char);
      return;
    }

    const sel = getSafeSelection(activeEl);
    const start = (sel.start === 0 && lastActiveInputRef.current === activeEl && lastSelectionStartRef.current > 0)
      ? lastSelectionStartRef.current
      : sel.start;
    const end = (sel.start === 0 && lastActiveInputRef.current === activeEl && lastSelectionStartRef.current > 0)
      ? lastSelectionStartRef.current
      : sel.end;
    const val = activeEl.value;

    const char = key === "Space" ? " " : (isCaps || isCapsLock) ? key.toUpperCase() : key;
    let newVal = val.slice(0, start) + char + val.slice(end);
    let newCursorPos = start + char.length;

    // Overwrite default zero values on first keystroke inside this input
    if (!hasTypedInCurrentInputRef.current && isInput) {
      const isZeroValue = /^0(\.0+)?$/.test(val.trim());
      if (isZeroValue && key !== "." && key !== "Back Space" && key !== "Back" && key !== "Space") {
        newVal = char;
        newCursorPos = char.length;
      }
      hasTypedInCurrentInputRef.current = true;
    }

    lastSelectionStartRef.current = newCursorPos;
    lastActiveInputRef.current = activeEl;

    triggerReactOnChange(activeEl, newVal, newCursorPos);

    // If shift was on, reset it after typing a letter (standard mobile keyboard layout behavior, unless Caps Lock is active)
    if (isCaps && !isCapsLock && key !== "Space") {
      setIsCaps(false);
    }
  };

  const handleKeyTouchEnd = (key: string) => {
    if (key === "Shift") {
      if (shiftLongPressTimeoutRef.current) {
        clearTimeout(shiftLongPressTimeoutRef.current);
        shiftLongPressTimeoutRef.current = null;
      }
    }
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
  const isLarge = size === "lg";
  const showHeader = !isCompact && !embedded;

  return (
    <div
      data-touch-keyboard="true"
      className={`
        w-full ${embedded ? "max-w-none" : isCompact ? "max-w-[550px]" : isLarge ? "max-w-[1100px]" : "max-w-[920px]"} mx-auto select-none transition-all duration-300 ease-out
        ${embedded ? "" : `
          bg-gradient-to-b from-[#faf8f9] to-[#f3edf0]
          border border-slate-300
          shadow-[0_15px_40px_rgba(73,41,62,0.08),0_1px_3px_rgba(0,0,0,0.05)]
          ${isCompact ? "rounded-xl p-1.5" : isLarge ? "rounded-2xl p-2.5 sm:p-3" : "rounded-2xl p-2 sm:p-2.5"}
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
            <span className="text-[9px] font-black tracking-[0.25em] uppercase text-slate-450 ml-1.5 flex items-center gap-1">
              <Sparkles size={8} className="text-[#49293e]/60 animate-pulse" />
              POS SMART KEYBOARD
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Quick Status indicators */}
            <span className="text-[8px] font-black uppercase text-slate-500 bg-slate-200/80 px-1.5 py-0.5 rounded tracking-wider border border-slate-300">
              Layout: {currentLayout}
            </span>
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                onClose?.();
              }}
              className="
                w-7 h-7 flex items-center justify-center rounded-lg
                bg-slate-200 hover:bg-slate-300 active:bg-slate-450/40
                text-slate-600 hover:text-slate-900
                transition-all duration-150 border border-slate-350
              "
            >
              <X size={14} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}

      {/* Grid of keys */}
      <div className={`flex flex-col ${isCompact ? "gap-0.5" : isLarge ? "gap-1.5 sm:gap-2" : "gap-1 sm:gap-1.5"}`}>
        {activeRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-0.5 sm:gap-1 w-full">
            {row.map((key) => {
              if (key === "Close" && hideCloseKey) return null;

              const isSpecial = ["Shift", "Back", "Back Space", "Clear", "Space", "Enter", "Close", "Symbols", "ABC", "123"].includes(key);
              const isActive = !!pressedKeys[key];
              const isShiftOn = key === "Shift" && (isCaps || isCapsLock);

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
                ? "h-8"
                : currentLayout === "numeric"
                  ? isLarge ? "h-[56px] sm:h-[62px]" : "h-[48px] sm:h-[52px]"
                  : isLarge ? "h-[48px] sm:h-[52px]" : "h-[42px] sm:h-[46px]";

              // Color styles matching the Backoffice Crimson/Maroon design rules
              let bgClass = "";
              let textClass = "";
              let borderClass = "";
              let shadowClass = "";

              if (isShiftOn) {
                bgClass = "bg-[#49293e]";
                textClass = "text-white";
                borderClass = "border-[#20101a]";
                shadowClass = "shadow-[0_2px_0_rgba(73,41,62,0.3)]";
              } else if (key === "Enter") {
                bgClass = isActive
                  ? "bg-[#351e2d]"
                  : "bg-gradient-to-b from-[#49293e] to-[#3a2031]";
                textClass = "text-white font-bold";
                borderClass = "border-[#20101a]";
                shadowClass = "shadow-[0_2.5px_0_rgba(73,41,62,0.25)]";
              } else if (key === "Close") {
                bgClass = isActive
                  ? "bg-slate-300"
                  : "bg-gradient-to-b from-slate-200 to-slate-250";
                textClass = "text-slate-700 font-black";
                borderClass = "border-slate-500";
                shadowClass = "shadow-[0_2px_0_rgba(148,163,184,0.15)]";
              } else if (isSpecial) {
                bgClass = isActive
                  ? "bg-slate-200"
                  : "bg-gradient-to-b from-slate-100 to-slate-200/90";
                textClass = "text-slate-600 font-semibold";
                borderClass = "border-slate-500";
                shadowClass = "shadow-[0_2px_0_rgba(148,163,184,0.15)]";
              } else {
                // Alpha-numeric standard key
                bgClass = isActive
                  ? "bg-slate-100"
                  : "bg-gradient-to-b from-white to-slate-50";
                textClass = "text-[#49293e] font-bold";
                borderClass = "border-slate-500";
                shadowClass = "shadow-[0_2.5px_0_rgba(148,163,184,0.2)]";
              }

              return (
                <button
                  key={key}
                  type="button"
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
                    ${isCompact ? "text-[10px]" : isLarge ? "text-sm" : "text-xs sm:text-sm"}
                  `}
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "none",
                  }}
                >
                  {key === "Back" || key === "Back Space" ? (
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Delete
                        size={isCompact ? 12 : isLarge ? 18 : currentLayout === "numeric" ? 18 : 16}
                        strokeWidth={2.2}
                      />
                      {key === "Back Space" && !isCompact && (
                        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Back Space</span>
                      )}
                    </div>
                  ) : key === "Shift" ? (
                    <div className="flex items-center gap-1.5 justify-center">
                      <ChevronUp
                        size={isCompact ? 12 : 15}
                        strokeWidth={3}
                        className={(isCaps || isCapsLock) ? "text-white animate-bounce" : "text-slate-600"}
                      />
                      {!isCompact && (
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${(isCaps || isCapsLock) ? "text-white" : "text-slate-500"}`}>
                          Shift
                        </span>
                      )}
                    </div>
                  ) : key === "Space" ? (
                    <div className="flex items-center gap-1.5 text-slate-400 w-full px-2">
                      <div className="h-[2px] flex-1 max-w-[20px] rounded-full bg-slate-300" />
                      <Space size={12} className="opacity-75" />
                      <div className="h-[2px] flex-1 max-w-[20px] rounded-full bg-slate-300" />
                    </div>
                  ) : key === "Clear" ? (
                    <span className={`${isCompact ? "text-[8px]" : "text-[9px] sm:text-[10px]"} font-black tracking-wider uppercase text-amber-600`}>
                      Clear
                    </span>
                  ) : key === "Enter" ? (
                    <div className="flex items-center gap-1">
                      <CornerDownLeft size={isCompact ? 10 : 12} strokeWidth={2.5} />
                      <span className={`${isCompact ? "text-[8px]" : "text-[9px] sm:text-[10px]"} font-bold tracking-wider uppercase`}>
                        Enter
                      </span>
                    </div>
                  ) : key === "Close" ? (
                    <div className="flex items-center gap-1">
                      <ArrowRight size={isCompact ? 10 : 12} strokeWidth={2.5} />
                      <span className={`${isCompact ? "text-[8px]" : "text-[9px] sm:text-[10px]"} font-bold tracking-wider uppercase`}>
                        Hide
                      </span>
                    </div>
                  ) : (
                    <span
                      className={`
                        ${isCompact ? "text-xs" : currentLayout === "numeric" ? (isLarge ? "text-xl sm:text-2xl font-black" : "text-lg sm:text-xl font-black") : (isLarge ? "text-base sm:text-lg" : "text-sm sm:text-base")}
                        font-bold tabular-nums leading-none
                      `}
                    >
                      {(isCaps || isCapsLock) && !isSpecial ? key.toUpperCase() : key}
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
        <div className="mt-2.5 h-[2px] w-full rounded-full bg-gradient-to-r from-transparent via-[#49293e]/20 to-transparent shrink-0" />
      )}
    </div>
  );
};