import { useState } from "react";
import { Truck, X, Check, MapPin } from "lucide-react";
import { useCurrency } from "../../../../../../hooks/useCurrency";

interface PosDeliveryChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCharge: number;
  onSelect: (charge: number) => void;
}

// ── Sample zones — replace with real API data when backend is ready ─────────
interface DeliveryZone {
  id: string;
  name: string;
  charge: number;
  description?: string;
}

const SAMPLE_ZONES: DeliveryZone[] = [
  { id: "1", name: "Zone 1", charge: 0.5,  description: "Nearby" },
  { id: "2", name: "Zone 2", charge: 1.0,  description: "City" },
  { id: "3", name: "Zone 3", charge: 1.5,  description: "Suburbs" },
  { id: "4", name: "Zone 4", charge: 2.0,  description: "Outskirts" },
  { id: "5", name: "Zone 5", charge: 2.5,  description: "Far" },
  { id: "6", name: "Zone 6", charge: 3.0,  description: "Remote" },
];
// ────────────────────────────────────────────────────────────────────────────

export const PosDeliveryChargeModal = ({
  isOpen,
  onClose,
  currentCharge,
  onSelect,
}: PosDeliveryChargeModalProps) => {
  const { formatAmount } = useCurrency();
  const [selected, setSelected] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelect = (zone: DeliveryZone) => {
    setSelected(zone.id);
    onSelect(zone.charge);
    onClose();
  };

  const activeZone =
    SAMPLE_ZONES.find((z) => z.id === selected) ??
    SAMPLE_ZONES.find((z) => z.charge === currentCharge);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ background: "rgba(15,10,20,0.55)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full mx-4 overflow-hidden"
        style={{ maxWidth: 360 }}
      >
        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#49293e] to-[#7b4060]">
          {/* Decorative circles */}
          <div className="absolute -top-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
          <div className="absolute -bottom-6 right-8 w-20 h-20 rounded-full bg-white/5" />

          <div className="flex items-center gap-2 text-white relative z-10">
            <div className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center">
              <Truck size={14} />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-widest leading-none">
                Delivery Zones
              </p>
              <p className="text-[8px] text-white/60 mt-0.5 leading-none">
                Select a charge zone
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="relative z-10 w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-all active:scale-95"
          >
            <X size={13} strokeWidth={2.5} />
          </button>
        </div>

        {/* ── Active zone banner ─────────────────────────────────────── */}
        {activeZone && (
          <div className="flex items-center gap-3 px-4 py-2.5 bg-[#49293e]/6 border-b border-[#49293e]/10">
            <MapPin size={11} className="text-[#49293e] shrink-0" />
            <span className="text-[9px] font-bold text-[#49293e] uppercase tracking-widest">
              Current:
            </span>
            <span className="text-[9px] font-black text-[#49293e]">
              {activeZone.name} — {formatAmount(activeZone.charge)}
            </span>
          </div>
        )}

        {/* ── Zone grid ─────────────────────────────────────────────── */}
        <div className="p-4">
          <div className="grid grid-cols-3 gap-2">
            {SAMPLE_ZONES.map((zone) => {
              const isActive =
                selected === zone.id ||
                (!selected && zone.charge === currentCharge);

              return (
                <button
                  key={zone.id}
                  onClick={() => handleSelect(zone)}
                  className={`
                    relative flex flex-col items-center justify-center gap-0.5
                    py-3.5 px-2 rounded-xl border-2 transition-all active:scale-95 group
                    ${
                      isActive
                        ? "border-[#49293e] bg-[#49293e] shadow-lg shadow-[#49293e]/25"
                        : "border-slate-100 bg-slate-50/80 hover:border-[#49293e]/30 hover:bg-[#49293e]/5 hover:shadow-sm"
                    }
                  `}
                >
                  {/* Active tick */}
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <Check
                        size={9}
                        className="text-[#49293e]"
                        strokeWidth={3}
                      />
                    </div>
                  )}

                  {/* Zone name */}
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest leading-none ${
                      isActive ? "text-white/70" : "text-slate-400"
                    }`}
                  >
                    {zone.name}
                  </span>

                  {/* Charge amount */}
                  <span
                    className={`text-[17px] font-black tracking-tight leading-snug ${
                      isActive ? "text-white" : "text-[#49293e]"
                    }`}
                  >
                    {formatAmount(zone.charge)}
                  </span>

                  {/* Description */}
                  {zone.description && (
                    <span
                      className={`text-[8px] font-bold leading-none ${
                        isActive ? "text-white/50" : "text-slate-300"
                      }`}
                    >
                      {zone.description}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 pb-4 pt-1">
          <p className="text-[8px] text-slate-300 uppercase tracking-widest">
            Double-click row to open
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-200 text-[9px] font-bold text-slate-500 hover:bg-slate-50 active:scale-95 transition-all uppercase tracking-widest"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
