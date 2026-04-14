import React from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const FormInput = ({
  label,
  error,
  className = "",
  type = "text",
  id,
  name,
  required,
  placeholder,
  ...props
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
          {required && <span className="text-red-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* INPUT */}
      <input
        id={inputId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder || (required ? "Enter value" : "")}
        className={`
          w-full px-3 md:px-4 py-2
          text-sm md:text-base
          rounded-md border outline-none transition
          
          ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
          ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${props.readOnly ? "bg-gray-100" : ""}

          focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
          ${className}
        `}
        {...props}
      />

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

export default FormInput;