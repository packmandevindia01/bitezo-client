interface Props {
  value: number; // 0-100
  onChange: (val: number) => void;
  disabled?: boolean;
}

const PositionSlider = ({ value, onChange, disabled }: Props) => {
  const snap = (val: number) => {
    // Snap to 0, 50, 100 if within 5% range
    if (val <= 5) return 0;
    if (val >= 45 && val <= 55) return 50;
    if (val >= 95) return 100;
    return val;
  };

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      {/* Ruler track */}
      <div className="relative flex-1 h-6 flex items-center">
        {/* Track */}
        <div className="w-full h-1.5 bg-gray-100 rounded-full relative">
          {/* Snap markers */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-300 rounded-full -translate-x-0.5" />
          <div className="absolute left-1/2 top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-300 rounded-full -translate-x-0.5" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-3 bg-gray-300 rounded-full translate-x-0.5" />

          {/* Fill */}
          <div
            className="absolute left-0 top-0 h-full bg-[#49293e]/30 rounded-full"
            style={{ width: `${value}%` }}
          />
        </div>

        {/* Thumb */}
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(snap(Number(e.target.value)))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Custom thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#49293e] rounded-full shadow-md border-2 border-white pointer-events-none transition-all"
          style={{ left: `calc(${value}% - 8px)` }}
        />
      </div>

      {/* Value badge */}
      <span className="text-[10px] font-mono text-gray-400 w-7 text-right shrink-0">
        {value === 0 ? "L" : value === 50 ? "C" : value === 100 ? "R" : value}
      </span>
    </div>
  );
};

export default PositionSlider;