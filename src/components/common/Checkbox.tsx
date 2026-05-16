import React from "react";

interface Props {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
  tabIndex?: number;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}

const Checkbox = ({
  label,
  checked,
  onChange,
  disabled,
  id,
  error,
  tabIndex,
  onKeyDown,
}: Props) => {
  const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className={`flex items-center justify-between gap-4 group py-1.5 px-1 rounded-lg transition-colors
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:bg-slate-50"}
        `}
      >
        {label && (
          <span className="text-sm font-bold text-slate-700 tracking-tight">
            {label}
          </span>
        )}
        
        <div className="relative inline-flex items-center">
          <input
            id={inputId}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            onKeyDown={onKeyDown}
            disabled={disabled}
            tabIndex={tabIndex}
            className="sr-only peer"
          />
          
          {/* Toggle Track */}
          <div className={`
            w-10 h-5.5 rounded-full transition-all duration-200 ease-in-out
            peer-focus:ring-2 peer-focus:ring-[#49293e]/20
            ${checked ? "bg-[#49293e]" : "bg-slate-200"}
            ${disabled ? "opacity-50" : "group-hover:opacity-90"}
          `} />
          
          {/* Toggle Thumb */}
          <div className={`
            absolute left-0.5 top-0.5 w-4.5 h-4.5 bg-white rounded-full shadow-sm
            transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-4.5" : "translate-x-0"}
          `} />
        </div>
      </label>

      {/* ERROR */}
      {error && (
        <span className="text-[10px] text-red-500 font-bold px-1">
          {error}
        </span>
      )}
    </div>
  );
};

export default Checkbox;