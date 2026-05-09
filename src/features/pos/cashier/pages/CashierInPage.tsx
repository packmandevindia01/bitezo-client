import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { posLoginApi } from "../../../../features/auth/services/authApi";
import { cashierLogService } from "../services/cashierLogService";
import { useToast } from "../../../../app/providers/useToast";
import { useAppDispatch } from "../../../../app/hooks";
import { setCredentials } from "../../../../features/auth/store/authSlice";
import { Settings, ShieldCheck, Sparkles, Delete } from "lucide-react";

// --- Custom Premium Numpad Component ---
const PremiumNumpad = ({ value, onChange, onSubmit, loading }: any) => {
  const handleNumClick = (num: string) => onChange(value + num);
  const handleClear = () => onChange("");
  const handleDelete = () => onChange(value.slice(0, -1));

  const buttons = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "Clear", "0", "Del"];

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* PIN Display Area */}
      <div className="mb-4 relative">
        <div className="flex justify-center gap-3 mb-2">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-3 h-3 rounded-full border-2 transition-all duration-300 ${
                value.length > i 
                  ? "bg-[#49293e] border-[#49293e] scale-125 shadow-[0_0_10px_rgba(73,41,62,0.3)]" 
                  : "bg-transparent border-slate-300"
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        {buttons.map((btn) => (
          <button
            key={btn}
            onClick={() => {
              if (btn === "Clear") handleClear();
              else if (btn === "Del") handleDelete();
              else handleNumClick(btn);
            }}
            disabled={loading}
            className={`h-12 md:h-14 rounded-xl flex items-center justify-center text-lg md:text-xl font-black transition-all active:scale-95 shadow-sm border ${
              btn === "Clear" || btn === "Del"
                ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                : "bg-white border-slate-100 text-[#49293e] hover:border-[#49293e]/20 hover:shadow-md"
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
          className="h-12 rounded-xl w-full bg-[#49293e] text-white font-extrabold uppercase tracking-wider text-[12px] flex items-center justify-center gap-2 hover:bg-[#5a334d] shadow-lg shadow-[#49293e]/10 transition-all disabled:opacity-50"
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
  const clientDb = localStorage.getItem("tenantId") || "app_db";

  const handleLogin = async () => {
    if (!pin) {
      showToast("Please enter your PIN", "warning");
      return;
    }

    if (!branchId || !counterId) {
      showToast("Terminal not registered. Please register first.", "error");
      navigate("/system/register");
      return;
    }

    setLoading(true);
    try {
      const data = await posLoginApi(pin, branchId, counterId);

      if (data?.accessToken && data?.user?.userId) {
        localStorage.setItem("userId", String(data.user.userId));
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userName", data.user.userName);
        localStorage.setItem("isMaster", String(Boolean(data.user.isMaster)));
        
        if (data.userRoles) {
          localStorage.setItem("userRoles", JSON.stringify(data.userRoles));
        }

        const decimalPart = data.company?.decimalPart ?? 2;
        const currencySymbol = data.company?.currencySymbol ?? "BHD";
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
          } else {
            localStorage.removeItem("activeShift");
          }
        } catch (err) {
          console.error("Post-login status check failed:", err);
        }

        navigate("/pos", { replace: true });
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
    <div className="h-screen flex flex-col md:flex-row bg-white overflow-hidden font-sans">
      {/* Left Column: Brand Area */}
      <div className="hidden md:flex flex-[1.2] bg-[#49293e] relative flex-col items-center justify-center p-12 overflow-hidden">
        {/* Background Patterns */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] border-[60px] border-white rounded-full translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] border-[40px] border-white rounded-full -translate-x-1/2 translate-y-1/2 opacity-20" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Logo Container */}
          <div className="w-48 h-48 bg-white rounded-[3rem] flex items-center justify-center p-6 mb-10 shadow-2xl border border-white/10 group hover:scale-105 transition-transform duration-700">
            <img 
              src="/bitezo-logo-hq.png" 
              alt="Bitezo" 
              className="w-full h-full object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.1)]" 
            />
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl font-black text-white tracking-tighter flex items-center justify-center gap-4">
              BITEZO <Sparkles className="text-white animate-pulse" size={40} />
            </h1>
            <p className="text-white/80 font-black text-sm uppercase tracking-[0.6em]">
              Cloud-Based Restaurant POS
            </p>
            <div className="h-1.5 w-24 bg-white/30 mx-auto rounded-full mt-4" />
            <p className="text-white/60 text-lg leading-relaxed max-w-xs mx-auto pt-6 font-medium italic">
              "Exquisite technology for the modern culinary & hospitality industry."
            </p>
          </div>

          <div className="mt-16 inline-flex items-center gap-3 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-xs font-bold text-white/80 uppercase tracking-widest backdrop-blur-md">
            <ShieldCheck size={18} className="text-emerald-400" />
            SECURE CLOUD AUTHORIZATION
          </div>
        </div>

        <div className="absolute bottom-10 text-white/20 text-[10px] font-black uppercase tracking-[0.4em]">
          Powered by Packman Solutions • v1.0.0
        </div>
      </div>

      {/* Right Column: Login Area */}
      <div className="flex-1 bg-slate-50 flex flex-col items-center justify-center p-6 md:p-16 relative">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          {/* Heading - Now centered and lowered */}
          <div className="text-center w-full mb-4">
            <div className="md:hidden mb-10 flex justify-center">
               <img src="/bitezo-logo-hq.png" alt="Bitezo" className="w-24 h-24 object-contain" />
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
          <div className="mt-2 flex flex-col items-center gap-4 w-full">
            <button 
              onClick={() => navigate("/system/register")}
              className="group flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#49293e] hover:border-[#49293e]/30 shadow-sm transition-all duration-300"
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