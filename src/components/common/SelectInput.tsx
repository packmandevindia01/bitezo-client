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
          {required && <span className="text-red-500 ml-1">*</span>}
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
        className={`
          w-full px-3 md:px-4 py-2
          text-sm md:text-base
          rounded-md border outline-none transition
          bg-white

          ${error ? "border-red-500" : "border-gray-300"}
          ${disabled ? "bg-gray-100 cursor-not-allowed" : ""}

          focus:ring-2 focus:ring-[#49293e] focus:border-[#49293e]
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
        <span className="text-xs text-red-500 mt-1">
          {error}
        </span>
      )}

    </div>
  );
};

export default SelectInput;