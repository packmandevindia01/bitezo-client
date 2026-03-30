import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

interface Props {
  value: "left" | "center" | "right";
  onChange: (align: "left" | "center" | "right") => void;
  disabled?: boolean;
  variant?: "select" | "buttons"; // select = dropdown, buttons = icon buttons
}

const AlignmentSelect = ({ value, onChange, disabled, variant = "select" }: Props) => {
  if (variant === "buttons") {
    return (
      <div className="flex items-center gap-1">
        {(["left", "center", "right"] as const).map((a) => {
          const Icon = a === "left" ? AlignLeft : a === "center" ? AlignCenter : AlignRight;
          return (
            <button
              key={a}
              onClick={() => onChange(a)}
              disabled={disabled}
              className={`p-1.5 rounded-lg transition ${
                value === a
                  ? "bg-[#49293e] text-white"
                  : "text-gray-400 hover:text-[#49293e] hover:bg-gray-100"
              }`}
            >
              <Icon size={13} />
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as "left" | "center" | "right")}
      disabled={disabled}
      className="text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#49293e]/20 transition shrink-0"
    >
      <option value="left">Left</option>
      <option value="center">Center</option>
      <option value="right">Right</option>
    </select>
  );
};

export default AlignmentSelect;