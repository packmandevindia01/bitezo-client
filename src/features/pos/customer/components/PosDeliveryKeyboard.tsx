import React, { useState, useEffect, useRef } from "react";
import { Delete, ChevronUp, Space, CornerDownLeft, ArrowRight } from "lucide-react";
import { handleFocusNextInput } from "../../../../utils/keyboard";

interface PosDeliveryKeyboardProps {
  onInput: (char: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  onEnter?: () => void;
  isCompactViewport?: boolean;
}

export const PosDeliveryKeyboard: React.FC<PosDeliveryKeyboardProps> = ({
  onInput,
  onBackspace,
  onClear,
  onClose,
  onEnter,
  isCompactViewport = false,
}) => {
  const [currentLayout, setCurrentLayout] = useState<"qwerty" | "symbols">("qwerty");
  const [isCaps, setIsCaps] = useState(false);
  const [isCapsLock, setIsCapsLock] = useState(false);
  const [pressedKeys, setPressedKeys] = useState<{ [key: string]: boolean }>({});

  const backspaceTimeoutRef = useRef<any>(null);
  const backspaceIntervalRef = useRef<any>(null);

  const handleBackspaceAction = () => {
    onBackspace();
  };

  const startBackspaceRepeater = () => {
    handleBackspaceAction();
    stopBackspaceRepeater();
    backspaceTimeoutRef.current = setTimeout(() => {
      backspaceIntervalRef.current = setInterval(() => {
        handleBackspaceAction();
      }, 75);
    }, 400);
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

  useEffect(() => {
    return () => stopBackspaceRepeater();
  }, []);

  const handleKeyTouchStart = (key: string, e: React.PointerEvent) => {
    e.preventDefault();
    setPressedKeys((prev) => ({ ...prev, [key]: true }));

    if (key === "Shift") {
      if (isCapsLock) {
        setIsCapsLock(false);
        setIsCaps(false);
      } else if (isCaps) {
        setIsCapsLock(true);
      } else {
        setIsCaps(true);
      }
      return;
    }

    if (key === "Back" || key === "Back Space") {
      startBackspaceRepeater();
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
      onClear();
      return;
    }

    if (key === "Enter") {
      if (onEnter) {
        onEnter();
      } else {
        const activeEl = document.activeElement as HTMLElement | null;
        if (activeEl) handleFocusNextInput(activeEl);
      }
      return;
    }

    if (key === "Close" || key === "Hide") {
      onClose();
      return;
    }

    const char = key === "Space" ? " " : (isCaps || isCapsLock) ? key.toUpperCase() : key;
    onInput(char);

    if (isCaps && !isCapsLock && key !== "Space") {
      setIsCaps(false);
    }
  };

  const handleKeyTouchEnd = (key: string) => {
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

  const qwertyLayout = [
    ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l", "."],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", "Enter"],
    ["Symbols", "Space", "Back Space", "Hide"],
  ];

  const symbolLayout = [
    ["[", "]", "{", "}", "(", ")", "<", ">", "_", "-"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "+", "="],
    ["~", "`", "|", "\\", ":", ";", "\"", "'", "?", "/"],
    ["ABC", "Space", "Back Space", "Hide"],
  ];

  const activeRows = currentLayout === "symbols" ? symbolLayout : qwertyLayout;

  return (
    <div
      data-touch-keyboard="true"
      className="w-full max-w-[1020px] mx-auto select-none bg-[#eae4e8] border border-[#49293e]/15 rounded-2xl p-2 sm:p-2.5 shadow-[0_2px_12px_rgba(73,41,62,0.05)]"
      style={{
        fontFamily: "'SF Pro Display', 'Segoe UI', system-ui, sans-serif",
        touchAction: "none",
      }}
    >
      <div className={`flex flex-col ${isCompactViewport ? "gap-1" : "gap-1.5"}`}>
        {activeRows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1 sm:gap-1.5 w-full">
            {row.map((key) => {
              const isSpecial = ["Shift", "Back", "Back Space", "Clear", "Space", "Enter", "Close", "Hide", "Symbols", "ABC"].includes(key);
              const isActive = !!pressedKeys[key];
              const isShiftOn = key === "Shift" && (isCaps || isCapsLock);

              let flexValue = 1;
              if (key === "Shift" || key === "Back" || key === "Back Space" || key === "Clear") flexValue = 1.4;
              if (key === "Space") flexValue = 4.5;
              if (key === "Back Space") flexValue = 3.5;
              if (key === "Enter") flexValue = 2.5;
              if (key === "Close" || key === "Hide") flexValue = 1.5;
              if (key === "ABC" || key === "Symbols") flexValue = 1.5;

              const hClass = "h-[34px] sm:h-[38px] md:h-[42px]";

              let bgClass = "";
              let textClass = "";
              let borderClass = "";

              if (isShiftOn) {
                bgClass = "bg-[#49293e]";
                textClass = "text-white";
                borderClass = "border-[#361e2e]";
              } else if (key === "Enter") {
                bgClass = isActive
                  ? "bg-emerald-700"
                  : "bg-emerald-600 hover:bg-emerald-500";
                textClass = "text-white font-black";
                borderClass = "border-emerald-700 shadow-[0_2px_6px_rgba(16,185,129,0.3)]";
              } else if (key === "Clear") {
                bgClass = isActive
                  ? "bg-amber-200"
                  : "bg-amber-100 hover:bg-amber-500 hover:text-white";
                textClass = "text-amber-900 font-black";
                borderClass = "border-amber-300 hover:border-amber-500 shadow-[0_2px_0_rgba(217,119,6,0.15)]";
              } else if (key === "Close" || key === "Hide") {
                bgClass = isActive
                  ? "bg-[#49293e]"
                  : "bg-[#49293e]/10 hover:bg-[#49293e] hover:text-white";
                textClass = "text-[#49293e] font-extrabold";
                borderClass = "border-[#49293e]/20 hover:border-[#49293e] shadow-[0_2px_0_rgba(73,41,62,0.08)]";
              } else if (isSpecial) {
                bgClass = isActive
                  ? "bg-[#49293e]"
                  : "bg-[#49293e]/10 hover:bg-[#49293e] hover:text-white";
                textClass = "text-[#49293e] font-extrabold";
                borderClass = "border-[#49293e]/20 hover:border-[#49293e] shadow-[0_2px_0_rgba(73,41,62,0.08)]";
              } else {
                bgClass = isActive
                  ? "bg-[#49293e] text-white"
                  : "bg-white hover:bg-[#49293e] hover:text-white";
                textClass = "text-[#49293e] font-black";
                borderClass = "border-slate-200/90 hover:border-[#49293e] shadow-[0_2px_4px_rgba(73,41,62,0.06),0_1px_0_rgba(73,41,62,0.1)]";
              }

              return (
                <button
                  key={key}
                  type="button"
                  onPointerDown={(e) => handleKeyTouchStart(key, e)}
                  onPointerUp={() => handleKeyTouchEnd(key)}
                  onPointerLeave={() => handleKeyTouchEnd(key)}
                  className={`
                    group ${hClass}
                    flex-1 min-w-0 select-none
                    flex items-center justify-center
                    rounded-xl border
                    ${bgClass} ${textClass} ${borderClass}
                    shadow-[0_2px_4px_rgba(73,41,62,0.08)]
                    transition-all duration-150
                    ${isActive ? "scale-95 translate-y-[1px]" : ""}
                    focus:outline-none focus:ring-0
                    cursor-pointer overflow-hidden
                    text-xs sm:text-sm
                  `}
                  style={{
                    WebkitTapHighlightColor: "transparent",
                    touchAction: "none",
                    flex: flexValue,
                  }}
                >
                  {key === "Back" || key === "Back Space" ? (
                    <div className="flex items-center gap-1.5 text-[#49293e] group-hover:text-white transition-colors">
                      <Delete size={17} strokeWidth={2.5} />
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#49293e] group-hover:text-white transition-colors">Back Space</span>
                    </div>
                  ) : key === "Shift" ? (
                    <div className="flex items-center gap-1.5 justify-center">
                      <ChevronUp
                        size={17}
                        strokeWidth={3}
                        className={(isCaps || isCapsLock) ? "text-white" : "text-[#49293e] group-hover:text-white transition-colors"}
                      />
                      <span className={`text-[10px] font-black uppercase tracking-wider ${(isCaps || isCapsLock) ? "text-white" : "text-[#49293e] group-hover:text-white transition-colors"}`}>
                        Shift
                      </span>
                    </div>
                  ) : key === "Space" ? (
                    <div className="flex items-center justify-center text-[#49293e] group-hover:text-white transition-colors w-full px-2">
                      <Space size={15} strokeWidth={2.2} className="opacity-90" />
                    </div>
                  ) : key === "Clear" ? (
                    <span className="text-[10px] font-black tracking-wider uppercase text-amber-900 group-hover:text-white transition-colors">
                      Clear
                    </span>
                  ) : key === "Enter" ? (
                    <div className="flex items-center gap-1 text-white">
                      <CornerDownLeft size={14} strokeWidth={2.8} />
                      <span className="text-[10px] font-black tracking-wider uppercase">
                        Enter
                      </span>
                    </div>
                  ) : key === "Close" || key === "Hide" ? (
                    <div className="flex items-center gap-1 text-[#49293e] group-hover:text-white transition-colors">
                      <ArrowRight size={14} strokeWidth={2.5} />
                      <span className="text-[10px] font-black tracking-wider uppercase">
                        Hide
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs sm:text-sm md:text-base font-black tabular-nums leading-none text-[#49293e] group-hover:text-white transition-colors">
                      {(isCaps || isCapsLock) && !isSpecial ? key.toUpperCase() : key}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
