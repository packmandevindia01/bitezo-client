import React, { forwardRef } from "react";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  inputClassName?: string;
}

const FormInput = forwardRef<HTMLInputElement, Props>(({
  label,
  error,
  className = "",
  inputClassName = "",
  type = "text",
  id,
  name,
  required,
  placeholder,
  ...props
}, ref) => {
  const inputId = id || name || label?.replace(/\s+/g, "-").toLowerCase();
  
  // Auto-align right for numbers and monetary/quantity fields
  const isNumericField = type === 'number' || (label && /\b(price|cost|amount|qty|quantity|vat|disc|discount|rate|total|net|gross|percentage|%)\b/i.test(label));

  return (
    <div className="flex flex-col gap-1 mb-4 w-full">

      {/* LABEL */}
      {label && (
        <label
          htmlFor={inputId}
          className={`text-xs md:text-sm font-medium text-gray-700 ${isNumericField ? 'text-right' : ''}`}
        >
          {label}
          {required && <span className="text-amber-500 ml-1 font-bold">*</span>}
        </label>
      )}

      {/* INPUT */}
      <input
        ref={ref}
        id={inputId}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder || (required ? "Enter value" : "")}
        min={isNumericField ? (props.min ?? 0) : props.min}
        onKeyDown={(e) => {
          if (isNumericField && (e.key === '-' || e.key === 'e')) {
            e.preventDefault();
          }
          if (props.onKeyDown) props.onKeyDown(e);
        }}
        className={`
          w-full px-3 md:px-4 py-2
          text-sm md:text-base
          rounded-md border outline-none transition
          ${isNumericField ? 'text-right' : 'text-left'}
          
          ${error ? "border-amber-500 bg-amber-50/30" : "border-gray-300 bg-white"}
          ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
          ${props.readOnly ? "bg-gray-100" : ""}

          focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
          ${className}
          ${inputClassName}
        `}
        {...props}
      />

      {/* ERROR */}
      {error && (
        <div className="flex items-center gap-1.5 mt-1 text-[11px] md:text-xs text-amber-600 font-semibold animate-in fade-in slide-in-from-top-1">
          <span className="shrink-0">⚠️</span>
          <span>{error}</span>
        </div>
      )}

    </div>
  );
});

FormInput.displayName = "FormInput";

export default FormInput;