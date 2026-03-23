import React from "react";

interface Props {
  label?: string;
  type?: string;
  name?: string;
  id?: string;
  placeholder?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  disabled?: boolean;
  autoComplete?: string;
}

const FormInput = ({
  label,
  type = "text",
  name,
  id,
  placeholder,
  required,
  value,
  onChange,
  onBlur,
  error,
  disabled,
  autoComplete,
}: Props) => {
  const inputId = id || name || label?.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1 mb-4 w-full">

      {/* LABEL */}
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs md:text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}

      {/* INPUT */}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        autoComplete={autoComplete}
        placeholder={placeholder || (required ? "Enter value" : "")}
        className={`
          w-full px-3 md:px-4 py-2
          text-sm md:text-base
          rounded-md border outline-none transition

          ${error ? "border-red-500" : "border-gray-300"}
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}

          focus:ring-2 focus:ring-[#49293e] focus:border-[#49293e]
        `}
      />

      {/* ERROR */}
      {error && (
        <span className="text-xs text-red-500 mt-1">
          {error}
        </span>
      )}

    </div>
  );
};

export default FormInput;