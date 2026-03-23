import React from "react";

interface Props {
  label?: string;
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  id?: string;
  error?: string;
}

const Checkbox = ({
  label,
  checked,
  onChange,
  disabled,
  id,
  error,
}: Props) => {
  const inputId = id || label?.replace(/\s+/g, "-").toLowerCase();

  return (
    <div className="flex flex-col gap-1">

      <label
        htmlFor={inputId}
        className={`flex items-center gap-2 text-sm md:text-base
          ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}
        `}
      >
        <input
          id={inputId}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`
            w-4 h-4 md:w-5 md:h-5
            accent-[#49293e]
            cursor-pointer
            disabled:cursor-not-allowed
            
            focus:ring-2 focus:ring-[#49293e]
          `}
        />

        {label && <span>{label}</span>}
      </label>

      {/* ERROR */}
      {error && (
        <span className="text-xs text-red-500">
          {error}
        </span>
      )}

    </div>
  );
};

export default Checkbox;