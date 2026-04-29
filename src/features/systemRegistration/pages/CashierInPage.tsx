import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TouchNumpad } from "../../../components/common";
import { useToast } from "../../../app/providers/useToast";
import { useCashierShift } from "../hooks/useCashierShift";
import { posLoginApi } from "../../auth/services/authApi";
import { useAppDispatch } from "../../../app/hooks";
import { setCredentials } from "../../auth/store/authSlice";

const CashierInPage = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { showToast } = useToast();
  const { openShift } = useCashierShift();

  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handlePasswordSubmit = async () => {
    if (loading) return;

    const branchId = localStorage.getItem("systemBranchId");
    const counterId = localStorage.getItem("systemCounterId");

    if (!branchId || !counterId) {
      showToast("System registration data missing. Please register again.", "error");
      navigate("/system/register");
      return;
    }

    setLoading(true);
    try {
      const response = await posLoginApi(
        password,
        Number(branchId),
        Number(counterId)
      );

      // 1. Store credentials in Redux (which also persists to LocalStorage)
      dispatch(setCredentials({
        tenantId: response.tenantId || null,
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        userId: response.user?.userId || 0,
        userName: response.user?.userName || "Cashier",
        isMaster: response.user?.isMaster || false,
        userRoles: response.userRoles || [],
        decimalPart: response.company?.decimalPart ?? 2,
        currencySymbol: response.company?.currencySymbol ?? "BHD",
        sessionExpiresAt: response.session?.expiresAt
      }));


      // 2. Open the shift (local state for routing guard)
      openShift({ 
        openingCash: 0, 
        notes: "Automated POS login",
        cashierId: response.user?.userId,
        cashierName: response.user?.userName
      });


      showToast("POS logged in successfully!", "success");
      navigate("/pos", { replace: true });
    } catch (error: any) {
      console.error("POS Login Error:", error);
      const msg = error.response?.data?.message || error.message || "Invalid password";
      showToast(msg, "error");
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#49293e]">POS Login</h1>
          <p className="text-slate-500 text-sm mt-1">
            Machine: <span className="font-bold text-slate-700">{localStorage.getItem("systemName")}</span>
          </p>
          <p className="text-slate-400 text-xs mt-0.5">Please enter your PIN to continue</p>
        </div>
        
        <TouchNumpad 
          title="ENTER PIN" 
          isPassword 
          value={password} 
          onChange={setPassword} 
          onSubmit={handlePasswordSubmit}
          disabled={loading}
        />

        {loading && (
          <p className="text-center text-xs text-[#49293e] mt-4 font-bold animate-pulse uppercase tracking-widest">
            Authenticating...
          </p>
        )}
      </div>
    </div>
  );
};

export default CashierInPage;
