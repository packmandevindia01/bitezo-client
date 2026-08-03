import React from "react";
import { handleFocusNextInput } from "../../utils/keyboard";

interface Option {
  label: string;
  value: string;
  disabled?: boolean;
}

interface Props {
  label?: string;
  name?: string;
  id?: string;
  options: Option[];
  required?: boolean;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLSelectElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLSelectElement>) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
  noMargin?: boolean;
  tabIndex?: number;
}

export const SelectInput = React.forwardRef<HTMLSelectElement, Props>(({
  label,
  name,
  id,
  options,
  required,
  placeholder = "Select",
  value,
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  error,
  disabled,
  autoFocus,
  className = "",
  noMargin = false,
  tabIndex,
  ...rest
}, ref) => {

  const selectId = id || name || label?.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className={`flex flex-col justify-end gap-1 w-full min-w-0 relative h-full ${noMargin ? "" : "mb-1"}`}>

      {/* LABEL */}
      {label && (
        <label
          htmlFor={selectId}
          className="flex items-center whitespace-nowrap overflow-hidden text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0"
        >
          <span className="truncate shrink">{label}</span>
          {required && <span className="text-red-500 ml-1 font-bold shrink-0">*</span>}
          {error && <span className="text-[10px] text-red-500 font-bold ml-2 normal-case truncate shrink" title={error}>({error.toLowerCase().includes('required') ? 'required' : error})</span>}
        </label>
      )}

      {/* SELECT */}
      <select
        ref={ref}
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleFocusNextInput(e.currentTarget);
          }
          if (onKeyDown) onKeyDown(e);
        }}
        disabled={disabled}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        className={`w-full bg-white border border-slate-300 rounded-lg px-3 h-9 text-xs font-semibold text-[#49293e] focus:outline-none focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20 transition-all shadow-sm ${
          error ? "border-red-300 bg-red-50" : "hover:border-slate-400"
        } ${disabled ? "opacity-50 cursor-not-allowed bg-slate-50" : ""} ${className}`}
        {...rest}
      >
        {/* Placeholder */}
        <option value="">
          {placeholder}
        </option>

        {/* Options */}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* ERROR (FALLBACK IF LABEL IS NOT PROVIDED) */}
      {error && !label && (
        <div className="absolute -bottom-3.5 left-1 text-[10px] text-red-600 font-semibold animate-in fade-in slide-in-from-top-1 z-10">
          {error}
        </div>
      )}
    </div>
  );
});

SelectInput.displayName = "SelectInput";

export default SelectInput;