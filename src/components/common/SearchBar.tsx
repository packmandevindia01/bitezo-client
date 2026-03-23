import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SearchBar = ({
  value,
  onChange,
  placeholder = "Search...",
  disabled,
  className = "",
}: SearchBarProps) => {
  return (
    <div className={`relative w-full ${className}`}>

      {/* SEARCH ICON */}
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />

      {/* INPUT */}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        aria-label="Search"
        className={`
          w-full pl-9 pr-9 py-2
          text-sm md:text-base
          border rounded-md outline-none transition
          
          ${disabled ? "bg-gray-100 cursor-not-allowed" : "bg-white"}
          
          focus:ring-2 focus:ring-[#49293e] focus:border-[#49293e]
        `}
      />

      {/* CLEAR BUTTON */}
      {value && !disabled && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={16} />
        </button>
      )}

    </div>
  );
};

export default SearchBar;