import React, { forwardRef } from "react";
import { handleFocusNextInput } from "../../utils/keyboard";

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  labelIcon?: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  className?: string;
  inputClassName?: string;
  wrapperClassName?: string;
  hideLabel?: boolean;
}

const FormInput = forwardRef<HTMLInputElement, Props>(({
  label,
  labelIcon,
  icon,
  rightIcon,
  error,
  className = "",
  inputClassName = "",
  wrapperClassName = "",
  type = "text",
  id,
  name,
  required,
  placeholder,
  hideLabel = false,
  ...props
}, ref) => {
  const inputId = id || name || label?.replace(/\s+/g, "-").toLowerCase();
  
  // Auto-align right for numbers and monetary/quantity fields
  const isNumericField = type === 'number' || (label && /\b(price|cost|amount|qty|quantity|vat|disc|discount|rate|total|net|gross|percentage|%|balance)\b/i.test(label));

  return (
    <div className={`flex flex-col gap-1 mb-1 min-w-0 relative ${wrapperClassName || "w-full"}`}>

      {/* LABEL */}
      {label && !hideLabel && (
        <label
          htmlFor={inputId}
          className="flex flex-wrap items-center text-[10px] font-bold uppercase tracking-widest text-slate-600 mb-0.5 min-w-0"
        >
          {labelIcon && <span className="shrink-0 mr-1">{labelIcon}</span>}
          <span className="truncate">{label}</span>
          {required && <span className="text-red-500 ml-1 font-bold shrink-0">*</span>}
          {error && <span className="text-[10px] text-red-500 font-bold ml-2 normal-case shrink" title={error}>({error.toLowerCase().includes('required') ? 'required' : error})</span>}
        </label>
      )}

      {/* INPUT WRAPPER */}
      <div className="relative group flex items-center">
        {icon && (
          <div className="absolute left-3.5 text-slate-400 group-focus-within:text-[#49293e] transition-colors pointer-events-none">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          name={name}
          type={type}
          required={required}
          placeholder={placeholder || (required ? "Enter value" : "")}
          min={isNumericField ? (props.min ?? 0) : props.min}
          step={props.step ?? (type === 'number' ? 'any' : undefined)}
          autoComplete={props.autoComplete ?? "off"}
          onKeyDown={(e) => {
            if (isNumericField && (e.key === '-' || e.key === 'e')) {
              e.preventDefault();
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              handleFocusNextInput(e.currentTarget);
            }
            if (props.onKeyDown) props.onKeyDown(e);
          }}
          className={`
            w-full h-9
            text-xs
            rounded-md border outline-none transition
            ${icon ? "pl-11" : "pl-4"}
            ${rightIcon ? "pr-10" : "pr-4"}
            ${type === 'password' ? 'text-center' : isNumericField ? 'text-right' : ''}
            
            ${error ? "border-red-500 bg-red-50/30" : "border-gray-300 bg-white"}
            ${props.disabled ? "bg-gray-100 cursor-not-allowed" : ""}
            ${props.readOnly ? "bg-gray-100 cursor-not-allowed" : ""}

            focus:border-[#49293e] focus:ring-1 focus:ring-[#49293e]/20
            ${className}
            ${inputClassName}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 text-slate-400 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>

      {/* ERROR (FALLBACK IF LABEL IS HIDDEN) */}
      {error && hideLabel && (
        <div className="absolute -bottom-3.5 left-1 text-[10px] text-red-600 font-semibold animate-in fade-in slide-in-from-top-1">
          {error}
        </div>
      )}

    </div>
  );
});

FormInput.displayName = "FormInput";

export default FormInput;