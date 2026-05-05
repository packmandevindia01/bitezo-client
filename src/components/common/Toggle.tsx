

interface Props {
  id?: string;
  label?: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

const Toggle = ({ id, label, enabled, onChange, onKeyDown, disabled, autoFocus }: Props) => {
  return (
    <div className="flex items-center justify-between py-2">
      {label && (
        <span className="text-sm font-medium text-gray-700">{label}</span>
      )}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        onKeyDown={onKeyDown}
        autoFocus={autoFocus}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#49293e] focus-visible:ring-offset-2 ${
          enabled ? "bg-[#49293e]" : "bg-gray-200"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
};

export default Toggle;
