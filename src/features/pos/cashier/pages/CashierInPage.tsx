import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { posLoginApi } from "../../../../features/auth/services/authApi";
import { cashierLogService } from "../services/cashierLogService";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../app/hooks";
import { setCredentials } from "../../../../features/auth/store/authSlice";
import { fetchPosMasterDataApi } from "../../../../features/auth/services/authApi";
import { Settings, Delete } from "lucide-react";

// --- Custom Premium Numpad Component ---
const PremiumNumpad = ({ value, onChange, onSubmit, loading }: any) => {
  const handleNumClick = (num: string) => onChange(value + num);
  const handleClear = () => onChange("");
  const handleDelete = () => onChange(value.slice(0, -1));

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Del"];

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* PIN Display Area */}
      <div className="mb-3 xl:mb-6 relative">
        <div className="flex justify-center gap-3 xl:gap-4 py-3 xl:py-4 px-4 xl:px-6 border-2 border-slate-100 bg-white rounded-2xl shadow-sm">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-300 ${value.length > i
                  ? "bg-[#49293e] border-[#49293e] scale-110 shadow-[0_0_10px_rgba(73,41,62,0.3)]"
                  : "bg-slate-50 border-slate-200"
                }`}
            />
          ))}
        </div>
        <input
          type="password"
          value={value}
          readOnly
          className="sr-only"
        />
      </div>

      {/* Grid - Reduced button height and gaps */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => {
              if (btn === "Clear") handleClear();
              else if (btn === "Del") handleDelete();
              else handleNumClick(btn);
            }}
            disabled={loading}
            className={`h-11 sm:h-12 xl:h-14 rounded-xl flex items-center justify-center text-lg md:text-xl font-black transition-all active:scale-95 shadow-sm border-2 ${btn === "Clear" || btn === "Del"
                ? "bg-slate-100 border-slate-300 text-slate-500 hover:bg-slate-200"
                : "bg-white border-slate-300 text-[#49293e] hover:border-[#49293e]/20 hover:shadow-md"
              }`}
          >
            {btn === "Del" ? <Delete size={20} /> : btn}
          </button>
        ))}
      </div>

      <div className="w-full">
        <button
          onClick={onSubmit}
          disabled={loading || value.length === 0}
          className="h-11 sm:h-12 xl:h-14 rounded-xl w-full bg-[#49293e] text-white font-extrabold uppercase tracking-wider text-[12px] flex items-center justify-center gap-2 hover:bg-[#5a334d] shadow-lg shadow-[#49293e]/10 transition-all disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Sign In"}
        </button>
      </div>
    </div>
  );
};



const CashierInPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const dispatch = useAppDispatch();
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const branchId = Number(localStorage.getItem("systemBranchId")) || 0;
  const counterId = Number(localStorage.getItem("systemCounterId")) || 0;
  const seriesId = Number(localStorage.getItem("systemSeriesId")) || 0;
  const clientDb = localStorage.getItem("tenantId") || "";

  const handleLogin = async () => {
    if (!pin) {
      showToast("Please enter your PIN", "warning");
      return;
    }

    if (!branchId || !counterId || !seriesId) {
      showToast("Terminal not fully registered. Please register first.", "error");
      navigate("/system/register");
      return;
    }

    setLoading(true);
    try {
      const data = await posLoginApi(pin, branchId, counterId, seriesId);

      if (data?.accessToken && data?.user?.userId) {
        localStorage.setItem("userId", String(data.user.userId));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userName", data.user.userName);
        localStorage.setItem("isMaster", String(Boolean(data.user.isMaster)));

        if (data.userRoles) {
          localStorage.setItem("userRoles", JSON.stringify(data.userRoles));
        }

        // Load POS Master Data in the background
        const terminalId = localStorage.getItem("terminalId") || "";
        let decimalPart = 2;
        let currencySymbol = "BHD";
        
        try {
          const masterData = await fetchPosMasterDataApi(terminalId, seriesId);
          decimalPart = masterData.company?.decimalPart ?? 2;
          currencySymbol = masterData.company?.currencySymbol ?? "BHD";

          if (masterData.configs) {
            localStorage.setItem("posConfigs", JSON.stringify(masterData.configs));
          }
          if (masterData.printerData) {
            localStorage.setItem("posPrinterData", JSON.stringify(masterData.printerData));
          }
          if (masterData.voucherSeries) {
            localStorage.setItem("posVoucherSeries", JSON.stringify(masterData.voucherSeries));
          }
        } catch (masterErr) {
          console.error("Failed to fetch POS master data:", masterErr);
          showToast("Login succeeded, but failed to load POS configs.", "warning");
        }

        localStorage.setItem("decimalPart", String(decimalPart));
        localStorage.setItem("currencySymbol", currencySymbol);

        dispatch(
          setCredentials({
            tenantId: clientDb,
            accessToken: data.accessToken,
            refreshToken: data.refreshToken,
            userId: data.user.userId,
            userName: data.user.userName,
            isMaster: Boolean(data.user.isMaster),
            userRoles: data.userRoles ?? [],
            decimalPart,
            currencySymbol,
          })
        );

        showToast("Login successful", "success");

        try {
          const statusResponse = await cashierLogService.checkStatus(branchId, counterId);
          const st = statusResponse.cashierInStatus;
          if (st && !st.isDayClosed && !st.isShiftClosed) {
            localStorage.setItem("activeShift", JSON.stringify({ status: "open", dayId: st.dayId, shiftId: st.shiftId }));
            navigate("/pos", { replace: true });
          } else {
            localStorage.removeItem("activeShift");
            navigate("/cashier/out", { replace: true });
          }
        } catch (err) {
          console.error("Post-login status check failed:", err);
          navigate("/pos", { replace: true });
        }
      } else {
        showToast("Invalid PIN. Please try again.", "warning");
        setPin("");
      }
    } catch (error: any) {
      console.error("POS Login Error:", error);
      const message = error.response?.status === 401
        ? "Incorrect PIN"
        : (error.message || "Login failed");
      showToast(message, "error");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      <div className="flex flex-none md:flex-[1.2] h-40 md:h-auto relative overflow-hidden bg-[#1a0f18]">
        <img
          src="/backoffice_logo.png"
          alt="Bitezo POS"
          className="w-full h-full object-cover object-left"
        />
      </div>

      {/* Right Column: Login Area */}
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-3 sm:p-6 lg:p-8 xl:p-16 relative overflow-y-auto md:overflow-hidden">
        <div className="w-full max-w-sm flex flex-col items-center gap-2 sm:gap-4 xl:gap-8 my-auto z-10">
          {/* Heading - Now centered and lowered */}
          <div className="text-center w-full mb-2 xl:mb-4">
            <div className="md:hidden mb-4 flex justify-center">
              <div className="w-36 h-16 flex items-center justify-center overflow-hidden relative">
                <img src="/LOGO6.png" alt="Bitezo" className="w-full h-full object-contain p-1" style={{ transform: 'scale(2.5)' }} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-[#49293e] uppercase tracking-tight leading-none mb-2">
              Cashier In
            </h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.3em]">
              Enter Access PIN
            </p>
          </div>

          {/* Premium Numpad */}
          <PremiumNumpad
            value={pin}
            onChange={setPin}
            onSubmit={handleLogin}
            loading={loading}
          />

          {/* Context and Config */}
          <div className="mt-1 xl:mt-4 flex flex-col items-center gap-2 xl:gap-4 w-full">
            <button
              onClick={() => navigate("/system/register")}
              className="group flex items-center gap-2 xl:gap-3 px-4 py-2 xl:px-5 xl:py-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#49293e] hover:border-[#49293e]/30 shadow-sm transition-all duration-300"
            >
              <Settings size={16} className="group-hover:rotate-90 transition-transform duration-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Terminal Configuration</span>
            </button>

            <div className="flex items-center gap-4 w-full">
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Branch</span>
                <span className="text-[10px] font-bold text-[#49293e] uppercase">{localStorage.getItem("systemBranchName") || "MAIN"}</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Terminal</span>
                <span className="text-[10px] font-bold text-[#49293e] uppercase">{localStorage.getItem("systemCounterName") || "COUNTER 01"}</span>
              </div>
              <div className="w-px h-6 bg-slate-200" />
              <div className="flex-1 flex flex-col items-center gap-0.5">
                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Series</span>
                <span className="text-[10px] font-bold text-[#49293e] uppercase">{localStorage.getItem("systemSeriesName") || "MAIN"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Large Decorative Watermark */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#49293e]/[0.03] pointer-events-none select-none font-black text-[180px] md:text-[240px] leading-none uppercase tracking-tighter -rotate-12 z-0">
          BITEZO
        </div>
      </div>
    </div>
  );
};

export default CashierInPage;