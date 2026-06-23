import React from "react";

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
    <div className={`flex flex-col gap-1 w-full relative ${noMargin ? "" : "mb-1"}`}>

      {/* LABEL */}
      {label && (
        <label
          htmlFor={selectId}
          className="flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5"
        >
          <span>{label}</span>
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
          {error && <span className="text-[10px] text-red-500 font-bold ml-2 normal-case">({error})</span>}
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
        onKeyDown={onKeyDown}
        disabled={disabled}
        autoFocus={autoFocus}
        tabIndex={tabIndex}
        className={`
          w-full px-3 md:px-4 h-10.5
          text-sm
          rounded-md border outline-none transition
          
          ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
          ${disabled ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}

          focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
          ${className}
        `}
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