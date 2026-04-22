import { Clock } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";

const TopbarShiftIndicator = () => {
  const systemType = localStorage.getItem("systemType");
  const isPOS = systemType === "pos";

  const openShiftCash = (() => {
    try {
      const raw = localStorage.getItem("activeShift");
      const shift = raw ? JSON.parse(raw) : null;
      return shift?.status === "open" ? shift.openingCash : null;
    } catch {
      return null;
    }
  })();

  if (!isPOS || openShiftCash === null) return null;

  return (
    <div className="hidden md:flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
      <Clock size={11} />
      <span>Shift Open · {formatCurrency(openShiftCash || 0)}</span>
    </div>
  );
};

export default TopbarShiftIndicator;
