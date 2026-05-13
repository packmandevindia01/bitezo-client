import { useState } from "react";

interface TouchKeyboardProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onClose: () => void;
  layout?: "qwerty" | "numeric";
}

export const TouchKeyboard = ({ onInput, onBackspace, onClear, onClose, layout = "qwerty" }: TouchKeyboardProps) => {
  const [isCaps, setIsCaps] = useState(false);

  const rows = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["Shift", "z", "x", "c", "v", "b", "n", "m", "Back"],
    ["Clear", "Space", "Done"]
  ];

  const handleKeyClick = (key: string) => {
    if (key === "Back") {
      onBackspace();
    } else if (key === "Clear") {
      onClear();
    } else if (key === "Done") {
      onClose();
    } else if (key === "Shift") {
      setIsCaps(!isCaps);
    } else if (key === "Space") {
      onInput(" ");
    } else {
      onInput(isCaps ? key.toUpperCase() : key);
    }
  };

  return (
    <div className="bg-slate-800 p-3 rounded-t-2xl shadow-2xl w-full select-none animate-in slide-in-from-bottom duration-300">
      <div className="flex justify-between items-center mb-3 px-2">
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Touch Keyboard</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
      
      <div className="flex flex-col gap-1.5">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="flex justify-center gap-1.5">
            {row.map((key) => {
              const isSpecial = ["Shift", "Back", "Clear", "Space", "Done"].includes(key);
              const isWide = ["Space", "Done", "Shift", "Back", "Clear"].includes(key);
              
              return (
                <button
                  key={key}
                  onClick={() => handleKeyClick(key)}
                  className={`
                    h-12 flex items-center justify-center rounded-lg text-sm font-bold transition-all active:scale-95
                    ${isSpecial 
                      ? "bg-slate-700 text-slate-300 px-4" 
                      : "bg-slate-600 text-white w-12"
                    }
                    ${key === "Space" ? "flex-1 max-w-sm" : ""}
                    ${key === "Done" ? "bg-pos-green text-white px-8" : ""}
                    ${key === "Shift" && isCaps ? "bg-[#eb8127] text-white" : ""}
                    hover:bg-slate-500
                  `}
                >
                  {key === "Back" ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6"/></svg>
                  ) : key === "Shift" ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="m12 19 7-7 3 3-10 10L2 15l3-3 7 7Z"/><path d="m12 19 7-7 3 3-10 10L2 15l3-3 7 7Z"/></svg>
                  ) : (
                    isCaps && !isSpecial ? key.toUpperCase() : key
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
