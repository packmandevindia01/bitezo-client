import React from "react";

interface Option {
  label: string;
  value: string;
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
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
}

const SelectInput = ({
  label,
  name,
  id,
  options,
  required,
  placeholder = "Select",
  value,
  onChange,
  onBlur,
  error,
  disabled,
  autoFocus,
}: Props) => {

  const selectId = id || name || label?.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1 mb-4 w-full">

      {/* LABEL */}
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs md:text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* SELECT */}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`
          w-full px-3 md:px-4 py-2
          text-sm md:text-base
          rounded-md border outline-none transition
          
          ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
          ${disabled ? "bg-gray-100 cursor-not-allowed opacity-50" : ""}

          focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
        `}
      >
        {/* Placeholder */}
        <option value="">
          {placeholder}
        </option>

        {/* Options */}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] md:text-xs text-red-600 font-semibold animate-in fade-in slide-in-from-top-1">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

    </div>
  );
};

export default SelectInput;