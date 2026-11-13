import { Delete } from "lucide-react";

interface SessionKeypadProps {
  onPress: (key: string) => void;
  disabled: boolean;
  /** The denomination screen counts whole notes, so its decimal key is always off. */
  decimalAlwaysDisabled?: boolean;
}

/** Touch keypad of the cashier session window (both screens). */
export const SessionKeypad = ({ onPress, disabled, decimalAlwaysDisabled = false }: SessionKeypadProps) => (
  <div className="flex-1 bg-slate-50 border border-slate-200 p-3 rounded-xl flex flex-col justify-center shadow-2xs">
    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center mb-2">
      Touch Keypad
    </span>
    <div className="grid grid-cols-3 gap-2 shrink-0">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((key) => (
        <button
          key={key}
          type="button"
          tabIndex={-1}
          onClick={() => onPress(key)}
          disabled={disabled}
          className="h-12 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
        >
          {key}
        </button>
      ))}
    </div>

    {/* Bottom Keypad Row: Clear, 0, ., Backspace */}
    <div className="grid grid-cols-4 gap-2 mt-2 shrink-0">
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onPress("Clear")}
        disabled={disabled}
        className="h-11 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center uppercase"
      >
        Clear
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onPress("0")}
        disabled={disabled}
        className="h-11 rounded-lg text-lg font-bold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-50"
      >
        0
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onPress(".")}
        disabled={decimalAlwaysDisabled ? true : disabled}
        title={decimalAlwaysDisabled ? "Decimal points apply to total amount in Manual mode" : undefined}
        className="h-11 rounded-lg text-xl font-extrabold bg-white text-slate-800 border border-slate-300 hover:bg-slate-100 transition-all active:scale-95 shadow-2xs disabled:opacity-30 flex items-center justify-center pb-1"
      >
        .
      </button>
      <button
        type="button"
        tabIndex={-1}
        onClick={() => onPress("Back")}
        disabled={disabled}
        title="Backspace"
        className="h-11 rounded-lg text-base font-bold bg-slate-200 text-slate-700 border border-slate-300 hover:bg-slate-300 transition-all active:scale-95 shadow-2xs disabled:opacity-50 flex items-center justify-center"
      >
        <Delete size={18} />
      </button>
    </div>
  </div>
);
