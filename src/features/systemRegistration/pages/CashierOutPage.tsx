import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Calendar, AlertCircle, Delete } from "lucide-react";
import { Button } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import { useCashierShift } from "../hooks/useCashierShift";

const DENOMINATIONS = [0.010, 0.025, 0.050, 0.100, 0.500, 1];

const CashierOutPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { activeShift, isShiftOpen, closeShift } = useCashierShift();

  const [activeInput, setActiveInput] = useState<number | "total">("total");
  const [totalStr, setTotalStr] = useState("");
  const [counts, setCounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  // If the user hasn't opened a shift
  if (!isShiftOpen || !activeShift) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
            <AlertCircle size={28} className="text-amber-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">No Open Shift</h2>
          <p className="mt-1 text-sm text-slate-500">There is no active shift to close.</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-sm font-semibold text-[#49293e] hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Derived shift data
  const openedAt = new Date(activeShift.openedAt);
  const now = new Date();
  const durationMs = now.getTime() - openedAt.getTime();
  const hours = Math.floor(durationMs / 3_600_000);
  const minutes = Math.floor((durationMs % 3_600_000) / 60_000);
  const durationStr = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  const openedTimeStr = openedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const dateStr = now.toLocaleDateString([], {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  // Computed Totals logic
  const computedTotal = useMemo(() => {
    return DENOMINATIONS.reduce((sum, denom) => {
      const count = parseInt(counts[denom] || "0", 10);
      return sum + denom * count;
    }, 0);
  }, [counts]);

  const hasDenominations = computedTotal > 0;
  // Final total displayed in the Total box
  const finalTotal = hasDenominations ? computedTotal.toFixed(3) : totalStr;

  // Numpad handler
  const handleNumpadKey = (key: string) => {
    if (activeInput === "total") {
      // Manual Total ignores denominations
      if (key === "Clear") {
        setTotalStr("");
        setCounts({});
      } else if (key === "Del") {
        setTotalStr((prev) => prev.slice(0, -1));
      } else {
        // Prevent double dots
        if (key === "." && totalStr.includes(".")) return;
        setTotalStr((prev) => prev + key);
        setCounts({}); // clear denominations if user types manual total
      }
    } else {
      // Modify a denomination count
      if (key === "Clear") {
        setCounts((prev) => ({ ...prev, [activeInput]: "" }));
      } else if (key === "Del") {
        setCounts((prev) => ({ ...prev, [activeInput]: prev[activeInput]?.slice(0, -1) || "" }));
      } else if (key !== ".") {
        // Count must be integer
        setCounts((prev) => ({ ...prev, [activeInput]: (prev[activeInput] || "") + key }));
      }
    }
  };

  const handleCloseShift = () => {
    const amount = parseFloat(finalTotal || "0");
    if (isNaN(amount) || amount < 0) {
      showToast("Please enter a valid closing balance", "error");
      return;
    }

    setLoading(true);
    try {
      closeShift({ closingCash: amount, closingNotes: "" });
      showToast("Shift closed successfully. See you next time!", "success");
      navigate("/cashier/in", { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-300 overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT COLUMN: Denomination Calculator */}
        <div className="flex-1 bg-white p-6 border-r border-gray-200">
          <h2 className="text-xl font-bold tracking-widest text-[#49293e] mb-6 uppercase border-b pb-3">
            Closing Balance
          </h2>

          <div className="space-y-4">
            {/* Total Row */}
            <div className="flex items-center">
              <label 
                className={`w-32 font-bold text-lg ${activeInput === "total" ? "text-[#49293e]" : "text-gray-600"}`}
              >
                Total:
              </label>
              <input
                type="text"
                readOnly
                value={finalTotal}
                onClick={() => setActiveInput("total")}
                className={`flex-1 px-4 py-3 text-right text-2xl font-bold bg-white border-2 rounded-xl outline-none cursor-pointer transition ${
                  activeInput === "total" 
                    ? "border-[#49293e] ring-4 ring-[#49293e]/10 shadow-sm" 
                    : "border-gray-300 hover:border-gray-400"
                }`}
              />
            </div>

            <div className="h-px bg-gray-100 my-4"></div>

            {/* Denominations */}
            {DENOMINATIONS.map((denom) => {
              const count = counts[denom] || "";
              const cVal = parseInt(count || "0", 10);
              const subtotal = (cVal * denom).toFixed(3);
              const isActive = activeInput === denom;

              return (
                <div key={denom} className="flex items-center gap-3">
                  <div className="w-32 flex items-center gap-2">
                    <span className="font-semibold text-gray-500 w-16 text-right">
                      {denom.toFixed(3)}
                    </span>
                    <span className="text-gray-400 font-bold text-sm">x</span>
                  </div>
                  
                  <input
                    type="text"
                    readOnly
                    value={count}
                    onClick={() => setActiveInput(denom)}
                    placeholder="0"
                    className={`w-28 px-3 py-2 text-center text-lg font-bold bg-white border-2 rounded-lg outline-none cursor-pointer transition ${
                      isActive 
                        ? "border-[#49293e] ring-4 ring-[#49293e]/10 shadow-sm text-[#49293e]" 
                        : "border-gray-300 hover:border-gray-400 text-gray-800"
                    }`}
                  />
                  
                  <input
                    type="text"
                    readOnly
                    value={subtotal}
                    className="flex-1 px-3 py-2 text-right text-lg font-semibold bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Info & Numpad */}
        <div className="w-full md:w-96 bg-gray-50 flex flex-col p-6">
          
          {/* Top Info */}
          <div className="flex justify-between items-center bg-white border border-gray-200 rounded-xl p-3 mb-6 shadow-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar size={18} className="text-[#49293e]" />
              <span className="font-semibold">{dateStr}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Clock size={18} className="text-[#49293e]" />
              <span className="font-semibold">{openedTimeStr}</span>
            </div>
          </div>

          <div className="mb-4 text-sm text-center text-gray-500">
            Shift Duration: <span className="font-bold text-gray-700">{durationStr}</span>
          </div>

          {/* Integrated Numpad */}
          <div className="grid grid-cols-3 gap-3 mb-6 flex-1">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "."].map((btn) => {
              if (btn === "Clear") {
                return (
                  <button
                    key={btn}
                    onClick={() => handleNumpadKey(btn)}
                    className="bg-white hover:bg-gray-100 text-gray-700 font-bold text-lg py-4 rounded-xl border border-gray-300 shadow-sm transition active:scale-95"
                  >
                    Clear
                  </button>
                );
              }
              return (
                <button
                  key={btn}
                  onClick={() => handleNumpadKey(btn)}
                  className="bg-white hover:bg-gray-100 text-[#49293e] font-bold text-2xl py-4 rounded-xl border border-gray-300 shadow-sm transition active:scale-95"
                >
                  {btn}
                </button>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 mt-auto">
            <Button
              size="lg"
              onClick={handleCloseShift}
              disabled={loading}
              loading={loading}
              className="py-4 text-lg font-bold rounded-xl"
            >
              Submit
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => navigate("/dashboard")}
              disabled={loading}
              className="py-4 text-lg font-bold rounded-xl text-gray-600"
            >
              Close
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default CashierOutPage;

